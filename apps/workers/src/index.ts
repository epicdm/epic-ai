/**
 * Epic AI Background Worker Entry Point
 *
 * Main entry point for the BullMQ worker process.
 * Handles worker initialization, queue connections, and graceful shutdown.
 *
 * Based on research.md Decision 5 (Lock Duration) and Decision 6 (Concurrency)
 *
 * @module index
 */

import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { redis, closeRedisConnection, createRedisConnection } from './lib';
import { QueueName } from './types/payloads';
import { getWorkerOptions } from './queues/options';
import { getQueuesHealth } from './queues';
import { logger } from './lib/logger';
import type { JobData } from './processors/base';
import {
  contentGenerationProcessor,
  contextScraperProcessor,
  rssSyncerProcessor,
  analyticsCollectorProcessor,
  tokenRefresherProcessor,
  documentProcessor,
  contentPublisherProcessor,
  imageGeneratorProcessor,
} from './processors';
import { JobType } from './types/payloads';
import { startHealthServer, recordJobProcessed } from './health';

// Load environment variables
dotenv.config();

// =============================================================================
// Constants
// =============================================================================

const COMPONENT = 'worker';

/**
 * Graceful shutdown timeout in milliseconds
 * After this time, force kill remaining jobs
 */
const SHUTDOWN_TIMEOUT_MS = 30_000;

/**
 * T049: Stalled job threshold in milliseconds (30 minutes)
 * Jobs running longer than this are considered stalled on startup
 */
const STALLED_JOB_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * T053: Stats monitoring interval in milliseconds (60 seconds)
 */
const STATS_INTERVAL_MS = 60_000;

// =============================================================================
// Worker Registry
// =============================================================================

/**
 * Active workers for graceful shutdown
 */
const workers: Worker[] = [];

/**
 * Shutdown in progress flag
 */
let isShuttingDown = false;

/**
 * Stats monitoring interval reference
 */
let statsInterval: NodeJS.Timeout | null = null;

// =============================================================================
// T049: Stalled Job Recovery
// =============================================================================

/**
 * Recovers stalled jobs on worker startup
 * Finds jobs with RUNNING status older than threshold and marks them as FAILED
 *
 * Implements T049: Stalled job recovery
 */
async function recoverStalledJobs(): Promise<void> {
  const threshold = new Date(Date.now() - STALLED_JOB_THRESHOLD_MS);

  try {
    // Find jobs that are marked as RUNNING but started more than 30 minutes ago
    const stalledJobs = await prisma.job.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: threshold },
      },
      select: {
        id: true,
        type: true,
        startedAt: true,
      },
    });

    if (stalledJobs.length === 0) {
      logger.info(COMPONENT, 'No stalled jobs found on startup');
      return;
    }

    logger.warn(COMPONENT, `Found ${stalledJobs.length} stalled jobs, recovering...`);

    // Mark all stalled jobs as FAILED
    const result = await prisma.job.updateMany({
      where: {
        id: { in: stalledJobs.map((j) => j.id) },
      },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Worker crashed or restarted - job was stalled',
      },
    });

    logger.info(COMPONENT, `Recovered ${result.count} stalled jobs`, {
      jobIds: stalledJobs.map((j) => j.id),
      jobTypes: [...new Set(stalledJobs.map((j) => j.type))],
    });
  } catch (error) {
    logger.error(COMPONENT, 'Failed to recover stalled jobs', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - worker should continue starting
  }
}

// =============================================================================
// T053: Stats Monitoring
// =============================================================================

/**
 * Logs queue metrics every 60 seconds
 * Implements T053: Worker stats monitoring
 */
async function logQueueStats(): Promise<void> {
  try {
    const health = await getQueuesHealth();

    for (const [queueName, stats] of Object.entries(health)) {
      logger.info(COMPONENT, `Queue stats: ${queueName}`, {
        waiting: stats.waiting,
        active: stats.active,
        completed: stats.completed,
        failed: stats.failed,
        delayed: stats.delayed,
        paused: stats.paused,
      });
    }

    // Log total summary
    const totals = Object.values(health).reduce(
      (acc, stats) => ({
        waiting: acc.waiting + stats.waiting,
        active: acc.active + stats.active,
        completed: acc.completed + stats.completed,
        failed: acc.failed + stats.failed,
      }),
      { waiting: 0, active: 0, completed: 0, failed: 0 }
    );

    logger.info(COMPONENT, 'Queue stats summary', totals);
  } catch (error) {
    logger.error(COMPONENT, 'Failed to log queue stats', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Starts the stats monitoring interval
 */
function startStatsMonitoring(): void {
  statsInterval = setInterval(() => {
    logQueueStats().catch((err) => {
      logger.error(COMPONENT, 'Stats monitoring error', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }, STATS_INTERVAL_MS);

  logger.info(COMPONENT, `Stats monitoring started (interval: ${STATS_INTERVAL_MS / 1000}s)`);
}

/**
 * Stops the stats monitoring interval
 */
function stopStatsMonitoring(): void {
  if (statsInterval) {
    clearInterval(statsInterval);
    statsInterval = null;
    logger.info(COMPONENT, 'Stats monitoring stopped');
  }
}

// =============================================================================
// Queue Routers
// =============================================================================

/**
 * Content generation queue router
 * Routes jobs to the appropriate processor based on job type
 * T046: Handles GENERATE_CONTENT, GENERATE_IMAGE, PUBLISH_CONTENT
 *
 * Processor concurrency/lockDuration recommendations:
 * - content-generator: concurrency 10, lockDuration 5min (CPU/API intensive)
 * - image-generator: concurrency 5, lockDuration 3min (API intensive)
 * - content-publisher: concurrency 30, lockDuration 2min (I/O bound)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function contentGenerationRouter(job: any): Promise<unknown> {
  const jobType = job.data?.type || job.data?.jobType;

  switch (jobType) {
    case JobType.GENERATE_CONTENT:
      return contentGenerationProcessor(job);
    case JobType.GENERATE_IMAGE:
      return imageGeneratorProcessor(job);
    case JobType.PUBLISH_CONTENT:
      return contentPublisherProcessor(job);
    default:
      logger.warn(COMPONENT, `Unknown content generation job type: ${jobType}`);
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

/**
 * Context scraping queue router
 * Routes jobs to the appropriate processor based on job type
 * T046: Handles SCRAPE_WEBSITE, SYNC_RSS, PROCESS_DOCUMENT
 *
 * Processor concurrency/lockDuration recommendations:
 * - context-scraper: concurrency 30, lockDuration 2min (I/O bound)
 * - rss-syncer: concurrency 30, lockDuration 2min (I/O bound)
 * - document-processor: concurrency 10, lockDuration 5min (CPU intensive)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function contextScrapingRouter(job: any): Promise<unknown> {
  const jobType = job.data?.type || job.data?.jobType;

  switch (jobType) {
    case JobType.SCRAPE_WEBSITE:
      return contextScraperProcessor(job);
    case JobType.SYNC_RSS:
      return rssSyncerProcessor(job);
    case JobType.PROCESS_DOCUMENT:
      return documentProcessor(job);
    default:
      logger.warn(COMPONENT, `Unknown context scraping job type: ${jobType}`);
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

/**
 * Analytics sync queue router
 * Routes jobs to the appropriate processor based on job type
 * T046: Handles SYNC_ANALYTICS, REFRESH_TOKEN
 *
 * Processor concurrency/lockDuration recommendations:
 * - analytics-collector: concurrency 60, lockDuration 3min (API calls with wait)
 * - token-refresher: concurrency 20, lockDuration 2min (OAuth refresh)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function analyticsSyncRouter(job: any): Promise<unknown> {
  const jobType = job.data?.type || job.data?.jobType;

  switch (jobType) {
    case JobType.SYNC_ANALYTICS:
      return analyticsCollectorProcessor(job);
    case JobType.REFRESH_TOKEN:
      return tokenRefresherProcessor(job);
    default:
      logger.warn(COMPONENT, `Unknown analytics sync job type: ${jobType}`);
      throw new Error(`Unknown job type: ${jobType}`);
  }
}

// =============================================================================
// Worker Factory
// =============================================================================

/**
 * Creates a BullMQ worker for a specific queue
 *
 * @param queueName - The queue to process
 * @param processor - The processor function (can be from createProcessor or a simple handler)
 */
function createWorker(
  queueName: QueueName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processor: (job: any) => Promise<unknown>
): Worker {
  const workerOptions = getWorkerOptions(queueName);

  // Create a dedicated Redis connection for this worker
  const connection = createRedisConnection();

  const worker = new Worker(
    queueName,
    processor,
    {
      connection,
      ...workerOptions,
    }
  );

  // Worker event handlers
  worker.on('ready', () => {
    logger.info(COMPONENT, `Worker ready for queue: ${queueName}`, {
      concurrency: workerOptions.concurrency,
    });
  });

  worker.on('active', (job) => {
    logger.debug(COMPONENT, `Job active: ${job.id}`, {
      queue: queueName,
      jobName: job.name,
    });
  });

  worker.on('completed', (job) => {
    logger.debug(COMPONENT, `Job completed: ${job.id}`, {
      queue: queueName,
    });
    // T050: Record job completion for health endpoint
    recordJobProcessed();
  });

  worker.on('failed', (job, err) => {
    logger.error(COMPONENT, `Job failed: ${job?.id}`, {
      queue: queueName,
      error: err.message,
    });
  });

  worker.on('stalled', (jobId) => {
    logger.warn(COMPONENT, `Job stalled: ${jobId}`, {
      queue: queueName,
    });
  });

  worker.on('error', (err) => {
    logger.error(COMPONENT, `Worker error on queue ${queueName}`, {
      error: err.message,
    });
  });

  return worker;
}

// =============================================================================
// Graceful Shutdown
// =============================================================================

/**
 * Performs graceful shutdown of all workers
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(COMPONENT, 'Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  isShuttingDown = true;
  logger.info(COMPONENT, `Received ${signal}, initiating graceful shutdown...`);

  // Create a timeout promise
  const timeoutPromise = new Promise<void>((_, reject) => {
    setTimeout(() => {
      reject(new Error('Shutdown timeout exceeded'));
    }, SHUTDOWN_TIMEOUT_MS);
  });

  try {
    // Race between graceful shutdown and timeout
    await Promise.race([
      shutdownWorkers(),
      timeoutPromise,
    ]);

    logger.info(COMPONENT, 'Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(COMPONENT, 'Shutdown error or timeout', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

/**
 * Closes all workers and connections
 */
async function shutdownWorkers(): Promise<void> {
  // T053: Stop stats monitoring
  stopStatsMonitoring();

  // Close all workers (waits for active jobs to complete)
  const closePromises = workers.map(async (worker) => {
    try {
      await worker.close();
      logger.info(COMPONENT, `Worker closed: ${worker.name}`);
    } catch (error) {
      logger.error(COMPONENT, `Error closing worker: ${worker.name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  await Promise.all(closePromises);

  // Close Redis connection
  await closeRedisConnection();
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  logger.info(COMPONENT, 'Starting Epic AI Background Worker...');

  try {
    // Connect to Redis
    await redis.connect();
    logger.info(COMPONENT, 'Connected to Redis');

    // T049: Recover stalled jobs from previous worker crash
    await recoverStalledJobs();

    // T050: Start health check HTTP server
    startHealthServer();

    // Create workers for each queue
    // T046: All workers use routers to handle multiple job types per queue
    const contentWorker = createWorker(
      QueueName.CONTENT_GENERATION,
      contentGenerationRouter
    );
    workers.push(contentWorker);

    const scrapingWorker = createWorker(
      QueueName.CONTEXT_SCRAPING,
      contextScrapingRouter
    );
    workers.push(scrapingWorker);

    const analyticsWorker = createWorker(
      QueueName.ANALYTICS_SYNC,
      analyticsSyncRouter
    );
    workers.push(analyticsWorker);

    logger.info(COMPONENT, 'All workers initialized', {
      queues: [
        QueueName.CONTENT_GENERATION,
        QueueName.CONTEXT_SCRAPING,
        QueueName.ANALYTICS_SYNC,
      ],
    });

    // T053: Start stats monitoring (logs queue metrics every 60s)
    startStatsMonitoring();

    // Register shutdown handlers
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error(COMPONENT, 'Uncaught exception', { error: error.message });
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error(COMPONENT, 'Unhandled rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });

    logger.info(COMPONENT, 'Worker process running. Waiting for jobs...');

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error(COMPONENT, 'Failed to start worker', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run main
main().catch((err) => {
  console.error('[Worker] Fatal error:', err);
  process.exit(1);
});

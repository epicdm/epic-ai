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
import { redis, closeRedisConnection, createRedisConnection } from './lib';
import { QueueName } from './types/payloads';
import { getWorkerOptions } from './queues/options';
import { logger } from './lib/logger';
import type { JobData } from './processors/base';
import { contentGenerationProcessor } from './processors';

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

// =============================================================================
// Placeholder Processors (to be replaced with actual implementations)
// =============================================================================

/**
 * Placeholder processor for context scraping queue
 * Replace with actual processors in Phase 4
 */
async function contextScrapingProcessor(job: { data: JobData }): Promise<unknown> {
  logger.info(COMPONENT, `Processing context scraping job: ${job.data.prismaJobId}`);
  // Placeholder - actual implementation in US-002
  return { status: 'processed', jobId: job.data.prismaJobId };
}

/**
 * Placeholder processor for analytics sync queue
 * Replace with actual processors in Phase 5
 */
async function analyticsSyncProcessor(job: { data: JobData }): Promise<unknown> {
  logger.info(COMPONENT, `Processing analytics sync job: ${job.data.prismaJobId}`);
  // Placeholder - actual implementation in US-005
  return { status: 'processed', jobId: job.data.prismaJobId };
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

    // Create workers for each queue
    const contentWorker = createWorker(
      QueueName.CONTENT_GENERATION,
      contentGenerationProcessor
    );
    workers.push(contentWorker);

    const scrapingWorker = createWorker(
      QueueName.CONTEXT_SCRAPING,
      contextScrapingProcessor
    );
    workers.push(scrapingWorker);

    const analyticsWorker = createWorker(
      QueueName.ANALYTICS_SYNC,
      analyticsSyncProcessor
    );
    workers.push(analyticsWorker);

    logger.info(COMPONENT, 'All workers initialized', {
      queues: [
        QueueName.CONTENT_GENERATION,
        QueueName.CONTEXT_SCRAPING,
        QueueName.ANALYTICS_SYNC,
      ],
    });

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

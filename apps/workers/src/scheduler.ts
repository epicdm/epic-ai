/**
 * Epic AI Background Job Scheduler
 *
 * Cron-based job scheduler that runs as a separate process from the worker.
 * Schedules recurring jobs for context scraping, RSS syncing, and analytics.
 *
 * Implements:
 * - T030: Scheduler service with cron job registration
 * - T031: Deterministic jobId generation for deduplication
 * - T032: Duplicate job detection before enqueuing
 * - T033: Default schedules (scraping 6h, analytics 1h)
 * - T034: Graceful shutdown handling
 * - T035: Health check logging
 *
 * @module scheduler
 */

import dotenv from 'dotenv';
import cron, { ScheduledTask } from 'node-cron';
import { prisma } from '@epic-ai/database';
import { redis, closeRedisConnection } from './lib';
import { addJob, closeAllQueues, getQueuesHealth } from './queues';
import { JobType } from './types/payloads';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

const COMPONENT = 'scheduler';

// =============================================================================
// Types
// =============================================================================

interface ScheduleConfig {
  id: string;
  name: string;
  cronExpression: string;
  jobType: JobType;
  enabled: boolean;
  description: string;
}

interface ScheduledJobInfo {
  scheduleId: string;
  jobType: JobType;
  nextRun: Date | null;
  lastRun: Date | null;
  isRunning: boolean;
}

// =============================================================================
// State
// =============================================================================

/**
 * Active cron tasks for graceful shutdown
 */
const activeTasks: Map<string, ScheduledTask> = new Map();

/**
 * Track last run times for each schedule
 */
const lastRunTimes: Map<string, Date> = new Map();

/**
 * Shutdown in progress flag
 */
let isShuttingDown = false;

// =============================================================================
// Default Schedules (T033)
// =============================================================================

/**
 * Default schedule configurations
 *
 * Schedule formats:
 * - Context scraping: Every 6 hours at :00
 * - RSS sync: Every 6 hours at :30
 * - Analytics sync: Every hour at :15
 * - Token refresh: Every 12 hours at :45
 */
const DEFAULT_SCHEDULES: ScheduleConfig[] = [
  {
    id: 'context-scraping',
    name: 'Context Source Scraping',
    cronExpression: '0 */6 * * *', // Every 6 hours at :00
    jobType: JobType.SCRAPE_WEBSITE,
    enabled: true,
    description: 'Scrape active website context sources',
  },
  {
    id: 'rss-sync',
    name: 'RSS Feed Sync',
    cronExpression: '30 */6 * * *', // Every 6 hours at :30
    jobType: JobType.SYNC_RSS,
    enabled: true,
    description: 'Sync active RSS feed sources',
  },
  {
    id: 'analytics-sync',
    name: 'Analytics Sync',
    cronExpression: '15 * * * *', // Every hour at :15
    jobType: JobType.SYNC_ANALYTICS,
    enabled: true,
    description: 'Sync social media analytics',
  },
  {
    id: 'token-refresh',
    name: 'OAuth Token Refresh',
    cronExpression: '45 */12 * * *', // Every 12 hours at :45
    jobType: JobType.REFRESH_TOKEN,
    enabled: true,
    description: 'Refresh expiring OAuth tokens',
  },
];

// =============================================================================
// Deterministic Job ID Generation (T031)
// =============================================================================

/**
 * Generates a deterministic job ID for deduplication
 *
 * Format: ${jobType}-${scheduleId}-${entityId}-${timestamp}
 *
 * The timestamp is rounded to the schedule interval to prevent
 * duplicate jobs within the same scheduled window.
 *
 * @param jobType - The type of job
 * @param scheduleId - The schedule identifier
 * @param entityId - The entity being processed (e.g., contextSourceId, socialAccountId)
 * @param intervalMs - The schedule interval in milliseconds
 * @returns Deterministic job ID
 */
function generateDeterministicJobId(
  jobType: JobType,
  scheduleId: string,
  entityId: string,
  intervalMs: number
): string {
  // Round timestamp to interval to ensure same ID within a schedule window
  const roundedTimestamp = Math.floor(Date.now() / intervalMs) * intervalMs;
  return `${jobType}-${scheduleId}-${entityId}-${roundedTimestamp}`;
}

/**
 * Gets the interval in milliseconds for a cron expression
 */
function getIntervalFromCron(cronExpression: string): number {
  // Parse common patterns
  if (cronExpression.includes('*/6 * * *')) {
    return 6 * 60 * 60 * 1000; // 6 hours
  }
  if (cronExpression.includes('*/12 * * *')) {
    return 12 * 60 * 60 * 1000; // 12 hours
  }
  if (cronExpression.match(/^\d+ \* \* \* \*$/)) {
    return 60 * 60 * 1000; // 1 hour
  }
  // Default to 1 hour
  return 60 * 60 * 1000;
}

// =============================================================================
// Duplicate Detection (T032)
// =============================================================================

/**
 * Checks if a job with the given ID already exists in the queue
 *
 * @param jobId - The job ID to check
 * @param _jobType - The type of job (unused, kept for future use)
 * @returns True if job exists (duplicate)
 */
async function isJobDuplicate(jobId: string, _jobType: JobType): Promise<boolean> {
  try {
    // Check if job exists in Prisma (PENDING or RUNNING)
    const existingJob = await prisma.job.findFirst({
      where: {
        id: jobId,
        status: {
          in: ['PENDING', 'RUNNING'],
        },
      },
    });

    if (existingJob) {
      logger.debug(COMPONENT, `Duplicate job detected in database: ${jobId}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error(COMPONENT, 'Error checking for duplicate job', {
      jobId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // On error, allow the job to proceed (fail open)
    return false;
  }
}

// =============================================================================
// Job Scheduling Functions
// =============================================================================

/**
 * Schedules context source scraping jobs
 */
async function scheduleContextScraping(scheduleId: string): Promise<number> {
  const intervalMs = getIntervalFromCron(
    DEFAULT_SCHEDULES.find((s) => s.id === scheduleId)?.cronExpression || '0 */6 * * *'
  );

  // Get active website context sources
  const sources = await prisma.contextSource.findMany({
    where: {
      type: 'WEBSITE',
      status: {
        in: ['ACTIVE', 'PENDING'],
      },
    },
    select: {
      id: true,
      brandId: true,
      config: true,
    },
  });

  let scheduledCount = 0;

  for (const source of sources) {
    const config = (source.config as Record<string, unknown>) || {};
    const url = config.url as string;

    if (!url) {
      logger.warn(COMPONENT, `Skipping source ${source.id}: no URL configured`);
      continue;
    }

    const jobId = generateDeterministicJobId(
      JobType.SCRAPE_WEBSITE,
      scheduleId,
      source.id,
      intervalMs
    );

    if (await isJobDuplicate(jobId, JobType.SCRAPE_WEBSITE)) {
      continue;
    }

    try {
      // Create Prisma job record
      await prisma.job.create({
        data: {
          id: jobId,
          type: JobType.SCRAPE_WEBSITE,
          status: 'PENDING',
          payload: {
            contextSourceId: source.id,
            brandId: source.brandId,
            url,
            sourceType: 'WEBSITE',
          },
          brandId: source.brandId,
        },
      });

      // Add to BullMQ queue
      await addJob(JobType.SCRAPE_WEBSITE, jobId, {
        contextSourceId: source.id,
        brandId: source.brandId,
        url,
        sourceType: 'WEBSITE',
      });

      scheduledCount++;
      logger.debug(COMPONENT, `Scheduled scraping job for source ${source.id}`);
    } catch (error) {
      logger.error(COMPONENT, `Failed to schedule scraping job for source ${source.id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return scheduledCount;
}

/**
 * Schedules RSS feed sync jobs
 */
async function scheduleRSSSync(scheduleId: string): Promise<number> {
  const intervalMs = getIntervalFromCron(
    DEFAULT_SCHEDULES.find((s) => s.id === scheduleId)?.cronExpression || '30 */6 * * *'
  );

  // Get active RSS feed sources
  const sources = await prisma.contextSource.findMany({
    where: {
      type: 'RSS_FEED',
      status: {
        in: ['ACTIVE', 'PENDING'],
      },
    },
    select: {
      id: true,
      brandId: true,
      config: true,
    },
  });

  let scheduledCount = 0;

  for (const source of sources) {
    const config = (source.config as Record<string, unknown>) || {};
    const feedUrl = (config.feedUrl as string) || (config.url as string);

    if (!feedUrl) {
      logger.warn(COMPONENT, `Skipping RSS source ${source.id}: no feedUrl configured`);
      continue;
    }

    const jobId = generateDeterministicJobId(JobType.SYNC_RSS, scheduleId, source.id, intervalMs);

    if (await isJobDuplicate(jobId, JobType.SYNC_RSS)) {
      continue;
    }

    try {
      await prisma.job.create({
        data: {
          id: jobId,
          type: JobType.SYNC_RSS,
          status: 'PENDING',
          payload: {
            contextSourceId: source.id,
            brandId: source.brandId,
            url: feedUrl,
            sourceType: 'RSS',
          },
          brandId: source.brandId,
        },
      });

      await addJob(JobType.SYNC_RSS, jobId, {
        contextSourceId: source.id,
        brandId: source.brandId,
        url: feedUrl,
        sourceType: 'RSS',
      });

      scheduledCount++;
      logger.debug(COMPONENT, `Scheduled RSS sync job for source ${source.id}`);
    } catch (error) {
      logger.error(COMPONENT, `Failed to schedule RSS sync job for source ${source.id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return scheduledCount;
}

/**
 * Schedules analytics sync jobs
 */
async function scheduleAnalyticsSync(scheduleId: string): Promise<number> {
  const intervalMs = getIntervalFromCron(
    DEFAULT_SCHEDULES.find((s) => s.id === scheduleId)?.cronExpression || '15 * * * *'
  );

  // Get active social accounts
  const accounts = await prisma.socialAccount.findMany({
    where: {
      status: 'CONNECTED',
    },
    select: {
      id: true,
      brandId: true,
      platform: true,
    },
  });

  let scheduledCount = 0;

  for (const account of accounts) {
    const jobId = generateDeterministicJobId(
      JobType.SYNC_ANALYTICS,
      scheduleId,
      account.id,
      intervalMs
    );

    if (await isJobDuplicate(jobId, JobType.SYNC_ANALYTICS)) {
      continue;
    }

    try {
      await prisma.job.create({
        data: {
          id: jobId,
          type: JobType.SYNC_ANALYTICS,
          status: 'PENDING',
          payload: {
            socialAccountId: account.id,
            organizationId: account.brandId, // Using brandId as organizationId
            platform: account.platform,
            syncType: 'INCREMENTAL',
          },
        },
      });

      await addJob(JobType.SYNC_ANALYTICS, jobId, {
        socialAccountId: account.id,
        organizationId: account.brandId, // Using brandId as organizationId
        platform: account.platform,
        syncType: 'INCREMENTAL',
      });

      scheduledCount++;
      logger.debug(COMPONENT, `Scheduled analytics sync for account ${account.id}`);
    } catch (error) {
      logger.error(COMPONENT, `Failed to schedule analytics sync for account ${account.id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return scheduledCount;
}

/**
 * Schedules OAuth token refresh jobs
 */
async function scheduleTokenRefresh(scheduleId: string): Promise<number> {
  const intervalMs = getIntervalFromCron(
    DEFAULT_SCHEDULES.find((s) => s.id === scheduleId)?.cronExpression || '45 */12 * * *'
  );

  // Get social accounts with tokens expiring in the next 24 hours
  const expirationThreshold = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const accounts = await prisma.socialAccount.findMany({
    where: {
      status: 'CONNECTED',
      tokenExpires: {
        lte: expirationThreshold,
      },
    },
    select: {
      id: true,
      brandId: true,
      platform: true,
    },
  });

  let scheduledCount = 0;

  for (const account of accounts) {
    const jobId = generateDeterministicJobId(
      JobType.REFRESH_TOKEN,
      scheduleId,
      account.id,
      intervalMs
    );

    if (await isJobDuplicate(jobId, JobType.REFRESH_TOKEN)) {
      continue;
    }

    try {
      await prisma.job.create({
        data: {
          id: jobId,
          type: JobType.REFRESH_TOKEN,
          status: 'PENDING',
          payload: {
            socialAccountId: account.id,
            platform: account.platform,
            organizationId: account.brandId, // Using brandId as organizationId
          },
        },
      });

      await addJob(JobType.REFRESH_TOKEN, jobId, {
        socialAccountId: account.id,
        platform: account.platform,
        organizationId: account.brandId, // Using brandId as organizationId
      });

      scheduledCount++;
      logger.debug(COMPONENT, `Scheduled token refresh for account ${account.id}`);
    } catch (error) {
      logger.error(COMPONENT, `Failed to schedule token refresh for account ${account.id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return scheduledCount;
}

// =============================================================================
// Schedule Registration (T030, T033)
// =============================================================================

/**
 * Registers a cron schedule
 */
function registerSchedule(config: ScheduleConfig): void {
  if (!config.enabled) {
    logger.info(COMPONENT, `Schedule ${config.id} is disabled, skipping`);
    return;
  }

  if (!cron.validate(config.cronExpression)) {
    logger.error(COMPONENT, `Invalid cron expression for ${config.id}: ${config.cronExpression}`);
    return;
  }

  const task = cron.schedule(
    config.cronExpression,
    async () => {
      if (isShuttingDown) {
        logger.info(COMPONENT, `Skipping ${config.id} - shutdown in progress`);
        return;
      }

      const startTime = Date.now();
      logger.info(COMPONENT, `Running scheduled task: ${config.name}`);

      try {
        let scheduledCount = 0;

        switch (config.jobType) {
          case JobType.SCRAPE_WEBSITE:
            scheduledCount = await scheduleContextScraping(config.id);
            break;
          case JobType.SYNC_RSS:
            scheduledCount = await scheduleRSSSync(config.id);
            break;
          case JobType.SYNC_ANALYTICS:
            scheduledCount = await scheduleAnalyticsSync(config.id);
            break;
          case JobType.REFRESH_TOKEN:
            scheduledCount = await scheduleTokenRefresh(config.id);
            break;
          default:
            logger.warn(COMPONENT, `Unknown job type for schedule ${config.id}: ${config.jobType}`);
        }

        lastRunTimes.set(config.id, new Date());

        logger.info(COMPONENT, `Scheduled task completed: ${config.name}`, {
          scheduledJobs: scheduledCount,
          durationMs: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(COMPONENT, `Scheduled task failed: ${config.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          durationMs: Date.now() - startTime,
        });
      }
    },
    {
      timezone: 'UTC',
    }
  );

  activeTasks.set(config.id, task);
  logger.info(COMPONENT, `Registered schedule: ${config.name}`, {
    id: config.id,
    cron: config.cronExpression,
    jobType: config.jobType,
  });
}

/**
 * Registers all default schedules
 */
function registerDefaultSchedules(): void {
  logger.info(COMPONENT, 'Registering default schedules...');

  for (const schedule of DEFAULT_SCHEDULES) {
    registerSchedule(schedule);
  }

  logger.info(COMPONENT, `Registered ${activeTasks.size} schedules`);
}

// =============================================================================
// Health Check Logging (T035)
// =============================================================================

/**
 * Gets the next run time for a cron expression
 */
function getNextRunTime(cronExpression: string): Date | null {
  try {
    // Simple calculation based on cron expression
    const now = new Date();
    const parts = cronExpression.split(' ');

    if (parts.length !== 5) return null;

    const [minute, hour] = parts;

    const next = new Date(now);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Handle minute
    if (minute !== '*' && !minute.includes('/')) {
      next.setMinutes(parseInt(minute, 10));
    } else if (minute.includes('/')) {
      const interval = parseInt(minute.split('/')[1], 10);
      const currentMinute = now.getMinutes();
      const nextMinute = Math.ceil(currentMinute / interval) * interval;
      next.setMinutes(nextMinute >= 60 ? 0 : nextMinute);
      if (nextMinute >= 60) next.setHours(next.getHours() + 1);
    }

    // Handle hour
    if (hour !== '*' && !hour.includes('/')) {
      next.setHours(parseInt(hour, 10));
    } else if (hour.includes('/')) {
      const interval = parseInt(hour.split('/')[1], 10);
      const currentHour = now.getHours();
      const nextHour = Math.ceil(currentHour / interval) * interval;
      next.setHours(nextHour >= 24 ? 0 : nextHour);
      if (nextHour >= 24) next.setDate(next.getDate() + 1);
    }

    // If the calculated time is in the past, add the appropriate interval
    if (next <= now) {
      if (hour.includes('/')) {
        const interval = parseInt(hour.split('/')[1], 10);
        next.setHours(next.getHours() + interval);
      } else if (minute.includes('/')) {
        const interval = parseInt(minute.split('/')[1], 10);
        next.setMinutes(next.getMinutes() + interval);
      } else {
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  } catch {
    return null;
  }
}

/**
 * Logs scheduler health information
 */
async function logHealthCheck(): Promise<void> {
  logger.info(COMPONENT, '=== Scheduler Health Check ===');

  // Log active schedules with next run times
  const scheduleInfo: ScheduledJobInfo[] = [];

  for (const schedule of DEFAULT_SCHEDULES) {
    if (!schedule.enabled) continue;

    const nextRun = getNextRunTime(schedule.cronExpression);
    const lastRun = lastRunTimes.get(schedule.id) || null;

    scheduleInfo.push({
      scheduleId: schedule.id,
      jobType: schedule.jobType,
      nextRun,
      lastRun,
      isRunning: activeTasks.has(schedule.id),
    });

    logger.info(COMPONENT, `Schedule: ${schedule.name}`, {
      id: schedule.id,
      cron: schedule.cronExpression,
      nextRun: nextRun?.toISOString() || 'unknown',
      lastRun: lastRun?.toISOString() || 'never',
    });
  }

  // Log queue health
  try {
    const queueHealth = await getQueuesHealth();

    for (const [queueName, health] of Object.entries(queueHealth)) {
      logger.info(COMPONENT, `Queue: ${queueName}`, {
        waiting: health.waiting,
        active: health.active,
        completed: health.completed,
        failed: health.failed,
        delayed: health.delayed,
        paused: health.paused,
      });
    }
  } catch (error) {
    logger.error(COMPONENT, 'Failed to get queue health', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  logger.info(COMPONENT, '=== End Health Check ===');
}

/**
 * Starts hourly health check logging
 */
function startHealthCheckLogging(): void {
  // Log immediately on startup
  logHealthCheck();

  // Then log every hour
  const healthCheckTask = cron.schedule(
    '0 * * * *', // Every hour at :00
    () => {
      if (!isShuttingDown) {
        logHealthCheck();
      }
    },
    {
      timezone: 'UTC',
    }
  );

  activeTasks.set('health-check', healthCheckTask);
  logger.info(COMPONENT, 'Started hourly health check logging');
}

// =============================================================================
// Graceful Shutdown (T034)
// =============================================================================

/**
 * Stops all cron tasks gracefully
 */
async function stopAllTasks(): Promise<void> {
  logger.info(COMPONENT, `Stopping ${activeTasks.size} scheduled tasks...`);

  for (const [id, task] of activeTasks) {
    try {
      task.stop();
      logger.debug(COMPONENT, `Stopped task: ${id}`);
    } catch (error) {
      logger.error(COMPONENT, `Error stopping task ${id}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  activeTasks.clear();
  logger.info(COMPONENT, 'All scheduled tasks stopped');
}

/**
 * Performs graceful shutdown
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn(COMPONENT, 'Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  isShuttingDown = true;
  logger.info(COMPONENT, `Received ${signal}, initiating graceful shutdown...`);

  try {
    // Stop all cron tasks
    await stopAllTasks();

    // Close queues
    await closeAllQueues();
    logger.info(COMPONENT, 'All queues closed');

    // Close Redis connection
    await closeRedisConnection();
    logger.info(COMPONENT, 'Redis connection closed');

    // Disconnect Prisma
    await prisma.$disconnect();
    logger.info(COMPONENT, 'Prisma disconnected');

    logger.info(COMPONENT, 'Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error(COMPONENT, 'Shutdown error', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  logger.info(COMPONENT, 'Starting Epic AI Job Scheduler...');

  try {
    // Connect to Redis (only if not already connecting/connected)
    if (redis.status === 'wait') {
      await redis.connect();
    }
    logger.info(COMPONENT, 'Connected to Redis');

    // Register default schedules
    registerDefaultSchedules();

    // Start health check logging
    startHealthCheckLogging();

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

    logger.info(COMPONENT, 'Scheduler running. Waiting for scheduled tasks...');

    // Keep process alive
    process.stdin.resume();
  } catch (error) {
    logger.error(COMPONENT, 'Failed to start scheduler', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Run main
main().catch((err) => {
  console.error('[Scheduler] Fatal error:', err);
  process.exit(1);
});

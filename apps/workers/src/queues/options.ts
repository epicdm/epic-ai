/**
 * BullMQ Job Options and Retry Strategy
 *
 * This module defines default job options and retry strategies
 * for all background job queues.
 *
 * Based on research.md Decision 4 (Retry Strategy)
 *
 * @module queues/options
 */

import type { JobsOptions } from 'bullmq';
import { JobType, JobPriority, QueueName, JobTypeToQueue } from '../types/payloads';

/**
 * Retry delays in milliseconds
 * Attempts: 1 min, 5 min, 15 min
 */
const RETRY_DELAYS_MS = [
  60_000, // 1 minute
  300_000, // 5 minutes
  900_000, // 15 minutes
];

/**
 * Custom backoff function for exponential retry delays
 *
 * @param attemptsMade - Number of attempts already made (1-based)
 * @returns Delay in milliseconds before next retry
 */
function customBackoff(attemptsMade: number): number {
  // attemptsMade is 1-based (1 = first retry after initial failure)
  const index = Math.min(attemptsMade - 1, RETRY_DELAYS_MS.length - 1);
  return RETRY_DELAYS_MS[index] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]!;
}

/**
 * Default job options applied to all queues
 *
 * Configuration:
 * - 3 retry attempts with custom exponential backoff
 * - Keep last 1000 completed jobs
 * - Keep last 5000 failed jobs for debugging
 */
export const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'custom',
  },
  removeOnComplete: {
    count: 1000, // Keep last 1000 completed jobs
  },
  removeOnFail: {
    count: 5000, // Keep last 5000 failed jobs for debugging
  },
};

/**
 * Lock durations per queue (milliseconds)
 * Based on research.md Decision 5
 */
export const lockDurations: Record<QueueName, number> = {
  [QueueName.CONTENT_GENERATION]: 300_000, // 5 minutes
  [QueueName.CONTEXT_SCRAPING]: 120_000, // 2 minutes
  [QueueName.ANALYTICS_SYNC]: 180_000, // 3 minutes
};

/**
 * Stall check intervals per queue (milliseconds)
 */
export const stalledIntervals: Record<QueueName, number> = {
  [QueueName.CONTENT_GENERATION]: 30_000, // 30 seconds
  [QueueName.CONTEXT_SCRAPING]: 15_000, // 15 seconds
  [QueueName.ANALYTICS_SYNC]: 20_000, // 20 seconds
};

/**
 * Concurrency limits per queue
 * Based on research.md Decision 6
 */
export const concurrencyLimits: Record<QueueName, number> = {
  [QueueName.CONTENT_GENERATION]: 10, // CPU/API intensive
  [QueueName.CONTEXT_SCRAPING]: 30, // I/O bound
  [QueueName.ANALYTICS_SYNC]: 60, // API calls with wait time
};

/**
 * Priority values for job priority levels
 */
export const priorityValues: Record<keyof typeof JobPriority, number> = {
  HIGH: JobPriority.HIGH, // 1
  NORMAL: JobPriority.NORMAL, // 5
  LOW: JobPriority.LOW, // 10
};

/**
 * Gets job options for a specific job type
 * Includes type-specific priority and timing settings
 *
 * @param jobType - The type of job
 * @returns Job options configured for this job type
 */
export function getJobOptionsForType(jobType: JobType): JobsOptions {
  const queueName = JobTypeToQueue[jobType];

  return {
    ...defaultJobOptions,
    priority: getDefaultPriorityForType(jobType),
  };
}

/**
 * Gets the default priority for a job type
 *
 * @param jobType - The type of job
 * @returns Priority value (lower = higher priority)
 */
export function getDefaultPriorityForType(jobType: JobType): number {
  switch (jobType) {
    // High priority - user-initiated
    case JobType.GENERATE_CONTENT:
    case JobType.GENERATE_IMAGE:
    case JobType.PUBLISH_CONTENT:
      return JobPriority.NORMAL; // Use NORMAL as default, HIGH for manual retries

    // Normal priority - scheduled
    case JobType.SCRAPE_WEBSITE:
    case JobType.SYNC_RSS:
    case JobType.SYNC_ANALYTICS:
    case JobType.REFRESH_TOKEN:
      return JobPriority.NORMAL;

    // Low priority - background
    case JobType.PROCESS_DOCUMENT:
      return JobPriority.LOW;

    default:
      return JobPriority.NORMAL;
  }
}

/**
 * Gets worker options for a queue
 *
 * @param queueName - The queue name
 * @returns Worker configuration options
 */
export function getWorkerOptions(queueName: QueueName) {
  return {
    concurrency: concurrencyLimits[queueName],
    lockDuration: lockDurations[queueName],
    stalledInterval: stalledIntervals[queueName],
    settings: {
      backoffStrategy: customBackoff,
    },
  };
}

/**
 * Calculates the next retry delay for a failed job
 *
 * @param attemptsMade - Number of attempts made so far
 * @returns Delay in milliseconds, or undefined if no more retries
 */
export function getNextRetryDelay(attemptsMade: number): number | undefined {
  if (attemptsMade >= defaultJobOptions.attempts!) {
    return undefined; // No more retries
  }
  return customBackoff(attemptsMade);
}

/**
 * Constants for rate limiting
 */
export const rateLimits = {
  /**
   * Maximum concurrent jobs per organization
   * Based on research.md Decision 10
   */
  MAX_CONCURRENT_JOBS_PER_ORG: 50,

  /**
   * Maximum jobs that can be queued per organization
   */
  MAX_QUEUED_JOBS_PER_ORG: 200,
};

/**
 * BullMQ Queue Definitions
 *
 * This module defines the BullMQ queues for background job processing.
 * Each queue handles a category of related job types.
 *
 * @module queues/index
 */

import { Queue } from 'bullmq';
import { redis } from '../lib/redis';
import { QueueName, JobType, JobTypeToQueue } from '../types/payloads';
import { defaultJobOptions, getJobOptionsForType } from './options';

/**
 * Content Generation Queue
 *
 * Handles: GENERATE_CONTENT, GENERATE_IMAGE, PUBLISH_CONTENT
 * Concurrency: 10 (CPU/API intensive)
 * Lock Duration: 5 minutes
 */
export const contentGenerationQueue = new Queue(QueueName.CONTENT_GENERATION, {
  connection: redis,
  defaultJobOptions,
});

/**
 * Context Scraping Queue
 *
 * Handles: SCRAPE_WEBSITE, SYNC_RSS, PROCESS_DOCUMENT
 * Concurrency: 30 (I/O bound)
 * Lock Duration: 2 minutes
 */
export const contextScrapingQueue = new Queue(QueueName.CONTEXT_SCRAPING, {
  connection: redis,
  defaultJobOptions,
});

/**
 * Analytics Sync Queue
 *
 * Handles: SYNC_ANALYTICS, REFRESH_TOKEN
 * Concurrency: 60 (API calls with wait time)
 * Lock Duration: 3 minutes
 */
export const analyticsSyncQueue = new Queue(QueueName.ANALYTICS_SYNC, {
  connection: redis,
  defaultJobOptions,
});

/**
 * Map of all queues by name
 */
export const queues: Record<QueueName, Queue> = {
  [QueueName.CONTENT_GENERATION]: contentGenerationQueue,
  [QueueName.CONTEXT_SCRAPING]: contextScrapingQueue,
  [QueueName.ANALYTICS_SYNC]: analyticsSyncQueue,
};

/**
 * Gets the appropriate queue for a job type
 *
 * @param jobType - The type of job
 * @returns The queue that handles this job type
 */
export function getQueueForJobType(jobType: JobType): Queue {
  const queueName = JobTypeToQueue[jobType];
  return queues[queueName];
}

/**
 * Adds a job to the appropriate queue
 *
 * @param jobType - The type of job to add
 * @param jobId - The Prisma Job record ID
 * @param payload - The job payload
 * @param options - Optional job options overrides
 * @returns The created BullMQ job
 */
export async function addJob<T extends Record<string, unknown>>(
  jobType: JobType,
  jobId: string,
  payload: T,
  options?: {
    priority?: number;
    delay?: number;
  }
) {
  const queue = getQueueForJobType(jobType);
  const jobOptions = getJobOptionsForType(jobType);

  return queue.add(
    jobType,
    {
      prismaJobId: jobId,
      type: jobType,
      payload,
    },
    {
      ...jobOptions,
      jobId, // Use Prisma ID as BullMQ job ID for deduplication
      priority: options?.priority ?? jobOptions.priority,
      delay: options?.delay,
    }
  );
}

/**
 * Gracefully closes all queues
 * Call during application shutdown
 */
export async function closeAllQueues(): Promise<void> {
  await Promise.all([
    contentGenerationQueue.close(),
    contextScrapingQueue.close(),
    analyticsSyncQueue.close(),
  ]);
}

/**
 * Gets health status for all queues
 */
export async function getQueuesHealth(): Promise<
  Record<
    QueueName,
    {
      name: string;
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
      paused: boolean;
    }
  >
> {
  const results: Record<QueueName, Awaited<ReturnType<typeof getQueueHealth>>> =
    {} as Record<QueueName, Awaited<ReturnType<typeof getQueueHealth>>>;

  for (const [name, queue] of Object.entries(queues) as [QueueName, Queue][]) {
    results[name] = await getQueueHealth(queue);
  }

  return results;
}

/**
 * Gets health status for a single queue
 */
async function getQueueHealth(queue: Queue) {
  const [waiting, active, completed, failed, delayed, paused] =
    await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

  return {
    name: queue.name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

export { QueueName };

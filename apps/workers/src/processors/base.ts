/**
 * Base Processor Template
 *
 * Provides a reusable pattern for processing BullMQ jobs with:
 * - Automatic Prisma status updates (RUNNING → COMPLETED/FAILED)
 * - Structured logging
 * - Error handling with retry classification
 * - Duration tracking
 *
 * Based on research.md Decision 1 (Dual-storage pattern)
 *
 * @module processors/base
 */

import type { Job } from 'bullmq';
import { prisma, type JobStatus as PrismaJobStatus, type Prisma } from '@epic-ai/database';
import {
  logJobStart,
  logJobComplete,
  logJobFailed,
  logJobRetry,
  logger,
} from '../lib/logger';
import {
  JobError,
  JobProcessingError,
  isRetryableError,
} from '../lib/errors';
import type { JobType, JobPayload, JobResult } from '../types/payloads';
import { getNextRetryDelay, defaultJobOptions } from '../queues/options';

/**
 * Job data structure as received from BullMQ
 */
export interface JobData<T extends JobPayload = JobPayload> {
  prismaJobId: string;
  type: JobType;
  brandId?: string;
  organizationId?: string;
  payload: T;
}

/**
 * Processor function signature
 * Implement this for each job type
 */
export type ProcessorFn<
  TPayload extends JobPayload = JobPayload,
  TResult extends JobResult = JobResult
> = (job: Job<JobData<TPayload>>, payload: TPayload) => Promise<TResult>;

/**
 * Creates a wrapped processor with automatic status management
 *
 * @param jobType - The job type this processor handles
 * @param processorFn - The actual processing logic
 * @returns A wrapped processor function for BullMQ
 */
export function createProcessor<
  TPayload extends JobPayload,
  TResult extends JobResult
>(
  jobType: JobType,
  processorFn: ProcessorFn<TPayload, TResult>
): (job: Job<JobData<TPayload>>) => Promise<TResult> {
  return async (job: Job<JobData<TPayload>>): Promise<TResult> => {
    const startTime = Date.now();
    const { prismaJobId, payload } = job.data;
    const attemptsMade = job.attemptsMade + 1; // BullMQ is 0-indexed
    const maxAttempts = defaultJobOptions.attempts ?? 3;

    // Log job start
    logJobStart(prismaJobId, jobType, attemptsMade, maxAttempts, {
      bullmqJobId: job.id,
      brandId: job.data.brandId,
      organizationId: job.data.organizationId,
    });

    try {
      // Update Prisma status to RUNNING
      await updateJobStatus(prismaJobId, 'RUNNING', {
        startedAt: new Date(),
        attempts: attemptsMade,
      });

      // Execute the actual processor
      const result = await processorFn(job, payload);

      // Calculate duration
      const duration = Date.now() - startTime;

      // Update Prisma status to COMPLETED
      await updateJobStatus(prismaJobId, 'COMPLETED', {
        completedAt: new Date(),
        result: result as unknown as Prisma.InputJsonValue,
      });

      // Log completion
      logJobComplete(prismaJobId, jobType, duration, {
        bullmqJobId: job.id,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Determine if error is retryable
      const isRetryable = isRetryableError(error);
      const hasMoreRetries = attemptsMade < maxAttempts;
      const willRetry = isRetryable && hasMoreRetries;

      if (willRetry) {
        // Log retry
        const nextDelay = getNextRetryDelay(attemptsMade) ?? 0;
        logJobRetry(
          prismaJobId,
          jobType,
          attemptsMade,
          maxAttempts,
          errorMessage,
          nextDelay
        );

        // Update attempts but keep PENDING status for retry
        await updateJobStatus(prismaJobId, 'PENDING', {
          attempts: attemptsMade,
          error: errorMessage,
        });
      } else {
        // Final failure - no more retries
        logJobFailed(
          prismaJobId,
          jobType,
          errorMessage,
          attemptsMade,
          maxAttempts,
          duration,
          {
            bullmqJobId: job.id,
            isRetryable,
            errorCode: error instanceof JobError ? error.code : undefined,
          }
        );

        // Update Prisma status to FAILED
        await updateJobStatus(prismaJobId, 'FAILED', {
          completedAt: new Date(),
          error: errorMessage,
          attempts: attemptsMade,
        });
      }

      // Re-throw to let BullMQ handle retry/failure
      throw error;
    }
  };
}

/**
 * Updates job status in Prisma database
 */
async function updateJobStatus(
  jobId: string,
  status: PrismaJobStatus,
  data: {
    startedAt?: Date;
    completedAt?: Date;
    result?: Prisma.InputJsonValue;
    error?: string;
    attempts?: number;
  }
): Promise<void> {
  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        result: data.result,
        error: data.error,
        attempts: data.attempts,
      },
    });
  } catch (err) {
    // Log but don't throw - job processing should continue
    logger.error('processors', `Failed to update job status for ${jobId}`, {
      status,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Helper to create a simple error result for failed jobs
 */
export function createErrorResult(error: unknown): { error: string } {
  return {
    error: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Reports job progress to BullMQ
 * Call this periodically for long-running jobs
 */
export async function reportProgress(
  job: Job<JobData>,
  progress: number,
  message?: string
): Promise<void> {
  await job.updateProgress({
    percent: Math.min(100, Math.max(0, progress)),
    message,
  });
}

/**
 * Checks if job should be cancelled
 * Call this periodically for long-running jobs
 */
export async function shouldCancel(job: Job<JobData>): Promise<boolean> {
  // Check if job was removed from queue (cancelled)
  const jobState = await job.getState();
  return jobState === 'failed' || jobState === 'completed';
}

/**
 * Creates a JobProcessingError with proper context
 */
export function createProcessingError(
  message: string,
  job: Job<JobData>,
  options?: {
    isRetryable?: boolean;
    context?: Record<string, unknown>;
    cause?: Error;
  }
): JobProcessingError {
  return new JobProcessingError(message, {
    jobId: job.data.prismaJobId,
    jobType: job.data.type,
    isRetryable: options?.isRetryable ?? true,
    context: options?.context,
    cause: options?.cause,
  });
}

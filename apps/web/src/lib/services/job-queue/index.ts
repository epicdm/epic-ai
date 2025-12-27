/**
 * Job Queue Service
 *
 * Client-side API for enqueuing and managing background jobs.
 * Implements dual-storage pattern with Prisma for persistence
 * and BullMQ for queue processing.
 *
 * @module job-queue
 */

// Types and validation
export {
  JobType,
  JobStatus,
  JobPriority,
  JobPriorityName,
  QueueName,
  JobTypeToQueue,
  validatePayload,
  safeValidatePayload,
  priorityToNumber,
  numberToPriority,
  CreateJobRequestSchema,
  type CreateJobRequest,
  type JobResponse,
  type JobListResponse,
  type JobErrorResponse,
} from './types';

// Producer API
export {
  enqueueJob,
  getJob,
  listJobs,
  cancelJob,
  retryJob,
  closeQueues,
  TooManyJobsError,
  PayloadValidationError,
  type EnqueueJobOptions,
} from './producer';

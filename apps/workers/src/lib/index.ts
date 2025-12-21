/**
 * Worker Library Exports
 *
 * Central export point for worker utility modules.
 *
 * @module lib
 */

// Redis connection
export { redis, createRedisConnection, closeRedisConnection } from './redis';

// Logging utilities
export {
  logJob,
  log,
  logJobStart,
  logJobComplete,
  logJobFailed,
  logJobRetry,
  logJobProgress,
  logger,
  type JobLog,
  type GenericLog,
  type LogLevel,
  type JobEvent,
} from './logger';

// Error classes
export {
  JobError,
  JobProcessingError,
  TooManyJobsError,
  PayloadValidationError,
  RateLimitError,
  TokenExpiredError,
  ExternalServiceError,
  UnknownJobTypeError,
  isJobError,
  isRetryableError,
} from './errors';

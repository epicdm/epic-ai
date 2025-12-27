/**
 * Custom Error Classes for Background Workers
 *
 * This module defines error types for job processing.
 * Follows Constitution Principle III (Error Handling) with structured errors.
 *
 * @module lib/errors
 */

import type { JobType } from '../types/payloads';

/**
 * Base error class for all job-related errors.
 * Provides consistent structure for error handling and logging.
 */
export abstract class JobError extends Error {
  public readonly code: string;
  public readonly jobId?: string;
  public readonly jobType?: JobType;
  public readonly isRetryable: boolean;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code: string;
      jobId?: string;
      jobType?: JobType;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, { cause: options.cause });
    this.name = this.constructor.name;
    this.code = options.code;
    this.jobId = options.jobId;
    this.jobType = options.jobType;
    this.isRetryable = options.isRetryable ?? false;
    this.context = options.context;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serializes error for logging/API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      jobId: this.jobId,
      jobType: this.jobType,
      isRetryable: this.isRetryable,
      context: this.context,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

/**
 * Error thrown when job processing fails.
 * Can be retryable or permanent based on the error type.
 */
export class JobProcessingError extends JobError {
  constructor(
    message: string,
    options: {
      jobId: string;
      jobType: JobType;
      isRetryable?: boolean;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(message, {
      code: 'JOB_PROCESSING_ERROR',
      ...options,
    });
  }
}

/**
 * Error thrown when organization exceeds concurrent job limit.
 * Not retryable - user must wait for other jobs to complete.
 */
export class TooManyJobsError extends JobError {
  public readonly organizationId: string;
  public readonly currentCount: number;
  public readonly maxAllowed: number;

  constructor(
    organizationId: string,
    currentCount: number,
    maxAllowed: number
  ) {
    super(`Maximum concurrent jobs reached (${maxAllowed})`, {
      code: 'TOO_MANY_JOBS',
      isRetryable: false,
      context: { organizationId, currentCount, maxAllowed },
    });
    this.organizationId = organizationId;
    this.currentCount = currentCount;
    this.maxAllowed = maxAllowed;
  }
}

/**
 * Error thrown when job payload fails Zod validation.
 * Not retryable - payload must be fixed before resubmission.
 */
export class PayloadValidationError extends JobError {
  public readonly validationErrors: Array<{
    path: (string | number)[];
    message: string;
  }>;

  constructor(
    jobType: JobType,
    validationErrors: Array<{ path: (string | number)[]; message: string }>
  ) {
    const errorSummary = validationErrors.map((e) => e.message).join(', ');
    super(`Invalid payload for job type ${jobType}: ${errorSummary}`, {
      code: 'PAYLOAD_VALIDATION_ERROR',
      jobType,
      isRetryable: false,
      context: { validationErrors },
    });
    this.validationErrors = validationErrors;
  }
}

/**
 * Error thrown when external API rate limit is hit.
 * Retryable after backoff period.
 */
export class RateLimitError extends JobError {
  public readonly retryAfterMs: number;
  public readonly platform?: string;

  constructor(
    message: string,
    options: {
      jobId: string;
      jobType: JobType;
      retryAfterMs: number;
      platform?: string;
      context?: Record<string, unknown>;
    }
  ) {
    super(message, {
      code: 'RATE_LIMIT_ERROR',
      jobId: options.jobId,
      jobType: options.jobType,
      isRetryable: true,
      context: {
        retryAfterMs: options.retryAfterMs,
        platform: options.platform,
        ...options.context,
      },
    });
    this.retryAfterMs = options.retryAfterMs;
    this.platform = options.platform;
  }
}

/**
 * Error thrown when OAuth token is expired and needs refresh.
 * May or may not be retryable depending on refresh success.
 */
export class TokenExpiredError extends JobError {
  public readonly socialAccountId: string;
  public readonly platform: string;

  constructor(
    socialAccountId: string,
    platform: string,
    options: {
      jobId?: string;
      jobType?: JobType;
      requiresReauth?: boolean;
    }
  ) {
    const requiresReauth = options.requiresReauth ?? false;
    super(
      requiresReauth
        ? `OAuth token expired for ${platform} account - user must re-authorize`
        : `OAuth token expired for ${platform} account - attempting refresh`,
      {
        code: 'TOKEN_EXPIRED_ERROR',
        jobId: options.jobId,
        jobType: options.jobType,
        isRetryable: !requiresReauth,
        context: { socialAccountId, platform, requiresReauth },
      }
    );
    this.socialAccountId = socialAccountId;
    this.platform = platform;
  }
}

/**
 * Error thrown when external service is unavailable.
 * Always retryable.
 */
export class ExternalServiceError extends JobError {
  public readonly serviceName: string;
  public readonly statusCode?: number;

  constructor(
    serviceName: string,
    message: string,
    options: {
      jobId: string;
      jobType: JobType;
      statusCode?: number;
      context?: Record<string, unknown>;
      cause?: Error;
    }
  ) {
    super(`${serviceName} error: ${message}`, {
      code: 'EXTERNAL_SERVICE_ERROR',
      jobId: options.jobId,
      jobType: options.jobType,
      isRetryable: true,
      context: {
        serviceName,
        statusCode: options.statusCode,
        ...options.context,
      },
      cause: options.cause,
    });
    this.serviceName = serviceName;
    this.statusCode = options.statusCode;
  }
}

/**
 * Error thrown when job type is unknown.
 * Not retryable - code bug.
 */
export class UnknownJobTypeError extends JobError {
  constructor(jobType: string) {
    super(`Unknown job type: ${jobType}`, {
      code: 'UNKNOWN_JOB_TYPE',
      isRetryable: false,
      context: { receivedJobType: jobType },
    });
  }
}

/**
 * Type guard to check if an error is a JobError
 */
export function isJobError(error: unknown): error is JobError {
  return error instanceof JobError;
}

/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (isJobError(error)) {
    return error.isRetryable;
  }
  // Network errors are generally retryable
  if (error instanceof Error) {
    const retryablePatterns = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'socket hang up',
      'network',
    ];
    return retryablePatterns.some(
      (pattern) =>
        error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  return false;
}

/**
 * Structured Logger for Background Workers
 *
 * This module provides structured JSON logging for job execution.
 * Consistent log format enables aggregation and querying in DigitalOcean.
 *
 * @module lib/logger
 */

import type { JobType } from '../types/payloads';

/**
 * Log level types
 */
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/**
 * Job lifecycle event types
 */
export type JobEvent =
  | 'started'
  | 'progress'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'stalled'
  | 'cancelled';

/**
 * Structured job log entry interface
 * Based on research.md Decision 9
 */
export interface JobLog {
  timestamp: string; // ISO 8601
  level: LogLevel;
  jobId: string;
  jobType: JobType;
  event: JobEvent;
  duration?: number; // milliseconds (on completion)
  attempt?: number; // current attempt number
  maxAttempts?: number;
  error?: string; // error message (on failure)
  metadata?: Record<string, unknown>; // job-specific data
}

/**
 * Generic log entry for non-job logs
 */
export interface GenericLog {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates a structured job log entry and outputs to stdout.
 *
 * @param params - Job log parameters
 */
export function logJob(params: Omit<JobLog, 'timestamp'>): void {
  const logEntry: JobLog = {
    timestamp: new Date().toISOString(),
    ...params,
  };

  // Output as JSON for log aggregation
  const output = JSON.stringify(logEntry);

  switch (params.level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.log(output);
      }
      break;
    default:
      console.log(output);
  }
}

/**
 * Creates a generic log entry for non-job operations.
 *
 * @param component - The component/module name
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Optional metadata
 */
export function log(
  component: string,
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const logEntry: GenericLog = {
    timestamp: new Date().toISOString(),
    level,
    component,
    message,
    ...(metadata && { metadata }),
  };

  const output = JSON.stringify(logEntry);

  switch (level) {
    case 'error':
      console.error(output);
      break;
    case 'warn':
      console.warn(output);
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.log(output);
      }
      break;
    default:
      console.log(output);
  }
}

/**
 * Helper to log job start
 */
export function logJobStart(
  jobId: string,
  jobType: JobType,
  attempt: number,
  maxAttempts: number,
  metadata?: Record<string, unknown>
): void {
  logJob({
    level: 'info',
    jobId,
    jobType,
    event: 'started',
    attempt,
    maxAttempts,
    metadata,
  });
}

/**
 * Helper to log job completion
 */
export function logJobComplete(
  jobId: string,
  jobType: JobType,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  logJob({
    level: 'info',
    jobId,
    jobType,
    event: 'completed',
    duration,
    metadata,
  });
}

/**
 * Helper to log job failure
 */
export function logJobFailed(
  jobId: string,
  jobType: JobType,
  error: string,
  attempt: number,
  maxAttempts: number,
  duration?: number,
  metadata?: Record<string, unknown>
): void {
  logJob({
    level: 'error',
    jobId,
    jobType,
    event: 'failed',
    error,
    attempt,
    maxAttempts,
    duration,
    metadata,
  });
}

/**
 * Helper to log job retry
 */
export function logJobRetry(
  jobId: string,
  jobType: JobType,
  attempt: number,
  maxAttempts: number,
  error: string,
  nextRetryDelay: number
): void {
  logJob({
    level: 'warn',
    jobId,
    jobType,
    event: 'retrying',
    attempt,
    maxAttempts,
    error,
    metadata: { nextRetryDelayMs: nextRetryDelay },
  });
}

/**
 * Helper to log job progress
 */
export function logJobProgress(
  jobId: string,
  jobType: JobType,
  progress: number,
  metadata?: Record<string, unknown>
): void {
  logJob({
    level: 'info',
    jobId,
    jobType,
    event: 'progress',
    metadata: { progress, ...metadata },
  });
}

/**
 * Logger instance for consistent component logging
 */
export const logger = {
  info: (component: string, message: string, metadata?: Record<string, unknown>) =>
    log(component, 'info', message, metadata),
  warn: (component: string, message: string, metadata?: Record<string, unknown>) =>
    log(component, 'warn', message, metadata),
  error: (component: string, message: string, metadata?: Record<string, unknown>) =>
    log(component, 'error', message, metadata),
  debug: (component: string, message: string, metadata?: Record<string, unknown>) =>
    log(component, 'debug', message, metadata),
};

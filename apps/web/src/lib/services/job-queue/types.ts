/**
 * Job Queue Type Exports
 *
 * Re-exports job types from the workers package contracts.
 * This provides a clean interface for the web app to interact
 * with the job queue system.
 *
 * @module job-queue/types
 */

// Note: These types mirror the worker types but are defined here
// to avoid a dependency on the workers package from the web app.
// In the future, consider a shared types package.

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const JobType = {
  SCRAPE_WEBSITE: 'SCRAPE_WEBSITE',
  SYNC_RSS: 'SYNC_RSS',
  PROCESS_DOCUMENT: 'PROCESS_DOCUMENT',
  GENERATE_CONTENT: 'GENERATE_CONTENT',
  GENERATE_IMAGE: 'GENERATE_IMAGE',
  PUBLISH_CONTENT: 'PUBLISH_CONTENT',
  SYNC_ANALYTICS: 'SYNC_ANALYTICS',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
} as const;

export type JobType = (typeof JobType)[keyof typeof JobType];

export const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const JobPriority = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const;

export type JobPriority = (typeof JobPriority)[keyof typeof JobPriority];

export const JobPriorityName = {
  HIGH: 'HIGH',
  NORMAL: 'NORMAL',
  LOW: 'LOW',
} as const;

export type JobPriorityName = keyof typeof JobPriority;

// =============================================================================
// Queue Names
// =============================================================================

export const QueueName = {
  CONTENT_GENERATION: 'content-generation',
  CONTEXT_SCRAPING: 'context-scraping',
  ANALYTICS_SYNC: 'analytics-sync',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

/**
 * Maps job types to their respective queues
 */
export const JobTypeToQueue: Record<JobType, QueueName> = {
  [JobType.GENERATE_CONTENT]: QueueName.CONTENT_GENERATION,
  [JobType.GENERATE_IMAGE]: QueueName.CONTENT_GENERATION,
  [JobType.SCRAPE_WEBSITE]: QueueName.CONTEXT_SCRAPING,
  [JobType.SYNC_RSS]: QueueName.CONTEXT_SCRAPING,
  [JobType.PROCESS_DOCUMENT]: QueueName.CONTEXT_SCRAPING,
  [JobType.SYNC_ANALYTICS]: QueueName.ANALYTICS_SYNC,
  [JobType.PUBLISH_CONTENT]: QueueName.CONTENT_GENERATION,
  [JobType.REFRESH_TOKEN]: QueueName.ANALYTICS_SYNC,
};

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

export const SocialPlatformSchema = z.enum([
  'TWITTER',
  'LINKEDIN',
  'FACEBOOK',
  'INSTAGRAM',
]);

export const ContentGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  topic: z.string().min(1).max(500),
  platforms: z.array(SocialPlatformSchema).min(1),
  tone: z.string().optional(),
  contentType: z.enum(['POST', 'THREAD', 'ARTICLE']).optional(),
  contextItemIds: z.array(z.string().cuid()).optional(),
});

export const ContextScrapingPayloadSchema = z.object({
  contextSourceId: z.string().cuid(),
  brandId: z.string().cuid(),
  url: z.string().url(),
  sourceType: z.enum(['WEBSITE', 'RSS']),
  maxItems: z.number().int().positive().optional(),
});

export const AnalyticsSyncPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  organizationId: z.string().cuid(),
  platform: SocialPlatformSchema,
  syncType: z.enum(['FULL', 'INCREMENTAL']),
  postIds: z.array(z.string().cuid()).optional(),
});

export const TokenRefreshPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  platform: SocialPlatformSchema,
  organizationId: z.string().cuid(),
});

export const DocumentProcessingPayloadSchema = z.object({
  contextSourceId: z.string().cuid(),
  brandId: z.string().cuid(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.enum(['application/pdf', 'text/plain', 'text/markdown']),
});

export const ImageGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  prompt: z.string().min(1).max(1000),
  style: z.enum(['realistic', 'artistic', 'minimal', 'branded']).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional(),
  contentItemId: z.string().cuid().optional(),
});

export const ContentPublishingPayloadSchema = z.object({
  contentVariationId: z.string().cuid(),
  socialAccountId: z.string().cuid(),
  platform: SocialPlatformSchema,
  scheduledFor: z.string().datetime().optional(),
});

/**
 * Map of job types to their payload validation schemas
 */
export const PayloadSchemaMap: Record<JobType, z.ZodSchema> = {
  [JobType.GENERATE_CONTENT]: ContentGenerationPayloadSchema,
  [JobType.SCRAPE_WEBSITE]: ContextScrapingPayloadSchema,
  [JobType.SYNC_RSS]: ContextScrapingPayloadSchema,
  [JobType.SYNC_ANALYTICS]: AnalyticsSyncPayloadSchema,
  [JobType.REFRESH_TOKEN]: TokenRefreshPayloadSchema,
  [JobType.PROCESS_DOCUMENT]: DocumentProcessingPayloadSchema,
  [JobType.GENERATE_IMAGE]: ImageGenerationPayloadSchema,
  [JobType.PUBLISH_CONTENT]: ContentPublishingPayloadSchema,
};

// =============================================================================
// Request/Response Types
// =============================================================================

export const CreateJobRequestSchema = z.object({
  type: z.enum([
    'SCRAPE_WEBSITE',
    'SYNC_RSS',
    'PROCESS_DOCUMENT',
    'GENERATE_CONTENT',
    'GENERATE_IMAGE',
    'PUBLISH_CONTENT',
    'SYNC_ANALYTICS',
    'REFRESH_TOKEN',
  ]),
  brandId: z.string().cuid().optional(),
  payload: z.record(z.unknown()),
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL'),
  runAt: z.string().datetime().optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

/**
 * Job response matching the API contract
 */
export interface JobResponse {
  id: string;
  type: JobType;
  brandId: string | null;
  organizationId: string;
  payload: Record<string, unknown>;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  runAt: string;
  startedAt: string | null;
  completedAt: string | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Job list response with pagination
 */
export interface JobListResponse {
  jobs: JobResponse[];
  nextCursor: string | null;
  totalCount: number;
}

/**
 * Error response format
 */
export interface JobErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates a job payload against its type-specific schema.
 * @throws {z.ZodError} If validation fails
 */
export function validatePayload(
  type: JobType,
  payload: unknown
): Record<string, unknown> {
  const schema = PayloadSchemaMap[type];
  if (!schema) {
    throw new Error(`Unknown job type: ${type}`);
  }
  return schema.parse(payload) as Record<string, unknown>;
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidatePayload(
  type: JobType,
  payload: unknown
):
  | { success: true; data: Record<string, unknown> }
  | { success: false; errors: z.ZodError } {
  const schema = PayloadSchemaMap[type];
  if (!schema) {
    return {
      success: false,
      errors: new z.ZodError([
        {
          code: 'custom',
          path: ['type'],
          message: `Unknown job type: ${type}`,
        },
      ]),
    };
  }

  const result = schema.safeParse(payload);
  if (result.success) {
    return { success: true, data: result.data as Record<string, unknown> };
  }
  return { success: false, errors: result.error };
}

/**
 * Converts priority name to numeric value
 */
export function priorityToNumber(priority: JobPriorityName): number {
  return JobPriority[priority];
}

/**
 * Converts numeric priority to name
 */
export function numberToPriority(value: number): JobPriorityName {
  if (value <= 1) return 'HIGH';
  if (value <= 5) return 'NORMAL';
  return 'LOW';
}

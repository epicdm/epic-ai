/**
 * Job Payload Type Definitions and Zod Schemas
 *
 * This file defines the TypeScript types and Zod validation schemas
 * for all background job payloads in Epic AI.
 *
 * @module job-payloads
 */

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

export type JobType = typeof JobType[keyof typeof JobType];

export const JobStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export const JobPriority = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
} as const;

export type JobPriority = typeof JobPriority[keyof typeof JobPriority];

export const SocialPlatform = {
  TWITTER: 'TWITTER',
  LINKEDIN: 'LINKEDIN',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
} as const;

export type SocialPlatform = typeof SocialPlatform[keyof typeof SocialPlatform];

export const ContentType = {
  POST: 'POST',
  THREAD: 'THREAD',
  ARTICLE: 'ARTICLE',
} as const;

export type ContentType = typeof ContentType[keyof typeof ContentType];

// =============================================================================
// Content Generation Job
// =============================================================================

export const ContentGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  topic: z.string().min(1).max(500),
  platforms: z.array(z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM'])).min(1),
  tone: z.string().optional(),
  contentType: z.enum(['POST', 'THREAD', 'ARTICLE']).optional(),
  contextItemIds: z.array(z.string().cuid()).optional(),
});

export type ContentGenerationPayload = z.infer<typeof ContentGenerationPayloadSchema>;

export interface ContentGenerationResult {
  contentItemId: string;
  variations: {
    platform: SocialPlatform;
    variationId: string;
    content: string;
    characterCount: number;
  }[];
  tokensUsed: number;
  generationTimeMs: number;
}

// =============================================================================
// Context Scraping Jobs (Website & RSS)
// =============================================================================

export const ContextScrapingPayloadSchema = z.object({
  contextSourceId: z.string().cuid(),
  brandId: z.string().cuid(),
  url: z.string().url(),
  sourceType: z.enum(['WEBSITE', 'RSS']),
  maxItems: z.number().int().positive().optional(),
});

export type ContextScrapingPayload = z.infer<typeof ContextScrapingPayloadSchema>;

export interface ContextScrapingResult {
  itemsProcessed: number;
  itemsCreated: number;
  itemsSkipped: number;
  errors: {
    itemUrl?: string;
    message: string;
  }[];
  scrapeDurationMs: number;
}

// =============================================================================
// Analytics Sync Job
// =============================================================================

export const AnalyticsSyncPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  organizationId: z.string().cuid(),
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']),
  syncType: z.enum(['FULL', 'INCREMENTAL']),
  postIds: z.array(z.string().cuid()).optional(),
});

export type AnalyticsSyncPayload = z.infer<typeof AnalyticsSyncPayloadSchema>;

export interface AnalyticsSyncResult {
  postsUpdated: number;
  metrics: {
    totalImpressions: number;
    totalEngagements: number;
    avgEngagementRate: number;
  };
  learningsGenerated: number;
  syncDurationMs: number;
  rateLimited: boolean;
}

// =============================================================================
// Token Refresh Job
// =============================================================================

export const TokenRefreshPayloadSchema = z.object({
  socialAccountId: z.string().cuid(),
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']),
  organizationId: z.string().cuid(),
});

export type TokenRefreshPayload = z.infer<typeof TokenRefreshPayloadSchema>;

export interface TokenRefreshResult {
  success: boolean;
  expiresAt?: Date;
  requiresReauth: boolean;
}

// =============================================================================
// Document Processing Job
// =============================================================================

export const DocumentProcessingPayloadSchema = z.object({
  contextSourceId: z.string().cuid(),
  brandId: z.string().cuid(),
  fileUrl: z.string().url(),
  fileName: z.string(),
  mimeType: z.enum(['application/pdf', 'text/plain', 'text/markdown']),
});

export type DocumentProcessingPayload = z.infer<typeof DocumentProcessingPayloadSchema>;

export interface DocumentProcessingResult {
  contextItemId: string;
  extractedText: number; // character count
  processingTimeMs: number;
}

// =============================================================================
// Image Generation Job
// =============================================================================

export const ImageGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  prompt: z.string().min(1).max(1000),
  style: z.enum(['realistic', 'artistic', 'minimal', 'branded']).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3']).optional(),
  contentItemId: z.string().cuid().optional(), // Link to content item
});

export type ImageGenerationPayload = z.infer<typeof ImageGenerationPayloadSchema>;

export interface ImageGenerationResult {
  imageUrl: string;
  thumbnailUrl: string;
  generationTimeMs: number;
}

// =============================================================================
// Content Publishing Job
// =============================================================================

export const ContentPublishingPayloadSchema = z.object({
  contentVariationId: z.string().cuid(),
  socialAccountId: z.string().cuid(),
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']),
  scheduledFor: z.string().datetime().optional(),
});

export type ContentPublishingPayload = z.infer<typeof ContentPublishingPayloadSchema>;

export interface ContentPublishingResult {
  postId: string; // Platform's post ID
  publishedAt: Date;
  permalink: string;
}

// =============================================================================
// Union Types for Generic Handling
// =============================================================================

export type JobPayload =
  | ContentGenerationPayload
  | ContextScrapingPayload
  | AnalyticsSyncPayload
  | TokenRefreshPayload
  | DocumentProcessingPayload
  | ImageGenerationPayload
  | ContentPublishingPayload;

export type JobResult =
  | ContentGenerationResult
  | ContextScrapingResult
  | AnalyticsSyncResult
  | TokenRefreshResult
  | DocumentProcessingResult
  | ImageGenerationResult
  | ContentPublishingResult;

// =============================================================================
// Payload Validator Map
// =============================================================================

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

/**
 * Validates a job payload against its type-specific schema.
 * @throws {z.ZodError} If validation fails
 */
export function validatePayload<T extends JobType>(
  type: T,
  payload: unknown
): JobPayload {
  const schema = PayloadSchemaMap[type];
  if (!schema) {
    throw new Error(`Unknown job type: ${type}`);
  }
  return schema.parse(payload) as JobPayload;
}

// =============================================================================
// Job Creation Request
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
  payload: z.record(z.unknown()), // Validated per-type after
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL'),
  runAt: z.string().datetime().optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

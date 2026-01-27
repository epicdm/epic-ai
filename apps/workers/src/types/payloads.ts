/**
 * Job Payload Type Definitions and Zod Schemas
 *
 * This file defines the TypeScript types and Zod validation schemas
 * for all background job payloads in Epic AI workers.
 *
 * Copied from: specs/001-background-workers/contracts/job-payloads.ts
 *
 * @module types/payloads
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
  ENRICH_COMPANY: 'ENRICH_COMPANY',
  ASSEMBLE_AGENT: 'ASSEMBLE_AGENT',
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

export const SocialPlatform = {
  TWITTER: 'TWITTER',
  LINKEDIN: 'LINKEDIN',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
} as const;

export type SocialPlatform = (typeof SocialPlatform)[keyof typeof SocialPlatform];

export const ContentType = {
  POST: 'POST',
  THREAD: 'THREAD',
  ARTICLE: 'ARTICLE',
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

// =============================================================================
// Content Generation Job
// =============================================================================

export const ContentGenerationPayloadSchema = z.object({
  brandId: z.string().cuid(),
  topic: z.string().min(1).max(500),
  platforms: z
    .array(z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM']))
    .min(1),
  tone: z.string().optional(),
  contentType: z.enum(['POST', 'THREAD', 'ARTICLE']).optional(),
  contextItemIds: z.array(z.string().cuid()).optional(),
});

export type ContentGenerationPayload = z.infer<
  typeof ContentGenerationPayloadSchema
>;

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

export type ContextScrapingPayload = z.infer<
  typeof ContextScrapingPayloadSchema
>;

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

export type DocumentProcessingPayload = z.infer<
  typeof DocumentProcessingPayloadSchema
>;

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

export type ImageGenerationPayload = z.infer<
  typeof ImageGenerationPayloadSchema
>;

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

export type ContentPublishingPayload = z.infer<
  typeof ContentPublishingPayloadSchema
>;

export interface ContentPublishingResult {
  postId: string; // Platform's post ID
  publishedAt: Date;
  permalink: string;
}

// =============================================================================
// Company Enrichment Job (Agent OS)
// =============================================================================

/**
 * Manual answers schema - data that can't be scraped from website
 */
export const EnrichmentManualAnswersSchema = z.object({
  hours_of_operation: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),
  service_area: z.string().max(500).optional(),
  service_radius_miles: z.number().int().positive().optional(),
  serves_nationwide: z.boolean().optional(),
  pricing_model: z.enum(['fixed', 'hourly', 'subscription', 'custom', 'contact']).optional(),
  price_range: z.string().max(200).optional(),
  free_consultation: z.boolean().optional(),
  preferred_contact_method: z.enum(['phone', 'email', 'form', 'chat']).optional(),
  response_time_hours: z.number().int().positive().optional(),
  unique_selling_points: z.array(z.string()).optional(),
  target_audience_description: z.string().max(1000).optional(),
});

export type EnrichmentManualAnswers = z.infer<typeof EnrichmentManualAnswersSchema>;

/**
 * Company enrichment job payload
 */
export const CompanyEnrichmentPayloadSchema = z.object({
  organizationId: z.string().cuid(),
  userId: z.string().min(1),
  websiteUrl: z.string().url(),
  companyProfileId: z.string().cuid().optional(),
  manualAnswers: EnrichmentManualAnswersSchema.optional(),
  // Crawl options
  maxPages: z.number().int().min(1).max(10).default(5),
  skipLlmRefinement: z.boolean().default(false),
});

export type CompanyEnrichmentPayload = z.infer<typeof CompanyEnrichmentPayloadSchema>;

/**
 * Brand voice profile result
 */
export interface BrandVoiceResult {
  tone: 'professional' | 'friendly' | 'enthusiastic' | 'empathetic' | 'authoritative' | 'casual' | 'warm' | 'formal';
  formality: number; // 1-5
  energy: 'calm' | 'moderate' | 'energetic';
  vocabulary_style: 'simple' | 'moderate' | 'sophisticated';
  uses_emojis: boolean;
  uses_first_person: boolean;
  sample_phrases: string[];
  confidence: number;
}

/**
 * Offering (product or service)
 */
export interface OfferingResult {
  name: string;
  description?: string;
  category?: string;
  is_service: boolean;
}

/**
 * Audience persona
 */
export interface AudienceResult {
  name: string;
  description?: string;
  pain_points?: string[];
  goals?: string[];
}

/**
 * Company enrichment result matching spec
 */
export interface CompanyEnrichmentResult {
  // Company info
  company: {
    name?: string;
    tagline?: string;
    description?: string;
    industry?: string;
    sub_industry?: string;
    founded_year?: number;
    headquarters?: string;
    email?: string;
    phone?: string;
    address?: string;
    social_links: {
      linkedin?: string;
      twitter?: string;
      facebook?: string;
      instagram?: string;
      youtube?: string;
    };
    // Manual fields
    hours_of_operation?: string;
    service_area?: string;
    pricing_model?: string;
    price_range?: string;
    // LLM-refined fields
    business_model?: 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'saas' | 'consulting' | 'unknown';
    sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
    target_audience?: string;
    value_proposition?: string;
    competitive_differentiators?: string[];
    service_category_tags?: string[];
    recommended_agent_types?: Array<
      | 'sales_qualifier'
      | 'appointment_setter'
      | 'customer_support'
      | 'lead_capture'
      | 'booking_assistant'
      | 'faq_bot'
      | 'onboarding_guide'
      | 'product_recommender'
    >;
  };

  // Products and services
  offerings: OfferingResult[];

  // Target audience personas
  audience: AudienceResult[];

  // Brand voice analysis
  brand_voice: BrandVoiceResult;

  // Recommended agent templates based on analysis
  recommended_agent_templates: {
    template_id: string;
    match_score: number;
    reasons: string[];
  }[];

  // Metadata
  source_url: string;
  pages_analyzed: number;
  scraped_at: string;

  // Gaps identified
  gaps: {
    gap_type: string;
    field_path: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    recommended_fix: string;
  }[];

  // Confidence scores
  confidence: Record<string, number>;

  // Evidence trail
  evidence: {
    source_type: string;
    source_url?: string;
    field_path: string;
    confidence: number;
    reasoning?: string;
  }[];

  // Processing metadata
  processing_time_ms: number;
  llm_tokens_used?: number;
}

// =============================================================================
// Agent Assembly Job (Agent OS)
// =============================================================================

/**
 * Agent assembly job payload
 * Runs the full 8-phase assembly orchestrator to create a configured agent
 */
export const AgentAssemblyPayloadSchema = z.object({
  type: z.literal('ASSEMBLE_AGENT').optional(),
  organizationId: z.string().cuid(),
  userId: z.string().min(1).optional(), // Optional - may be set by API route
  companyId: z.string().cuid().optional(),
  websiteUrl: z.string().url().optional(),
  userAnswers: z.record(z.unknown()).optional(),
  desiredTemplateKey: z.string().optional(),
  channels: z.array(z.enum(['VOICE', 'CHAT', 'SMS', 'EMAIL'])).optional(),
  agentId: z.string().cuid().optional(),
  force: z.boolean().optional().default(false),
  // Agent metadata
  name: z.string().optional(),
  slug: z.string().optional(),
});

export type AgentAssemblyPayload = z.infer<typeof AgentAssemblyPayloadSchema>;

/**
 * Agent assembly result
 */
export interface AgentAssemblyResult {
  agentId: string;
  status: 'draft' | 'complete' | 'failed';
  assembly_state: {
    phase: string;
    completed: string[];
    error?: string;
  };
  confidence: {
    overall: number;
    by_phase: Record<string, number>;
    by_dimension?: Record<string, number>;
  };
  gaps: {
    gap_type: string;
    field_path: string;
    severity: 'low' | 'medium' | 'high';
    impact: string;
    recommended_fix: string;
  }[];
  warnings: {
    code: string;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }[];
  processing_time_ms: number;
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
  | ContentPublishingPayload
  | CompanyEnrichmentPayload
  | AgentAssemblyPayload;

export type JobResult =
  | ContentGenerationResult
  | ContextScrapingResult
  | AnalyticsSyncResult
  | TokenRefreshResult
  | DocumentProcessingResult
  | ImageGenerationResult
  | ContentPublishingResult
  | CompanyEnrichmentResult
  | AgentAssemblyResult;

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
  [JobType.ENRICH_COMPANY]: CompanyEnrichmentPayloadSchema,
  [JobType.ASSEMBLE_AGENT]: AgentAssemblyPayloadSchema,
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

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidatePayload<T extends JobType>(
  type: T,
  payload: unknown
):
  | { success: true; data: JobPayload }
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
    return { success: true, data: result.data as JobPayload };
  }
  return { success: false, errors: result.error };
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
    'ENRICH_COMPANY',
    'ASSEMBLE_AGENT',
  ]),
  brandId: z.string().cuid().optional(),
  payload: z.record(z.unknown()), // Validated per-type after
  priority: z.enum(['HIGH', 'NORMAL', 'LOW']).optional().default('NORMAL'),
  runAt: z.string().datetime().optional(),
});

export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

// =============================================================================
// Queue Names
// =============================================================================

/**
 * BullMQ queue names for different job categories
 */
export const QueueName = {
  CONTENT_GENERATION: 'content-generation',
  CONTEXT_SCRAPING: 'context-scraping',
  ANALYTICS_SYNC: 'analytics-sync',
  AGENT_OS: 'agent-os',
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
  [JobType.ENRICH_COMPANY]: QueueName.AGENT_OS,
  [JobType.ASSEMBLE_AGENT]: QueueName.AGENT_OS,
};

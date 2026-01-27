/**
 * Auto-fill Next-step Schema v1
 *
 * Schema for the auto-fill next-step endpoint that:
 * - Reads current wizard snapshot
 * - Reads explained next-step
 * - Runs the correct engine for that step
 * - Returns updated wizard snapshot + next-step
 *
 * @module agent-os/schemas/auto-fill-next-step
 */

import { z } from "zod";
import { WizardStepKeySchema } from "./next-step";
import { GapItemSchema, WarningItemSchema, ConfidenceMapSchema } from "./common";

// ============================================
// REQUEST SCHEMA
// ============================================

export const AutoFillNextStepRequestSchema = z.object({
  /**
   * Optional: override the step to auto-fill.
   * If omitted, uses the resolved next_step from the wizard.
   */
  desiredStep: WizardStepKeySchema.optional(),

  /**
   * Alias for desiredStep (backwards compatibility)
   */
  forceStep: WizardStepKeySchema.optional(),

  /**
   * Optional: user answers to questions from the explain endpoint.
   * These are merged with engine output.
   */
  answers: z.record(z.unknown()).optional(),

  /**
   * Optional: company hints to pass to the enrichment engine.
   * Only used for company/enrichment step.
   */
  companyHints: z
    .object({
      websiteUrl: z.string().url().optional(),
      companyName: z.string().optional(),
      industry: z.string().optional(),
    })
    .optional(),

  /**
   * Optional: website URL for enrichment step (shorthand for companyHints.websiteUrl)
   */
  websiteUrl: z.string().url().optional(),

  /**
   * Optional: template key to use for template step.
   * Only used for template step.
   */
  desiredTemplateKey: z.string().optional(),

  /**
   * Whether to apply results immediately (via PATCH) or just return the plan.
   * Default: true (apply immediately)
   */
  applyImmediately: z.boolean().default(true),

  /**
   * Dry run mode - plan but don't write.
   * Alias for applyImmediately=false
   */
  dryRun: z.boolean().default(false),

  /**
   * Force overwrite even if existing config is already good.
   * Default: false (skip overwrite if existing config has high confidence >= 0.85)
   */
  force: z.boolean().default(false),

  /**
   * Maximum seconds to wait for engine completion.
   * Default: 12 seconds
   */
  maxSeconds: z.number().int().min(1).max(60).default(12),
});

export type AutoFillNextStepRequest = z.infer<typeof AutoFillNextStepRequestSchema>;

// ============================================
// WRITE PLAN SCHEMA
// ============================================

/**
 * A single write operation in the auto-fill plan.
 */
export const WritePlanItemSchema = z.object({
  /** The module to write to (e.g., "brain", "personality", "tools") */
  module: z.string(),
  /** The payload to PATCH */
  payload: z.unknown(),
});

export type WritePlanItem = z.infer<typeof WritePlanItemSchema>;

/**
 * Result of applying a single write.
 */
export const AppliedWriteResultSchema = z.object({
  module: z.string(),
  ok: z.boolean(),
  error: z.string().optional(),
});

export type AppliedWriteResult = z.infer<typeof AppliedWriteResultSchema>;

// ============================================
// STEP RESULT SCHEMA
// ============================================

/**
 * Result from running an individual step engine.
 * Each engine returns its own config + confidence + gaps.
 */
export const AutoFillStepResultSchema = z.object({
  /** The step that was filled */
  step: WizardStepKeySchema,
  /** Whether the engine ran successfully */
  ok: z.boolean(),
  /** Error message if !ok */
  error: z.string().optional(),
  /** The generated config to PATCH */
  config: z.record(z.unknown()).optional(),
  /** Confidence in the generated config */
  confidence: z.record(z.number()).optional(),
  /** Gaps detected by the engine */
  gaps: z.array(GapItemSchema).optional(),
  /** Warnings detected by the engine */
  warnings: z.array(WarningItemSchema).optional(),
  /** Evidence supporting the config */
  evidence: z.array(z.record(z.unknown())).optional(),
});

export type AutoFillStepResult = z.infer<typeof AutoFillStepResultSchema>;

// ============================================
// RESPONSE SCHEMA
// ============================================

export const AutoFillNextStepResponseSchema = z.object({
  /** Whether the auto-fill succeeded */
  ok: z.boolean(),

  /** The step that was auto-filled */
  step: WizardStepKeySchema,

  /** Alias: ran_step for API consistency */
  ran_step: WizardStepKeySchema.optional(),

  /** Result from the engine */
  engine_result: AutoFillStepResultSchema.optional(),

  /** Whether the config was applied (PATCH sent) */
  applied: z.boolean(),

  /** Whether any writes were made */
  did_write: z.boolean().optional(),

  /** The planned writes (useful for dry run) */
  write_plan: z.array(WritePlanItemSchema).optional(),

  /** Results of applying each write */
  applied_writes: z.array(AppliedWriteResultSchema).optional(),

  /** Updated confidence after applying */
  confidence: ConfidenceMapSchema.optional(),

  /** Remaining gaps after applying */
  gaps: z.array(GapItemSchema).optional(),

  /** Warnings after applying */
  warnings: z.array(WarningItemSchema).optional(),

  /** The next step after this one (for chaining) */
  next_step: WizardStepKeySchema.optional(),

  /** Updated wizard snapshot (optional, for UI convenience) */
  snapshot: z.unknown().optional(),

  /** Error info if !ok */
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),

  /** Timing metadata */
  metadata: z
    .object({
      started_at: z.string().optional(),
      finished_at: z.string().optional(),
      duration_ms: z.number().int().optional(),
    })
    .optional(),
});

export type AutoFillNextStepResponse = z.infer<typeof AutoFillNextStepResponseSchema>;

// ============================================
// API ENVELOPE
// ============================================

export const AutoFillNextStepAPIResponseSchema = z.object({
  data: AutoFillNextStepResponseSchema.nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type AutoFillNextStepAPIResponse = z.infer<typeof AutoFillNextStepAPIResponseSchema>;

/**
 * Next-Step Explanation Schema v1
 *
 * Schema for the enhanced next-step explanation endpoint that provides:
 * - Why this step is next
 * - What's missing (gaps)
 * - What autopilot can do (auto_actions)
 * - What user must answer (questions)
 * - Step readiness + confidence
 *
 * @module agent-os/schemas/next-step
 */

import { z } from "zod";
import { GapItemSchema, WarningItemSchema, ConfidenceMapSchema } from "./common";

// ============================================
// WIZARD STEP KEY
// ============================================

export const WizardStepKeySchema = z.enum([
  "company",
  "template",
  "tools",
  "flow",
  "personality",
  "brain",
  "knowledge",
  "memory",
  "learning",
  "governance",
  "economics",
  "review",
]);

export type WizardStepKey = z.infer<typeof WizardStepKeySchema>;

// ============================================
// STEP READINESS
// ============================================

export const StepReadinessSchema = z.object({
  /** The wizard step */
  step: WizardStepKeySchema,
  /** Whether this step has data/config */
  has_data: z.boolean(),
  /** Whether this step is complete (no blocking gaps) */
  is_complete: z.boolean(),
  /** Whether this step can be auto-filled */
  can_autofill: z.boolean(),
  /** Confidence in this step's configuration (0-1) */
  confidence: z.number().min(0).max(1),
  /** Brief status message */
  status_message: z.string(),
});

export type StepReadiness = z.infer<typeof StepReadinessSchema>;

// ============================================
// AUTO ACTIONS
// ============================================

export const AutoActionSchema = z.object({
  /** Action identifier */
  action_id: z.string(),
  /** Human-readable label */
  label: z.string(),
  /** What this action will do */
  description: z.string(),
  /** API endpoint to call */
  endpoint: z.string(),
  /** HTTP method */
  method: z.enum(["POST", "PATCH"]),
  /** Request body (if any) */
  body: z.record(z.unknown()).optional(),
  /** Expected confidence after action */
  expected_confidence: z.number().min(0).max(1).optional(),
});

export type AutoAction = z.infer<typeof AutoActionSchema>;

// ============================================
// USER QUESTIONS
// ============================================

export const QuestionOptionSchema = z.object({
  /** Option value */
  value: z.string(),
  /** Human-readable label */
  label: z.string(),
  /** Optional description */
  description: z.string().optional(),
});

export const UserQuestionSchema = z.object({
  /** Question identifier */
  question_id: z.string(),
  /** Human-readable question */
  question: z.string(),
  /** Field path this question relates to */
  field_path: z.string(),
  /** Input type */
  input_type: z.enum(["text", "select", "multiselect", "boolean", "url"]),
  /** Options for select/multiselect */
  options: z.array(QuestionOptionSchema).optional(),
  /** Placeholder text */
  placeholder: z.string().optional(),
  /** Whether this question is required */
  required: z.boolean().default(true),
  /** Why we need this information */
  why_needed: z.string().optional(),
});

export type UserQuestion = z.infer<typeof UserQuestionSchema>;
export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

// ============================================
// UI HINTS
// ============================================

export const UIHintsSchema = z.object({
  /** Page/section title */
  title: z.string(),
  /** Description for the current step */
  description: z.string(),
  /** Primary CTA button */
  primary_action: z.object({
    label: z.string(),
    action: z.enum(["autofill", "save", "continue", "publish", "custom"]),
    disabled: z.boolean().default(false),
    disabled_reason: z.string().optional(),
  }),
  /** Secondary CTA button (optional) */
  secondary_action: z
    .object({
      label: z.string(),
      action: z.enum(["skip", "back", "reset", "custom"]),
    })
    .optional(),
  /** Progress percentage (0-100) */
  progress_percent: z.number().min(0).max(100),
  /** Show autofill button */
  show_autofill: z.boolean().default(true),
});

export type UIHints = z.infer<typeof UIHintsSchema>;

// ============================================
// NEXT STEP EXPLAIN RESULT
// ============================================

export const NextStepExplainSchema = z.object({
  /** The agent ID */
  agent_id: z.string(),
  /** The recommended next step */
  next_step: WizardStepKeySchema,
  /** Short reason why this is the next step */
  reason: z.string(),
  /** Detailed explanation */
  reason_detail: z.string(),
  /** Whether the wizard is blocked from proceeding */
  is_blocked: z.boolean(),
  /** Deployment state of the agent */
  deployment_state: z.enum(["draft", "assembling", "ready", "published", "archived"]),

  /** Readiness status for all steps */
  step_readiness: z.array(StepReadinessSchema),

  /** Overall confidence in agent configuration */
  confidence: ConfidenceMapSchema,

  /** Gaps that need to be addressed */
  gaps: z.array(GapItemSchema),

  /** Warnings (non-blocking issues) */
  warnings: z.array(WarningItemSchema),

  /** Questions user must answer */
  questions: z.array(UserQuestionSchema),

  /** Actions autopilot can take */
  auto_actions: z.array(AutoActionSchema),

  /** UI rendering hints */
  ui: UIHintsSchema,
});

export type NextStepExplain = z.infer<typeof NextStepExplainSchema>;

// ============================================
// API RESPONSE ENVELOPE
// ============================================

export const NextStepExplainResponseSchema = z.object({
  data: NextStepExplainSchema.nullable(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export type NextStepExplainResponse = z.infer<typeof NextStepExplainResponseSchema>;

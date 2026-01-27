/**
 * Question Format v1
 *
 * Strict, future-proof question contract for the Agent OS wizard.
 * - Next-Step endpoint returns WizardQuestion[]
 * - UI renders questions from this contract
 * - Answer-to-PATCH consumes WizardAnswer[]
 *
 * @module schemas/questions
 */

import { z } from "zod";

// ============================================================================
// Module Prefix Schema
// ============================================================================

/**
 * Valid module prefixes for field paths.
 * Every field_path MUST start with one of these prefixes.
 */
export const ModulePrefixSchema = z.enum([
  "role_card",
  "brain_config",
  "personality_config",
  "tool_config",
  "knowledge_config",
  "memory_config",
  "learning_config",
  "governance_config",
  "economics_config",
  "flow_config",
]);

export type ModulePrefix = z.infer<typeof ModulePrefixSchema>;

// ============================================================================
// Field Path Schema
// ============================================================================

/**
 * Module-prefixed field path (e.g., "knowledge_config.price_range").
 * Validates that the path starts with a known module prefix.
 */
export const FieldPathSchema = z
  .string()
  .min(1)
  .refine(
    (val) => {
      const prefix = val.split(".")[0];
      return ModulePrefixSchema.safeParse(prefix).success;
    },
    {
      message:
        "field_path must start with a valid module prefix (e.g., knowledge_config.price_range)",
    }
  );

export type FieldPath = z.infer<typeof FieldPathSchema>;

// ============================================================================
// Question Value Type Schema
// ============================================================================

/**
 * The expected value type for the answer.
 * UI uses this to validate input before sending.
 */
export const QuestionValueTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "string[]",
  "object",
  "json",
]);

export type QuestionValueType = z.infer<typeof QuestionValueTypeSchema>;

// ============================================================================
// Question Control Schema
// ============================================================================

/**
 * UI control hint for rendering the question.
 * Determines how the question is displayed to the user.
 */
export const QuestionControlSchema = z.enum([
  "text", // Single-line text input
  "textarea", // Multi-line text input
  "number", // Numeric input
  "toggle", // Boolean toggle switch
  "select", // Dropdown/single select
  "multi-select", // Multiple selection chips
  "radio", // Radio button group
  "checkbox-group", // Multiple checkboxes
  "slider", // Numeric slider
  "date", // Date picker
  "time", // Time picker
  "datetime", // Date + time picker
  "json-editor", // JSON/object editor
  "file-upload", // File upload
  "rich-text", // Rich text editor
]);

export type QuestionControl = z.infer<typeof QuestionControlSchema>;

// ============================================================================
// Question Validation Schema
// ============================================================================

/**
 * Optional validation rules for the answer value.
 * Applied by UI before submission and by backend on receipt.
 */
export const QuestionValidationSchema = z
  .object({
    required: z.boolean().optional(),
    min: z.number().optional(), // For numbers: min value; for strings: min length
    max: z.number().optional(), // For numbers: max value; for strings: max length
    pattern: z.string().optional(), // Regex pattern (string)
    pattern_message: z.string().optional(), // Error message for pattern mismatch
    min_items: z.number().optional(), // For arrays: min items
    max_items: z.number().optional(), // For arrays: max items
  })
  .strict()
  .optional();

export type QuestionValidation = z.infer<typeof QuestionValidationSchema>;

// ============================================================================
// Question Dependency Schema
// ============================================================================

/**
 * Conditional visibility based on another question's answer.
 * Used for follow-up questions that only appear after a specific answer.
 */
export const QuestionDependencySchema = z
  .object({
    field_path: FieldPathSchema, // The field this depends on
    operator: z.enum(["eq", "neq", "in", "nin", "exists", "not_exists"]),
    value: z.unknown().optional(), // Value to compare against
  })
  .strict()
  .optional();

export type QuestionDependency = z.infer<typeof QuestionDependencySchema>;

// ============================================================================
// Choice Item Schema
// ============================================================================

/**
 * A choice option for select/radio/checkbox controls.
 */
export const ChoiceItemSchema = z
  .object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    label: z.string(),
    description: z.string().optional(),
    disabled: z.boolean().optional(),
  })
  .strict();

export type ChoiceItem = z.infer<typeof ChoiceItemSchema>;

// ============================================================================
// Wizard Question Schema
// ============================================================================

/**
 * Full question definition for the Agent OS wizard.
 * This is the canonical contract between backend and UI.
 */
export const WizardQuestionSchema = z
  .object({
    // ─────────────────────────────────────────────────────────────────────────
    // Core fields (required)
    // ─────────────────────────────────────────────────────────────────────────
    field_path: FieldPathSchema,
    prompt: z.string().min(1), // The main question text
    value_type: QuestionValueTypeSchema,
    control: QuestionControlSchema,

    // ─────────────────────────────────────────────────────────────────────────
    // Optional UI hints
    // ─────────────────────────────────────────────────────────────────────────
    help: z.string().optional(), // Secondary explanation text
    placeholder: z.string().optional(), // Input placeholder
    choices: z.array(ChoiceItemSchema).optional(), // For select/radio/checkbox
    default_value: z.unknown().optional(), // Pre-filled value
    examples: z.array(z.string()).optional(), // Example answers
    unit: z.string().optional(), // Unit label (e.g., "USD", "minutes")

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────
    validation: QuestionValidationSchema,

    // ─────────────────────────────────────────────────────────────────────────
    // Priority and grouping
    // ─────────────────────────────────────────────────────────────────────────
    priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
    group: z.string().optional(), // Logical grouping (e.g., "pricing", "hours")
    order: z.number().optional(), // Display order within group

    // ─────────────────────────────────────────────────────────────────────────
    // Sensitivity and privacy
    // ─────────────────────────────────────────────────────────────────────────
    sensitivity: z.enum(["public", "internal", "confidential"]).default("public"),
    pii: z.boolean().default(false), // Contains personally identifiable information

    // ─────────────────────────────────────────────────────────────────────────
    // Dependencies and conditionals
    // ─────────────────────────────────────────────────────────────────────────
    depends_on: QuestionDependencySchema,

    // ─────────────────────────────────────────────────────────────────────────
    // Traceability
    // ─────────────────────────────────────────────────────────────────────────
    rationale: z.string().optional(), // Why this question is being asked
    source_gap: z.string().optional(), // Original gap_type that triggered this
  })
  .strict();

export type WizardQuestion = z.infer<typeof WizardQuestionSchema>;

/**
 * Array of wizard questions.
 */
export const WizardQuestionsSchema = z.array(WizardQuestionSchema);

export type WizardQuestions = z.infer<typeof WizardQuestionsSchema>;

// ============================================================================
// Wizard Answer Schema
// ============================================================================

/**
 * User's answer to a wizard question.
 * This is what the UI sends to Answer-to-PATCH.
 */
export const WizardAnswerSchema = z
  .object({
    field_path: FieldPathSchema,
    value: z.unknown(),
    skipped: z.boolean().optional(), // User explicitly skipped this question
    confidence: z.number().min(0).max(1).optional(), // User's confidence in their answer
  })
  .strict();

export type WizardAnswer = z.infer<typeof WizardAnswerSchema>;

/**
 * Array of wizard answers.
 */
export const WizardAnswersSchema = z.array(WizardAnswerSchema);

export type WizardAnswers = z.infer<typeof WizardAnswersSchema>;

// ============================================================================
// Question Group Schema
// ============================================================================

/**
 * A logical group of related questions.
 * Used for better UI organization.
 */
export const QuestionGroupSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(), // Icon name or emoji
    order: z.number().default(0),
    questions: WizardQuestionsSchema,
  })
  .strict();

export type QuestionGroup = z.infer<typeof QuestionGroupSchema>;

/**
 * Array of question groups.
 */
export const QuestionGroupsSchema = z.array(QuestionGroupSchema);

export type QuestionGroups = z.infer<typeof QuestionGroupsSchema>;

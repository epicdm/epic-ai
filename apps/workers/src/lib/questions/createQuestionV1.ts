/**
 * Question Factory v1
 *
 * Helper for creating WizardQuestion objects with sensible defaults.
 * Ensures all questions follow the Question format v1 contract.
 *
 * @module lib/questions/createQuestionV1
 */

import type {
  WizardQuestion,
  QuestionValueType,
  QuestionControl,
  ChoiceItem,
  QuestionValidation,
  QuestionDependency,
} from "@epic-ai/shared";

// ============================================================================
// Input type for createQuestionV1
// ============================================================================

export interface CreateQuestionInput {
  // Required fields
  field_path: string;
  prompt: string;

  // Value type (defaults to "string")
  value_type?: QuestionValueType;

  // Control hint (defaults based on value_type)
  control?: QuestionControl;

  // Optional UI hints
  help?: string;
  placeholder?: string;
  choices?: ChoiceItem[];
  default_value?: unknown;
  examples?: string[];
  unit?: string;

  // Validation
  validation?: QuestionValidation;

  // Priority and grouping
  priority?: "low" | "medium" | "high" | "critical";
  group?: string;
  order?: number;

  // Sensitivity
  sensitivity?: "public" | "internal" | "confidential";
  pii?: boolean;

  // Dependencies
  depends_on?: QuestionDependency;

  // Traceability
  rationale?: string;
  source_gap?: string;
}

// ============================================================================
// Default control mapping
// ============================================================================

const VALUE_TYPE_TO_CONTROL: Record<QuestionValueType, QuestionControl> = {
  string: "text",
  number: "number",
  boolean: "toggle",
  "string[]": "multi-select",
  object: "json-editor",
  json: "json-editor",
};

// ============================================================================
// createQuestionV1
// ============================================================================

/**
 * Creates a WizardQuestion with sensible defaults.
 *
 * @example
 * ```ts
 * const q = createQuestionV1({
 *   field_path: "knowledge_config.price_range",
 *   prompt: "What is the typical price range for your services?",
 *   help: "This helps the agent discuss pricing accurately.",
 *   value_type: "string",
 *   control: "text",
 *   examples: ["$50-$100", "Starting at $25"],
 *   priority: "high",
 *   source_gap: "missing_pricing",
 * });
 * ```
 */
export function createQuestionV1(input: CreateQuestionInput): WizardQuestion {
  const value_type = input.value_type ?? "string";
  const control = input.control ?? VALUE_TYPE_TO_CONTROL[value_type] ?? "text";

  const question: WizardQuestion = {
    field_path: input.field_path,
    prompt: input.prompt,
    value_type,
    control,
    priority: input.priority ?? "medium",
    sensitivity: input.sensitivity ?? "public",
    pii: input.pii ?? false,
  };

  // Add optional fields only if provided
  if (input.help !== undefined) question.help = input.help;
  if (input.placeholder !== undefined) question.placeholder = input.placeholder;
  if (input.choices !== undefined) question.choices = input.choices;
  if (input.default_value !== undefined) question.default_value = input.default_value;
  if (input.examples !== undefined) question.examples = input.examples;
  if (input.unit !== undefined) question.unit = input.unit;
  if (input.validation !== undefined) question.validation = input.validation;
  if (input.group !== undefined) question.group = input.group;
  if (input.order !== undefined) question.order = input.order;
  if (input.depends_on !== undefined) question.depends_on = input.depends_on;
  if (input.rationale !== undefined) question.rationale = input.rationale;
  if (input.source_gap !== undefined) question.source_gap = input.source_gap;

  return question;
}

// ============================================================================
// Specialized question creators
// ============================================================================

/**
 * Creates a text question (string value, text control).
 */
export function createTextQuestion(
  field_path: string,
  prompt: string,
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "string",
    control: "text",
  });
}

/**
 * Creates a textarea question (string value, textarea control).
 */
export function createTextareaQuestion(
  field_path: string,
  prompt: string,
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "string",
    control: "textarea",
  });
}

/**
 * Creates a number question.
 */
export function createNumberQuestion(
  field_path: string,
  prompt: string,
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "number",
    control: "number",
  });
}

/**
 * Creates a boolean/toggle question.
 */
export function createToggleQuestion(
  field_path: string,
  prompt: string,
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "boolean",
    control: "toggle",
  });
}

/**
 * Creates a select question (single choice).
 */
export function createSelectQuestion(
  field_path: string,
  prompt: string,
  choices: ChoiceItem[],
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control" | "choices">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "string",
    control: "select",
    choices,
  });
}

/**
 * Creates a multi-select question (multiple choices).
 */
export function createMultiSelectQuestion(
  field_path: string,
  prompt: string,
  choices: ChoiceItem[],
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control" | "choices">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "string[]",
    control: "multi-select",
    choices,
  });
}

/**
 * Creates a radio question (single choice, radio style).
 */
export function createRadioQuestion(
  field_path: string,
  prompt: string,
  choices: ChoiceItem[],
  opts?: Omit<CreateQuestionInput, "field_path" | "prompt" | "value_type" | "control" | "choices">
): WizardQuestion {
  return createQuestionV1({
    ...opts,
    field_path,
    prompt,
    value_type: "string",
    control: "radio",
    choices,
  });
}

// ============================================================================
// Gap-to-question converter
// ============================================================================

export interface GapToQuestionInput {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}

/**
 * Converts a gap item into a WizardQuestion.
 * Uses the gap's question_to_user as the prompt if available.
 */
export function gapToQuestion(gap: GapToQuestionInput): WizardQuestion {
  const priority = gap.severity === "high" ? "high" : gap.severity === "low" ? "low" : "medium";

  return createQuestionV1({
    field_path: gap.field_path,
    prompt: gap.question_to_user || gap.recommended_fix,
    help: gap.impact,
    examples: gap.suggestions,
    priority,
    source_gap: gap.gap_type,
    rationale: gap.impact,
  });
}

/**
 * Batch converts gaps to questions.
 */
export function gapsToQuestions(gaps: GapToQuestionInput[]): WizardQuestion[] {
  return gaps.map(gapToQuestion);
}

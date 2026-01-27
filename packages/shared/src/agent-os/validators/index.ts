/**
 * Agent OS Validation Helpers
 *
 * Strict validation utilities for Agent OS API endpoints.
 * Enforces schema contracts with strict mode (rejects unknown keys).
 *
 * @module agent-os/validators
 */

import { z, ZodError } from "zod";
import {
  RoleCardSchemaStrict,
  BrainConfigSchemaStrict,
  PersonalityConfigSchemaStrict,
  ToolConfigSchemaStrict,
  KnowledgeConfigSchemaStrict,
  MemoryConfigSchemaStrict,
  LearningConfigSchemaStrict,
  GovernanceConfigSchemaStrict,
  EconomicsConfigSchemaStrict,
  GapItemSchema,
  WarningItemSchema,
  ConfidenceMapSchema,
  ApiResponseSchema,
} from "../schemas";
import type { GapItem, WarningItem, ConfidenceMap } from "../types";

// ============================================
// VALIDATION RESULT TYPES
// ============================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  error: {
    code: "VALIDATION_ERROR";
    message: string;
    details: z.ZodFormattedError<unknown>;
  };
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

// ============================================
// STRICT SCHEMA VALIDATION
// ============================================

/**
 * Validate input against a strict schema (rejects unknown keys)
 * Use this for all PATCH endpoint request body validation
 * Note: Uses AnyZodObject to support .strict() method
 */
export function validateStrict<T extends z.AnyZodObject>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.strict().safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: formatZodError(result.error),
      details: result.error.format(),
    },
  };
}

/**
 * Validate partial input for PATCH operations (allows partial data, rejects unknown keys)
 * Note: Uses AnyZodObject to support .partial() and .strict() methods
 */
export function validatePartialStrict<T extends z.AnyZodObject>(
  schema: T,
  data: unknown
): ValidationResult<Partial<z.infer<T>>> {
  // Create partial version with strict mode
  const partialSchema = schema.partial().strict();
  const result = partialSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data as Partial<z.infer<T>>,
    };
  }

  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: formatZodError(result.error),
      details: result.error.format(),
    },
  };
}

/**
 * Validate any Zod schema (non-strict, for schemas that don't support .strict())
 */
export function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): ValidationResult<z.infer<T>> {
  const result = schema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: formatZodError(result.error),
      details: result.error.format(),
    },
  };
}

// ============================================
// MODULE-SPECIFIC VALIDATORS
// ============================================

/**
 * Validate role card config (strict, partial for PATCH)
 */
export function validateRoleCard(data: unknown) {
  return validatePartialStrict(RoleCardSchemaStrict, data);
}

/**
 * Validate brain config (strict, partial for PATCH)
 */
export function validateBrainConfig(data: unknown) {
  return validatePartialStrict(BrainConfigSchemaStrict, data);
}

/**
 * Validate personality config (strict, partial for PATCH)
 */
export function validatePersonalityConfig(data: unknown) {
  return validatePartialStrict(PersonalityConfigSchemaStrict, data);
}

/**
 * Validate tool config (strict, partial for PATCH)
 */
export function validateToolConfig(data: unknown) {
  return validatePartialStrict(ToolConfigSchemaStrict, data);
}

/**
 * Validate knowledge config (strict, partial for PATCH)
 */
export function validateKnowledgeConfig(data: unknown) {
  return validatePartialStrict(KnowledgeConfigSchemaStrict, data);
}

/**
 * Validate memory config (strict, partial for PATCH)
 */
export function validateMemoryConfig(data: unknown) {
  return validatePartialStrict(MemoryConfigSchemaStrict, data);
}

/**
 * Validate learning config (strict, partial for PATCH)
 */
export function validateLearningConfig(data: unknown) {
  return validatePartialStrict(LearningConfigSchemaStrict, data);
}

/**
 * Validate governance config (strict, partial for PATCH)
 */
export function validateGovernanceConfig(data: unknown) {
  return validatePartialStrict(GovernanceConfigSchemaStrict, data);
}

/**
 * Validate economics config (strict, partial for PATCH)
 */
export function validateEconomicsConfig(data: unknown) {
  return validatePartialStrict(EconomicsConfigSchemaStrict, data);
}

// ============================================
// RESPONSE ENVELOPE VALIDATION
// ============================================

/**
 * Validate response envelope structure
 * Ensures response follows the standard { data, confidence, gaps, warnings } pattern
 */
export function validateResponseEnvelope(response: unknown): ValidationResult<{
  data: unknown;
  confidence?: ConfidenceMap;
  gaps?: GapItem[];
  warnings?: WarningItem[];
}> {
  return validateStrict(ApiResponseSchema, response) as ValidationResult<{
    data: unknown;
    confidence?: ConfidenceMap;
    gaps?: GapItem[];
    warnings?: WarningItem[];
  }>;
}

/**
 * Validate confidence map (all values must be 0-1)
 */
export function validateConfidenceMap(data: unknown): ValidationResult<ConfidenceMap> {
  return validateSchema(ConfidenceMapSchema, data);
}

/**
 * Validate gap items array
 */
export function validateGaps(data: unknown): ValidationResult<GapItem[]> {
  return validateSchema(z.array(GapItemSchema), data);
}

/**
 * Validate warning items array
 */
export function validateWarnings(data: unknown): ValidationResult<WarningItem[]> {
  return validateSchema(z.array(WarningItemSchema), data);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format Zod error into human-readable message
 */
export function formatZodError(error: ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });

  if (issues.length === 1) {
    return issues[0];
  }

  return `Validation errors: ${issues.join("; ")}`;
}

/**
 * Check if validation result is a failure
 */
export function isValidationFailure<T>(
  result: ValidationResult<T>
): result is ValidationFailure {
  return !result.success;
}

/**
 * Check if validation result is a success
 */
export function isValidationSuccess<T>(
  result: ValidationResult<T>
): result is ValidationSuccess<T> {
  return result.success;
}

/**
 * Get module validator by name
 */
export function getModuleValidator(
  moduleName: string
): ((data: unknown) => ValidationResult<unknown>) | null {
  const validators: Record<string, (data: unknown) => ValidationResult<unknown>> = {
    roleCard: validateRoleCard,
    role_card: validateRoleCard,
    brainConfig: validateBrainConfig,
    brain_config: validateBrainConfig,
    personalityConfig: validatePersonalityConfig,
    personality_config: validatePersonalityConfig,
    toolConfig: validateToolConfig,
    tool_config: validateToolConfig,
    knowledgeConfig: validateKnowledgeConfig,
    knowledge_config: validateKnowledgeConfig,
    memoryConfig: validateMemoryConfig,
    memory_config: validateMemoryConfig,
    learningConfig: validateLearningConfig,
    learning_config: validateLearningConfig,
    governanceConfig: validateGovernanceConfig,
    governance_config: validateGovernanceConfig,
    economicsConfig: validateEconomicsConfig,
    economics_config: validateEconomicsConfig,
  };

  return validators[moduleName] || null;
}

// ============================================
// ASSERTION HELPERS (throw on failure)
// ============================================

/**
 * Assert strict validation - throws on failure
 * Use for internal validation where failure is unexpected
 */
export function assertStrict<T extends z.AnyZodObject>(
  schema: T,
  data: unknown,
  context?: string
): z.infer<T> {
  const result = validateStrict(schema, data);

  if (!result.success) {
    const prefix = context ? `[${context}] ` : "";
    throw new Error(`${prefix}${result.error.message}`);
  }

  return result.data;
}

/**
 * Assert module config validation - throws on failure
 */
export function assertModuleConfig(
  moduleName: string,
  data: unknown
): unknown {
  const validator = getModuleValidator(moduleName);

  if (!validator) {
    throw new Error(`Unknown module: ${moduleName}`);
  }

  const result = validator(data);

  if (!result.success) {
    throw new Error(`[${moduleName}] ${result.error.message}`);
  }

  return result.data;
}

/**
 * Agent OS API Response Helpers
 *
 * Standardized response format for all Agent OS endpoints.
 * Keeps API layer thin - no business logic here.
 */

import type { ConfidenceMap, GapItem, WarningItem } from "@epic-ai/shared";

// Re-export validation helpers from the [id] level
export {
  validateAgentAccess,
  isErrorResponse,
  returnError,
  validateBody,
  updateAgentModule,
  getModuleGaps,
  type ModulePatchContext,
  type ModulePatchError,
  type ValidateAgentAccessOptions,
} from "./[id]/_helpers";

/**
 * Metadata included with all Agent OS responses
 */
export interface ResponseMeta {
  confidence?: ConfidenceMap;
  gaps?: GapItem[];
  warnings?: WarningItem[];
}

/**
 * Success response builder
 *
 * @param data - The response payload
 * @param meta - Optional metadata (confidence, gaps, warnings)
 */
export function ok<T>(data: T, meta?: ResponseMeta) {
  return {
    data,
    error: null,
    ...(meta?.confidence && { confidence: meta.confidence }),
    ...(meta?.gaps && { gaps: meta.gaps }),
    ...(meta?.warnings && { warnings: meta.warnings }),
  };
}

/**
 * Error response builder
 *
 * @param code - Error code (e.g., "NOT_FOUND", "VALIDATION_ERROR")
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 */
export function fail(
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return {
    data: null,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Common error codes for Agent OS
 */
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  NO_ORG: "NO_ORG",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",

  // State errors
  AGENT_PUBLISHED: "AGENT_PUBLISHED",
  AGENT_ARCHIVED: "AGENT_ARCHIVED",
  AGENT_ASSEMBLING: "AGENT_ASSEMBLING",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_MODULE: "INVALID_MODULE",

  // System errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

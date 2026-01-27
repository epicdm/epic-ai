/**
 * Common Schemas
 *
 * Base schemas that are used by multiple other schema files.
 * Extracted to avoid circular imports.
 *
 * @module agent-os/schemas/common
 */

import { z } from "zod";

/**
 * Gap item schema - identifies missing or incomplete configuration
 */
export const GapItemSchema = z.object({
  gap_type: z.enum([
    "missing_required",
    "missing_recommended",
    "missing_config",
    "missing_data",
    "missing_profile",
    "missing_pricing",
    "missing_hours",
    "missing_service_area",
    "missing_contact",
    "incomplete",
    "invalid",
    "missing_context",
    "no_compliance",
    "no_knowledge",
    "no_tools",
    "no_learning",
    "no_escalation",
  ]),
  field_path: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  impact: z.string().min(1),
  recommended_fix: z.string().min(1),
  question_to_user: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

/**
 * Warning item schema - non-blocking issues or suggestions
 */
export const WarningItemSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]),
  field_path: z.string().optional(),
  suggestion: z.string().optional(),
});

/**
 * Confidence map schema - confidence scores for configuration sections
 */
export const ConfidenceMapSchema = z.record(z.string(), z.number().min(0).max(1));

import { z } from "zod";
import {
  createApiResponseSchema,
  GapItemSchema,
  WarningItemSchema,
  ConfidenceMapSchema,
} from "../agent-os/schemas";

/**
 * Inbound Call Guard v1 - Telephony Schemas
 *
 * These schemas enforce live-only call routing:
 * - DID must be mapped to an agent
 * - Agent must have live-eligible status (PUBLISHED or READY)
 * - Fail-closed: reject ambiguous cases
 */

// ============================================================================
// Resolve DID Request
// ============================================================================

export const ResolveDidRequestSchema = z
  .object({
    did: z.string().min(3).max(32).describe("Phone number (DID) to resolve"),
    callId: z
      .string()
      .min(1)
      .max(128)
      .optional()
      .describe("Optional call ID for logging/tracing"),
  })
  .strict();

export type ResolveDidRequest = z.infer<typeof ResolveDidRequestSchema>;

// ============================================================================
// Resolve DID Response Data
// ============================================================================

export const ResolveDidDataSchema = z
  .object({
    allowed: z
      .boolean()
      .describe("Whether the call is allowed to proceed"),
    agentId: z
      .string()
      .optional()
      .describe("Agent ID if allowed, or the agent that blocked the call"),
    deploymentState: z
      .enum(["draft", "assembling", "ready", "published", "archived"])
      .optional()
      .describe("Deployment state derived from agent status"),
    reason_code: z
      .enum([
        "DID_NOT_MAPPED",      // DID has no agent mapping
        "AGENT_NOT_FOUND",     // Agent ID from mapping doesn't exist
        "AGENT_NOT_LIVE",      // Agent status is not PUBLISHED or READY
        "AGENT_PAUSED",        // Agent is temporarily paused
        "AGENT_ARCHIVED",      // Agent has been archived
        "SYSTEM_UNHEALTHY",    // Health check failed
        "UNKNOWN",             // Unexpected error
      ])
      .optional()
      .describe("Specific reason code if not allowed"),
    message: z
      .string()
      .optional()
      .describe("Human-readable message for rejection (fallback TTS)"),
  })
  .strict();

export type ResolveDidData = z.infer<typeof ResolveDidDataSchema>;

// ============================================================================
// Resolve DID Full Response (with envelope)
// ============================================================================

export const ResolveDidResponseSchema = createApiResponseSchema(
  ResolveDidDataSchema
);

export type ResolveDidResponse = z.infer<typeof ResolveDidResponseSchema>;

// ============================================================================
// Health Check Response Data
// ============================================================================

export const HealthCheckDataSchema = z
  .object({
    ok: z.boolean().describe("Overall system health status"),
    checks: z
      .object({
        db: z.boolean().describe("Database connectivity"),
      })
      .describe("Individual subsystem health checks"),
  })
  .strict();

export type HealthCheckData = z.infer<typeof HealthCheckDataSchema>;

// ============================================================================
// Health Check Full Response (with envelope)
// ============================================================================

export const HealthCheckResponseSchema = createApiResponseSchema(
  HealthCheckDataSchema
);

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ============================================================================
// Re-export common schemas for convenience
// ============================================================================

export { GapItemSchema, WarningItemSchema, ConfidenceMapSchema };

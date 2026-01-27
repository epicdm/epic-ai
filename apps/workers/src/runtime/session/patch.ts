/**
 * Live Session Atomic Patch Helper
 *
 * Safely patch session state with validation and audit trail.
 * All mutations go through this helper for consistency.
 *
 * @module runtime/session/patch
 */

import { SessionState, HandoffState, validateStateTransition, validateHandoffTransition } from "./state";
import { LiveSession, validateLiveSession } from "./state";

// ============================================================================
// Session Patch Types
// ============================================================================

/**
 * Atomic session patch: updates multiple fields in single Redis HSET operation
 *
 * Validation:
 * - If state is changing, validate transition
 * - If handoff_state is changing, validate within session state context
 * - Ensure updated_at is always set
 * - All values must be serializable to strings (Redis HSET)
 */
export interface SessionPatch {
  // Explicit state changes
  state?: SessionState;
  handoff_state?: HandoffState;

  // Escalation tracking
  escalation_attempt_count?: number;
  escalation_reason?: string;
  escalation_error?: string;
  escalation_target_context?: string;
  escalation_target_exten?: string;
  transferred_at?: string;

  // Voice-specific
  asterisk_channel?: string;
  asterisk_other_channel?: string;

  // Generic fields (allows additional arbitrary fields for Redis compatibility)
  [key: string]: SessionState | HandoffState | string | number | undefined;
}

/**
 * Apply patch to session with validation
 *
 * @param session Current session state from Redis
 * @param patch Fields to update
 * @param options Validation and audit options
 * @returns Updated session object or error
 */
export function applySessionPatch(
  session: Record<string, string>,
  patch: SessionPatch,
  options?: {
    skipValidation?: boolean;
    reason?: string;
    auditTrail?: boolean;
  }
): {
  ok: boolean;
  session?: Record<string, string>;
  error?: string;
  transitionLog?: Array<{ type: string; from?: string; to: string; reason?: string }>;
} {
  const { skipValidation = false, reason, auditTrail = true } = options || {};
  const transitionLog: Array<{ type: string; from?: string; to: string; reason?: string }> = [];

  try {
    // Create updated session object
    const updated = { ...session };

    // Always update timestamp
    updated.updated_at = new Date().toISOString();

    // VALIDATION: State transition
    if (patch.state !== undefined && patch.state !== session.state) {
      const currentState = session.state as SessionState;
      const newState = patch.state;

      if (!skipValidation) {
        const validation = validateStateTransition({
          fromState: currentState,
          toState: newState,
          reason: patch.escalation_reason || reason,
          enforceRules: true,
        });

        if (!validation.valid) {
          return { ok: false, error: validation.error };
        }
      }

      if (auditTrail) {
        transitionLog.push({
          type: "STATE_TRANSITION",
          from: currentState,
          to: newState,
          reason: patch.escalation_reason || reason,
        });
      }

      updated.state = newState;
    }

    // VALIDATION: Handoff state transition (only if in ESCALATING/ESCALATED)
    if (patch.handoff_state !== undefined && patch.handoff_state !== session.handoff_state) {
      const currentHandoffState = (session.handoff_state || "NONE") as HandoffState;
      const newHandoffState = patch.handoff_state;
      const sessionState = updated.state || (session.state as SessionState);

      if (!skipValidation) {
        const validation = validateHandoffTransition({
          fromState: currentHandoffState,
          toState: newHandoffState,
          sessionState,
          reason: patch.escalation_error || reason,
        });

        if (!validation.valid) {
          return { ok: false, error: validation.error };
        }
      }

      if (auditTrail) {
        transitionLog.push({
          type: "HANDOFF_TRANSITION",
          from: currentHandoffState,
          to: newHandoffState,
          reason: patch.escalation_error || reason,
        });
      }

      updated.handoff_state = newHandoffState;
    }

    // Apply all patch fields (as strings for Redis)
    Object.entries(patch).forEach(([key, value]) => {
      if (value !== undefined && key !== "state" && key !== "handoff_state") {
        updated[key] = String(value);
      }
    });

    // Final validation: ensure result matches contract
    const validation = validateLiveSession(updated);
    if (!validation.valid) {
      return {
        ok: false,
        error: `Session validation failed after patch: ${validation.errors?.join(", ")}`,
      };
    }

    return {
      ok: true,
      session: updated,
      transitionLog: auditTrail ? transitionLog : undefined,
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to apply patch: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ============================================================================
// Convenience Helpers for Common Patches
// ============================================================================

/**
 * Create patch for session initialization
 */
export function createInitPatch(sessionId: string, agentId?: string): SessionPatch {
  return {
    state: "ACTIVE",
    handoff_state: "NONE",
    escalation_attempt_count: 0,
    agentId: agentId || "",
  };
}

/**
 * Create patch for escalation request
 */
export function createEscalatePatch(args: {
  reason: string;
  targetContext?: string;
  targetExten?: string;
  severity?: "low" | "medium" | "high" | "critical";
}): SessionPatch {
  const { reason, targetContext, targetExten, severity = "high" } = args;
  return {
    state: "ESCALATING",
    handoff_state: "REQUESTED",
    escalation_reason: reason,
    escalation_target_context: targetContext,
    escalation_target_exten: targetExten,
    // Note: escalation_attempt_count should be incremented separately
  };
}

/**
 * Create patch for successful handoff
 */
export function createSuccessPatch(transferredAt?: string): SessionPatch {
  return {
    state: "ESCALATED",
    handoff_state: "SUCCESS",
    transferred_at: transferredAt || new Date().toISOString(),
  };
}

/**
 * Create patch for failed handoff
 */
export function createFailedPatch(args: {
  error: string;
  increaseAttemptCount?: boolean;
}): SessionPatch {
  const { error, increaseAttemptCount = true } = args;
  const patch: SessionPatch = {
    handoff_state: "FAILED",
    escalation_error: error,
  };

  // If we want to increment attempts, this helper returns a callback
  // The caller should handle the increment with current count

  return patch;
}

/**
 * Create patch for session ending
 */
export function createEndPatch(): SessionPatch {
  return {
    state: "ENDING",
  };
}

/**
 * Create patch for session termination
 */
export function createTerminatePatch(): SessionPatch {
  return {
    state: "ENDED",
  };
}

/**
 * Create patch for session error
 */
export function createErrorPatch(error: string): SessionPatch {
  return {
    state: "FAILED",
    escalation_error: error,
  };
}

// ============================================================================
// Patch Serialization (for Redis HSET)
// ============================================================================

/**
 * Convert patch to Redis HSET format (all values as strings)
 */
export function serializePatch(patch: SessionPatch): Record<string, string> {
  const serialized: Record<string, string> = {};

  Object.entries(patch).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      serialized[key] = String(value);
    }
  });

  return serialized;
}

/**
 * Deserialize Redis hash to typed session object
 */
export function deserializeSession(hash: Record<string, string>): {
  ok: boolean;
  session?: Record<string, string>;
  error?: string;
} {
  try {
    // Parse numeric fields
    const parsed: Record<string, any> = { ...hash };

    if (parsed.escalation_attempt_count) {
      parsed.escalation_attempt_count = parseInt(parsed.escalation_attempt_count, 10);
    }

    // Validate against contract
    const validation = validateLiveSession(parsed);
    if (!validation.valid) {
      return {
        ok: false,
        error: `Session deserialization failed: ${validation.errors?.join(", ")}`,
      };
    }

    return { ok: true, session: hash };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to deserialize session: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

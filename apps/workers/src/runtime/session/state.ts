/**
 * Live Session State Machine v1
 *
 * Canonical session states and handoff states for consistent session lifecycle management.
 * All state transitions are enforced through invariant rules.
 *
 * @module runtime/session/state
 */

import { z } from "zod";

// ============================================================================
// Session States (Canonical)
// ============================================================================

/**
 * Core session lifecycle states
 *
 * - INIT: Session created, not yet active
 * - ACTIVE: Conversation in progress, AI loop running
 * - ESCALATING: Handoff initiated, waiting for transfer
 * - ESCALATED: Successfully transferred to human
 * - ENDING: Session termination initiated
 * - ENDED: Session complete
 * - FAILED: Session encountered unrecoverable error
 */
export const SessionStateEnum = z.enum([
  "INIT",
  "ACTIVE",
  "ESCALATING",
  "ESCALATED",
  "ENDING",
  "ENDED",
  "FAILED",
]);

export type SessionState = z.infer<typeof SessionStateEnum>;

// ============================================================================
// Handoff States (Subordinate to ESCALATING/ESCALATED)
// ============================================================================

/**
 * Handoff flow states (sub-state within ESCALATING state)
 *
 * - NONE: No handoff initiated
 * - REQUESTED: Handoff requested, not yet started
 * - IN_PROGRESS: Handoff in progress, transfer executing
 * - SUCCESS: Handoff completed successfully
 * - FAILED: Handoff failed, session remains with AI
 */
export const HandoffStateEnum = z.enum([
  "NONE",
  "REQUESTED",
  "IN_PROGRESS",
  "SUCCESS",
  "FAILED",
]);

export type HandoffState = z.infer<typeof HandoffStateEnum>;

// ============================================================================
// State Transition Rules (Invariants)
// ============================================================================

/**
 * Enforce valid state transitions
 *
 * Rules:
 * 1. INIT → ACTIVE only (session entry)
 * 2. ACTIVE → ESCALATING or ENDING or FAILED
 * 3. ESCALATING → ESCALATED or ENDING or FAILED
 * 4. ESCALATED → ENDING or ENDED
 * 5. ENDING → ENDED or FAILED
 * 6. ENDED and FAILED are terminal states
 *
 * Invariants:
 * - Cannot transition to INIT (no re-entry)
 * - Cannot transition between ESCALATING/ESCALATED without rules
 * - Cannot transition to ENDING from INIT or ESCALATING without explicit signal
 */
export function isValidStateTransition(
  from: SessionState,
  to: SessionState
): boolean {
  const validTransitions: Record<SessionState, SessionState[]> = {
    INIT: ["ACTIVE"],
    ACTIVE: ["ESCALATING", "ENDING", "FAILED"],
    ESCALATING: ["ESCALATED", "ENDING", "FAILED"],
    ESCALATED: ["ENDING", "ENDED"],
    ENDING: ["ENDED", "FAILED"],
    ENDED: [], // Terminal
    FAILED: [], // Terminal
  };

  return validTransitions[from]?.includes(to) || false;
}

/**
 * Validate state transition with context
 */
export function validateStateTransition(args: {
  fromState: SessionState;
  toState: SessionState;
  reason?: string;
  enforceRules?: boolean;
}): { valid: boolean; error?: string } {
  const { fromState, toState, reason, enforceRules = true } = args;

  // Check basic transition validity
  if (!isValidStateTransition(fromState, toState)) {
    return {
      valid: false,
      error: `Invalid transition: ${fromState} → ${toState}`,
    };
  }

  // If enforcing rules, apply additional constraints
  if (enforceRules) {
    // Cannot transition from terminal states
    if (fromState === "ENDED" || fromState === "FAILED") {
      return {
        valid: false,
        error: `Cannot transition from terminal state: ${fromState}`,
      };
    }

    // Transition to ESCALATING requires reason
    if (toState === "ESCALATING" && !reason) {
      return {
        valid: false,
        error: "Transition to ESCALATING requires escalation reason",
      };
    }

    // Transition to FAILED requires reason
    if (toState === "FAILED" && !reason) {
      return {
        valid: false,
        error: "Transition to FAILED requires error reason",
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Handoff State Transition Rules
// ============================================================================

/**
 * Valid handoff state transitions (subordinate to session state)
 */
export function isValidHandoffTransition(
  from: HandoffState,
  to: HandoffState
): boolean {
  const validTransitions: Record<HandoffState, HandoffState[]> = {
    NONE: ["REQUESTED"],
    REQUESTED: ["IN_PROGRESS", "FAILED"],
    IN_PROGRESS: ["SUCCESS", "FAILED"],
    SUCCESS: [], // Terminal for handoff
    FAILED: [], // Terminal for handoff
  };

  return validTransitions[from]?.includes(to) || false;
}

/**
 * Validate handoff state transition with context
 */
export function validateHandoffTransition(args: {
  fromState: HandoffState;
  toState: HandoffState;
  sessionState: SessionState;
  reason?: string;
}): { valid: boolean; error?: string } {
  const { fromState, toState, sessionState, reason } = args;

  // Check basic transition validity
  if (!isValidHandoffTransition(fromState, toState)) {
    return {
      valid: false,
      error: `Invalid handoff transition: ${fromState} → ${toState}`,
    };
  }

  // Handoff transitions only valid in ESCALATING/ESCALATED states
  if (sessionState !== "ESCALATING" && sessionState !== "ESCALATED") {
    return {
      valid: false,
      error: `Handoff transitions only valid in ESCALATING/ESCALATED states, current: ${sessionState}`,
    };
  }

  // Transitions to FAILED require reason
  if (toState === "FAILED" && !reason) {
    return {
      valid: false,
      error: "Transition to handoff FAILED requires error reason",
    };
  }

  return { valid: true };
}

// ============================================================================
// Live Session JSON Contract
// ============================================================================

/**
 * Minimal live session JSON structure
 *
 * Required fields:
 * - sessionId: Unique session identifier
 * - state: Current session state
 * - created_at: ISO8601 timestamp
 * - updated_at: ISO8601 timestamp
 *
 * Recommended fields (for handoff tracking):
 * - agentId: Agent handling this session
 * - handoff_state: Current handoff state (if applicable)
 * - escalation_attempt_count: Number of handoff attempts
 * - asterisk_channel: Asterisk channel for voice sessions
 *
 * Optional fields:
 * - asterisk_other_channel: Bridged channel (for voice)
 * - escalation_reason: Why session escalated
 * - escalation_error: Error message if escalation failed
 * - transferred_at: Timestamp when successfully transferred
 * - tags: Session tags
 */
export const LiveSessionSchema = z
  .object({
    // Required
    sessionId: z.string().min(1),
    state: SessionStateEnum,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),

    // Strongly recommended for handoff sessions
    agentId: z.string().optional(),
    handoff_state: HandoffStateEnum.optional(),
    escalation_attempt_count: z.coerce.number().int().min(0).optional(),

    // Voice-specific (populated by voice service)
    asterisk_channel: z.string().optional(),
    asterisk_other_channel: z.string().optional(),

    // Escalation tracking
    escalation_reason: z.string().optional(),
    escalation_error: z.string().optional(),
    escalation_target_context: z.string().optional(),
    escalation_target_exten: z.string().optional(),
    transferred_at: z.string().datetime().optional(),

    // Other fields
    tags: z.array(z.string()).optional(),
    channel: z.string().optional(),
    conversationId: z.string().optional(),
  })
  .passthrough(); // Allow additional fields for extensibility

export type LiveSession = z.infer<typeof LiveSessionSchema>;

/**
 * Validate session against contract
 */
export function validateLiveSession(data: unknown): {
  valid: boolean;
  session?: LiveSession;
  errors?: string[];
} {
  try {
    const session = LiveSessionSchema.parse(data);
    return { valid: true, session };
  } catch (error) {
    const errors =
      error instanceof z.ZodError
        ? error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
        : ["Unknown validation error"];
    return { valid: false, errors };
  }
}

// ============================================================================
// State Machine Type Exports
// ============================================================================

export interface StateTransitionEvent {
  sessionId: string;
  fromState: SessionState;
  toState: SessionState;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface HandoffTransitionEvent {
  sessionId: string;
  fromState: HandoffState;
  toState: HandoffState;
  timestamp: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

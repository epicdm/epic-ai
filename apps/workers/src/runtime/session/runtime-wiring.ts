/**
 * Live Session State Machine - Runtime Integration
 *
 * Wires session state machine into the execution flow with gates and middleware.
 * These functions enforce session state invariants at runtime.
 *
 * @module runtime/session/runtime-wiring
 */

import { SessionState, HandoffState } from "./state";
import { applySessionPatch, serializePatch } from "./patch";

// ============================================================================
// Session State Gates (Execution Guards)
// ============================================================================

/**
 * Gate functions that enforce session state invariants during execution
 */
export interface SessionStateGates {
  /**
   * Can AI loop continue?
   * Allows: INIT, ACTIVE
   * Blocks: ESCALATING, ESCALATED, ENDING, ENDED, FAILED
   */
  canContinueAiLoop(state: SessionState): boolean;

  /**
   * Can accept handoff request?
   * Allows: ACTIVE (only)
   * Blocks: All other states (already processing)
   */
  canRequestHandoff(state: SessionState): boolean;

  /**
   * Can process user input?
   * Allows: INIT, ACTIVE
   * Blocks: ESCALATING (handoff in progress), others
   */
  canProcessInput(state: SessionState): boolean;

  /**
   * Should terminate session?
   * Allows: ENDING
   * Blocks: Others
   */
  shouldTerminate(state: SessionState): boolean;
}

/**
 * Create session state gates
 */
export function createSessionStateGates(): SessionStateGates {
  return {
    canContinueAiLoop(state: SessionState): boolean {
      // AI loop only runs in INIT and ACTIVE states
      return state === "INIT" || state === "ACTIVE";
    },

    canRequestHandoff(state: SessionState): boolean {
      // Handoff only from ACTIVE state
      return state === "ACTIVE";
    },

    canProcessInput(state: SessionState): boolean {
      // Input processing allowed in INIT and ACTIVE
      return state === "INIT" || state === "ACTIVE";
    },

    shouldTerminate(state: SessionState): boolean {
      // Terminate when in ENDING state
      return state === "ENDING";
    },
  };
}

// ============================================================================
// Runtime Middleware for State Enforcement
// ============================================================================

export interface SessionStateMiddlewareOptions {
  /**
   * Whether to throw errors or log warnings
   */
  enforceStrict?: boolean;

  /**
   * Optional callback when gate is violated
   */
  onGateViolation?: (args: {
    gate: string;
    state: SessionState;
    operation: string;
  }) => void;

  /**
   * Optional callback for state transitions
   */
  onStateTransition?: (args: {
    sessionId: string;
    fromState: SessionState;
    toState: SessionState;
    timestamp: string;
  }) => void;
}

/**
 * Create middleware that enforces session state gates
 *
 * Usage:
 * ```ts
 * const middleware = createSessionStateMiddleware();
 *
 * // Wrap AI loop execution
 * const result = await middleware.withAiLoopGate(sessionState, async () => {
 *   return await runAgentTurn(...);
 * });
 * ```
 */
export function createSessionStateMiddleware(
  options?: SessionStateMiddlewareOptions
) {
  const { enforceStrict = true, onGateViolation, onStateTransition } = options || {};
  const gates = createSessionStateGates();

  return {
    /**
     * Enforce AI loop gate - only runs if state allows
     */
    async withAiLoopGate<T>(
      sessionState: SessionState,
      handler: () => Promise<T>,
      sessionId?: string
    ): Promise<T | { blocked: true; reason: string }> {
      if (!gates.canContinueAiLoop(sessionState)) {
        const reason = `AI loop blocked in state: ${sessionState}`;
        onGateViolation?.({
          gate: "aiLoop",
          state: sessionState,
          operation: "runAgent",
        });

        if (enforceStrict) {
          throw new Error(reason);
        }

        return { blocked: true, reason };
      }

      return handler();
    },

    /**
     * Enforce handoff gate - only allows from ACTIVE state
     */
    async withHandoffGate<T>(
      sessionState: SessionState,
      handler: () => Promise<T>,
      sessionId?: string
    ): Promise<T | { blocked: true; reason: string }> {
      if (!gates.canRequestHandoff(sessionState)) {
        const reason = `Handoff blocked in state: ${sessionState}`;
        onGateViolation?.({
          gate: "handoff",
          state: sessionState,
          operation: "requestHandoff",
        });

        if (enforceStrict) {
          throw new Error(reason);
        }

        return { blocked: true, reason };
      }

      return handler();
    },

    /**
     * Enforce input processing gate
     */
    async withInputGate<T>(
      sessionState: SessionState,
      handler: () => Promise<T>,
      sessionId?: string
    ): Promise<T | { blocked: true; reason: string }> {
      if (!gates.canProcessInput(sessionState)) {
        const reason = `Input processing blocked in state: ${sessionState}`;
        onGateViolation?.({
          gate: "input",
          state: sessionState,
          operation: "processInput",
        });

        if (enforceStrict) {
          throw new Error(reason);
        }

        return { blocked: true, reason };
      }

      return handler();
    },

    /**
     * Check if session should terminate
     */
    checkTermination(sessionState: SessionState): boolean {
      return gates.shouldTerminate(sessionState);
    },

    /**
     * Get current gates for external use
     */
    getGates(): SessionStateGates {
      return gates;
    },
  };
}

// ============================================================================
// AI Loop Integration Helper
// ============================================================================

/**
 * Wrap AI loop execution with session state enforcement
 *
 * Flow:
 * 1. Check if session state allows AI loop to continue
 * 2. Execute agent turn
 * 3. Check if session should terminate after response
 * 4. Return stop signal if needed
 */
export interface WithSessionStateGatesArgs {
  sessionId: string;
  sessionState: SessionState;
  agentTurnHandler: () => Promise<{
    ok: boolean;
    response: string;
    shouldEnd?: boolean;
    [key: string]: any;
  }>;
  onStateChange?: (args: {
    sessionId: string;
    fromState: SessionState;
    toState: SessionState;
  }) => void;
}

export async function withSessionStateGates(args: WithSessionStateGatesArgs) {
  const { sessionId, sessionState, agentTurnHandler, onStateChange } = args;
  const middleware = createSessionStateMiddleware({ enforceStrict: false });

  // Check if AI loop should run
  const aiLoopResult = await middleware.withAiLoopGate(
    sessionState,
    agentTurnHandler,
    sessionId
  );

  if ("blocked" in aiLoopResult) {
    // Gate violation - return stop signal
    return {
      ok: false,
      response: `Session in state ${sessionState}, cannot continue AI loop`,
      stop: true,
      reason: aiLoopResult.reason,
    };
  }

  // Get agent turn result
  const turnResult = aiLoopResult;

  // Check if session should terminate
  if (middleware.checkTermination(sessionState)) {
    onStateChange?.({
      sessionId,
      fromState: sessionState,
      toState: "ENDED",
    });

    return {
      ...turnResult,
      stop: true,
      reason: "Session terminated",
    };
  }

  // Check if agent response indicates end
  if (turnResult.shouldEnd) {
    return {
      ...turnResult,
      stop: true,
      reason: "Agent indicated session end",
    };
  }

  // Continue normally
  return {
    ...turnResult,
    stop: false,
  };
}

// ============================================================================
// Handoff Integration Helper
// ============================================================================

/**
 * Wrap handoff execution with session state enforcement
 *
 * Ensures handoff only happens from ACTIVE state and properly
 * tracks state transitions through ESCALATING → ESCALATED flow.
 */
export interface WithHandoffGatesArgs {
  sessionId: string;
  sessionState: SessionState;
  escalationReason: string;
  handoffHandler: () => Promise<{
    ok: boolean;
    code: number;
    message: string;
    data?: any;
  }>;
  onPatch?: (patch: Record<string, string>) => Promise<void>;
}

export async function withHandoffGates(args: WithHandoffGatesArgs) {
  const { sessionId, sessionState, escalationReason, handoffHandler, onPatch } =
    args;
  const middleware = createSessionStateMiddleware({ enforceStrict: false });

  // Check if handoff is allowed from this state
  const handoffGateResult = await middleware.withHandoffGate(
    sessionState,
    handoffHandler,
    sessionId
  );

  if ("blocked" in handoffGateResult) {
    // Gate violation - cannot handoff from this state
    const errorPatch = {
      handoff_state: "FAILED",
      escalation_error: `Cannot handoff from state ${sessionState}`,
      updated_at: new Date().toISOString(),
    };

    await onPatch?.(errorPatch);

    return {
      ok: false,
      code: 409,
      message: handoffGateResult.reason,
    };
  }

  // Execute handoff
  const handoffResult = handoffGateResult;

  // Handle result and update state
  if (handoffResult.ok) {
    // Handoff succeeded - transition to ESCALATED
    const successPatch = {
      state: "ESCALATED",
      handoff_state: "SUCCESS",
      transferred_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await onPatch?.(successPatch);
  } else {
    // Handoff failed - remain in ACTIVE but mark handoff as failed
    const failedPatch = {
      handoff_state: "FAILED",
      escalation_error: handoffResult.message,
      updated_at: new Date().toISOString(),
    };

    await onPatch?.(failedPatch);
  }

  return handoffResult;
}

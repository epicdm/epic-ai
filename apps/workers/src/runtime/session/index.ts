/**
 * Live Session State Machine v1 - Public API
 *
 * Core session lifecycle management with state transition enforcement.
 * Use these exports for all session state operations.
 *
 * @module runtime/session
 */

// State definitions
export {
  SessionStateEnum,
  HandoffStateEnum,
  isValidStateTransition,
  validateStateTransition,
  isValidHandoffTransition,
  validateHandoffTransition,
  LiveSessionSchema,
  validateLiveSession,
} from "./state";

export type {
  SessionState,
  HandoffState,
  LiveSession,
  StateTransitionEvent,
  HandoffTransitionEvent,
} from "./state";

// Patch operations
export {
  applySessionPatch,
  createInitPatch,
  createEscalatePatch,
  createSuccessPatch,
  createFailedPatch,
  createEndPatch,
  createTerminatePatch,
  createErrorPatch,
  serializePatch,
  deserializeSession,
} from "./patch";

export type { SessionPatch } from "./patch";

// Runtime wiring (gates and integration)
export { withSessionStateGates, createSessionStateMiddleware } from "./runtime-wiring";

export type { SessionStateGates, SessionStateMiddlewareOptions } from "./runtime-wiring";

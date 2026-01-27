/**
 * Flow Engine v1
 *
 * Generates conversation flow configuration (state machine).
 * Defines how agents move through conversation stages.
 *
 * Architecture:
 * - Template-based flow skeletons
 * - Tool hooks for automation
 * - Guardrails for safety
 * - Gap detection for completeness
 *
 * @module engines/flow
 */

// Main engine
export { runFlowEngine, clamp01, type FlowEngineParams } from "./flow.engine";

// Flow catalog
export {
  getBaseFlowSkeleton,
  getFlowSupportedTemplates,
  hasCustomFlow,
} from "./flow.catalog";

// Tool hooks builder
export {
  buildToolHooks,
  getHooksForNode,
  getHooksForEvent,
  hasToolHook,
  type BuildToolHooksParams,
} from "./flow.tools";

// Validation
export {
  validateFlow,
  checkFlowWarnings,
  getReachableNodes,
  canReachExit,
  FlowValidationError,
} from "./flow.validation";

// Gap detection
export {
  detectFlowGaps,
  getGapsBySeverity,
  hasBlockingGaps,
  getGapQuestions,
} from "./flow.gaps";

// Types
export type {
  FlowNodeType,
  FlowNode,
  FlowEdgeCondition,
  FlowEdge,
  FlowIntent,
  ToolHookEvent,
  ToolHookTrigger,
  ToolHook,
  EscalationConfig,
  FallbackConfig,
  FlowGuardrails,
  FlowConfig,
  FlowEngineInput,
  FlowEvidence,
  FlowGap,
  FlowWarning,
  FlowEngineResult,
  FlowSkeleton,
} from "./flow.types";

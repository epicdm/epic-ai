/**
 * Tools Engine v1
 *
 * Converts template intent + company context → tool configuration JSON.
 *
 * Architecture:
 * - Deterministic scoring first (no AI required)
 * - Optional AI enhancement
 * - Full evidence/confidence tracking
 *
 * @module engines/tools
 */

// Main engine
export { runToolsEngine, type ToolsEngineParams } from "./tools.engine";

// Deterministic scoring
export { scoreTools, clamp01 } from "./tools.rules";

// Tool catalog
export {
  TOOL_CATALOG,
  getToolById,
  getToolsByCategory,
  getToolsForTemplate,
  getAllToolIds,
  type ToolDefinition,
  type ToolCategory,
} from "./tools.catalog";

// AI assist (optional)
export {
  aiSuggestTools,
  type AIToolCandidate,
  type AIToolSuggestion,
  type AIToolSuggestParams,
} from "./tools.ai";

// Types
export type {
  ToolRecommendationInput,
  ToolMatch,
  EnabledTool,
  ToolPermissions,
  ToolRateLimits,
  ToolPolicies,
  ToolPreferences,
  ToolConfig,
  ToolsEngineResult,
  ToolsEvidence,
  ToolsGap,
  ToolsWarning,
} from "./tools.types";

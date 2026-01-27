/**
 * Brain Engine v1
 *
 * Generates brain configuration for AI agents.
 * Defines decision policies, response rules, reasoning strategy.
 *
 * Architecture:
 * - Template-based defaults
 * - Channel constraints
 * - Industry safety clamps
 * - Governance rules
 * - Gap detection for completeness
 *
 * @module engines/brain
 */

// Main engine
export {
  runBrainEngine,
  clamp01,
  hasValidBrain,
  getBrainConfidence,
  needsBrainReview,
  getPolicySummary,
  getHighPriorityPolicies,
} from "./brain.engine";

// Catalog
export {
  getTemplateBrainDefaults,
  getBrainDescription,
  getBrainSupportedTemplates,
  normalizeReasoningApproach,
  normalizeUncertaintyAction,
} from "./brain.catalog";

// Rules builder
export {
  buildBrainConfig,
  hasGovernanceData,
  getHighPriorityPolicies as getRulePriorityPolicies,
  type BuildBrainResult,
} from "./brain.rules";

// Gap detection
export {
  detectBrainGaps,
  detectBrainWarnings,
  getGapsBySeverity,
  hasBlockingGaps,
  getWarningsBySeverity,
  hasErrorWarnings,
} from "./brain.gaps";

// Types
export type {
  DecisionPolicy,
  ResponseRule,
  ContextHandling,
  ReasoningApproach,
  ReasoningStrategy,
  UncertaintyAction,
  FallbackBehavior,
  BrainConfig,
  GovernanceHints,
  BrainCompanyInfo,
  BrainEngineInput,
  BrainEngineParams,
  BrainEvidence,
  BrainGap,
  BrainWarning,
  BrainEngineResult,
  TemplateBrainDefaults,
} from "./brain.types";

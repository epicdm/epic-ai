/**
 * Brain Engine v1 - Type Definitions
 *
 * Types for brain configuration generation.
 * Defines decision policies, response rules, reasoning strategy.
 *
 * @module engines/brain/types
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// DECISION POLICY TYPES
// ============================================

/** Decision policy definition */
export interface DecisionPolicy {
  name: string;
  description: string;
  conditions: string[];
  action: string;
  priority: number; // 0-100, higher = more important
}

// ============================================
// RESPONSE RULE TYPES
// ============================================

/** Response rule definition */
export interface ResponseRule {
  name: string;
  when: string;
  do: string;
  examples?: string[];
}

// ============================================
// CONTEXT HANDLING TYPES
// ============================================

/** Context handling configuration */
export interface ContextHandling {
  conversation_window: number; // 1-100
  summarize_long_conversations: boolean;
  track_entities: string[];
}

// ============================================
// REASONING STRATEGY TYPES
// ============================================

/** Reasoning approach */
export type ReasoningApproach = "chain_of_thought" | "direct" | "deliberative";

/** Reasoning strategy configuration */
export interface ReasoningStrategy {
  approach: ReasoningApproach;
  show_reasoning: boolean;
  max_reasoning_steps: number; // 1-10
}

// ============================================
// FALLBACK BEHAVIOR TYPES
// ============================================

/** Uncertainty handling */
export type UncertaintyAction = "ask_clarification" | "best_guess" | "escalate";

/** Fallback behavior configuration */
export interface FallbackBehavior {
  on_uncertainty: UncertaintyAction;
  default_response: string;
  max_clarifications: number; // 1-5
}

// ============================================
// BRAIN CONFIG TYPE
// ============================================

/**
 * Brain configuration
 * Matches BrainConfigSchema from @epic-ai/shared
 */
export interface BrainConfig {
  decision_policies: DecisionPolicy[];
  response_rules: ResponseRule[];
  context_handling: ContextHandling;
  reasoning_strategy: ReasoningStrategy;
  fallback_behavior: FallbackBehavior;
}

// ============================================
// GOVERNANCE TYPES
// ============================================

/** Governance configuration hints */
export interface GovernanceHints {
  /** Whether PII handling is allowed */
  pii_allowed?: boolean;
  /** Topics to avoid or handle carefully */
  sensitive_topics?: string[];
  /** Require confirmation for actions */
  require_confirmations?: boolean;
  /** Maximum autonomous actions */
  max_autonomous_actions?: number;
}

// ============================================
// ENGINE INPUT/OUTPUT
// ============================================

/** Company info subset for brain generation */
export interface BrainCompanyInfo {
  name?: string;
  industry?: string;
}

/** Input to the Brain Engine */
export interface BrainEngineInput {
  /** Agent template type */
  templateKey: AgentType;
  /** Enabled channels */
  channels?: string[];
  /** Company information */
  company?: BrainCompanyInfo;
  /** Governance hints */
  governance?: GovernanceHints | null;
}

/** Extended params for engine (includes options) */
export interface BrainEngineParams extends BrainEngineInput {
  /** Skip schema validation (for testing) */
  skipValidation?: boolean;
}

/** Evidence for brain generation */
export interface BrainEvidence {
  source_type: "inference" | "template_default" | "channel_constraint" | "governance_rule" | "industry_clamp";
  field_path: string;
  confidence: number;
  reasoning: string;
}

/** Gap in brain configuration */
export interface BrainGap {
  gap_type: "missing_governance" | "low_confidence" | "invalid" | "missing_industry";
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  suggestions?: string[];
}

/** Warning for brain configuration */
export interface BrainWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  suggestion?: string;
}

/** Result from the Brain Engine */
export interface BrainEngineResult {
  /** Generated brain configuration (or null if invalid) */
  brain_config: BrainConfig | null;
  /** Evidence for generation decisions */
  evidence: BrainEvidence[];
  /** Confidence scores */
  confidence: Record<string, number>;
  /** Detected gaps */
  gaps: BrainGap[];
  /** Warnings */
  warnings: BrainWarning[];
}

// ============================================
// CATALOG TYPES
// ============================================

/** Template brain defaults */
export interface TemplateBrainDefaults {
  reasoning_strategy: ReasoningStrategy;
  fallback_behavior: FallbackBehavior;
  context_handling: Partial<ContextHandling>;
}

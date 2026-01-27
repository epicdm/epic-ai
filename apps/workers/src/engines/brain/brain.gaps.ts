/**
 * Brain Engine v1 - Gap Detection
 *
 * Detects gaps and warnings in brain configuration.
 * Helps identify missing governance, industry info, etc.
 *
 * @module engines/brain/gaps
 */

import type {
  BrainConfig,
  BrainEvidence,
  BrainGap,
  BrainWarning,
  GovernanceHints,
} from "./brain.types";
import { hasGovernanceData } from "./brain.rules";

// ============================================
// GAP DETECTION
// ============================================

/** Detect gaps in brain configuration */
export function detectBrainGaps(params: {
  config: BrainConfig | null;
  evidence: BrainEvidence[];
  industry?: string;
  governance?: GovernanceHints | null;
}): BrainGap[] {
  const { config, industry, governance } = params;
  const gaps: BrainGap[] = [];

  // No config at all
  if (!config) {
    gaps.push({
      gap_type: "invalid",
      field_path: "*",
      severity: "high",
      impact: "Cannot generate brain config - schema validation failed",
      recommended_fix: "Check brain.rules.ts to ensure output matches BrainConfigSchema",
    });
    return gaps;
  }

  // Missing governance
  if (!hasGovernanceData(governance)) {
    gaps.push({
      gap_type: "missing_governance",
      field_path: "governance",
      severity: "medium",
      impact: "Using safe default governance; PII and escalation policies may not match requirements",
      recommended_fix: "Provide governance_config to align policies with business rules",
      suggestions: [
        "Define PII handling policy",
        "Specify sensitive topics to handle carefully",
        "Set confirmation requirements for actions",
      ],
    });
  }

  // Missing industry
  if (!industry) {
    gaps.push({
      gap_type: "missing_industry",
      field_path: "industry",
      severity: "low",
      impact: "Cannot apply industry-specific safety clamps",
      recommended_fix: "Specify company industry for appropriate guardrails",
      suggestions: [
        "Set industry in company profile",
        "Run enrichment to detect industry",
      ],
    });
  }

  // Check for empty decision policies
  if (!config.decision_policies?.length) {
    gaps.push({
      gap_type: "low_confidence",
      field_path: "decision_policies",
      severity: "medium",
      impact: "No decision policies defined - agent may behave unpredictably",
      recommended_fix: "Ensure buildBrainConfig generates decision policies",
    });
  }

  // Check for empty response rules
  if (!config.response_rules?.length) {
    gaps.push({
      gap_type: "low_confidence",
      field_path: "response_rules",
      severity: "low",
      impact: "No response rules defined - agent may not follow expected patterns",
      recommended_fix: "Add response rules for consistent behavior",
    });
  }

  return gaps;
}

// ============================================
// WARNING DETECTION
// ============================================

/** Industries requiring conservative settings */
const CONSERVATIVE_INDUSTRIES = [
  "legal",
  "law",
  "finance",
  "financial",
  "banking",
  "insurance",
  "healthcare",
  "medical",
  "pharmaceutical",
  "government",
  "compliance",
];

/** Check if industry is conservative */
function isConservativeIndustry(industry?: string): boolean {
  if (!industry) return false;
  const normalized = industry.toLowerCase();
  return CONSERVATIVE_INDUSTRIES.some(
    (ind) => normalized.includes(ind) || ind.includes(normalized)
  );
}

/** Detect warnings in brain configuration */
export function detectBrainWarnings(params: {
  config: BrainConfig;
  evidence: BrainEvidence[];
  industry?: string;
  governance?: GovernanceHints | null;
  channels?: string[];
}): BrainWarning[] {
  const { config, industry, governance, channels = [] } = params;
  const warnings: BrainWarning[] = [];

  // Warning: No governance provided
  if (!hasGovernanceData(governance)) {
    warnings.push({
      code: "GOVERNANCE_MISSING",
      message: "No governance config provided to Brain Engine; using safe defaults.",
      severity: "info",
      suggestion: "Provide governance_config to better align PII and escalation policies.",
    });
  }

  // Warning: Industry unknown
  if (!industry) {
    warnings.push({
      code: "INDUSTRY_UNKNOWN",
      message: "Industry not provided; skipping industry-specific safety clamps.",
      severity: "info",
    });
  }

  // Warning: Best guess in conservative industry
  if (
    isConservativeIndustry(industry) &&
    config.fallback_behavior?.on_uncertainty === "best_guess"
  ) {
    warnings.push({
      code: "BEST_GUESS_IN_CONSERVATIVE_INDUSTRY",
      message: `Using "best_guess" fallback in ${industry} industry may be risky`,
      severity: "warning",
      suggestion: 'Consider using "ask_clarification" or "escalate" for high-stakes industries',
    });
  }

  // Warning: Direct reasoning in conservative industry
  if (
    isConservativeIndustry(industry) &&
    config.reasoning_strategy?.approach === "direct"
  ) {
    warnings.push({
      code: "DIRECT_REASONING_IN_CONSERVATIVE_INDUSTRY",
      message: `Direct reasoning approach in ${industry} industry may miss nuances`,
      severity: "info",
      suggestion: "Consider deliberative reasoning for more careful responses",
    });
  }

  // Warning: Short conversation window
  if (config.context_handling?.conversation_window < 5) {
    warnings.push({
      code: "SHORT_CONVERSATION_WINDOW",
      message: `Conversation window of ${config.context_handling.conversation_window} may lose context`,
      severity: "info",
      suggestion: "Consider increasing to at least 8 for better context retention",
    });
  }

  // Warning: High max reasoning steps with direct approach
  if (
    config.reasoning_strategy?.approach === "direct" &&
    config.reasoning_strategy?.max_reasoning_steps > 4
  ) {
    warnings.push({
      code: "HIGH_STEPS_WITH_DIRECT",
      message: "High max_reasoning_steps with direct approach is unnecessary",
      severity: "info",
      suggestion: "Direct approach typically needs 2-3 steps max",
    });
  }

  // Warning: No PII policy in governance but PII likely
  if (
    governance &&
    governance.pii_allowed === undefined &&
    channels.some((c) => ["webchat", "sms", "email"].includes(c.toLowerCase()))
  ) {
    warnings.push({
      code: "PII_POLICY_UNCLEAR",
      message: "PII handling policy not specified; customer channels may receive PII",
      severity: "warning",
      suggestion: "Explicitly set pii_allowed in governance config",
    });
  }

  // Warning: Low max clarifications
  if (config.fallback_behavior?.max_clarifications < 2) {
    warnings.push({
      code: "LOW_MAX_CLARIFICATIONS",
      message: "max_clarifications of 1 may frustrate users who need help",
      severity: "info",
      suggestion: "Consider allowing at least 2-3 clarifications",
    });
  }

  return warnings;
}

// ============================================
// HELPERS
// ============================================

/** Get gaps by severity */
export function getGapsBySeverity(
  gaps: BrainGap[],
  severity: "low" | "medium" | "high"
): BrainGap[] {
  return gaps.filter((g) => g.severity === severity);
}

/** Check for blocking (high severity) gaps */
export function hasBlockingGaps(gaps: BrainGap[]): boolean {
  return gaps.some((g) => g.severity === "high");
}

/** Get warnings by severity */
export function getWarningsBySeverity(
  warnings: BrainWarning[],
  severity: "info" | "warning" | "error"
): BrainWarning[] {
  return warnings.filter((w) => w.severity === severity);
}

/** Check for error-level warnings */
export function hasErrorWarnings(warnings: BrainWarning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}

/**
 * Brain Engine v1 - Main Orchestrator
 *
 * Generates brain configuration for AI agents.
 * Combines template defaults, channel constraints, industry
 * guardrails, and governance rules.
 *
 * @module engines/brain/engine
 */

import { BrainConfigSchemaStrict } from "@epic-ai/shared";
import { buildBrainConfig, hasGovernanceData } from "./brain.rules";
import { detectBrainGaps, detectBrainWarnings } from "./brain.gaps";
import type {
  BrainEngineParams,
  BrainEngineResult,
  BrainConfig,
  BrainEvidence,
} from "./brain.types";

// ============================================
// MAIN ENGINE
// ============================================

/**
 * Run the Brain Engine
 *
 * @param params Engine parameters
 * @returns Brain configuration with evidence, confidence, gaps, warnings
 */
export async function runBrainEngine(
  params: BrainEngineParams
): Promise<BrainEngineResult> {
  const {
    templateKey,
    channels = [],
    company,
    governance,
    skipValidation = false,
  } = params;

  // 1. Build brain config from all sources
  const { config, evidence } = buildBrainConfig({
    templateKey,
    channels,
    industry: company?.industry,
    governance,
  });

  // 2. Validate against schema (unless skipped)
  let validatedConfig: BrainConfig | null = config;
  if (!skipValidation) {
    const validation = BrainConfigSchemaStrict.safeParse(config);
    if (!validation.success) {
      // Add validation error evidence
      evidence.push({
        source_type: "inference",
        field_path: "*",
        confidence: 0,
        reasoning: `Schema validation failed: ${validation.error.message}`,
      });

      // Return with structured gap for schema failure
      return {
        brain_config: null,
        evidence,
        confidence: { brain_config: 0 },
        gaps: [
          {
            gap_type: "invalid",
            field_path: "brain_config",
            severity: "high",
            impact: "Generated brain config failed schema validation",
            recommended_fix: "Fix brain.rules.ts to align with BrainConfigSchema",
            suggestions: validation.error.issues.map(
              (i) => `${i.path.join(".")}: ${i.message}`
            ),
          },
        ],
        warnings: [],
      };
    }
    validatedConfig = validation.data as BrainConfig;
  }

  // 3. Calculate confidence scores
  const confidence = calculateConfidence(evidence, governance ? true : false, company?.industry);

  // 4. Detect gaps
  const gaps = detectBrainGaps({
    config: validatedConfig,
    evidence,
    industry: company?.industry,
    governance,
  });

  // 5. Detect warnings (only if config is valid)
  const warnings = validatedConfig
    ? detectBrainWarnings({
        config: validatedConfig,
        evidence,
        industry: company?.industry,
        governance,
        channels,
      })
    : [];

  return {
    brain_config: validatedConfig,
    evidence,
    confidence,
    gaps,
    warnings,
  };
}

// ============================================
// CONFIDENCE CALCULATION
// ============================================

/** Calculate confidence scores for each field */
function calculateConfidence(
  evidence: BrainEvidence[],
  hasGovernance: boolean,
  industry?: string
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Base confidence from evidence
  const byField = new Map<string, BrainEvidence[]>();
  for (const ev of evidence) {
    const path = ev.field_path;
    if (!byField.has(path)) {
      byField.set(path, []);
    }
    byField.get(path)!.push(ev);
  }

  // Calculate confidence per field
  for (const [field, fieldEvidence] of byField) {
    if (field === "*") {
      // Global evidence applies to overall
      scores["overall"] = Math.max(
        scores["overall"] ?? 0,
        ...fieldEvidence.map((e) => e.confidence)
      );
      continue;
    }

    // Take highest confidence for field
    scores[field] = Math.max(...fieldEvidence.map((e) => e.confidence));
  }

  // Calculate brain_config confidence
  let brainConfidence = 0.8; // Base confidence from template

  // Boost if we have governance
  if (hasGovernance) {
    brainConfidence += 0.1;
  }

  // Boost if we have industry
  if (industry) {
    brainConfidence += 0.05;
  }

  scores["brain_config"] = clamp01(brainConfidence);

  // Overall confidence
  if (!scores["overall"]) {
    scores["overall"] = scores["brain_config"];
  }

  return scores;
}

// ============================================
// HELPERS
// ============================================

/** Clamp value between 0 and 1 */
export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Check if result has valid brain config */
export function hasValidBrain(result: BrainEngineResult): boolean {
  return result.brain_config !== null;
}

/** Get brain config confidence from result */
export function getBrainConfidence(result: BrainEngineResult): number {
  return result.confidence["brain_config"] ?? 0;
}

/** Check if brain needs review */
export function needsBrainReview(result: BrainEngineResult): boolean {
  // Needs review if low confidence or has warnings
  const brainConfidence = getBrainConfidence(result);
  const hasWarnings = result.warnings.some((w) => w.severity === "warning");
  const hasMediumGaps = result.gaps.some((g) => g.severity === "medium");

  return brainConfidence < 0.7 || hasWarnings || hasMediumGaps;
}

/** Get summary of decision policies */
export function getPolicySummary(result: BrainEngineResult): string[] {
  if (!result.brain_config) return [];

  return result.brain_config.decision_policies.map(
    (p) => `[${p.priority}] ${p.name}: ${p.action}`
  );
}

/** Get high-priority policies (priority >= 90) */
export function getHighPriorityPolicies(result: BrainEngineResult) {
  if (!result.brain_config) return [];

  return result.brain_config.decision_policies.filter((p) => p.priority >= 90);
}

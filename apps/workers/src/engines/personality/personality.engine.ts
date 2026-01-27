/**
 * Personality Engine v1 - Main Orchestrator
 *
 * Generates personality configuration for AI agents.
 * Combines template defaults, brand voice, channel constraints,
 * and industry guardrails to produce validated config.
 *
 * @module engines/personality/engine
 */

import { PersonalityConfigSchemaStrict } from "@epic-ai/shared";
import { buildPersonalityConfig, hasBrandVoiceData } from "./personality.rules";
import { detectPersonalityGaps, detectPersonalityWarnings } from "./personality.gaps";
import type {
  PersonalityEngineParams,
  PersonalityEngineResult,
  PersonalityConfig,
  PersonalityEvidence,
} from "./personality.types";

// ============================================
// MAIN ENGINE
// ============================================

/**
 * Run the Personality Engine
 *
 * @param params Engine parameters
 * @returns Personality configuration with evidence, confidence, gaps, warnings
 */
export async function runPersonalityEngine(
  params: PersonalityEngineParams
): Promise<PersonalityEngineResult> {
  const {
    templateKey,
    company,
    brandVoice,
    channels = [],
    skipValidation = false,
  } = params;

  // 1. Build personality config from all sources
  const { config, evidence } = buildPersonalityConfig({
    templateKey,
    companyName: company?.name,
    industry: company?.industry,
    brandVoice,
    channels,
  });

  // 2. Validate against schema (unless skipped)
  let validatedConfig: PersonalityConfig | null = config;
  if (!skipValidation) {
    const validation = PersonalityConfigSchemaStrict.safeParse(config);
    if (!validation.success) {
      // Add validation error evidence
      evidence.push({
        source_type: "inference",
        field_path: "*",
        confidence: 0,
        reasoning: `Schema validation failed: ${validation.error.message}`,
      });
      validatedConfig = null;
    }
  }

  // 3. Calculate confidence scores
  const confidence = calculateConfidence(evidence, brandVoice ? true : false);

  // 4. Detect gaps
  const gaps = detectPersonalityGaps({
    config: validatedConfig,
    evidence,
    brandVoice,
    industry: company?.industry,
  });

  // 5. Detect warnings (only if config is valid)
  const warnings = validatedConfig
    ? detectPersonalityWarnings({
        config: validatedConfig,
        evidence,
        channels,
        industry: company?.industry,
      })
    : [];

  return {
    personality_config: validatedConfig,
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
  evidence: PersonalityEvidence[],
  hasBrandVoice: boolean
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Group evidence by field path
  const byField = new Map<string, PersonalityEvidence[]>();
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

  // Overall confidence
  if (!scores["overall"]) {
    // Base overall on source quality
    if (hasBrandVoice) {
      // With brand voice, we have more confidence
      const avgConfidence =
        Object.values(scores).reduce((a, b) => a + b, 0) /
        Math.max(Object.keys(scores).length, 1);
      scores["overall"] = avgConfidence;
    } else {
      // Template defaults only
      scores["overall"] = 0.7;
    }
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

/** Check if result has valid personality */
export function hasValidPersonality(result: PersonalityEngineResult): boolean {
  return result.personality_config !== null;
}

/** Get overall confidence from result */
export function getOverallConfidence(result: PersonalityEngineResult): number {
  return result.confidence["overall"] ?? 0;
}

/** Check if personality needs review */
export function needsReview(result: PersonalityEngineResult): boolean {
  // Needs review if low confidence or has warnings
  const overallConfidence = getOverallConfidence(result);
  const hasWarnings = result.warnings.some((w) => w.severity === "warning");
  const hasMediumGaps = result.gaps.some((g) => g.severity === "medium");

  return overallConfidence < 0.6 || hasWarnings || hasMediumGaps;
}

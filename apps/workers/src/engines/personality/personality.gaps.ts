/**
 * Personality Engine v1 - Gap Detection
 *
 * Detects gaps and warnings in personality configuration.
 * Helps identify missing or low-confidence fields.
 *
 * @module engines/personality/gaps
 */

import type {
  PersonalityConfig,
  PersonalityEvidence,
  PersonalityGap,
  PersonalityWarning,
  BrandVoiceHints,
} from "./personality.types";
import { hasBrandVoiceData, getBrandVoiceConfidence } from "./personality.rules";

// ============================================
// GAP DETECTION
// ============================================

/** Detect gaps in personality configuration */
export function detectPersonalityGaps(params: {
  config: PersonalityConfig | null;
  evidence: PersonalityEvidence[];
  brandVoice?: BrandVoiceHints | null;
  industry?: string;
}): PersonalityGap[] {
  const { config, evidence, brandVoice, industry } = params;
  const gaps: PersonalityGap[] = [];

  // No config at all
  if (!config) {
    gaps.push({
      gap_type: "missing_profile",
      field_path: "*",
      severity: "high",
      impact: "Cannot generate personality without valid configuration",
      recommended_fix: "Ensure template key is valid and run engine again",
    });
    return gaps;
  }

  // Check for missing brand voice
  if (!hasBrandVoiceData(brandVoice)) {
    gaps.push({
      gap_type: "missing_profile",
      field_path: "brandVoice",
      severity: "medium",
      impact: "Using template defaults only, personality may not match brand",
      recommended_fix: "Run enrichment engine to detect brand voice characteristics",
      suggestions: [
        "Scrape company website for tone analysis",
        "Upload brand guidelines document",
        "Manually configure voice settings",
      ],
    });
  }

  // Check for low confidence brand voice
  const confidence = getBrandVoiceConfidence(brandVoice);
  if (hasBrandVoiceData(brandVoice) && confidence < 0.5) {
    gaps.push({
      gap_type: "low_confidence",
      field_path: "brandVoice",
      severity: "low",
      impact: `Brand voice detection confidence is ${(confidence * 100).toFixed(0)}%, results may be unreliable`,
      recommended_fix: "Review and manually adjust personality settings",
      suggestions: [
        "Add more brand content for analysis",
        "Manually verify tone settings",
      ],
    });
  }

  // Check for missing industry
  if (!industry) {
    gaps.push({
      gap_type: "missing_industry",
      field_path: "industry",
      severity: "low",
      impact: "Cannot apply industry-specific guardrails",
      recommended_fix: "Specify company industry for better personality defaults",
      suggestions: [
        "Set industry in company profile",
        "Run enrichment to detect industry",
      ],
    });
  }

  // Check for missing language locale
  if (!config.language_style?.locale) {
    gaps.push({
      gap_type: "missing_profile",
      field_path: "language_style.locale",
      severity: "low",
      impact: "Using default en-US locale",
      recommended_fix: "Specify target locale for regional language patterns",
    });
  }

  // Check for empty preferred phrases
  if (!config.preferred_phrases?.length) {
    gaps.push({
      gap_type: "missing_profile",
      field_path: "preferred_phrases",
      severity: "low",
      impact: "No brand-specific phrases defined",
      recommended_fix: "Add preferred phrases from brand content",
      suggestions: [
        "Extract key phrases from website",
        "Add brand taglines or mottos",
        "Include common greeting styles",
      ],
    });
  }

  return gaps;
}

// ============================================
// WARNING DETECTION
// ============================================

/** Detect warnings in personality configuration */
export function detectPersonalityWarnings(params: {
  config: PersonalityConfig;
  evidence: PersonalityEvidence[];
  channels?: string[];
  industry?: string;
}): PersonalityWarning[] {
  const { config, channels = [], industry } = params;
  const warnings: PersonalityWarning[] = [];

  // Humor in conservative industry
  if (config.humor_level > 0 && isConservativeIndustry(industry)) {
    warnings.push({
      code: "HUMOR_IN_CONSERVATIVE_INDUSTRY",
      message: `Humor level ${config.humor_level} may be inappropriate for ${industry} industry`,
      severity: "warning",
      suggestion: "Consider setting humor_level to 0 for professional contexts",
    });
  }

  // Low formality in professional channels
  if (config.formality < 3 && channels.includes("email")) {
    warnings.push({
      code: "LOW_FORMALITY_EMAIL",
      message: "Low formality may be inappropriate for email channel",
      severity: "info",
      suggestion: "Consider increasing formality for email communications",
    });
  }

  // Emojis in voice channel
  if (config.use_emojis && channels.some((c) => ["voice", "phone"].includes(c.toLowerCase()))) {
    warnings.push({
      code: "EMOJIS_IN_VOICE",
      message: "Emojis cannot be used in voice/phone channels",
      severity: "info",
      suggestion: "Emojis will be ignored in voice interactions",
    });
  }

  // High empathy with fast pace
  if (config.empathy_level >= 4 && config.pace === "fast") {
    warnings.push({
      code: "EMPATHY_PACE_MISMATCH",
      message: "High empathy with fast pace may feel rushed",
      severity: "info",
      suggestion: "Consider moderate pace for empathetic interactions",
    });
  }

  // Sophisticated language with high empathy
  if (
    config.language_style?.complexity === "sophisticated" &&
    config.empathy_level >= 4
  ) {
    warnings.push({
      code: "COMPLEXITY_EMPATHY_MISMATCH",
      message: "Sophisticated language may undermine empathetic tone",
      severity: "info",
      suggestion: "Consider simpler language for more approachable empathy",
    });
  }

  // Very formal with casual tone
  if (config.formality >= 4 && config.voice_tone === "casual") {
    warnings.push({
      code: "FORMALITY_TONE_MISMATCH",
      message: "High formality conflicts with casual tone",
      severity: "warning",
      suggestion: "Align formality level with voice tone",
    });
  }

  // Very informal with professional tone
  if (config.formality <= 2 && config.voice_tone === "professional") {
    warnings.push({
      code: "FORMALITY_TONE_MISMATCH",
      message: "Low formality conflicts with professional tone",
      severity: "warning",
      suggestion: "Increase formality to match professional tone",
    });
  }

  // Jargon with simple complexity
  if (
    config.language_style?.use_jargon &&
    config.language_style?.complexity === "simple"
  ) {
    warnings.push({
      code: "JARGON_SIMPLICITY_MISMATCH",
      message: "Technical jargon conflicts with simple language setting",
      severity: "info",
      suggestion: "Either disable jargon or increase complexity level",
    });
  }

  return warnings;
}

// ============================================
// HELPERS
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

/** Get gaps by severity */
export function getGapsBySeverity(
  gaps: PersonalityGap[],
  severity: "low" | "medium" | "high"
): PersonalityGap[] {
  return gaps.filter((g) => g.severity === severity);
}

/** Check for blocking (high severity) gaps */
export function hasBlockingGaps(gaps: PersonalityGap[]): boolean {
  return gaps.some((g) => g.severity === "high");
}

/** Get warnings by severity */
export function getWarningsBySeverity(
  warnings: PersonalityWarning[],
  severity: "info" | "warning" | "error"
): PersonalityWarning[] {
  return warnings.filter((w) => w.severity === severity);
}

/** Check for error-level warnings */
export function hasErrorWarnings(warnings: PersonalityWarning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}

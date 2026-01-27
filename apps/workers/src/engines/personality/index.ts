/**
 * Personality Engine v1
 *
 * Generates personality configuration for AI agents.
 * Maps brand voice hints to tone, formality, empathy, and style.
 *
 * Architecture:
 * - Template-based defaults
 * - Brand voice overlay
 * - Channel constraints
 * - Industry guardrails
 * - Gap detection for completeness
 *
 * @module engines/personality
 */

// Main engine
export {
  runPersonalityEngine,
  clamp01,
  hasValidPersonality,
  getOverallConfidence,
  needsReview,
} from "./personality.engine";

// Catalog
export {
  getTemplatePersonalityDefaults,
  getPersonalityDescription,
  getPersonalitySupportedTemplates,
  normalizeVoiceTone,
  normalizeSentenceComplexity,
} from "./personality.catalog";

// Rules builder
export {
  buildPersonalityConfig,
  hasBrandVoiceData,
  getBrandVoiceConfidence,
  type BuildPersonalityResult,
} from "./personality.rules";

// Gap detection
export {
  detectPersonalityGaps,
  detectPersonalityWarnings,
  getGapsBySeverity,
  hasBlockingGaps,
  getWarningsBySeverity,
  hasErrorWarnings,
} from "./personality.gaps";

// Types
export type {
  VoiceTone,
  LanguageComplexity,
  SentenceLength,
  LanguageStyle,
  ConversationPace,
  PersonalityConfig,
  BrandVoiceHints,
  PersonalityCompanyInfo,
  PersonalityEngineInput,
  PersonalityEngineParams,
  PersonalityEvidence,
  PersonalityGap,
  PersonalityWarning,
  PersonalityEngineResult,
  TemplatePersonalityDefaults,
} from "./personality.types";

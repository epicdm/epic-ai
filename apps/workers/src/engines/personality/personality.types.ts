/**
 * Personality Engine v1 - Type Definitions
 *
 * Types for personality configuration generation.
 * Maps brand voice hints to agent personality settings.
 *
 * @module engines/personality/types
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// VOICE TONE TYPE
// ============================================

/** Valid voice tone values (matches PersonalityConfigSchema) */
export type VoiceTone =
  | "professional"
  | "friendly"
  | "enthusiastic"
  | "empathetic"
  | "authoritative"
  | "casual"
  | "warm"
  | "formal";

// ============================================
// LANGUAGE STYLE TYPES
// ============================================

/** Language complexity levels */
export type LanguageComplexity = "simple" | "moderate" | "sophisticated";

/** Sentence length preferences */
export type SentenceLength = "short" | "medium" | "varied";

/** Language style configuration */
export interface LanguageStyle {
  complexity: LanguageComplexity;
  sentence_length: SentenceLength;
  use_contractions: boolean;
  use_jargon: boolean;
  locale?: string;
}

// ============================================
// PERSONALITY CONFIG TYPE
// ============================================

/** Pace of conversation */
export type ConversationPace = "slow" | "moderate" | "fast";

/**
 * Personality configuration
 * Matches PersonalityConfigSchema from @epic-ai/shared
 */
export interface PersonalityConfig {
  voice_tone: VoiceTone;
  formality: number; // 1-5
  humor_level: number; // 0-5
  empathy_level: number; // 1-5
  pace: ConversationPace;
  language_style: LanguageStyle;
  preferred_phrases: string[];
  avoided_phrases: string[];
  use_emojis: boolean;
  greeting_style: string;
  signoff_style: string;
}

// ============================================
// BRAND VOICE HINTS
// ============================================

/**
 * Brand voice hints from enrichment
 * These are optional signals that influence personality generation
 */
export interface BrandVoiceHints {
  /** Detected tone from website/content */
  detected_tone?: string;
  /** Formality level (1-5) */
  formality_level?: number;
  /** Whether technical jargon is used */
  uses_technical_jargon?: boolean;
  /** Whether emojis are used in brand content */
  uses_emojis?: boolean;
  /** Detected sentence complexity */
  sentence_complexity?: "simple" | "moderate" | "complex";
  /** Sample phrases from brand content */
  sample_phrases?: string[];
  /** Words/phrases to avoid */
  avoided_words?: string[];
  /** Confidence in the detection (0-1) */
  detection_confidence?: number;
}

// ============================================
// ENGINE INPUT/OUTPUT
// ============================================

/**
 * Company info subset for personality generation
 */
export interface PersonalityCompanyInfo {
  name?: string;
  industry?: string;
}

/**
 * Input to the Personality Engine
 */
export interface PersonalityEngineInput {
  /** Agent template type */
  templateKey: AgentType;
  /** Company information */
  company?: PersonalityCompanyInfo;
  /** Brand voice hints from enrichment */
  brandVoice?: BrandVoiceHints | null;
  /** Enabled channels (affects tone/style) */
  channels?: string[];
}

/**
 * Extended params for engine (includes options)
 */
export interface PersonalityEngineParams extends PersonalityEngineInput {
  /** Skip schema validation (for testing) */
  skipValidation?: boolean;
}

/**
 * Evidence for personality generation
 */
export interface PersonalityEvidence {
  source_type: "inference" | "website_scrape" | "template_default" | "channel_constraint";
  field_path: string;
  confidence: number;
  reasoning: string;
}

/**
 * Gap in personality configuration
 */
export interface PersonalityGap {
  gap_type: "missing_profile" | "low_confidence" | "invalid" | "missing_industry";
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  suggestions?: string[];
}

/**
 * Warning for personality configuration
 */
export interface PersonalityWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  suggestion?: string;
}

/**
 * Result from the Personality Engine
 */
export interface PersonalityEngineResult {
  /** Generated personality configuration (or null if invalid) */
  personality_config: PersonalityConfig | null;
  /** Evidence for generation decisions */
  evidence: PersonalityEvidence[];
  /** Confidence scores */
  confidence: Record<string, number>;
  /** Detected gaps */
  gaps: PersonalityGap[];
  /** Warnings */
  warnings: PersonalityWarning[];
}

// ============================================
// CATALOG TYPES
// ============================================

/**
 * Template personality defaults
 */
export interface TemplatePersonalityDefaults {
  voice_tone: VoiceTone;
  formality: number;
  humor_level: number;
  empathy_level: number;
  pace: ConversationPace;
  use_emojis: boolean;
}

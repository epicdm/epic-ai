/**
 * Template Engine v1 - Types
 *
 * Type definitions for template recommendation and seed generation.
 *
 * @module engines/template/types
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// INPUT TYPES (from Enrichment Engine)
// ============================================

export interface CompanyProfileLite {
  name?: string;
  description?: string;
  industry?: string;
  products?: { name: string; description?: string; category?: string }[];
  services?: { name: string; description?: string; category?: string }[];
  phone?: string;
  email?: string;
  hours_of_operation?: string;
  service_area?: string;
  pricing_model?: string;
  price_range?: string;
  social_links?: Record<string, string>;
  target_audience?: string;
  business_model?: string;
  value_proposition?: string;
}

export interface BrandVoiceProfileLite {
  detected_tone?: string;
  formality_level?: number;
  uses_technical_jargon?: boolean;
  uses_emojis?: boolean;
  sentence_complexity?: string;
  sample_phrases?: string[];
  avoided_words?: string[];
  detection_confidence?: number;
}

export interface EvidenceItemLite {
  source_type: string;
  field_path: string;
  confidence: number;
  reasoning?: string;
  extracted_text?: string;
  source_url?: string;
  timestamp?: string;
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface TemplateMatch {
  templateKey: AgentType;
  /** Match score 0..1 */
  score: number;
  /** Human-readable reasons for this match */
  reasons: string[];
  /** Debug-friendly breakdown of signal hits */
  featureHits: Record<string, number>;
}

export interface SelectedTemplate {
  key: AgentType;
  name: string;
  description: string;
  bestFor: string[];
  channels_supported: string[];
}

export interface TemplateSeeds {
  role_card?: RoleCardSeed;
  brain_config?: BrainConfigSeed;
  knowledge_config?: KnowledgeConfigSeed;
  personality_seed?: PersonalitySeed;
}

export interface TemplateEngineResult {
  /** The selected template key */
  templateKey: AgentType;
  /** All scored matches (top 5) */
  matches: TemplateMatch[];
  /** Details about the selected template */
  selected_template: SelectedTemplate;
  /** Starter config seeds */
  seeds: TemplateSeeds;
  /** Evidence supporting the selection */
  evidence: EvidenceItemLite[];
  /** Confidence scores per output field */
  confidence: Record<string, number>;
  /** Gaps requiring user input */
  gaps: TemplateGap[];
  /** Warnings about the selection */
  warnings: TemplateWarning[];
}

// ============================================
// SEED TYPES
// ============================================

export interface RoleCardSeed {
  name: string;
  title: string;
  company: string;
  mission: string;
  boundaries: string[];
  escalation_rules: { trigger: string; action: string; message?: string }[];
  context: string;
}

export interface BrainConfigSeed {
  reasoning_strategy: {
    approach: string;
    show_reasoning: boolean;
    max_reasoning_steps: number;
  };
  fallback_behavior: {
    on_uncertainty: string;
    default_response: string;
    max_clarifications: number;
  };
  context_handling: {
    conversation_window: number;
    summarize_long_conversations: boolean;
    track_entities: string[];
  };
  decision_policies: unknown[];
  response_rules: ResponseRule[];
}

export interface ResponseRule {
  name: string;
  when: string;
  do: string;
  examples: string[];
}

export interface KnowledgeConfigSeed {
  knowledge_bases: unknown[];
  sources: unknown[];
  quick_answers: unknown[];
  retrieval_settings: {
    top_k: number;
    similarity_threshold: number;
    rerank: boolean;
  };
  context_window: {
    max_knowledge_tokens: number;
    overflow_strategy: string;
  };
}

export interface PersonalitySeed {
  voice_tone: string;
  formality: number;
  humor_level: number;
  empathy_level: number;
  pace: string;
  greeting_style: string;
  signoff_style: string;
}

// ============================================
// GAP & WARNING TYPES
// ============================================

export interface TemplateGap {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}

export interface TemplateWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

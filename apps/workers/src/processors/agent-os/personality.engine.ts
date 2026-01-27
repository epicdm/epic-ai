/**
 * Personality Engine (PE v1)
 *
 * The fifth and final intelligence layer of the AI Agent Operating System.
 * Generates personality configuration that defines HOW the agent communicates.
 *
 * Input:
 * - company.brand_voice_profile (tone traits, formality, vocabulary style, do/don't say)
 * - company_profile.industry, business_model, sales_complexity
 * - selected_template_id
 * - tool_config.channels (voice, sms, email)
 * - governance flags (compliance style, PII handling)
 *
 * Output:
 * - agent.personality_config
 * - agent.brain_config.communication_rules
 * - voice selection hints (if voice agents)
 * - evidence + confidence per dimension
 * - gaps for missing brand voice data
 *
 * The personality is calculated based on:
 * 1. Template base personality (sales/support/booking role)
 * 2. Brand voice overlay (highest priority for tone/language)
 * 3. Industry norms adjustments
 * 4. Channel tuning rules (voice vs chat vs sms)
 * 5. Governance constraints
 */

import type { AgentType, SalesComplexity, BusinessModel } from './template-recommendation.engine';

// ============================================================================
// Type Definitions - Core Schema
// ============================================================================

export interface PersonaConfig {
  name: string; // "Sophia", "EPIC Sales Concierge"
  role_title: string; // "Sales Qualifier", "Support Specialist"
  backstory_one_liner?: string; // keeps responses consistent
}

export interface ToneConfig {
  traits: string[]; // ["professional", "warm", "direct"]
  formality: 0 | 1 | 2 | 3 | 4; // 0 casual → 4 formal
  enthusiasm: 0 | 1 | 2 | 3 | 4; // 0 calm → 4 energetic
  empathy: 0 | 1 | 2 | 3 | 4;
  humor: 0 | 1 | 2 | 3 | 4;
}

export type VocabularyStyle = 'plain' | 'balanced' | 'technical';
export type SentenceLength = 'short' | 'mixed' | 'long';
export type FillerWords = 'none' | 'light' | 'allowed';
export type ContractionUse = 'low' | 'medium' | 'high';

export interface LanguageConfig {
  vocabulary_style: VocabularyStyle;
  sentence_length: SentenceLength;
  filler_words: FillerWords;
  contraction_use: ContractionUse;
  forbidden_phrases: string[];
  preferred_phrases: string[];
}

export type InterruptionHandling = 'graceful' | 'direct';
export type Pacing = 'fast' | 'balanced' | 'slow';

export interface ConversationStyleConfig {
  ask_permission_before_actions: boolean;
  confirm_critical_details: boolean;
  summarize_before_handoff: boolean;
  handle_interruptions: InterruptionHandling;
  pacing: Pacing;
}

export type ComplianceMode = 'standard' | 'strict';

export interface RoleBoundariesConfig {
  allowed_topics: string[];
  disallowed_topics: string[];
  compliance_mode: ComplianceMode;
  escalation_triggers: string[];
}

export type PauseFrequency = 'low' | 'medium' | 'high';
export type PronunciationStyle = 'clear' | 'natural';
export type ToneAdjustment = 'shorter' | 'same';
export type EmailStructure = 'bullets' | 'paragraphs';

export interface VoiceChannelConfig {
  speech_rate_wpm: number; // 150-175 typical
  pause_frequency: PauseFrequency;
  pronunciation_style: PronunciationStyle;
}

export interface SmsChannelConfig {
  max_chars: number;
  tone_adjustment: ToneAdjustment;
}

export interface EmailChannelConfig {
  structure: EmailStructure;
  signoff: string;
}

export interface ChannelTuningConfig {
  voice: VoiceChannelConfig;
  sms: SmsChannelConfig;
  email: EmailChannelConfig;
}

export interface PersonalityConfig {
  persona: PersonaConfig;
  tone: ToneConfig;
  language: LanguageConfig;
  conversation_style: ConversationStyleConfig;
  role_boundaries: RoleBoundariesConfig;
  channel_tuning: ChannelTuningConfig;
}

// ============================================================================
// Evidence & Confidence Types
// ============================================================================

export interface EvidenceItem {
  field_path: string;
  source: 'brand_voice' | 'template_base' | 'industry_norm' | 'channel_rule' | 'governance' | 'default';
  quote?: string;
  reasoning: string;
}

export interface DimensionConfidence {
  dimension: string;
  confidence: number; // 0-1
  evidence: EvidenceItem[];
}

export interface PersonalityGap {
  missing_field: string;
  question: string;
  options?: string[];
  importance: 'required' | 'recommended' | 'optional';
}

// ============================================================================
// Input Types
// ============================================================================

export interface BrandVoiceProfile {
  tone_traits?: string[];
  formality?: number; // 0-4
  vocabulary_style?: VocabularyStyle;
  do_say?: string[];
  dont_say?: string[];
  brand_name?: string;
  humor_allowed?: boolean;
}

export interface PersonalityGenerationInput {
  agent_type: AgentType;
  template_name?: string;

  // Company context
  industry?: string;
  sub_industry?: string;
  business_model?: BusinessModel;
  sales_complexity?: SalesComplexity;
  company_name?: string;

  // Brand voice (highest priority overlay)
  brand_voice?: BrandVoiceProfile;

  // Channels enabled
  channels?: Array<'VOICE' | 'SMS' | 'EMAIL' | 'CHAT'>;

  // Governance
  compliance_mode?: ComplianceMode;
  pii_strict?: boolean;
}

export interface PersonalityGenerationResult {
  personality: PersonalityConfig;
  confidence: number; // overall 0-1
  dimension_confidence: DimensionConfidence[];
  evidence: EvidenceItem[];
  gaps: PersonalityGap[];
  reasoning: string[];
}

// ============================================================================
// Template Base Personalities
// ============================================================================

interface TemplatePersonalityBase {
  role_title: string;
  backstory_template: string;
  tone_traits: string[];
  formality: 0 | 1 | 2 | 3 | 4;
  enthusiasm: 0 | 1 | 2 | 3 | 4;
  empathy: 0 | 1 | 2 | 3 | 4;
  humor: 0 | 1 | 2 | 3 | 4;
  vocabulary_style: VocabularyStyle;
  sentence_length: SentenceLength;
  pacing: Pacing;
  ask_permission: boolean;
  confirm_details: boolean;
  summarize_handoff: boolean;
  allowed_topics: string[];
  escalation_triggers: string[];
}

const TEMPLATE_PERSONALITY_BASES: Record<AgentType, TemplatePersonalityBase> = {
  sales_qualifier: {
    role_title: 'Sales Concierge',
    backstory_template: 'A helpful {company} representative focused on qualifying needs and booking the right next step.',
    tone_traits: ['professional', 'confident', 'direct'],
    formality: 3,
    enthusiasm: 2,
    empathy: 2,
    humor: 0,
    vocabulary_style: 'balanced',
    sentence_length: 'short',
    pacing: 'fast',
    ask_permission: true,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['services', 'pricing_if_known', 'booking', 'qualification'],
    escalation_triggers: ['angry_customer', 'legal_threat', 'competitor_comparison'],
  },
  appointment_setter: {
    role_title: 'Scheduling Specialist',
    backstory_template: 'A friendly {company} assistant dedicated to finding the perfect time for your appointment.',
    tone_traits: ['friendly', 'efficient', 'helpful'],
    formality: 2,
    enthusiasm: 3,
    empathy: 2,
    humor: 1,
    vocabulary_style: 'plain',
    sentence_length: 'short',
    pacing: 'fast',
    ask_permission: false,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['scheduling', 'availability', 'services', 'location'],
    escalation_triggers: ['cancellation_request', 'complaint', 'urgent_need'],
  },
  customer_support: {
    role_title: 'Support Specialist',
    backstory_template: 'A patient and knowledgeable {company} support representative here to resolve your concerns.',
    tone_traits: ['empathetic', 'patient', 'helpful'],
    formality: 2,
    enthusiasm: 1,
    empathy: 4,
    humor: 0,
    vocabulary_style: 'plain',
    sentence_length: 'mixed',
    pacing: 'slow',
    ask_permission: true,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['troubleshooting', 'account_help', 'product_info', 'returns'],
    escalation_triggers: ['angry_customer', 'refund_request', 'legal_threat', 'safety_issue'],
  },
  faq_bot: {
    role_title: 'Information Assistant',
    backstory_template: 'A knowledgeable {company} assistant ready to answer your questions.',
    tone_traits: ['professional', 'concise', 'informative'],
    formality: 2,
    enthusiasm: 1,
    empathy: 1,
    humor: 0,
    vocabulary_style: 'balanced',
    sentence_length: 'short',
    pacing: 'fast',
    ask_permission: false,
    confirm_details: false,
    summarize_handoff: false,
    allowed_topics: ['general_info', 'faq', 'hours', 'location', 'services'],
    escalation_triggers: ['complex_question', 'complaint', 'human_request'],
  },
  product_recommender: {
    role_title: 'Product Advisor',
    backstory_template: 'An enthusiastic {company} advisor helping you find the perfect product.',
    tone_traits: ['enthusiastic', 'knowledgeable', 'helpful'],
    formality: 2,
    enthusiasm: 3,
    empathy: 2,
    humor: 1,
    vocabulary_style: 'balanced',
    sentence_length: 'mixed',
    pacing: 'balanced',
    ask_permission: false,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['products', 'recommendations', 'comparisons', 'pricing', 'availability'],
    escalation_triggers: ['complaint', 'return_request', 'stock_issue'],
  },
  lead_nurturer: {
    role_title: 'Relationship Manager',
    backstory_template: 'A thoughtful {company} representative focused on understanding your needs over time.',
    tone_traits: ['warm', 'patient', 'consultative'],
    formality: 2,
    enthusiasm: 2,
    empathy: 3,
    humor: 1,
    vocabulary_style: 'balanced',
    sentence_length: 'mixed',
    pacing: 'slow',
    ask_permission: true,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['services', 'education', 'follow_up', 'resources'],
    escalation_triggers: ['unsubscribe_request', 'complaint', 'sales_ready'],
  },
  survey_agent: {
    role_title: 'Feedback Specialist',
    backstory_template: 'A {company} representative gathering valuable feedback to improve our service.',
    tone_traits: ['professional', 'neutral', 'respectful'],
    formality: 2,
    enthusiasm: 1,
    empathy: 2,
    humor: 0,
    vocabulary_style: 'plain',
    sentence_length: 'short',
    pacing: 'balanced',
    ask_permission: true,
    confirm_details: false,
    summarize_handoff: false,
    allowed_topics: ['feedback', 'ratings', 'suggestions', 'experience'],
    escalation_triggers: ['complaint', 'negative_feedback', 'callback_request'],
  },
  lead_capture: {
    role_title: 'Lead Specialist',
    backstory_template: 'A {company} representative focused on capturing your interest and getting you connected.',
    tone_traits: ['friendly', 'efficient', 'helpful'],
    formality: 2,
    enthusiasm: 3,
    empathy: 2,
    humor: 1,
    vocabulary_style: 'plain',
    sentence_length: 'short',
    pacing: 'fast',
    ask_permission: false,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['services', 'contact_info', 'scheduling', 'general_info'],
    escalation_triggers: ['complaint', 'complex_question', 'human_request'],
  },
  booking_assistant: {
    role_title: 'Booking Specialist',
    backstory_template: 'A {company} assistant helping you book the perfect appointment or reservation.',
    tone_traits: ['friendly', 'efficient', 'organized'],
    formality: 2,
    enthusiasm: 2,
    empathy: 2,
    humor: 1,
    vocabulary_style: 'plain',
    sentence_length: 'short',
    pacing: 'fast',
    ask_permission: false,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['booking', 'availability', 'services', 'cancellation', 'rescheduling'],
    escalation_triggers: ['cancellation_request', 'complaint', 'refund_request'],
  },
  onboarding_guide: {
    role_title: 'Onboarding Specialist',
    backstory_template: 'A {company} guide helping you get started and make the most of our services.',
    tone_traits: ['patient', 'helpful', 'encouraging'],
    formality: 2,
    enthusiasm: 3,
    empathy: 3,
    humor: 1,
    vocabulary_style: 'plain',
    sentence_length: 'mixed',
    pacing: 'slow',
    ask_permission: true,
    confirm_details: true,
    summarize_handoff: true,
    allowed_topics: ['getting_started', 'features', 'tutorials', 'account_setup', 'best_practices'],
    escalation_triggers: ['frustration', 'technical_issue', 'human_request'],
  },
};

// ============================================================================
// Industry Adjustments
// ============================================================================

interface IndustryAdjustment {
  formality_delta?: number;
  empathy_delta?: number;
  enthusiasm_delta?: number;
  humor_delta?: number;
  vocabulary_style?: VocabularyStyle;
  compliance_mode?: ComplianceMode;
  pacing?: Pacing;
  additional_escalation_triggers?: string[];
  disallowed_topics?: string[];
}

const INDUSTRY_ADJUSTMENTS: Record<string, IndustryAdjustment> = {
  healthcare: {
    formality_delta: 1,
    empathy_delta: 1,
    humor_delta: -1,
    compliance_mode: 'strict',
    pacing: 'slow',
    additional_escalation_triggers: ['medical_emergency', 'insurance_dispute'],
    disallowed_topics: ['medical_diagnosis', 'treatment_recommendations', 'medication_advice'],
  },
  finance: {
    formality_delta: 1,
    empathy_delta: 0,
    humor_delta: -2,
    vocabulary_style: 'technical',
    compliance_mode: 'strict',
    additional_escalation_triggers: ['fraud_concern', 'regulatory_question'],
    disallowed_topics: ['investment_advice', 'financial_guarantees', 'tax_advice'],
  },
  legal: {
    formality_delta: 2,
    humor_delta: -2,
    vocabulary_style: 'technical',
    compliance_mode: 'strict',
    pacing: 'slow',
    disallowed_topics: ['legal_advice', 'case_outcomes', 'liability_statements'],
  },
  insurance: {
    formality_delta: 1,
    empathy_delta: 1,
    compliance_mode: 'strict',
    additional_escalation_triggers: ['claim_dispute', 'coverage_question'],
    disallowed_topics: ['coverage_guarantees', 'claim_approvals'],
  },
  solar: {
    enthusiasm_delta: 1,
    empathy_delta: 1,
    vocabulary_style: 'balanced',
    additional_escalation_triggers: ['installation_complaint', 'warranty_issue'],
  },
  home_services: {
    formality_delta: -1,
    enthusiasm_delta: 1,
    pacing: 'fast',
    additional_escalation_triggers: ['emergency_service', 'damage_complaint'],
  },
  saas: {
    vocabulary_style: 'technical',
    formality_delta: 1,
    additional_escalation_triggers: ['integration_issue', 'data_concern', 'downtime_report'],
  },
  technology: {
    vocabulary_style: 'technical',
    formality_delta: 1,
  },
  ecommerce: {
    formality_delta: -1,
    enthusiasm_delta: 1,
    pacing: 'fast',
    additional_escalation_triggers: ['shipping_complaint', 'wrong_item', 'refund_request'],
  },
  consulting: {
    formality_delta: 1,
    vocabulary_style: 'technical',
    pacing: 'slow',
    additional_escalation_triggers: ['scope_dispute', 'deliverable_concern'],
  },
  real_estate: {
    enthusiasm_delta: 1,
    empathy_delta: 1,
    additional_escalation_triggers: ['price_negotiation', 'contract_question'],
  },
  hospitality: {
    formality_delta: -1,
    enthusiasm_delta: 1,
    empathy_delta: 1,
    humor_delta: 1,
    additional_escalation_triggers: ['booking_issue', 'complaint', 'special_request'],
  },
  education: {
    empathy_delta: 1,
    vocabulary_style: 'plain',
    pacing: 'slow',
    additional_escalation_triggers: ['enrollment_issue', 'grade_dispute'],
  },
  retail: {
    formality_delta: -1,
    enthusiasm_delta: 1,
    pacing: 'fast',
  },
};

// ============================================================================
// Business Model Adjustments
// ============================================================================

interface BusinessModelAdjustment {
  formality_delta?: number;
  vocabulary_style?: VocabularyStyle;
  sentence_length?: SentenceLength;
  pacing?: Pacing;
  confirm_details?: boolean;
}

const BUSINESS_MODEL_ADJUSTMENTS: Record<BusinessModel, BusinessModelAdjustment> = {
  b2c: {
    formality_delta: -1,
    vocabulary_style: 'plain',
    sentence_length: 'short',
    pacing: 'fast',
  },
  b2b: {
    formality_delta: 1,
    vocabulary_style: 'technical',
    sentence_length: 'mixed',
    pacing: 'balanced',
    confirm_details: true,
  },
  b2b2c: {
    vocabulary_style: 'balanced',
    sentence_length: 'mixed',
    pacing: 'balanced',
    confirm_details: true,
  },
  saas: {
    vocabulary_style: 'technical',
    confirm_details: true,
  },
  marketplace: {
    pacing: 'fast',
  },
  subscription: {
    confirm_details: true,
  },
  service: {
    pacing: 'balanced',
    confirm_details: true,
  },
  consulting: {
    formality_delta: 1,
    vocabulary_style: 'technical',
    sentence_length: 'mixed',
    pacing: 'slow',
    confirm_details: true,
  },
  unknown: {
    // No adjustments for unknown business model - use defaults
  },
};

// ============================================================================
// Sales Complexity Adjustments
// ============================================================================

interface ComplexityAdjustment {
  sentence_length?: SentenceLength;
  pacing?: Pacing;
  confirm_details?: boolean;
  summarize_handoff?: boolean;
}

const COMPLEXITY_ADJUSTMENTS: Record<SalesComplexity, ComplexityAdjustment> = {
  simple: {
    sentence_length: 'short',
    pacing: 'fast',
    confirm_details: false,
  },
  moderate: {
    // balanced - no changes
  },
  complex: {
    sentence_length: 'mixed',
    pacing: 'slow',
    confirm_details: true,
    summarize_handoff: true,
  },
  enterprise: {
    sentence_length: 'long',
    pacing: 'slow',
    confirm_details: true,
    summarize_handoff: true,
  },
};

// ============================================================================
// Channel-Specific Defaults
// ============================================================================

const DEFAULT_VOICE_CONFIG: VoiceChannelConfig = {
  speech_rate_wpm: 160,
  pause_frequency: 'medium',
  pronunciation_style: 'clear',
};

const DEFAULT_SMS_CONFIG: SmsChannelConfig = {
  max_chars: 240,
  tone_adjustment: 'shorter',
};

const DEFAULT_EMAIL_CONFIG: EmailChannelConfig = {
  structure: 'bullets',
  signoff: '— The Team',
};

// Voice tuning by pacing
const VOICE_CONFIG_BY_PACING: Record<Pacing, Partial<VoiceChannelConfig>> = {
  fast: { speech_rate_wpm: 175, pause_frequency: 'low' },
  balanced: { speech_rate_wpm: 160, pause_frequency: 'medium' },
  slow: { speech_rate_wpm: 145, pause_frequency: 'high' },
};

// ============================================================================
// Default Agent Names by Role
// ============================================================================

const DEFAULT_NAMES: Record<AgentType, string[]> = {
  sales_qualifier: ['Alex', 'Jordan', 'Taylor', 'Morgan'],
  appointment_setter: ['Sam', 'Casey', 'Riley', 'Jamie'],
  customer_support: ['Emma', 'Olivia', 'Sophia', 'Mia'],
  faq_bot: ['Assistant', 'Helper', 'Guide', 'Info'],
  product_recommender: ['Max', 'Leo', 'Zoe', 'Ava'],
  lead_nurturer: ['Grace', 'Lily', 'Hannah', 'Chloe'],
  survey_agent: ['Quinn', 'Parker', 'Avery', 'Blake'],
  lead_capture: ['Chris', 'Dana', 'Drew', 'Devon'],
  booking_assistant: ['Kim', 'Pat', 'Robin', 'Sage'],
  onboarding_guide: ['Ellis', 'Finley', 'Harper', 'Rowan'],
};

// ============================================================================
// Governance Constants
// ============================================================================

const UNIVERSAL_DISALLOWED_TOPICS = [
  'legal_advice',
  'medical_diagnosis',
  'financial_guarantees',
  'competitor_defamation',
  'discriminatory_content',
];

const UNIVERSAL_ESCALATION_TRIGGERS = [
  'angry_customer',
  'legal_threat',
  'human_request',
  'safety_concern',
];

const FORBIDDEN_PHRASES_GOVERNANCE = [
  'I guarantee',
  'I promise',
  'trust me',
  '100% certain',
  'no risk',
  'definitely will',
];

// ============================================================================
// Main Engine Function
// ============================================================================

export function generatePersonality(input: PersonalityGenerationInput): PersonalityGenerationResult {
  const evidence: EvidenceItem[] = [];
  const reasoning: string[] = [];
  const gaps: PersonalityGap[] = [];
  const dimensionConfidence: DimensionConfidence[] = [];

  // Get template base
  const templateBase = TEMPLATE_PERSONALITY_BASES[input.agent_type];
  reasoning.push(`Base personality from ${input.agent_type} template`);

  // Initialize values from template
  let toneTraits = [...templateBase.tone_traits];
  let formality = templateBase.formality;
  let enthusiasm = templateBase.enthusiasm;
  let empathy = templateBase.empathy;
  let humor = templateBase.humor;
  let vocabularyStyle = templateBase.vocabulary_style;
  let sentenceLength = templateBase.sentence_length;
  let pacing = templateBase.pacing;
  let askPermission = templateBase.ask_permission;
  let confirmDetails = templateBase.confirm_details;
  let summarizeHandoff = templateBase.summarize_handoff;
  let allowedTopics = [...templateBase.allowed_topics];
  let escalationTriggers = [...templateBase.escalation_triggers, ...UNIVERSAL_ESCALATION_TRIGGERS];
  let disallowedTopics = [...UNIVERSAL_DISALLOWED_TOPICS];
  let complianceMode: ComplianceMode = input.compliance_mode || 'standard';
  let fillerWords: FillerWords = 'light';
  let contractionUse: ContractionUse = 'medium';
  let forbiddenPhrases = [...FORBIDDEN_PHRASES_GOVERNANCE];
  let preferredPhrases: string[] = [];

  evidence.push({
    field_path: 'tone.traits',
    source: 'template_base',
    reasoning: `${input.agent_type} agents typically use ${toneTraits.join(', ')} tone`,
  });

  // =========================================================================
  // Apply Industry Adjustments
  // =========================================================================
  if (input.industry) {
    const industryKey = input.industry.toLowerCase().replace(/[^a-z]/g, '_');
    const industryAdj = INDUSTRY_ADJUSTMENTS[industryKey];

    if (industryAdj) {
      reasoning.push(`Applied ${input.industry} industry personality norms`);

      if (industryAdj.formality_delta) {
        formality = clampScale(formality + industryAdj.formality_delta);
        evidence.push({
          field_path: 'tone.formality',
          source: 'industry_norm',
          reasoning: `${input.industry} industry expects ${industryAdj.formality_delta > 0 ? 'higher' : 'lower'} formality`,
        });
      }

      if (industryAdj.empathy_delta) {
        empathy = clampScale(empathy + industryAdj.empathy_delta);
      }

      if (industryAdj.enthusiasm_delta) {
        enthusiasm = clampScale(enthusiasm + industryAdj.enthusiasm_delta);
      }

      if (industryAdj.humor_delta) {
        humor = clampScale(humor + industryAdj.humor_delta);
      }

      if (industryAdj.vocabulary_style) {
        vocabularyStyle = industryAdj.vocabulary_style;
        evidence.push({
          field_path: 'language.vocabulary_style',
          source: 'industry_norm',
          reasoning: `${input.industry} industry typically uses ${industryAdj.vocabulary_style} vocabulary`,
        });
      }

      if (industryAdj.compliance_mode) {
        complianceMode = industryAdj.compliance_mode;
      }

      if (industryAdj.pacing) {
        pacing = industryAdj.pacing;
      }

      if (industryAdj.additional_escalation_triggers) {
        escalationTriggers.push(...industryAdj.additional_escalation_triggers);
      }

      if (industryAdj.disallowed_topics) {
        disallowedTopics.push(...industryAdj.disallowed_topics);
      }
    }
  }

  // =========================================================================
  // Apply Business Model Adjustments
  // =========================================================================
  if (input.business_model) {
    const businessAdj = BUSINESS_MODEL_ADJUSTMENTS[input.business_model];

    if (businessAdj) {
      reasoning.push(`Adjusted for ${input.business_model} business model`);

      if (businessAdj.formality_delta) {
        formality = clampScale(formality + businessAdj.formality_delta);
      }

      if (businessAdj.vocabulary_style) {
        vocabularyStyle = businessAdj.vocabulary_style;
      }

      if (businessAdj.sentence_length) {
        sentenceLength = businessAdj.sentence_length;
      }

      if (businessAdj.pacing) {
        pacing = businessAdj.pacing;
      }

      if (businessAdj.confirm_details !== undefined) {
        confirmDetails = businessAdj.confirm_details;
      }
    }
  }

  // =========================================================================
  // Apply Sales Complexity Adjustments
  // =========================================================================
  if (input.sales_complexity) {
    const complexityAdj = COMPLEXITY_ADJUSTMENTS[input.sales_complexity];

    if (complexityAdj) {
      reasoning.push(`Tuned for ${input.sales_complexity} sales complexity`);

      if (complexityAdj.sentence_length) {
        sentenceLength = complexityAdj.sentence_length;
      }

      if (complexityAdj.pacing) {
        pacing = complexityAdj.pacing;
      }

      if (complexityAdj.confirm_details !== undefined) {
        confirmDetails = complexityAdj.confirm_details;
      }

      if (complexityAdj.summarize_handoff !== undefined) {
        summarizeHandoff = complexityAdj.summarize_handoff;
      }
    }
  }

  // =========================================================================
  // Apply Brand Voice Overlay (Highest Priority)
  // =========================================================================
  if (input.brand_voice) {
    const bv = input.brand_voice;

    if (bv.tone_traits && bv.tone_traits.length > 0) {
      toneTraits = bv.tone_traits;
      evidence.push({
        field_path: 'tone.traits',
        source: 'brand_voice',
        quote: bv.tone_traits.join(', '),
        reasoning: 'Brand voice defines specific tone traits',
      });
    }

    if (bv.formality !== undefined) {
      formality = clampScale(bv.formality);
      evidence.push({
        field_path: 'tone.formality',
        source: 'brand_voice',
        reasoning: `Brand voice specifies formality level ${bv.formality}`,
      });
    }

    if (bv.vocabulary_style) {
      vocabularyStyle = bv.vocabulary_style;
      evidence.push({
        field_path: 'language.vocabulary_style',
        source: 'brand_voice',
        reasoning: `Brand voice specifies ${bv.vocabulary_style} vocabulary`,
      });
    }

    if (bv.do_say && bv.do_say.length > 0) {
      preferredPhrases = bv.do_say;
      evidence.push({
        field_path: 'language.preferred_phrases',
        source: 'brand_voice',
        reasoning: 'Brand voice defines preferred phrases',
      });
    }

    if (bv.dont_say && bv.dont_say.length > 0) {
      forbiddenPhrases = [...forbiddenPhrases, ...bv.dont_say];
      evidence.push({
        field_path: 'language.forbidden_phrases',
        source: 'brand_voice',
        reasoning: 'Brand voice defines forbidden phrases',
      });
    }

    if (bv.humor_allowed !== undefined) {
      humor = bv.humor_allowed ? (Math.max(humor, 1) as ToneConfig['humor']) : 0;
    }
  } else {
    // No brand voice - add gap
    gaps.push({
      missing_field: 'brand_voice',
      question: 'How should your brand sound? (professional/friendly/casual)',
      options: ['professional', 'friendly', 'casual', 'authoritative', 'empathetic'],
      importance: 'recommended',
    });
  }

  // =========================================================================
  // Channel Tuning
  // =========================================================================
  const hasVoice = input.channels?.includes('VOICE');
  const hasSms = input.channels?.includes('SMS');
  const hasEmail = input.channels?.includes('EMAIL');

  // Voice channel adjustments
  if (hasVoice) {
    // Reduce complex language for voice
    if (sentenceLength === 'long') {
      sentenceLength = 'mixed';
      evidence.push({
        field_path: 'language.sentence_length',
        source: 'channel_rule',
        reasoning: 'Voice channel requires shorter sentences for clarity',
      });
    }

    // Reduce humor unless explicitly brand-approved
    if (!input.brand_voice?.humor_allowed && humor > 1) {
      humor = 1;
      evidence.push({
        field_path: 'tone.humor',
        source: 'channel_rule',
        reasoning: 'Voice channel limits humor for clarity',
      });
    }

    fillerWords = 'light'; // Some fillers help voice sound natural
    contractionUse = 'high'; // Contractions sound more natural in speech
  }

  // Build voice config
  const voiceConfig: VoiceChannelConfig = {
    ...DEFAULT_VOICE_CONFIG,
    ...VOICE_CONFIG_BY_PACING[pacing],
  };

  // Build SMS config
  const smsConfig: SmsChannelConfig = {
    ...DEFAULT_SMS_CONFIG,
  };

  // Build email config
  const emailSignoff = input.company_name
    ? `— ${input.company_name} Team`
    : input.brand_voice?.brand_name
      ? `— ${input.brand_voice.brand_name} Team`
      : DEFAULT_EMAIL_CONFIG.signoff;

  const emailConfig: EmailChannelConfig = {
    ...DEFAULT_EMAIL_CONFIG,
    signoff: emailSignoff,
    structure: sentenceLength === 'long' ? 'paragraphs' : 'bullets',
  };

  // =========================================================================
  // Build Persona
  // =========================================================================
  const agentName = DEFAULT_NAMES[input.agent_type][0]; // Pick first default
  const companyRef = input.company_name || input.brand_voice?.brand_name || 'our';

  const persona: PersonaConfig = {
    name: agentName,
    role_title: input.template_name || templateBase.role_title,
    backstory_one_liner: templateBase.backstory_template.replace('{company}', companyRef),
  };

  // =========================================================================
  // Governance Constraints
  // =========================================================================
  if (input.pii_strict) {
    complianceMode = 'strict';
    confirmDetails = true;
    evidence.push({
      field_path: 'role_boundaries.compliance_mode',
      source: 'governance',
      reasoning: 'PII strict mode requires strict compliance',
    });
  }

  // =========================================================================
  // Build Final Config
  // =========================================================================
  const personality: PersonalityConfig = {
    persona,
    tone: {
      traits: toneTraits,
      formality,
      enthusiasm,
      empathy,
      humor,
    },
    language: {
      vocabulary_style: vocabularyStyle,
      sentence_length: sentenceLength,
      filler_words: fillerWords,
      contraction_use: contractionUse,
      forbidden_phrases: [...new Set(forbiddenPhrases)], // dedupe
      preferred_phrases: preferredPhrases,
    },
    conversation_style: {
      ask_permission_before_actions: askPermission,
      confirm_critical_details: confirmDetails,
      summarize_before_handoff: summarizeHandoff,
      handle_interruptions: empathy >= 3 ? 'graceful' : 'direct',
      pacing,
    },
    role_boundaries: {
      allowed_topics: [...new Set(allowedTopics)],
      disallowed_topics: [...new Set(disallowedTopics)],
      compliance_mode: complianceMode,
      escalation_triggers: [...new Set(escalationTriggers)],
    },
    channel_tuning: {
      voice: voiceConfig,
      sms: smsConfig,
      email: emailConfig,
    },
  };

  // =========================================================================
  // Calculate Confidence
  // =========================================================================
  let confidence = 0.5; // Base

  // Add confidence for each input present
  if (input.industry) confidence += 0.1;
  if (input.business_model) confidence += 0.1;
  if (input.sales_complexity) confidence += 0.05;
  if (input.brand_voice) confidence += 0.15;
  if (input.brand_voice?.tone_traits) confidence += 0.05;
  if (input.brand_voice?.formality !== undefined) confidence += 0.05;

  // Build dimension confidence
  dimensionConfidence.push({
    dimension: 'tone',
    confidence: input.brand_voice?.tone_traits ? 0.9 : input.industry ? 0.7 : 0.5,
    evidence: evidence.filter((e) => e.field_path.startsWith('tone.')),
  });

  dimensionConfidence.push({
    dimension: 'language',
    confidence: input.brand_voice?.vocabulary_style ? 0.9 : input.industry ? 0.7 : 0.5,
    evidence: evidence.filter((e) => e.field_path.startsWith('language.')),
  });

  dimensionConfidence.push({
    dimension: 'conversation_style',
    confidence: input.sales_complexity ? 0.8 : 0.6,
    evidence: evidence.filter((e) => e.field_path.startsWith('conversation_style.')),
  });

  dimensionConfidence.push({
    dimension: 'role_boundaries',
    confidence: input.industry ? 0.8 : 0.6,
    evidence: evidence.filter((e) => e.field_path.startsWith('role_boundaries.')),
  });

  dimensionConfidence.push({
    dimension: 'channel_tuning',
    confidence: input.channels?.length ? 0.8 : 0.5,
    evidence: evidence.filter((e) => e.field_path.startsWith('channel_tuning.')),
  });

  // Add more gaps for missing recommended data
  if (!input.industry) {
    gaps.push({
      missing_field: 'industry',
      question: 'What industry is your business in?',
      importance: 'recommended',
    });
  }

  if (!input.company_name && !input.brand_voice?.brand_name) {
    gaps.push({
      missing_field: 'company_name',
      question: 'What is your company or brand name?',
      importance: 'recommended',
    });
  }

  return {
    personality,
    confidence: Math.min(confidence, 1),
    dimension_confidence: dimensionConfidence,
    evidence,
    gaps,
    reasoning,
  };
}

// ============================================================================
// Builder Function
// ============================================================================

export interface EnrichmentForPersonality {
  company?: {
    name?: string;
    industry?: string;
    sub_industry?: string;
    business_model?: BusinessModel;
    sales_complexity?: SalesComplexity;
  };
  brand_brain?: {
    tone_traits?: string[];
    formality_level?: number;
    vocabulary_style?: VocabularyStyle;
    do_say?: string[];
    dont_say?: string[];
    brand_name?: string;
    humor_allowed?: boolean;
  };
  tools?: {
    channels?: Array<'VOICE' | 'SMS' | 'EMAIL' | 'CHAT'>;
  };
}

export function buildPersonalityInput(
  agentType: AgentType,
  templateName?: string,
  enrichment?: EnrichmentForPersonality
): PersonalityGenerationInput {
  const input: PersonalityGenerationInput = {
    agent_type: agentType,
    template_name: templateName,
  };

  if (enrichment?.company) {
    input.company_name = enrichment.company.name;
    input.industry = enrichment.company.industry;
    input.sub_industry = enrichment.company.sub_industry;
    input.business_model = enrichment.company.business_model;
    input.sales_complexity = enrichment.company.sales_complexity;
  }

  if (enrichment?.brand_brain) {
    input.brand_voice = {
      tone_traits: enrichment.brand_brain.tone_traits,
      formality: enrichment.brand_brain.formality_level,
      vocabulary_style: enrichment.brand_brain.vocabulary_style,
      do_say: enrichment.brand_brain.do_say,
      dont_say: enrichment.brand_brain.dont_say,
      brand_name: enrichment.brand_brain.brand_name,
      humor_allowed: enrichment.brand_brain.humor_allowed,
    };
  }

  if (enrichment?.tools?.channels) {
    input.channels = enrichment.tools.channels;
  }

  return input;
}

// ============================================================================
// Helper Functions
// ============================================================================

function clampScale(value: number): 0 | 1 | 2 | 3 | 4 {
  return Math.max(0, Math.min(4, Math.round(value))) as 0 | 1 | 2 | 3 | 4;
}

export function getTemplatePersonalityBase(agentType: AgentType): TemplatePersonalityBase {
  return TEMPLATE_PERSONALITY_BASES[agentType];
}

export function getIndustryAdjustment(industry: string): IndustryAdjustment | undefined {
  const key = industry.toLowerCase().replace(/[^a-z]/g, '_');
  return INDUSTRY_ADJUSTMENTS[key];
}

export function getSupportedIndustries(): string[] {
  return Object.keys(INDUSTRY_ADJUSTMENTS);
}

/**
 * Validate a personality config for completeness and consistency
 */
export function validatePersonality(
  personality: PersonalityConfig
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check required fields
  if (!personality.persona.name) {
    issues.push('Persona name is required');
  }

  if (!personality.persona.role_title) {
    issues.push('Role title is required');
  }

  // Check tone scales
  const toneFields = ['formality', 'enthusiasm', 'empathy', 'humor'] as const;
  for (const field of toneFields) {
    const value = personality.tone[field];
    if (value < 0 || value > 4) {
      issues.push(`tone.${field} must be 0-4, got ${value}`);
    }
  }

  // Check for conflicting traits
  if (personality.tone.humor >= 3 && personality.role_boundaries.compliance_mode === 'strict') {
    issues.push('High humor level may conflict with strict compliance mode');
  }

  // Check voice config
  if (
    personality.channel_tuning.voice.speech_rate_wpm < 100 ||
    personality.channel_tuning.voice.speech_rate_wpm > 200
  ) {
    issues.push('Voice speech rate should be 100-200 WPM');
  }

  // Check SMS config
  if (personality.channel_tuning.sms.max_chars < 100 || personality.channel_tuning.sms.max_chars > 500) {
    issues.push('SMS max chars should be 100-500');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Get a human-readable summary of the personality
 */
export function describePersonality(personality: PersonalityConfig): string {
  const traits: string[] = [];

  // Tone traits
  traits.push(...personality.tone.traits);

  // Formality
  if (personality.tone.formality >= 3) traits.push('formal');
  else if (personality.tone.formality <= 1) traits.push('casual');

  // Pacing
  traits.push(`${personality.conversation_style.pacing}-paced`);

  // Key behavioral traits
  if (personality.tone.empathy >= 3) traits.push('highly empathetic');
  if (personality.tone.enthusiasm >= 3) traits.push('energetic');
  if (personality.tone.humor >= 2) traits.push('lighthearted');

  return traits.join(', ');
}

/**
 * Get default agent names for a template type
 */
export function getDefaultAgentNames(agentType: AgentType): string[] {
  return DEFAULT_NAMES[agentType];
}

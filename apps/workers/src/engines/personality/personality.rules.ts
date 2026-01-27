/**
 * Personality Engine v1 - Rules Builder
 *
 * Builds personality configuration from:
 * - Template defaults (base)
 * - Brand voice hints (overlay)
 * - Channel constraints (adjustments)
 * - Industry guardrails (safety)
 *
 * @module engines/personality/rules
 */

import type { AgentType } from "@epic-ai/shared";
import {
  getTemplatePersonalityDefaults,
  normalizeVoiceTone,
  normalizeSentenceComplexity,
} from "./personality.catalog";
import type {
  PersonalityConfig,
  BrandVoiceHints,
  LanguageStyle,
  PersonalityEvidence,
  VoiceTone,
  ConversationPace,
} from "./personality.types";

// ============================================
// CHANNEL CONSTRAINTS
// ============================================

/** Channel-specific adjustments */
interface ChannelConstraints {
  maxFormality?: number;
  minFormality?: number;
  paceOverride?: ConversationPace;
  emojiAllowed?: boolean;
  complexityLimit?: "simple" | "moderate";
}

/** Get constraints for a channel */
function getChannelConstraints(channel: string): ChannelConstraints {
  switch (channel.toLowerCase()) {
    case "sms":
    case "whatsapp":
      return {
        maxFormality: 3,
        paceOverride: "fast",
        emojiAllowed: true,
        complexityLimit: "simple",
      };
    case "email":
      return {
        minFormality: 3,
        complexityLimit: "moderate",
      };
    case "voice":
    case "phone":
      return {
        paceOverride: "moderate",
        complexityLimit: "simple",
        emojiAllowed: false,
      };
    case "webchat":
    case "chat":
      return {
        paceOverride: "fast",
        emojiAllowed: true,
      };
    default:
      return {};
  }
}

// ============================================
// INDUSTRY GUARDRAILS
// ============================================

/** Industries that require conservative personality */
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

/** Check if industry requires conservative settings */
function isConservativeIndustry(industry?: string): boolean {
  if (!industry) return false;
  const normalized = industry.toLowerCase();
  return CONSERVATIVE_INDUSTRIES.some(
    (ind) => normalized.includes(ind) || ind.includes(normalized)
  );
}

/** Get industry guardrails */
function getIndustryGuardrails(industry?: string): Partial<PersonalityConfig> {
  if (!isConservativeIndustry(industry)) {
    return {};
  }

  return {
    humor_level: 0,
    formality: 4,
    voice_tone: "professional",
  };
}

// ============================================
// BRAND VOICE APPLICATION
// ============================================

/** Apply brand voice hints to config */
function applyBrandVoice(
  config: Partial<PersonalityConfig>,
  brandVoice: BrandVoiceHints,
  evidence: PersonalityEvidence[]
): Partial<PersonalityConfig> {
  const result = { ...config };

  // Apply detected tone
  if (brandVoice.detected_tone) {
    result.voice_tone = normalizeVoiceTone(brandVoice.detected_tone);
    evidence.push({
      source_type: "website_scrape",
      field_path: "voice_tone",
      confidence: brandVoice.detection_confidence ?? 0.7,
      reasoning: `Detected tone "${brandVoice.detected_tone}" from brand content`,
    });
  }

  // Apply formality level
  if (brandVoice.formality_level !== undefined) {
    result.formality = Math.max(1, Math.min(5, brandVoice.formality_level));
    evidence.push({
      source_type: "website_scrape",
      field_path: "formality",
      confidence: brandVoice.detection_confidence ?? 0.7,
      reasoning: `Detected formality level ${brandVoice.formality_level} from brand content`,
    });
  }

  // Apply emoji usage
  if (brandVoice.uses_emojis !== undefined) {
    result.use_emojis = brandVoice.uses_emojis;
    evidence.push({
      source_type: "website_scrape",
      field_path: "use_emojis",
      confidence: brandVoice.detection_confidence ?? 0.7,
      reasoning: brandVoice.uses_emojis
        ? "Brand content uses emojis"
        : "Brand content avoids emojis",
    });
  }

  // Apply sentence complexity to language style
  if (brandVoice.sentence_complexity) {
    const complexity = normalizeSentenceComplexity(brandVoice.sentence_complexity);
    result.language_style = {
      ...(result.language_style || {}),
      complexity,
    } as LanguageStyle;
    evidence.push({
      source_type: "website_scrape",
      field_path: "language_style.complexity",
      confidence: brandVoice.detection_confidence ?? 0.6,
      reasoning: `Detected ${brandVoice.sentence_complexity} sentence complexity`,
    });
  }

  // Apply jargon usage
  if (brandVoice.uses_technical_jargon !== undefined) {
    result.language_style = {
      ...(result.language_style || {}),
      use_jargon: brandVoice.uses_technical_jargon,
    } as LanguageStyle;
    evidence.push({
      source_type: "website_scrape",
      field_path: "language_style.use_jargon",
      confidence: brandVoice.detection_confidence ?? 0.6,
      reasoning: brandVoice.uses_technical_jargon
        ? "Brand uses technical jargon"
        : "Brand avoids technical jargon",
    });
  }

  // Apply sample phrases as preferred
  if (brandVoice.sample_phrases?.length) {
    result.preferred_phrases = brandVoice.sample_phrases.slice(0, 10);
    evidence.push({
      source_type: "website_scrape",
      field_path: "preferred_phrases",
      confidence: brandVoice.detection_confidence ?? 0.5,
      reasoning: `Extracted ${brandVoice.sample_phrases.length} sample phrases from brand content`,
    });
  }

  // Apply avoided words
  if (brandVoice.avoided_words?.length) {
    result.avoided_phrases = brandVoice.avoided_words.slice(0, 10);
    evidence.push({
      source_type: "website_scrape",
      field_path: "avoided_phrases",
      confidence: brandVoice.detection_confidence ?? 0.5,
      reasoning: `Identified ${brandVoice.avoided_words.length} words/phrases to avoid`,
    });
  }

  return result;
}

// ============================================
// CHANNEL CONSTRAINTS APPLICATION
// ============================================

/** Apply channel constraints to config */
function applyChannelConstraints(
  config: Partial<PersonalityConfig>,
  channels: string[],
  evidence: PersonalityEvidence[]
): Partial<PersonalityConfig> {
  const result = { ...config };

  // Merge constraints from all channels
  for (const channel of channels) {
    const constraints = getChannelConstraints(channel);

    // Apply formality bounds
    if (constraints.maxFormality !== undefined) {
      const current = result.formality ?? 3;
      if (current > constraints.maxFormality) {
        result.formality = constraints.maxFormality;
        evidence.push({
          source_type: "channel_constraint",
          field_path: "formality",
          confidence: 1.0,
          reasoning: `${channel} channel limits formality to ${constraints.maxFormality}`,
        });
      }
    }

    if (constraints.minFormality !== undefined) {
      const current = result.formality ?? 3;
      if (current < constraints.minFormality) {
        result.formality = constraints.minFormality;
        evidence.push({
          source_type: "channel_constraint",
          field_path: "formality",
          confidence: 1.0,
          reasoning: `${channel} channel requires minimum formality of ${constraints.minFormality}`,
        });
      }
    }

    // Apply pace override
    if (constraints.paceOverride) {
      result.pace = constraints.paceOverride;
      evidence.push({
        source_type: "channel_constraint",
        field_path: "pace",
        confidence: 1.0,
        reasoning: `${channel} channel requires ${constraints.paceOverride} pace`,
      });
    }

    // Apply emoji restriction
    if (constraints.emojiAllowed === false) {
      result.use_emojis = false;
      evidence.push({
        source_type: "channel_constraint",
        field_path: "use_emojis",
        confidence: 1.0,
        reasoning: `${channel} channel does not support emojis`,
      });
    }

    // Apply complexity limit
    if (constraints.complexityLimit) {
      const currentStyle = result.language_style || ({} as LanguageStyle);
      const currentComplexity = currentStyle.complexity || "moderate";

      // Only downgrade complexity, never upgrade
      const complexityOrder = ["simple", "moderate", "sophisticated"];
      const limitIndex = complexityOrder.indexOf(constraints.complexityLimit);
      const currentIndex = complexityOrder.indexOf(currentComplexity);

      if (currentIndex > limitIndex) {
        result.language_style = {
          ...currentStyle,
          complexity: constraints.complexityLimit,
        } as LanguageStyle;
        evidence.push({
          source_type: "channel_constraint",
          field_path: "language_style.complexity",
          confidence: 1.0,
          reasoning: `${channel} channel limits complexity to ${constraints.complexityLimit}`,
        });
      }
    }
  }

  return result;
}

// ============================================
// DEFAULT LANGUAGE STYLE
// ============================================

/** Get default language style */
function getDefaultLanguageStyle(): LanguageStyle {
  return {
    complexity: "moderate",
    sentence_length: "medium",
    use_contractions: true,
    use_jargon: false,
    locale: "en-US",
  };
}

/** Get default greeting for template */
function getDefaultGreeting(templateKey: AgentType): string {
  switch (templateKey) {
    case "sales_qualifier":
      return "Hello! I'm here to help you find the right solution for your needs.";
    case "appointment_setter":
      return "Hi there! I'd be happy to help you schedule an appointment.";
    case "customer_support":
      return "Hello! I'm here to help. How can I assist you today?";
    case "lead_capture":
      return "Welcome! I'd love to learn more about what you're looking for.";
    case "faq_bot":
      return "Hi! I'm here to answer your questions. What would you like to know?";
    case "onboarding_guide":
      return "Welcome aboard! I'm excited to help you get started.";
    case "booking_assistant":
      return "Hello! Ready to help you make a reservation.";
    case "product_recommender":
      return "Hi! Let me help you find the perfect product.";
    default:
      return "Hi! How can I help you today?";
  }
}

/** Get default signoff for template */
function getDefaultSignoff(templateKey: AgentType): string {
  switch (templateKey) {
    case "sales_qualifier":
      return "Is there anything else you'd like to discuss before we proceed?";
    case "appointment_setter":
      return "Is there anything else I can help you with regarding your appointment?";
    case "customer_support":
      return "Is there anything else I can help you with today?";
    case "lead_capture":
      return "Thanks for chatting! Feel free to reach out if you have more questions.";
    case "faq_bot":
      return "Any other questions I can help answer?";
    case "onboarding_guide":
      return "You're doing great! Let me know if you need any help.";
    case "booking_assistant":
      return "Anything else I can help you with for your booking?";
    case "product_recommender":
      return "Would you like me to help you find anything else?";
    default:
      return "Is there anything else I can help you with?";
  }
}

// ============================================
// MAIN BUILD FUNCTION
// ============================================

/** Build result with config and evidence */
export interface BuildPersonalityResult {
  config: PersonalityConfig;
  evidence: PersonalityEvidence[];
}

/** Build personality configuration from all sources */
export function buildPersonalityConfig(params: {
  templateKey: AgentType;
  companyName?: string;
  industry?: string;
  brandVoice?: BrandVoiceHints | null;
  channels?: string[];
}): BuildPersonalityResult {
  const { templateKey, industry, brandVoice, channels = [] } = params;
  const evidence: PersonalityEvidence[] = [];

  // 1. Start with template defaults
  const templateDefaults = getTemplatePersonalityDefaults(templateKey);
  let config: Partial<PersonalityConfig> = {
    voice_tone: templateDefaults.voice_tone,
    formality: templateDefaults.formality,
    humor_level: templateDefaults.humor_level,
    empathy_level: templateDefaults.empathy_level,
    pace: templateDefaults.pace,
    use_emojis: templateDefaults.use_emojis,
  };

  evidence.push({
    source_type: "template_default",
    field_path: "*",
    confidence: 1.0,
    reasoning: `Applied ${templateKey} template defaults`,
  });

  // 2. Apply brand voice hints (if available)
  if (brandVoice) {
    config = applyBrandVoice(config, brandVoice, evidence);
  }

  // 3. Apply channel constraints
  if (channels.length > 0) {
    config = applyChannelConstraints(config, channels, evidence);
  }

  // 4. Apply industry guardrails (safety override)
  const industryGuardrails = getIndustryGuardrails(industry);
  if (Object.keys(industryGuardrails).length > 0) {
    // Industry guardrails override everything
    if (industryGuardrails.humor_level !== undefined) {
      config.humor_level = industryGuardrails.humor_level;
      evidence.push({
        source_type: "inference",
        field_path: "humor_level",
        confidence: 1.0,
        reasoning: `${industry} industry requires conservative humor settings`,
      });
    }
    if (industryGuardrails.formality !== undefined) {
      config.formality = Math.max(config.formality ?? 3, industryGuardrails.formality);
      evidence.push({
        source_type: "inference",
        field_path: "formality",
        confidence: 1.0,
        reasoning: `${industry} industry requires high formality`,
      });
    }
    if (industryGuardrails.voice_tone !== undefined) {
      config.voice_tone = industryGuardrails.voice_tone;
      evidence.push({
        source_type: "inference",
        field_path: "voice_tone",
        confidence: 1.0,
        reasoning: `${industry} industry requires professional tone`,
      });
    }
  }

  // 5. Fill in remaining defaults
  const finalConfig: PersonalityConfig = {
    voice_tone: config.voice_tone ?? "friendly",
    formality: config.formality ?? 3,
    humor_level: config.humor_level ?? 0,
    empathy_level: config.empathy_level ?? 4,
    pace: config.pace ?? "moderate",
    language_style: {
      ...getDefaultLanguageStyle(),
      ...(config.language_style || {}),
    },
    preferred_phrases: config.preferred_phrases ?? [],
    avoided_phrases: config.avoided_phrases ?? [],
    use_emojis: config.use_emojis ?? false,
    greeting_style: config.greeting_style ?? getDefaultGreeting(templateKey),
    signoff_style: config.signoff_style ?? getDefaultSignoff(templateKey),
  };

  return { config: finalConfig, evidence };
}

// ============================================
// HELPERS
// ============================================

/** Check if brand voice has sufficient data */
export function hasBrandVoiceData(brandVoice?: BrandVoiceHints | null): boolean {
  if (!brandVoice) return false;

  // At least one meaningful field should be present
  return !!(
    brandVoice.detected_tone ||
    brandVoice.formality_level !== undefined ||
    brandVoice.uses_emojis !== undefined ||
    brandVoice.sentence_complexity ||
    brandVoice.uses_technical_jargon !== undefined
  );
}

/** Get confidence score for brand voice */
export function getBrandVoiceConfidence(brandVoice?: BrandVoiceHints | null): number {
  if (!brandVoice) return 0;
  return brandVoice.detection_confidence ?? 0.5;
}

/**
 * Personality Engine v1 - Template Catalog
 *
 * Template-based personality defaults for each agent type.
 * Provides baseline voice/tone/style settings.
 *
 * @module engines/personality/catalog
 */

import type { AgentType } from "@epic-ai/shared";
import type { TemplatePersonalityDefaults, VoiceTone, ConversationPace } from "./personality.types";

// ============================================
// TEMPLATE DEFAULTS
// ============================================

/**
 * Sales Qualifier personality
 * Professional, confident, balanced empathy
 */
function salesQualifierPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "professional",
    formality: 4,
    humor_level: 0,
    empathy_level: 3,
    pace: "moderate",
    use_emojis: false,
  };
}

/**
 * Appointment Setter personality
 * Friendly, helpful, efficient
 */
function appointmentSetterPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "friendly",
    formality: 3,
    humor_level: 1,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: false,
  };
}

/**
 * Customer Support personality
 * Empathetic, patient, solution-oriented
 */
function customerSupportPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "empathetic",
    formality: 3,
    humor_level: 0,
    empathy_level: 5,
    pace: "slow",
    use_emojis: false,
  };
}

/**
 * Lead Capture personality
 * Warm, welcoming, conversational
 */
function leadCapturePersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "warm",
    formality: 3,
    humor_level: 1,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: false,
  };
}

/**
 * FAQ Bot personality
 * Friendly, informative, efficient
 */
function faqBotPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "friendly",
    formality: 3,
    humor_level: 0,
    empathy_level: 3,
    pace: "fast",
    use_emojis: false,
  };
}

/**
 * Onboarding Guide personality
 * Enthusiastic, encouraging, patient
 */
function onboardingGuidePersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "enthusiastic",
    formality: 2,
    humor_level: 2,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: true,
  };
}

/**
 * Booking Assistant personality
 * Friendly, efficient, professional
 */
function bookingAssistantPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "friendly",
    formality: 3,
    humor_level: 0,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: false,
  };
}

/**
 * Product Recommender personality
 * Enthusiastic, knowledgeable, helpful
 */
function productRecommenderPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "enthusiastic",
    formality: 3,
    humor_level: 1,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: false,
  };
}

/**
 * Default/fallback personality
 * Friendly, balanced, professional
 */
function defaultPersonality(): TemplatePersonalityDefaults {
  return {
    voice_tone: "friendly",
    formality: 3,
    humor_level: 0,
    empathy_level: 4,
    pace: "moderate",
    use_emojis: false,
  };
}

// ============================================
// MAIN CATALOG FUNCTION
// ============================================

/**
 * Get template-specific personality defaults
 *
 * @param templateKey Agent template type
 * @returns Personality defaults for the template
 */
export function getTemplatePersonalityDefaults(
  templateKey: AgentType
): TemplatePersonalityDefaults {
  switch (templateKey) {
    case "sales_qualifier":
      return salesQualifierPersonality();
    case "appointment_setter":
      return appointmentSetterPersonality();
    case "customer_support":
      return customerSupportPersonality();
    case "lead_capture":
      return leadCapturePersonality();
    case "faq_bot":
      return faqBotPersonality();
    case "onboarding_guide":
      return onboardingGuidePersonality();
    case "booking_assistant":
      return bookingAssistantPersonality();
    case "product_recommender":
      return productRecommenderPersonality();
    default:
      return defaultPersonality();
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Get description for personality template
 */
export function getPersonalityDescription(templateKey: AgentType): string {
  switch (templateKey) {
    case "sales_qualifier":
      return "Professional, confident tone for qualifying leads";
    case "appointment_setter":
      return "Friendly, efficient tone for booking appointments";
    case "customer_support":
      return "Empathetic, patient tone for resolving issues";
    case "lead_capture":
      return "Warm, welcoming tone for engaging visitors";
    case "faq_bot":
      return "Friendly, informative tone for answering questions";
    case "onboarding_guide":
      return "Enthusiastic, encouraging tone for guiding new users";
    case "booking_assistant":
      return "Friendly, professional tone for scheduling";
    case "product_recommender":
      return "Enthusiastic, knowledgeable tone for product discovery";
    default:
      return "Balanced, friendly tone for general assistance";
  }
}

/**
 * Get list of templates that support custom personality
 */
export function getPersonalitySupportedTemplates(): AgentType[] {
  return [
    "sales_qualifier",
    "appointment_setter",
    "customer_support",
    "lead_capture",
    "faq_bot",
    "onboarding_guide",
    "booking_assistant",
    "product_recommender",
  ];
}

/**
 * Map detected tone to valid voice_tone enum value
 */
export function normalizeVoiceTone(detectedTone: string): VoiceTone {
  const normalized = detectedTone.toLowerCase().trim();

  // Direct matches
  const validTones: VoiceTone[] = [
    "professional",
    "friendly",
    "enthusiastic",
    "empathetic",
    "authoritative",
    "casual",
    "warm",
    "formal",
  ];

  if (validTones.includes(normalized as VoiceTone)) {
    return normalized as VoiceTone;
  }

  // Fuzzy mappings
  if (["corporate", "business", "serious"].includes(normalized)) {
    return "professional";
  }
  if (["happy", "cheerful", "upbeat"].includes(normalized)) {
    return "enthusiastic";
  }
  if (["caring", "understanding", "supportive"].includes(normalized)) {
    return "empathetic";
  }
  if (["relaxed", "informal", "laid-back"].includes(normalized)) {
    return "casual";
  }
  if (["welcoming", "inviting", "personable"].includes(normalized)) {
    return "warm";
  }
  if (["official", "proper", "polished"].includes(normalized)) {
    return "formal";
  }
  if (["expert", "confident", "commanding"].includes(normalized)) {
    return "authoritative";
  }

  // Default fallback
  return "friendly";
}

/**
 * Map complexity to valid enum value
 */
export function normalizeSentenceComplexity(
  complexity: string
): "simple" | "moderate" | "sophisticated" {
  const normalized = complexity.toLowerCase().trim();

  if (normalized === "simple" || normalized === "basic" || normalized === "easy") {
    return "simple";
  }
  if (normalized === "complex" || normalized === "sophisticated" || normalized === "advanced") {
    return "sophisticated";
  }

  return "moderate";
}

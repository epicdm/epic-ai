/**
 * Brain Engine v1 - Template Catalog
 *
 * Template-based brain defaults for each agent type.
 * Provides baseline reasoning, fallback, and context settings.
 *
 * @module engines/brain/catalog
 */

import type { AgentType } from "@epic-ai/shared";
import type { TemplateBrainDefaults, ReasoningApproach, UncertaintyAction } from "./brain.types";

// ============================================
// TEMPLATE DEFAULTS
// ============================================

/**
 * Sales Qualifier brain
 * Direct reasoning, ask for clarification on uncertainty
 */
function salesQualifierBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 3,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I want to make sure I understand your needs correctly. Could you tell me more about that?",
      max_clarifications: 3,
    },
    context_handling: {
      conversation_window: 12,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Appointment Setter brain
 * Direct and efficient, minimal reasoning
 */
function appointmentSetterBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 2,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "Let me make sure I have the right details. Could you confirm?",
      max_clarifications: 2,
    },
    context_handling: {
      conversation_window: 10,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Customer Support brain
 * Deliberative reasoning, patient and thorough
 */
function customerSupportBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "deliberative",
      show_reasoning: false,
      max_reasoning_steps: 4,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I want to help you resolve this. Can you provide a bit more detail about the issue?",
      max_clarifications: 3,
    },
    context_handling: {
      conversation_window: 15,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Lead Capture brain
 * Warm and engaging, quick to understand intent
 */
function leadCaptureBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 2,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I'd love to help! Could you tell me a bit more about what you're looking for?",
      max_clarifications: 2,
    },
    context_handling: {
      conversation_window: 8,
      summarize_long_conversations: true,
    },
  };
}

/**
 * FAQ Bot brain
 * Direct answers, best guess on uncertainty
 */
function faqBotBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 2,
    },
    fallback_behavior: {
      on_uncertainty: "best_guess",
      default_response: "Based on what I understand, here's what I can tell you. Let me know if you need different information.",
      max_clarifications: 2,
    },
    context_handling: {
      conversation_window: 8,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Onboarding Guide brain
 * Patient, step-by-step reasoning
 */
function onboardingGuideBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "chain_of_thought",
      show_reasoning: false,
      max_reasoning_steps: 4,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "No worries! Let me help you with that. What part would you like me to explain further?",
      max_clarifications: 4,
    },
    context_handling: {
      conversation_window: 12,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Booking Assistant brain
 * Efficient, confirmation-focused
 */
function bookingAssistantBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 2,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I want to make sure your booking is correct. Could you confirm the details?",
      max_clarifications: 2,
    },
    context_handling: {
      conversation_window: 10,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Product Recommender brain
 * Exploratory reasoning, understand preferences
 */
function productRecommenderBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "deliberative",
      show_reasoning: false,
      max_reasoning_steps: 3,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "To give you the best recommendations, could you tell me more about what you're looking for?",
      max_clarifications: 3,
    },
    context_handling: {
      conversation_window: 12,
      summarize_long_conversations: true,
    },
  };
}

/**
 * Default/fallback brain
 * Balanced, clarification-focused
 */
function defaultBrain(): TemplateBrainDefaults {
  return {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 3,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response: "I'm not sure I fully understand. Could you please clarify?",
      max_clarifications: 3,
    },
    context_handling: {
      conversation_window: 10,
      summarize_long_conversations: true,
    },
  };
}

// ============================================
// MAIN CATALOG FUNCTION
// ============================================

/**
 * Get template-specific brain defaults
 *
 * @param templateKey Agent template type
 * @returns Brain defaults for the template
 */
export function getTemplateBrainDefaults(
  templateKey: AgentType
): TemplateBrainDefaults {
  switch (templateKey) {
    case "sales_qualifier":
      return salesQualifierBrain();
    case "appointment_setter":
      return appointmentSetterBrain();
    case "customer_support":
      return customerSupportBrain();
    case "lead_capture":
      return leadCaptureBrain();
    case "faq_bot":
      return faqBotBrain();
    case "onboarding_guide":
      return onboardingGuideBrain();
    case "booking_assistant":
      return bookingAssistantBrain();
    case "product_recommender":
      return productRecommenderBrain();
    default:
      return defaultBrain();
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Get description for brain template
 */
export function getBrainDescription(templateKey: AgentType): string {
  switch (templateKey) {
    case "sales_qualifier":
      return "Direct reasoning with clarification-focused fallback";
    case "appointment_setter":
      return "Efficient reasoning for quick scheduling";
    case "customer_support":
      return "Deliberative reasoning for thorough issue resolution";
    case "lead_capture":
      return "Quick reasoning for engaging conversations";
    case "faq_bot":
      return "Direct answers with best-guess fallback";
    case "onboarding_guide":
      return "Step-by-step reasoning for patient guidance";
    case "booking_assistant":
      return "Efficient reasoning with confirmation focus";
    case "product_recommender":
      return "Exploratory reasoning for preference discovery";
    default:
      return "Balanced reasoning with clarification fallback";
  }
}

/**
 * Get list of templates that support custom brain config
 */
export function getBrainSupportedTemplates(): AgentType[] {
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
 * Map string to valid reasoning approach
 */
export function normalizeReasoningApproach(approach: string): ReasoningApproach {
  const normalized = approach.toLowerCase().trim();

  if (normalized === "chain_of_thought" || normalized === "cot") {
    return "chain_of_thought";
  }
  if (normalized === "deliberative" || normalized === "careful") {
    return "deliberative";
  }

  return "direct";
}

/**
 * Map string to valid uncertainty action
 */
export function normalizeUncertaintyAction(action: string): UncertaintyAction {
  const normalized = action.toLowerCase().trim();

  if (normalized === "best_guess" || normalized === "guess") {
    return "best_guess";
  }
  if (normalized === "escalate" || normalized === "handoff") {
    return "escalate";
  }

  return "ask_clarification";
}

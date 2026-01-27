/**
 * Template Engine v1 - Seed Generation
 *
 * Generates starter config seeds based on template and company context.
 * Seeds are minimal - downstream engines specialize them.
 *
 * @module engines/template/seeds
 */

import type { AgentType } from "@epic-ai/shared";
import type {
  CompanyProfileLite,
  BrandVoiceProfileLite,
  RoleCardSeed,
  BrainConfigSeed,
  KnowledgeConfigSeed,
  PersonalitySeed,
  ResponseRule,
} from "./template.types";

// ============================================
// TONE MAPPING
// ============================================

type VoiceTone =
  | "professional"
  | "empathetic"
  | "warm"
  | "authoritative"
  | "casual"
  | "friendly";

/**
 * Map detected brand tone to personality voice tone
 */
function pickTone(brand: BrandVoiceProfileLite): VoiceTone {
  const t = (brand.detected_tone || "").toLowerCase();
  if (t.includes("professional")) return "professional";
  if (t.includes("empathetic")) return "empathetic";
  if (t.includes("warm")) return "warm";
  if (t.includes("authoritative")) return "authoritative";
  if (t.includes("casual")) return "casual";
  return "friendly";
}

// ============================================
// TEMPLATE-SPECIFIC CONTENT
// ============================================

function templateTitle(key: AgentType): string {
  const titles: Record<AgentType, string> = {
    sales_qualifier: "Sales Qualifier",
    appointment_setter: "Appointment Setter",
    customer_support: "Customer Support Agent",
    lead_capture: "Lead Capture Agent",
    booking_assistant: "Booking Assistant",
    faq_bot: "FAQ Assistant",
    onboarding_guide: "Onboarding Guide",
    product_recommender: "Product Recommender",
  };
  return titles[key] || "AI Agent";
}

function templateMission(key: AgentType, companyName: string): string {
  const missions: Record<AgentType, string> = {
    sales_qualifier: `Qualify inbound leads for ${companyName}, collect key requirements, and route/book next steps.`,
    appointment_setter: `Help customers book the right appointment with ${companyName} quickly and accurately.`,
    customer_support: `Resolve common issues for ${companyName} and escalate when needed.`,
    lead_capture: `Capture visitor details and intent for ${companyName}, then route to follow-up.`,
    booking_assistant: `Handle booking requests for ${companyName}, including confirmations and rescheduling.`,
    faq_bot: `Answer frequently asked questions about ${companyName} clearly and consistently.`,
    onboarding_guide: `Guide users through setup and first success with ${companyName}.`,
    product_recommender: `Recommend the best ${companyName} option based on the user's needs and constraints.`,
  };
  return missions[key] || `Assist customers of ${companyName}.`;
}

function defaultGreeting(key: AgentType, companyName: string): string {
  const greetings: Record<AgentType, string> = {
    sales_qualifier: `Hi! Thanks for reaching out to ${companyName}. What are you looking to accomplish?`,
    appointment_setter: `Hi! I can help you schedule with ${companyName}. What day/time works best?`,
    customer_support: `Hi! I'm here to help with ${companyName}. What issue are you running into?`,
    lead_capture: `Hi! Thanks for your interest in ${companyName}. How can I help you today?`,
    booking_assistant: `Hi! I can help you make a booking with ${companyName}. What are you looking for?`,
    faq_bot: `Hi! I can answer questions about ${companyName}. What would you like to know?`,
    onboarding_guide: `Welcome to ${companyName}! I'll help you get started. Ready to begin?`,
    product_recommender: `Hi! I can help you find the right ${companyName} solution. What are your needs?`,
  };
  return (
    greetings[key] ||
    `Hi! Thanks for contacting ${companyName}. How can I help today?`
  );
}

function templateResponseRules(
  key: AgentType,
  companyName: string
): ResponseRule[] {
  const rules: Record<AgentType, ResponseRule[]> = {
    sales_qualifier: [
      {
        name: "capture_intent",
        when: "user describes a need",
        do: "ask 2-4 clarifying questions (budget/timeline/scope) then offer booking",
        examples: [],
      },
      {
        name: "price_if_unknown",
        when: "user asks pricing and pricing is not known",
        do: "explain pricing depends on scope and offer an estimate call",
        examples: [],
      },
    ],
    appointment_setter: [
      {
        name: "calendar_first",
        when: "user wants to book",
        do: "ask for preferred day/time, check availability, confirm booking",
        examples: [],
      },
      {
        name: "collect_basics",
        when: "before confirming appointment",
        do: "collect name, contact, and reason for visit",
        examples: [],
      },
    ],
    customer_support: [
      {
        name: "triage",
        when: "user reports an issue",
        do: "ask for device/order/account details as allowed; propose troubleshooting steps; escalate if unresolved",
        examples: [],
      },
      {
        name: "empathy_first",
        when: "user is frustrated",
        do: "acknowledge the frustration, apologize for inconvenience, then help",
        examples: [],
      },
    ],
    lead_capture: [
      {
        name: "quick_capture",
        when: "user shows interest",
        do: "collect name, email, and key question; confirm follow-up",
        examples: [],
      },
    ],
    booking_assistant: [
      {
        name: "validate_booking",
        when: "user requests a booking",
        do: "verify availability, party size, special requirements; confirm details",
        examples: [],
      },
    ],
    faq_bot: [
      {
        name: "answer_accurately",
        when: "user asks a question",
        do: "provide accurate answer from knowledge base; if unsure, offer to connect with human",
        examples: [],
      },
    ],
    onboarding_guide: [
      {
        name: "step_by_step",
        when: "user starts onboarding",
        do: "guide through setup steps one at a time; celebrate progress",
        examples: [],
      },
    ],
    product_recommender: [
      {
        name: "needs_discovery",
        when: "user asks for recommendation",
        do: "ask about needs, budget, constraints; recommend best-fit option with reasoning",
        examples: [],
      },
    ],
  };

  return (
    rules[key] || [
      {
        name: "be_clear",
        when: "always",
        do: `be concise and helpful; keep responses aligned to ${companyName} offerings`,
        examples: [],
      },
    ]
  );
}

function buildContextBlurb(input: {
  templateKey: AgentType;
  company: CompanyProfileLite;
  brand: BrandVoiceProfileLite;
}): string {
  const services = (input.company.services || [])
    .slice(0, 6)
    .map((s) => s.name)
    .filter(Boolean);
  const products = (input.company.products || [])
    .slice(0, 6)
    .map((p) => p.name)
    .filter(Boolean);

  const parts: string[] = [];

  if (input.company.industry) {
    parts.push(`Industry: ${input.company.industry}.`);
  }

  if (services.length > 0 || products.length > 0) {
    const offerings = [...services, ...products].slice(0, 8).join(", ");
    parts.push(`Offerings: ${offerings}.`);
  }

  if (input.company.target_audience) {
    parts.push(`Target: ${input.company.target_audience}.`);
  }

  return parts.join(" ");
}

// ============================================
// SEED BUILDER
// ============================================

export interface BuildSeedsInput {
  templateKey: AgentType;
  company: CompanyProfileLite;
  brand: BrandVoiceProfileLite;
}

export interface TemplateSeeds {
  role_card: RoleCardSeed;
  brain_config: BrainConfigSeed;
  knowledge_config: KnowledgeConfigSeed;
  personality_seed: PersonalitySeed;
}

/**
 * Build starter config seeds for a template
 *
 * Seeds are minimal - they provide a starting point.
 * Downstream engines (Personality, Knowledge, etc.) will specialize them.
 *
 * @param input Template and company context
 * @returns Config seeds
 */
export function buildTemplateSeeds(input: BuildSeedsInput): TemplateSeeds {
  const companyName = input.company.name || "Company";
  const tone = pickTone(input.brand);

  // Role Card Seed
  const role_card: RoleCardSeed = {
    name: `${companyName} Agent`,
    title: templateTitle(input.templateKey),
    company: companyName,
    mission: templateMission(input.templateKey, companyName),
    boundaries: [
      "Do not fabricate pricing, hours, or policies.",
      "If unsure, ask clarifying questions or escalate.",
      "Keep PII minimal and follow governance rules.",
    ],
    escalation_rules: [
      { trigger: "user requests a human", action: "transfer" },
      {
        trigger: "legal/medical/financial advice",
        action: "notify",
        message: "High-stakes topic",
      },
    ],
    context: buildContextBlurb(input),
  };

  // Brain Config Seed
  const brain_config: BrainConfigSeed = {
    reasoning_strategy: {
      approach: "direct",
      show_reasoning: false,
      max_reasoning_steps: 3,
    },
    fallback_behavior: {
      on_uncertainty: "ask_clarification",
      default_response:
        "I want to make sure I understand—can you clarify a bit?",
      max_clarifications: 3,
    },
    context_handling: {
      conversation_window: 10,
      summarize_long_conversations: true,
      track_entities: [],
    },
    decision_policies: [],
    response_rules: templateResponseRules(input.templateKey, companyName),
  };

  // Knowledge Config Seed (empty - Knowledge Engine fills this)
  const knowledge_config: KnowledgeConfigSeed = {
    knowledge_bases: [],
    sources: [],
    quick_answers: [],
    retrieval_settings: {
      top_k: 5,
      similarity_threshold: 0.7,
      rerank: false,
    },
    context_window: {
      max_knowledge_tokens: 4000,
      overflow_strategy: "truncate",
    },
  };

  // Personality Seed (bridge to Personality Engine)
  const personality_seed: PersonalitySeed = {
    voice_tone: tone,
    formality: input.brand.formality_level ?? 3,
    humor_level: 1,
    empathy_level: tone === "empathetic" ? 5 : 4,
    pace: "moderate",
    greeting_style: defaultGreeting(input.templateKey, companyName),
    signoff_style: "Is there anything else I can help you with?",
  };

  return {
    role_card,
    brain_config,
    knowledge_config,
    personality_seed,
  };
}

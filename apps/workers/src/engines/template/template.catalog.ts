/**
 * Template Engine v1 - Template Catalog
 *
 * The "truth table" of available agent templates.
 * Each template has scoring signals for deterministic matching.
 *
 * @module engines/template/catalog
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// TYPES
// ============================================

export type ChannelType = "VOICE" | "CHAT" | "SMS" | "EMAIL";

export interface TemplateSignals {
  /** Keywords indicating user intent (highest weight) */
  intentKeywords: string[];
  /** Keywords matching service offerings */
  serviceKeywords: string[];
  /** Industry keywords for context matching */
  industryKeywords: string[];
  /** Keywords that negatively indicate this template */
  negativeKeywords?: string[];
}

export interface TemplateDefinition {
  key: AgentType;
  name: string;
  description: string;
  bestFor: string[];
  channels_supported: ChannelType[];
  signals: TemplateSignals;
}

// ============================================
// TEMPLATE CATALOG
// ============================================

export const TEMPLATE_CATALOG: TemplateDefinition[] = [
  {
    key: "sales_qualifier",
    name: "Sales Qualifier",
    description:
      "Qualify inbound leads, capture requirements, route to sales, and book calls.",
    bestFor: [
      "Inbound lead qualification",
      "BANT-like triage",
      "Pipeline creation",
    ],
    channels_supported: ["VOICE", "CHAT", "SMS", "EMAIL"],
    signals: {
      intentKeywords: [
        "quote",
        "pricing",
        "cost",
        "demo",
        "proposal",
        "consultation",
        "estimate",
        "talk to sales",
        "free trial",
        "get started",
      ],
      serviceKeywords: [
        "services",
        "solutions",
        "consulting",
        "implementation",
        "installation",
        "managed",
        "enterprise",
      ],
      industryKeywords: [
        "b2b",
        "saas",
        "telecom",
        "agency",
        "security",
        "software",
        "technology",
      ],
    },
  },
  {
    key: "appointment_setter",
    name: "Appointment Setter",
    description:
      "Book appointments fast (calendar-first) with reminders and follow-ups.",
    bestFor: [
      "Scheduling",
      "Front desk replacement",
      "Bookings + reminders",
    ],
    channels_supported: ["VOICE", "CHAT", "SMS"],
    signals: {
      intentKeywords: [
        "book",
        "schedule",
        "appointment",
        "availability",
        "calendar",
        "reserve",
        "time slot",
        "reschedule",
      ],
      serviceKeywords: [
        "consultation",
        "visit",
        "meeting",
        "demo",
        "call",
        "session",
        "checkup",
      ],
      industryKeywords: [
        "clinic",
        "salon",
        "law",
        "accounting",
        "real estate",
        "services",
        "medical",
        "dental",
        "spa",
      ],
    },
  },
  {
    key: "customer_support",
    name: "Customer Support",
    description:
      "Answer questions, troubleshoot, create tickets, and escalate when needed.",
    bestFor: ["Support deflection", "Ticket triage", "FAQ + escalation"],
    channels_supported: ["CHAT", "VOICE", "EMAIL"],
    signals: {
      intentKeywords: [
        "support",
        "help",
        "issue",
        "problem",
        "troubleshoot",
        "refund",
        "cancel",
        "warranty",
        "broken",
        "not working",
      ],
      serviceKeywords: [
        "support",
        "helpdesk",
        "troubleshooting",
        "returns",
        "repair",
        "maintenance",
      ],
      industryKeywords: [
        "ecommerce",
        "software",
        "telecom",
        "utilities",
        "retail",
        "subscription",
      ],
    },
  },
  {
    key: "lead_capture",
    name: "Lead Capture",
    description:
      "Capture lead details quickly and route to a human follow-up.",
    bestFor: [
      "Website conversion",
      "Contact form replacement",
      "Simple intake",
    ],
    channels_supported: ["CHAT", "SMS", "EMAIL"],
    signals: {
      intentKeywords: [
        "contact",
        "get in touch",
        "leave a message",
        "reach out",
        "call me back",
        "request info",
        "learn more",
      ],
      serviceKeywords: ["inquiry", "information", "contact", "callback"],
      industryKeywords: ["all"],
    },
  },
  {
    key: "booking_assistant",
    name: "Booking Assistant",
    description:
      "Handle bookings for services/events with validation and confirmations.",
    bestFor: ["Bookings with constraints", "Rescheduling", "Confirmations"],
    channels_supported: ["VOICE", "CHAT", "SMS"],
    signals: {
      intentKeywords: [
        "book",
        "reserve",
        "table",
        "rental",
        "stay",
        "tour",
        "class",
        "registration",
      ],
      serviceKeywords: [
        "booking",
        "reservation",
        "event",
        "rental",
        "accommodation",
        "ticket",
      ],
      industryKeywords: [
        "hospitality",
        "restaurant",
        "tour",
        "rental",
        "hotel",
        "travel",
        "fitness",
      ],
    },
  },
  {
    key: "faq_bot",
    name: "FAQ Bot",
    description:
      "Answer common questions accurately and route edge cases.",
    bestFor: ["FAQ automation", "Policies", "Basic product/service info"],
    channels_supported: ["CHAT", "EMAIL"],
    signals: {
      intentKeywords: [
        "faq",
        "questions",
        "how does it work",
        "policy",
        "hours",
        "location",
        "what is",
        "how do i",
      ],
      serviceKeywords: ["information", "details", "policies", "terms"],
      industryKeywords: ["all"],
    },
  },
  {
    key: "onboarding_guide",
    name: "Onboarding Guide",
    description:
      "Guide users through setup, activation, and first success.",
    bestFor: ["SaaS onboarding", "Activation flows", "Customer success"],
    channels_supported: ["CHAT", "EMAIL"],
    signals: {
      intentKeywords: [
        "get started",
        "setup",
        "activate",
        "onboarding",
        "welcome",
        "install",
        "configure",
        "tutorial",
      ],
      serviceKeywords: [
        "setup",
        "integration",
        "configuration",
        "training",
        "walkthrough",
      ],
      industryKeywords: ["saas", "software", "platform", "app", "technology"],
    },
  },
  {
    key: "product_recommender",
    name: "Product Recommender",
    description:
      "Recommend products/services based on needs and preferences.",
    bestFor: ["Cross-sell", "Guided selling", "Bundles"],
    channels_supported: ["CHAT", "VOICE"],
    signals: {
      intentKeywords: [
        "recommend",
        "which should i choose",
        "best option",
        "compare",
        "plan",
        "suggestion",
        "what do you recommend",
      ],
      serviceKeywords: [
        "plans",
        "packages",
        "products",
        "bundles",
        "options",
        "tiers",
      ],
      industryKeywords: [
        "ecommerce",
        "telecom",
        "saas",
        "retail",
        "subscription",
      ],
    },
  },
];

/**
 * Get template definition by key
 */
export function getTemplateByKey(
  key: AgentType
): TemplateDefinition | undefined {
  return TEMPLATE_CATALOG.find((t) => t.key === key);
}

/**
 * Get all template keys
 */
export function getAllTemplateKeys(): AgentType[] {
  return TEMPLATE_CATALOG.map((t) => t.key);
}

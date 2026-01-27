/**
 * Tools Engine v1 - Tool Catalog
 *
 * The "truth table" of available tools and their capabilities.
 * Each tool has scoring signals for deterministic matching.
 *
 * @module engines/tools/catalog
 */

import type { AgentType } from "@epic-ai/shared";
import type { ToolPermissions } from "./tools.types";

// ============================================
// TYPES
// ============================================

export type ToolCategory =
  | "calendar"
  | "crm"
  | "support"
  | "knowledge"
  | "messaging"
  | "payment"
  | "integration";

export interface ToolDefinition {
  /** Unique tool identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Tool category for grouping */
  category: ToolCategory;
  /** Tool purpose keywords for matching */
  purposeKeywords: string[];
  /** Template keys where this tool is highly relevant */
  templateAffinity: AgentType[];
  /** Supported channels */
  channels: string[];
  /** Default permissions */
  defaultPermissions: ToolPermissions;
  /** Default rate limits (optional) */
  defaultRateLimits?: {
    calls_per_minute?: number;
    calls_per_conversation?: number;
    calls_per_day?: number;
  };
  /** Whether this tool is sensitive (requires confirmation) */
  isSensitive: boolean;
  /** Description for AI/user understanding */
  description: string;
}

// ============================================
// TOOL CATALOG
// ============================================

export const TOOL_CATALOG: ToolDefinition[] = [
  // ========== CALENDAR TOOLS ==========
  {
    id: "calendar.booking",
    name: "Calendar Booking",
    category: "calendar",
    description: "Create, update, and cancel calendar appointments.",
    purposeKeywords: [
      "appointment",
      "schedule",
      "booking",
      "reserve",
      "calendar",
      "time slot",
      "availability",
      "reschedule",
    ],
    templateAffinity: ["appointment_setter", "booking_assistant", "sales_qualifier"],
    channels: ["VOICE", "CHAT", "SMS"],
    defaultPermissions: { read: true, write: true, delete: false },
    defaultRateLimits: { calls_per_conversation: 5 },
    isSensitive: false,
  },
  {
    id: "calendar.availability",
    name: "Availability Checker",
    category: "calendar",
    description: "Check available time slots for appointments.",
    purposeKeywords: [
      "availability",
      "open slots",
      "free time",
      "when available",
      "check calendar",
    ],
    templateAffinity: ["appointment_setter", "booking_assistant"],
    channels: ["VOICE", "CHAT", "SMS"],
    defaultPermissions: { read: true },
    isSensitive: false,
  },

  // ========== CRM TOOLS ==========
  {
    id: "crm.lead_create",
    name: "CRM Lead Create",
    category: "crm",
    description: "Create new leads in the CRM system.",
    purposeKeywords: [
      "lead",
      "sales",
      "qualification",
      "prospect",
      "pipeline",
      "contact",
      "inquiry",
    ],
    templateAffinity: ["sales_qualifier", "lead_capture"],
    channels: ["VOICE", "CHAT", "SMS", "EMAIL"],
    defaultPermissions: { write: true },
    isSensitive: false,
  },
  {
    id: "crm.lead_update",
    name: "CRM Lead Update",
    category: "crm",
    description: "Update existing lead information and status.",
    purposeKeywords: [
      "update lead",
      "lead status",
      "qualification",
      "pipeline stage",
    ],
    templateAffinity: ["sales_qualifier"],
    channels: ["VOICE", "CHAT", "SMS", "EMAIL"],
    defaultPermissions: { read: true, write: true },
    isSensitive: false,
  },
  {
    id: "crm.contact_lookup",
    name: "Contact Lookup",
    category: "crm",
    description: "Look up existing contacts in the CRM.",
    purposeKeywords: [
      "find contact",
      "lookup",
      "existing customer",
      "returning",
      "account",
    ],
    templateAffinity: ["customer_support", "sales_qualifier"],
    channels: ["VOICE", "CHAT", "SMS", "EMAIL"],
    defaultPermissions: { read: true },
    isSensitive: false,
  },

  // ========== SUPPORT TOOLS ==========
  {
    id: "ticket.create",
    name: "Support Ticket Create",
    category: "support",
    description: "Create support tickets for issue tracking.",
    purposeKeywords: [
      "support",
      "issue",
      "problem",
      "ticket",
      "help",
      "troubleshoot",
      "complaint",
      "bug",
    ],
    templateAffinity: ["customer_support"],
    channels: ["CHAT", "EMAIL", "VOICE"],
    defaultPermissions: { write: true },
    isSensitive: false,
  },
  {
    id: "ticket.update",
    name: "Support Ticket Update",
    category: "support",
    description: "Update existing support tickets with notes or status changes.",
    purposeKeywords: [
      "update ticket",
      "ticket status",
      "add note",
      "escalate",
    ],
    templateAffinity: ["customer_support"],
    channels: ["CHAT", "EMAIL", "VOICE"],
    defaultPermissions: { read: true, write: true },
    isSensitive: false,
  },
  {
    id: "ticket.lookup",
    name: "Ticket Lookup",
    category: "support",
    description: "Look up existing support tickets by ID or customer.",
    purposeKeywords: [
      "find ticket",
      "ticket status",
      "existing issue",
      "case",
    ],
    templateAffinity: ["customer_support"],
    channels: ["CHAT", "EMAIL", "VOICE"],
    defaultPermissions: { read: true },
    isSensitive: false,
  },

  // ========== KNOWLEDGE TOOLS ==========
  {
    id: "knowledge.search",
    name: "Knowledge Base Search",
    category: "knowledge",
    description: "Search knowledge base for answers and information.",
    purposeKeywords: [
      "faq",
      "information",
      "details",
      "policy",
      "how to",
      "what is",
      "knowledge",
      "documentation",
    ],
    templateAffinity: ["faq_bot", "customer_support", "onboarding_guide"],
    channels: ["CHAT", "VOICE", "EMAIL"],
    defaultPermissions: { read: true },
    isSensitive: false,
  },
  {
    id: "knowledge.product_lookup",
    name: "Product Lookup",
    category: "knowledge",
    description: "Look up product details, pricing, and specifications.",
    purposeKeywords: [
      "product",
      "price",
      "specifications",
      "features",
      "compare",
      "options",
    ],
    templateAffinity: ["product_recommender", "sales_qualifier", "faq_bot"],
    channels: ["CHAT", "VOICE", "EMAIL"],
    defaultPermissions: { read: true },
    isSensitive: false,
  },

  // ========== MESSAGING TOOLS ==========
  {
    id: "sms.send",
    name: "SMS Sender",
    category: "messaging",
    description: "Send SMS messages for reminders and follow-ups.",
    purposeKeywords: [
      "reminder",
      "followup",
      "text",
      "sms",
      "notification",
      "confirm",
    ],
    templateAffinity: ["appointment_setter", "booking_assistant"],
    channels: ["SMS"],
    defaultPermissions: { write: true, requires_confirmation: true },
    defaultRateLimits: { calls_per_conversation: 3, calls_per_day: 10 },
    isSensitive: true,
  },
  {
    id: "email.send",
    name: "Email Sender",
    category: "messaging",
    description: "Send email messages for summaries and follow-ups.",
    purposeKeywords: [
      "email",
      "followup",
      "summary",
      "confirmation",
      "notification",
    ],
    templateAffinity: ["customer_support", "sales_qualifier", "lead_capture"],
    channels: ["EMAIL"],
    defaultPermissions: { write: true, requires_confirmation: true },
    defaultRateLimits: { calls_per_conversation: 2, calls_per_day: 20 },
    isSensitive: true,
  },

  // ========== INTEGRATION TOOLS ==========
  {
    id: "handoff.human",
    name: "Human Handoff",
    category: "integration",
    description: "Transfer conversation to a human agent.",
    purposeKeywords: [
      "transfer",
      "human",
      "agent",
      "escalate",
      "speak to someone",
      "real person",
    ],
    templateAffinity: [
      "customer_support",
      "sales_qualifier",
      "appointment_setter",
      "booking_assistant",
      "lead_capture",
      "faq_bot",
      "onboarding_guide",
      "product_recommender",
    ],
    channels: ["VOICE", "CHAT"],
    defaultPermissions: { write: true },
    isSensitive: false,
  },
  {
    id: "webhook.trigger",
    name: "Webhook Trigger",
    category: "integration",
    description: "Trigger external webhooks for custom integrations.",
    purposeKeywords: [
      "webhook",
      "integration",
      "external",
      "api",
      "automation",
    ],
    templateAffinity: [],
    channels: ["VOICE", "CHAT", "SMS", "EMAIL"],
    defaultPermissions: { write: true, requires_confirmation: true },
    defaultRateLimits: { calls_per_conversation: 3 },
    isSensitive: true,
  },
];

// ============================================
// CATALOG HELPERS
// ============================================

/**
 * Get tool definition by ID
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return TOOL_CATALOG.find((t) => t.id === id);
}

/**
 * Get all tools by category
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_CATALOG.filter((t) => t.category === category);
}

/**
 * Get tools with high affinity for a template
 */
export function getToolsForTemplate(templateKey: AgentType): ToolDefinition[] {
  return TOOL_CATALOG.filter((t) => t.templateAffinity.includes(templateKey));
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): string[] {
  return TOOL_CATALOG.map((t) => t.id);
}

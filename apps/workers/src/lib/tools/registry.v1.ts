/**
 * Tool Registry v1
 *
 * Canonical tool definitions for sales_qualifier template.
 * Defines required/optional tools with default configurations.
 */

export type ToolId =
  | "telephony.call"
  | "calendar.book"
  | "crm.upsert_lead"
  | "sms.send"
  | "email.send"
  | "kb.search";

export type ToolChannel = "VOICE" | "CHAT" | "SMS" | "EMAIL";

export interface ToolRequirement {
  id: ToolId;
  name: string;
  required: boolean;
  reasons: string[];
  defaultEnabled: boolean;
  permissions: {
    read: boolean;
    write: boolean;
    delete: boolean;
    requires_confirmation: boolean;
  };
  defaultConfig?: Record<string, unknown>;
}

/**
 * Sales Qualifier v1 canonical tool set
 */
export const SALES_QUALIFIER_TOOLS_V1: ToolRequirement[] = [
  {
    id: "telephony.call",
    name: "Voice Calling",
    required: true,
    reasons: ["Core channel for VOICE sales qualifier agents."],
    defaultEnabled: true,
    permissions: { read: true, write: true, delete: false, requires_confirmation: false },
    defaultConfig: { provider: "livekit", channel: "VOICE" },
  },
  {
    id: "calendar.book",
    name: "Calendar Booking",
    required: true,
    reasons: ["Qualified leads should be booked immediately for best conversion."],
    defaultEnabled: true,
    permissions: { read: true, write: true, delete: false, requires_confirmation: true },
    defaultConfig: { mode: "book_slot", timezone: "auto" },
  },
  {
    id: "crm.upsert_lead",
    name: "CRM Lead Sync",
    required: true,
    reasons: ["All leads and outcomes must be captured in CRM for ops visibility."],
    defaultEnabled: true,
    permissions: { read: true, write: true, delete: false, requires_confirmation: false },
    defaultConfig: { strategy: "upsert", dedupe_key: "email_or_phone" },
  },
  {
    id: "kb.search",
    name: "Knowledge Search",
    required: true,
    reasons: ["Agent must answer basic questions and reference services accurately."],
    defaultEnabled: true,
    permissions: { read: true, write: false, delete: false, requires_confirmation: false },
    defaultConfig: { top_k: 5 },
  },
  {
    id: "sms.send",
    name: "SMS Follow-up",
    required: false,
    reasons: ["Text follow-ups improve show-up rate and conversion."],
    defaultEnabled: true,
    permissions: { read: true, write: true, delete: false, requires_confirmation: true },
    defaultConfig: { from: "default", allow_links: false },
  },
  {
    id: "email.send",
    name: "Email Follow-up",
    required: false,
    reasons: ["Email confirmations and nurture sequences capture non-ready leads."],
    defaultEnabled: true,
    permissions: { read: true, write: true, delete: false, requires_confirmation: true },
    defaultConfig: { from: "default", track_opens: true },
  },
];

/**
 * Get confidence map key for a tool
 */
export function toolKeyForStatus(id: ToolId): string {
  return `tools.${id}`;
}

/**
 * Get tool requirement by ID
 */
export function getToolRequirement(id: ToolId): ToolRequirement | undefined {
  return SALES_QUALIFIER_TOOLS_V1.find((t) => t.id === id);
}

/**
 * Get all required tool IDs
 */
export function getRequiredToolIds(): ToolId[] {
  return SALES_QUALIFIER_TOOLS_V1.filter((t) => t.required).map((t) => t.id);
}

/**
 * Get all tool IDs
 */
export function getAllToolIds(): ToolId[] {
  return SALES_QUALIFIER_TOOLS_V1.map((t) => t.id);
}

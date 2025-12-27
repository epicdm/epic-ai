/**
 * Analytics Event Types
 *
 * Define all analytics events with their properties here for type safety.
 */

export type AnalyticsEvent =
  // Onboarding Events
  | { name: "onboarding_started"; properties: { goal?: string } }
  | { name: "onboarding_step_completed"; properties: { step: string; goal?: string } }
  | { name: "onboarding_completed"; properties: { goal: string; duration_seconds?: number } }
  | { name: "onboarding_skipped"; properties: { step: string } }

  // Voice Agent Events
  | { name: "voice_agent_created"; properties: { agent_id: string; llm_provider: string; tts_provider: string } }
  | { name: "voice_agent_edited"; properties: { agent_id: string } }
  | { name: "voice_agent_deployed"; properties: { agent_id: string } }
  | { name: "voice_call_started"; properties: { agent_id: string; type: "test" | "live" } }
  | { name: "voice_call_ended"; properties: { agent_id: string; duration_seconds: number; estimated_cost: number } }
  | { name: "phone_number_purchased"; properties: { region: string } }

  // Content Events
  | { name: "content_generated"; properties: { type: string; platform?: string; word_count?: number } }
  | { name: "content_published"; properties: { platform: string; scheduled: boolean } }
  | { name: "content_scheduled"; properties: { platform: string } }

  // Brand Brain Events
  | { name: "brand_created"; properties: { brand_id: string } }
  | { name: "brand_brain_configured"; properties: { brand_id: string; fields_updated: string[] } }
  | { name: "audience_created"; properties: { brand_id: string } }
  | { name: "content_pillar_created"; properties: { brand_id: string } }

  // Social Account Events
  | { name: "social_account_connected"; properties: { platform: string } }
  | { name: "social_account_disconnected"; properties: { platform: string } }

  // Demo Mode Events
  | { name: "demo_started"; properties: { goal: string } }
  | { name: "demo_action_attempted"; properties: { action: string } }
  | { name: "demo_exited"; properties: { upgraded: boolean } }

  // Usage Events
  | { name: "usage_dashboard_viewed"; properties: { period?: string } }
  | { name: "cost_breakdown_viewed"; properties: { service: string } }

  // AI Assistant Events
  | { name: "ai_assistant_opened"; properties: {} }
  | { name: "ai_assistant_message_sent"; properties: { message_length: number } }
  | { name: "ai_assistant_action_taken"; properties: { action: string } }

  // General Navigation
  | { name: "page_viewed"; properties: { path: string; title?: string } }
  | { name: "feature_used"; properties: { feature: string } };

// Event names as constants for easier tracking
export const ANALYTICS_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_SKIPPED: "onboarding_skipped",

  // Voice
  VOICE_AGENT_CREATED: "voice_agent_created",
  VOICE_AGENT_EDITED: "voice_agent_edited",
  VOICE_AGENT_DEPLOYED: "voice_agent_deployed",
  VOICE_CALL_STARTED: "voice_call_started",
  VOICE_CALL_ENDED: "voice_call_ended",
  PHONE_NUMBER_PURCHASED: "phone_number_purchased",

  // Content
  CONTENT_GENERATED: "content_generated",
  CONTENT_PUBLISHED: "content_published",
  CONTENT_SCHEDULED: "content_scheduled",

  // Brand
  BRAND_CREATED: "brand_created",
  BRAND_BRAIN_CONFIGURED: "brand_brain_configured",
  AUDIENCE_CREATED: "audience_created",
  CONTENT_PILLAR_CREATED: "content_pillar_created",

  // Social
  SOCIAL_ACCOUNT_CONNECTED: "social_account_connected",
  SOCIAL_ACCOUNT_DISCONNECTED: "social_account_disconnected",

  // Demo
  DEMO_STARTED: "demo_started",
  DEMO_ACTION_ATTEMPTED: "demo_action_attempted",
  DEMO_EXITED: "demo_exited",

  // Usage
  USAGE_DASHBOARD_VIEWED: "usage_dashboard_viewed",
  COST_BREAKDOWN_VIEWED: "cost_breakdown_viewed",

  // AI Assistant
  AI_ASSISTANT_OPENED: "ai_assistant_opened",
  AI_ASSISTANT_MESSAGE_SENT: "ai_assistant_message_sent",
  AI_ASSISTANT_ACTION_TAKEN: "ai_assistant_action_taken",

  // General
  PAGE_VIEWED: "page_viewed",
  FEATURE_USED: "feature_used",
} as const;

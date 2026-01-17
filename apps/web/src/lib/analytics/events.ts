/**
 * Analytics Event Types
 *
 * Define all analytics events with their properties here for type safety.
 */

export type AnalyticsEvent =
  // Onboarding Events
  | { name: "onboarding_started"; properties: { goal?: string } }
  | { name: "onboarding_step_completed"; properties: { step: string; goal?: string } }
  | { name: "onboarding_completed"; properties: { goal: string; setup_path?: string; template?: string; duration_seconds?: number; demo_mode_enabled?: boolean } }
  | { name: "onboarding_business_created"; properties: { template_id?: string; has_website: boolean } }
  | { name: "onboarding_skipped"; properties: { step: string } }
  | { name: "onboarding_template_selected"; properties: { template_id: string; template_name?: string } }

  // Voice Agent Events
  | { name: "voice_agent_created"; properties: { agent_id: string; llm_provider: string; tts_provider: string; phone_provisioned?: boolean; provisioning_error?: string } }
  | { name: "voice_agent_edited"; properties: { agent_id: string } }
  | { name: "voice_agent_deployed"; properties: { agent_id: string } }
  | { name: "voice_agent_deleted"; properties: { agent_id: string; phone_numbers_released?: boolean; numbers_count?: number } }
  | { name: "voice_call_started"; properties: { agent_id: string; type: "test" | "live" } }
  | { name: "voice_call_ended"; properties: { agent_id: string; duration_seconds: number; estimated_cost: number } }
  | { name: "voice_phone_provisioned"; properties: { agent_id: string; phone_number: string } }
  | { name: "brand_voice_applied"; properties: { agent_id?: string; brand_id?: string; voice_provider?: string; voice_id?: string } }
  | { name: "phone_number_purchased"; properties: { region: string } }

  // Content Events
  | { name: "content_generated"; properties: { type: string; platform?: string; word_count?: number; pillar?: string; platforms?: string; topic?: string; content_type?: string; count?: number; generated_count?: number; tone?: string } }
  | { name: "ai_content_generated"; properties: { topic?: string; platforms?: string[]; count?: number } }
  | { name: "content_published"; properties: { platform: string; scheduled: boolean; pillar?: string; platforms?: string; publishOption?: string } }
  | { name: "content_scheduled"; properties: { platform: string } }
  | { name: "content_saved"; properties: { content_count: number } }
  | { name: "social_post_created"; properties: { platform?: string; scheduled?: boolean; platforms_count?: number; content_length?: number } }

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
  | { name: "demo_mode_started"; properties: { goal?: string; brand_name?: string } }
  | { name: "demo_mode_ended"; properties: { upgraded?: boolean; reason?: string } }
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
  | { name: "feature_used"; properties: { feature: string } }

  // Wizard Funnel Events (Phase 3: Polish)
  | { name: "wizard_started"; properties: { setup_path: string; brand_id?: string } }
  | { name: "wizard_step_completed"; properties: { setup_path: string; step: number; step_id: string; duration_seconds?: number } }
  | { name: "wizard_step_skipped"; properties: { setup_path: string; step: number; step_id: string } }
  | { name: "wizard_ai_assist_used"; properties: { step_id: string; assist_type: string } }
  | { name: "wizard_progress_saved"; properties: { setup_path: string; step: number; progress: number } }
  | { name: "wizard_resumed"; properties: { setup_path: string; step: number; time_away_seconds: number } }
  | { name: "wizard_abandoned"; properties: { setup_path: string; step: number; progress: number } }
  | { name: "wizard_completed"; properties: { setup_path: string; duration_seconds: number; steps_completed: number } }
  | { name: "flywheel_activated"; properties: { setup_path: string; phases_completed: number } };

// Event names as constants for easier tracking
export const ANALYTICS_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_BUSINESS_CREATED: "onboarding_business_created",
  ONBOARDING_SKIPPED: "onboarding_skipped",
  ONBOARDING_TEMPLATE_SELECTED: "onboarding_template_selected",

  // Voice
  VOICE_AGENT_CREATED: "voice_agent_created",
  VOICE_AGENT_EDITED: "voice_agent_edited",
  VOICE_AGENT_DEPLOYED: "voice_agent_deployed",
  VOICE_AGENT_DELETED: "voice_agent_deleted",
  VOICE_CALL_STARTED: "voice_call_started",
  VOICE_CALL_ENDED: "voice_call_ended",
  VOICE_PHONE_PROVISIONED: "voice_phone_provisioned",
  BRAND_VOICE_APPLIED: "brand_voice_applied",
  PHONE_NUMBER_PURCHASED: "phone_number_purchased",

  // Content
  CONTENT_GENERATED: "content_generated",
  AI_CONTENT_GENERATED: "ai_content_generated",
  CONTENT_PUBLISHED: "content_published",
  CONTENT_SCHEDULED: "content_scheduled",
  CONTENT_SAVED: "content_saved",
  SOCIAL_POST_CREATED: "social_post_created",

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
  DEMO_MODE_STARTED: "demo_mode_started",
  DEMO_MODE_ENDED: "demo_mode_ended",
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

  // Wizard Funnel (Phase 3: Polish)
  WIZARD_STARTED: "wizard_started",
  WIZARD_STEP_COMPLETED: "wizard_step_completed",
  WIZARD_STEP_SKIPPED: "wizard_step_skipped",
  WIZARD_AI_ASSIST_USED: "wizard_ai_assist_used",
  WIZARD_PROGRESS_SAVED: "wizard_progress_saved",
  WIZARD_RESUMED: "wizard_resumed",
  WIZARD_ABANDONED: "wizard_abandoned",
  WIZARD_COMPLETED: "wizard_completed",
  FLYWHEEL_ACTIVATED: "flywheel_activated",
} as const;

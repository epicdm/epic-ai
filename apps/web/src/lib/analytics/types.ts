export type AnalyticsEvent =
  // Existing events
  | "onboarding_started"
  | "onboarding_completed"
  | "voice_agent_created"
  // Add new feature discovery events
  | "feature_card_clicked"
  | "feature_card_learn_more"
  | "feature_unlocked"
  | "feature_gate_met";

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  data?: Record<string, unknown>;
}

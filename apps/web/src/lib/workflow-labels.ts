/**
 * Workflow Labels & Constants
 * 
 * Web-safe labels extracted from cross-channel humanizer.
 * No database imports - just display constants.
 */

export const ACTION_LABELS: Record<string, string> = {
  // Email actions
  email_send: "Send Email",
  email_sequence_start: "Start Email Sequence",
  email_sequence_stop: "Stop Email Sequence",

  // Social actions
  social_post: "Post to Social Media",
  social_dm: "Send Direct Message",
  social_engage: "Engage on Social",

  // Voice actions
  voice_call_outbound: "Make Outbound Call",
  voice_call_schedule: "Schedule Call",
  voice_sms: "Send SMS",

  // Chat actions
  chat_message: "Send Chat Message",
  chat_assign: "Assign to Agent",

  // Internal actions
  wait: "Wait",
  condition: "Check Condition",
  update_lead: "Update Lead",
  notify_team: "Notify Team",
  ai_analyze: "AI Analysis",
  attribute: "Record Touchpoint",
  end: "End Workflow",

  // Legacy actions
  create_lead: "Create Lead",
  update_lead_status: "Update Lead Status",
  add_lead_activity: "Add Activity",
  add_lead_tag: "Add Tag",
  send_notification: "Send Notification",
  webhook: "Call Webhook",
};

export const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "Manual Trigger",
  SCHEDULED: "Scheduled",
  EVENT: "Event-Based",
  CONDITION: "Condition-Based",
  WEBHOOK: "Webhook",
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
  FORM_SUBMITTED: "Form Submitted",
  EMAIL_OPENED: "Email Opened",
  EMAIL_CLICKED: "Email Clicked",
  SOCIAL_MENTION: "Social Mention",
  SOCIAL_DM_RECEIVED: "DM Received",
};

export const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: "Email",
  SOCIAL: "Social Media",
  VOICE: "Voice/SMS",
  CHAT: "Chat",
};

export function getEstimatedDuration(steps: number): string {
  if (steps <= 2) return "~1 min";
  if (steps <= 5) return "~2-5 min";
  if (steps <= 10) return "~5-15 min";
  return "~15+ min";
}

export function getWorkflowSummary(name: string, trigger: string, stepCount: number): string {
  const triggerLabel = TRIGGER_LABELS[trigger] || trigger;
  return `${name} • ${triggerLabel} • ${stepCount} steps`;
}

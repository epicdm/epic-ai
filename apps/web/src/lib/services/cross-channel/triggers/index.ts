/**
 * Cross-Channel Triggers
 *
 * Central export for all cross-channel automation triggers.
 * These triggers connect events from voice, social, and other channels
 * to workflow automation execution.
 *
 * Part of the "One Brain, Many Voices" architecture.
 */

// Voice triggers
export {
  triggerOnCallCompleted,
  triggerOnCallScheduled,
  triggerOnCallMissed,
  COMMON_CALL_CONDITIONS,
  type CallCompletedContext,
  type CallScheduledContext,
} from "./voice-triggers";

// Social triggers
export {
  triggerOnHighEngagement,
  triggerOnNewFollower,
  triggerOnMention,
  triggerOnContentPerformance,
  triggerOnContentPublished,
  COMMON_SOCIAL_TRIGGERS,
  type HighEngagementContext,
  type NewFollowerContext,
  type MentionContext,
  type ContentPerformanceContext,
} from "./social-triggers";

/**
 * Supported trigger events
 */
export const TRIGGER_EVENTS = {
  // Voice events
  CALL_COMPLETED: "call.completed",
  CALL_SCHEDULED: "call.scheduled",
  CALL_MISSED: "call.missed",

  // Social events
  SOCIAL_HIGH_ENGAGEMENT: "social.high_engagement",
  SOCIAL_NEW_FOLLOWER: "social.new_follower",
  SOCIAL_MENTION: "social.mention",
  SOCIAL_CONTENT_THRESHOLD: "social.content_threshold",
  SOCIAL_CONTENT_PUBLISHED: "social.content_published",

  // Lead events (future)
  LEAD_CREATED: "lead.created",
  LEAD_SCORE_CHANGED: "lead.score_changed",
  LEAD_STATUS_CHANGED: "lead.status_changed",

  // Email events (future)
  EMAIL_OPENED: "email.opened",
  EMAIL_CLICKED: "email.clicked",
  EMAIL_REPLIED: "email.replied",
} as const;

export type TriggerEvent = (typeof TRIGGER_EVENTS)[keyof typeof TRIGGER_EVENTS];

/**
 * Trigger event metadata for UI display and configuration
 */
export const TRIGGER_EVENT_METADATA: Record<
  TriggerEvent,
  {
    name: string;
    description: string;
    channel: string;
    availableConditions: string[];
  }
> = {
  [TRIGGER_EVENTS.CALL_COMPLETED]: {
    name: "Call Completed",
    description: "Triggers when a voice call ends",
    channel: "voice",
    availableConditions: ["duration", "outcome", "direction", "sentiment", "agentId"],
  },
  [TRIGGER_EVENTS.CALL_SCHEDULED]: {
    name: "Call Scheduled",
    description: "Triggers when a call is scheduled",
    channel: "voice",
    availableConditions: ["scheduledAt"],
  },
  [TRIGGER_EVENTS.CALL_MISSED]: {
    name: "Call Missed",
    description: "Triggers when an inbound call is missed",
    channel: "voice",
    availableConditions: ["callerNumber"],
  },
  [TRIGGER_EVENTS.SOCIAL_HIGH_ENGAGEMENT]: {
    name: "High Engagement",
    description: "Triggers when content engagement exceeds threshold",
    channel: "social",
    availableConditions: ["engagementScore", "platform", "contentType"],
  },
  [TRIGGER_EVENTS.SOCIAL_NEW_FOLLOWER]: {
    name: "New Follower",
    description: "Triggers when a new follower is detected",
    channel: "social",
    availableConditions: ["platform", "isHighValue"],
  },
  [TRIGGER_EVENTS.SOCIAL_MENTION]: {
    name: "Brand Mention",
    description: "Triggers when brand is mentioned",
    channel: "social",
    availableConditions: ["platform", "sentiment", "isInfluencer"],
  },
  [TRIGGER_EVENTS.SOCIAL_CONTENT_THRESHOLD]: {
    name: "Content Performance Threshold",
    description: "Triggers when content metric exceeds threshold",
    channel: "social",
    availableConditions: ["platform", "metric", "threshold"],
  },
  [TRIGGER_EVENTS.SOCIAL_CONTENT_PUBLISHED]: {
    name: "Content Published",
    description: "Triggers when content is published",
    channel: "social",
    availableConditions: ["platform", "contentType"],
  },
  [TRIGGER_EVENTS.LEAD_CREATED]: {
    name: "Lead Created",
    description: "Triggers when a new lead is created",
    channel: "crm",
    availableConditions: ["source", "score"],
  },
  [TRIGGER_EVENTS.LEAD_SCORE_CHANGED]: {
    name: "Lead Score Changed",
    description: "Triggers when lead score changes",
    channel: "crm",
    availableConditions: ["previousScore", "newScore", "direction"],
  },
  [TRIGGER_EVENTS.LEAD_STATUS_CHANGED]: {
    name: "Lead Status Changed",
    description: "Triggers when lead status changes",
    channel: "crm",
    availableConditions: ["previousStatus", "newStatus"],
  },
  [TRIGGER_EVENTS.EMAIL_OPENED]: {
    name: "Email Opened",
    description: "Triggers when an email is opened",
    channel: "email",
    availableConditions: ["campaignId", "openCount"],
  },
  [TRIGGER_EVENTS.EMAIL_CLICKED]: {
    name: "Email Link Clicked",
    description: "Triggers when an email link is clicked",
    channel: "email",
    availableConditions: ["campaignId", "linkUrl"],
  },
  [TRIGGER_EVENTS.EMAIL_REPLIED]: {
    name: "Email Replied",
    description: "Triggers when someone replies to an email",
    channel: "email",
    availableConditions: ["campaignId", "sentiment"],
  },
};

/**
 * Get available triggers for a specific channel
 */
export function getTriggersForChannel(channel: string): TriggerEvent[] {
  return Object.entries(TRIGGER_EVENT_METADATA)
    .filter(([, meta]) => meta.channel === channel)
    .map(([event]) => event as TriggerEvent);
}

/**
 * Get all available triggers
 */
export function getAllTriggers(): TriggerEvent[] {
  return Object.values(TRIGGER_EVENTS);
}

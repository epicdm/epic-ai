/**
 * Step Humanizer
 *
 * Converts workflow step configurations into human-readable descriptions.
 * Part of Phase 7: Frictionless UX Implementation.
 *
 * "One Brain, Many Voices" - Making complex workflows understandable at a glance.
 */

import { ChannelType } from "@epic-ai/database";

interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  channel?: ChannelType;
  config?: Record<string, unknown>;
  branches?: Array<{
    condition: {
      field: string;
      operator: string;
      value: unknown;
    };
    nextStepId: string;
  }>;
  onSuccess?: string;
  onFailure?: string;
  delayMinutes?: number;
  useBrandVoice?: boolean;
}

interface HumanizedStep {
  title: string;
  description: string;
  icon: string;
  color: "blue" | "green" | "yellow" | "purple" | "orange" | "red" | "gray";
  channel?: string;
  duration?: string;
  branches?: Array<{
    condition: string;
    nextStep: string;
  }>;
}

/**
 * Action labels for display
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

/**
 * Trigger labels for display
 */
export const TRIGGER_LABELS: Record<string, string> = {
  MANUAL: "Manual Trigger",
  SCHEDULED: "Scheduled",
  EVENT: "Event-Based",
  CONDITION: "Condition-Based",
  WEBHOOK: "Webhook",
  // Legacy triggers
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
};

/**
 * Channel display names
 */
const CHANNEL_LABELS: Record<string, string> = {
  SOCIAL: "Social Media",
  EMAIL: "Email",
  VOICE: "Voice",
  CHAT: "Chat",
  SMS: "SMS",
};

/**
 * Operator display text
 */
const OPERATOR_LABELS: Record<string, string> = {
  equals: "equals",
  not_equals: "does not equal",
  greater_than: "is greater than",
  less_than: "is less than",
  greater_than_or_equals: "is at least",
  less_than_or_equals: "is at most",
  contains: "contains",
  not_contains: "does not contain",
  in_list: "is one of",
  not_in_list: "is not one of",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
};

/**
 * Convert a workflow step to human-readable format
 */
export function humanizeStep(step: WorkflowStep): HumanizedStep {
  const action = step.action;
  const config = step.config || {};

  switch (action) {
    case "email_send":
      return humanizeEmailSend(step, config);
    case "social_post":
      return humanizeSocialPost(step, config);
    case "social_dm":
      return humanizeSocialDm(step, config);
    case "social_engage":
      return humanizeSocialEngage(step, config);
    case "voice_call_outbound":
      return humanizeVoiceCall(step, config);
    case "voice_call_schedule":
      return humanizeVoiceSchedule(step, config);
    case "voice_sms":
      return humanizeSms(step, config);
    case "wait":
      return humanizeWait(step, config);
    case "condition":
      return humanizeCondition(step);
    case "update_lead":
      return humanizeUpdateLead(step, config);
    case "notify_team":
      return humanizeNotifyTeam(step, config);
    case "ai_analyze":
      return humanizeAiAnalyze(step, config);
    case "attribute":
      return humanizeAttribute(step, config);
    case "end":
      return humanizeEnd(step, config);
    default:
      return humanizeGeneric(step);
  }
}

/**
 * Humanize email send step
 */
function humanizeEmailSend(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const template = config.template as string;
  const subject = config.subject as string;

  let description = "Send an email";
  if (template) {
    const templateName = formatTemplateName(template);
    description = `Send "${templateName}" email`;
  }
  if (subject) {
    description += ` with subject "${subject}"`;
  }

  const features: string[] = [];
  if (config.personalizeContent) features.push("personalized content");
  if (config.includeGettingStarted) features.push("getting started guide");
  if (config.includeResources) features.push("helpful resources");
  if (config.includeCalendarLink) features.push("calendar link");
  if (config.includeTestimonial) features.push("customer testimonial");
  if (config.includeSpecialDiscount) features.push("special discount");
  if (config.askForFeedback) features.push("feedback request");

  if (features.length > 0) {
    description += ` with ${features.join(", ")}`;
  }

  return {
    title: step.name || ACTION_LABELS.email_send,
    description,
    icon: "mail",
    color: "blue",
    channel: "Email",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize social post step
 */
function humanizeSocialPost(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const contentType = config.contentType as string;
  const platforms = config.platforms as string[] | undefined;

  let description = "Post content to social media";
  if (contentType) {
    const typeName = formatTemplateName(contentType);
    description = `Post ${typeName.toLowerCase()} content`;
  }
  if (platforms && platforms.length > 0) {
    description += ` on ${platforms.map(capitalize).join(", ")}`;
  }

  return {
    title: step.name || ACTION_LABELS.social_post,
    description,
    icon: "share",
    color: "green",
    channel: "Social Media",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize social DM step
 */
function humanizeSocialDm(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const messageType = config.messageType as string;

  let description = "Send a direct message on social media";
  if (messageType) {
    const typeName = formatTemplateName(messageType);
    description = `Send ${typeName.toLowerCase()} via DM`;
  }
  if (config.mentionPainPoints) {
    description += ", addressing their specific needs";
  }

  return {
    title: step.name || ACTION_LABELS.social_dm,
    description,
    icon: "message-circle",
    color: "green",
    channel: "Social Media",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize social engage step
 */
function humanizeSocialEngage(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const engagementAction = config.action as string;
  const platforms = config.platforms as string[] | undefined;

  let description = "Engage with contact on social media";
  if (engagementAction) {
    const actionName = formatTemplateName(engagementAction);
    description = actionName;
  }
  if (platforms && platforms.length > 0) {
    description += ` on ${platforms.map(capitalize).join(", ")}`;
  }

  return {
    title: step.name || ACTION_LABELS.social_engage,
    description,
    icon: "heart",
    color: "green",
    channel: "Social Media",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize voice call step
 */
function humanizeVoiceCall(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const callType = config.callType as string;
  const useAI = config.useAIAgent as boolean;
  const objectives = config.objectives as string[] | undefined;

  let description = "Make a phone call";
  if (callType) {
    const typeName = formatTemplateName(callType);
    description = `Make a ${typeName.toLowerCase()} call`;
  }
  if (useAI) {
    description += " using AI voice agent";
  }
  if (objectives && objectives.length > 0) {
    description += ` to ${objectives.map(formatTemplateName).map((s) => s.toLowerCase()).join(", ")}`;
  }

  return {
    title: step.name || ACTION_LABELS.voice_call_outbound,
    description,
    icon: "phone",
    color: "purple",
    channel: "Voice",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize voice schedule step
 */
function humanizeVoiceSchedule(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const callType = config.callType as string;
  const useAI = config.useAIAgent as boolean;

  let description = "Schedule a phone call";
  if (callType) {
    const typeName = formatTemplateName(callType);
    description = `Schedule a ${typeName.toLowerCase()} call`;
  }
  if (useAI) {
    description += " with AI voice agent";
  }

  return {
    title: step.name || ACTION_LABELS.voice_call_schedule,
    description,
    icon: "calendar",
    color: "purple",
    channel: "Voice",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize SMS step
 */
function humanizeSms(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const template = config.template as string;

  let description = "Send a text message";
  if (template) {
    const templateName = formatTemplateName(template);
    description = `Send "${templateName}" SMS`;
  }

  return {
    title: step.name || ACTION_LABELS.voice_sms,
    description,
    icon: "smartphone",
    color: "purple",
    channel: "SMS",
    duration: step.delayMinutes
      ? formatDuration(step.delayMinutes)
      : undefined,
  };
}

/**
 * Humanize wait step
 */
function humanizeWait(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const duration = config.duration as number;
  const unit = config.unit as string;
  const waitUntil = config.waitUntil as string;

  let description = "Wait before next step";
  if (duration && unit) {
    description = `Wait for ${duration} ${unit}`;
  } else if (waitUntil) {
    description = `Wait until ${waitUntil}`;
  }

  return {
    title: step.name || ACTION_LABELS.wait,
    description,
    icon: "clock",
    color: "gray",
    duration: duration && unit ? `${duration} ${unit}` : undefined,
  };
}

/**
 * Humanize condition step
 */
function humanizeCondition(step: WorkflowStep): HumanizedStep {
  const branches = step.branches || [];

  const humanizedBranches = branches.map((branch) => ({
    condition: humanizeConditionExpression(branch.condition),
    nextStep: branch.nextStepId,
  }));

  return {
    title: step.name || ACTION_LABELS.condition,
    description:
      branches.length > 0
        ? `Branch based on ${humanizedBranches.length} conditions`
        : "Check conditions and branch",
    icon: "git-branch",
    color: "yellow",
    branches: humanizedBranches,
  };
}

/**
 * Humanize a condition expression
 */
function humanizeConditionExpression(condition: {
  field: string;
  operator: string;
  value: unknown;
}): string {
  const fieldName = formatFieldName(condition.field);
  const operator = OPERATOR_LABELS[condition.operator] || condition.operator;
  const value = formatConditionValue(condition.value);

  return `${fieldName} ${operator} ${value}`;
}

/**
 * Humanize update lead step
 */
function humanizeUpdateLead(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const updates: string[] = [];

  if (config.status) {
    updates.push(`set status to "${config.status}"`);
  }
  if (config.addTag) {
    updates.push(`add tag "${config.addTag}"`);
  }
  if (config.removeTag) {
    updates.push(`remove tag "${config.removeTag}"`);
  }

  const description =
    updates.length > 0
      ? `Update lead: ${updates.join(", ")}`
      : "Update lead information";

  return {
    title: step.name || ACTION_LABELS.update_lead,
    description,
    icon: "user-check",
    color: "orange",
  };
}

/**
 * Humanize notify team step
 */
function humanizeNotifyTeam(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const channel = config.channel as string;
  const message = config.message as string;

  let description = "Send notification to team";
  if (channel) {
    description = `Notify team via ${channel}`;
  }
  if (message) {
    description += `: "${truncate(message, 50)}"`;
  }

  return {
    title: step.name || ACTION_LABELS.notify_team,
    description,
    icon: "bell",
    color: "orange",
  };
}

/**
 * Humanize AI analyze step
 */
function humanizeAiAnalyze(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const analyzeType = config.analyzeType as string;
  const factors = config.factors as string[] | undefined;

  let description = "Perform AI analysis";
  if (analyzeType) {
    const typeName = formatTemplateName(analyzeType);
    description = `AI analyzes ${typeName.toLowerCase()}`;
  }
  if (factors && factors.length > 0) {
    description += ` based on ${factors.map(formatTemplateName).map((s) => s.toLowerCase()).join(", ")}`;
  }

  return {
    title: step.name || ACTION_LABELS.ai_analyze,
    description,
    icon: "brain",
    color: "purple",
  };
}

/**
 * Humanize attribute step
 */
function humanizeAttribute(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const touchpointType = config.touchpointType as string;

  let description = "Record a customer touchpoint";
  if (touchpointType) {
    const typeName = formatTemplateName(touchpointType);
    description = `Record "${typeName}" touchpoint for attribution`;
  }

  return {
    title: step.name || ACTION_LABELS.attribute,
    description,
    icon: "target",
    color: "blue",
  };
}

/**
 * Humanize end step
 */
function humanizeEnd(
  step: WorkflowStep,
  config: Record<string, unknown>
): HumanizedStep {
  const outcome = config.outcome as string;

  let description = "Complete the workflow";
  if (outcome) {
    const outcomeName = formatTemplateName(outcome);
    description = `Complete with outcome: ${outcomeName}`;
  }

  const extras: string[] = [];
  if (config.notifyTeam) extras.push("notify team");
  if (config.scheduleReEngagement) {
    const days = config.reEngagementDays as number;
    extras.push(`re-engage in ${days || 30} days`);
  }
  if (config.addToNurtureList) extras.push("add to nurture list");
  if (config.updateCRM) extras.push("update CRM");

  if (extras.length > 0) {
    description += ` (${extras.join(", ")})`;
  }

  return {
    title: step.name || ACTION_LABELS.end,
    description,
    icon: "flag",
    color: outcome?.includes("success") ? "green" : "gray",
  };
}

/**
 * Humanize generic step
 */
function humanizeGeneric(step: WorkflowStep): HumanizedStep {
  return {
    title: step.name || ACTION_LABELS[step.action] || capitalize(step.action),
    description: `Execute ${formatTemplateName(step.action).toLowerCase()} action`,
    icon: "play",
    color: "gray",
    channel: step.channel ? CHANNEL_LABELS[step.channel] : undefined,
  };
}

/**
 * Humanize a full workflow for preview
 */
export function humanizeWorkflow(steps: WorkflowStep[]): HumanizedStep[] {
  return steps.map(humanizeStep);
}

/**
 * Get a brief summary of the workflow
 */
export function getWorkflowSummary(steps: WorkflowStep[]): string {
  const channels = new Set<string>();
  const actions: string[] = [];

  for (const step of steps) {
    if (step.channel) {
      channels.add(CHANNEL_LABELS[step.channel] || step.channel);
    }
    if (step.action !== "wait" && step.action !== "condition" && step.action !== "end") {
      actions.push(ACTION_LABELS[step.action] || step.action);
    }
  }

  const channelList = Array.from(channels);
  const uniqueActions = [...new Set(actions)].slice(0, 3);

  let summary = "";
  if (channelList.length > 0) {
    summary = `Uses ${channelList.join(", ")}`;
  }
  if (uniqueActions.length > 0) {
    summary += summary ? ". " : "";
    summary += `Actions: ${uniqueActions.join(", ")}`;
    if (actions.length > 3) {
      summary += `, and ${actions.length - 3} more`;
    }
  }

  return summary || "Custom workflow";
}

/**
 * Get estimated duration of workflow
 */
export function getEstimatedDuration(steps: WorkflowStep[]): string {
  let totalMinutes = 0;

  for (const step of steps) {
    if (step.action === "wait" && step.config) {
      const duration = step.config.duration as number;
      const unit = step.config.unit as string;
      if (duration && unit) {
        totalMinutes += convertToMinutes(duration, unit);
      }
    }
    if (step.delayMinutes) {
      totalMinutes += step.delayMinutes;
    }
  }

  if (totalMinutes === 0) return "Instant";
  if (totalMinutes < 60) return `~${totalMinutes} minutes`;
  if (totalMinutes < 1440) return `~${Math.round(totalMinutes / 60)} hours`;
  return `~${Math.round(totalMinutes / 1440)} days`;
}

// Helper functions

function formatTemplateName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .split(" ")
    .map(capitalize)
    .join(" ");
}

function formatFieldName(field: string): string {
  const parts = field.split(".");
  const lastPart = parts[parts.length - 1];
  return formatTemplateName(lastPart);
}

function formatConditionValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

function convertToMinutes(duration: number, unit: string): number {
  switch (unit) {
    case "minutes":
      return duration;
    case "hours":
      return duration * 60;
    case "days":
      return duration * 1440;
    case "weeks":
      return duration * 10080;
    default:
      return duration;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

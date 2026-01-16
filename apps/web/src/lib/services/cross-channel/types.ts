/**
 * Cross-Channel Workflow Types
 *
 * Defines types for cross-channel workflows that orchestrate actions
 * across social, voice, email, and chat channels - all powered by Brand Brain.
 *
 * "One Brain, Many Voices" - Consistent brand experience across channels.
 */

import { ChannelType, TouchpointAction, AttributionModel } from "@epic-ai/database";

// Re-export for convenience
export { ChannelType, TouchpointAction, AttributionModel };

/**
 * Workflow trigger types
 */
export type WorkflowTrigger =
  | "manual" // User-initiated
  | "scheduled" // Time-based
  | "event" // Event-driven (lead created, call ended, etc.)
  | "condition" // Condition-based (lead score > X, etc.)
  | "webhook"; // External webhook

/**
 * Workflow step action types mapped to channels
 */
export type WorkflowAction =
  // Social actions
  | "social_post" // Publish a social media post
  | "social_dm" // Send a direct message
  | "social_engage" // Like/comment on content
  // Voice actions
  | "voice_call_outbound" // Initiate outbound call
  | "voice_call_schedule" // Schedule a call
  | "voice_sms" // Send SMS
  // Email actions
  | "email_send" // Send email
  | "email_sequence_start" // Start email sequence
  | "email_sequence_stop" // Stop email sequence
  // Chat actions
  | "chat_message" // Send chat message
  | "chat_assign" // Assign to agent
  // Internal actions
  | "wait" // Wait for time/condition
  | "condition" // Conditional branch
  | "update_lead" // Update lead status/score
  | "notify_team" // Send internal notification
  | "ai_analyze" // AI analysis step
  | "attribute" // Record attribution touchpoint
  | "end"; // End workflow

/**
 * Condition operators for workflow logic
 */
export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"
  | "in_list"
  | "not_in_list";

/**
 * Workflow condition for branching
 */
export interface WorkflowCondition {
  field: string; // e.g., "lead.status", "call.outcome", "engagement.score"
  operator: ConditionOperator;
  value: string | number | boolean | string[];
}

/**
 * Individual workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  description?: string;

  // Step type
  action: WorkflowAction;
  channel?: ChannelType;

  // Step configuration
  config: Record<string, unknown>;

  // Timing
  delayMinutes?: number; // Wait before executing
  delayType?: "fixed" | "business_hours" | "optimal_time";

  // Conditions
  conditions?: WorkflowCondition[];
  conditionLogic?: "and" | "or";

  // Branching
  onSuccess?: string; // Next step ID on success
  onFailure?: string; // Next step ID on failure
  branches?: {
    condition: WorkflowCondition;
    nextStepId: string;
  }[];

  // Brand Brain integration
  useBrandVoice?: boolean;
  brandBrainConfig?: {
    tone?: string;
    formality?: number;
    mustMention?: string[];
    avoidMentioning?: string[];
  };

  // Attribution
  recordTouchpoint?: boolean;
  touchpointAction?: TouchpointAction;
}

/**
 * Complete workflow template definition
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;

  // Trigger configuration
  trigger: WorkflowTrigger;
  triggerConfig?: {
    schedule?: string; // Cron expression
    event?: string; // Event name
    conditions?: WorkflowCondition[];
    webhookSecret?: string;
  };

  // Steps
  steps: WorkflowStep[];
  entryStepId: string;

  // Channels involved
  channels: ChannelType[];

  // Brand Brain
  requiresBrandBrain: boolean;
  brandBrainFeatures?: string[];

  // Default settings
  defaultConfig?: Record<string, unknown>;

  // Metadata
  isTemplate: boolean;
  isActive: boolean;
  version: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Workflow categories for organization
 */
export type WorkflowCategory =
  | "lead_nurture" // Nurturing leads across channels
  | "customer_onboarding" // Onboarding new customers
  | "re_engagement" // Re-engaging dormant contacts
  | "event_promotion" // Promoting events/webinars
  | "support_escalation" // Support workflow
  | "sales_outreach" // Sales prospecting
  | "retention" // Customer retention
  | "feedback" // Collecting feedback
  | "custom"; // Custom workflow

/**
 * Workflow instance (running workflow)
 */
export interface WorkflowInstance {
  id: string;
  templateId: string;
  organizationId: string;
  brandId?: string;

  // Context
  leadId?: string;
  customerId?: string;
  journeyId?: string;

  // State
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  currentStepId: string;
  completedSteps: string[];

  // Execution data
  context: Record<string, unknown>;
  results: Record<string, unknown>;
  errors: WorkflowError[];

  // Timing
  startedAt: Date;
  scheduledNextAt?: Date;
  completedAt?: Date;

  // Metrics
  touchpointsCreated: number;
  channelsUsed: ChannelType[];
}

/**
 * Workflow execution error
 */
export interface WorkflowError {
  stepId: string;
  timestamp: Date;
  message: string;
  code?: string;
  retryable: boolean;
  retryCount: number;
}

/**
 * Workflow execution result
 */
export interface WorkflowStepResult {
  stepId: string;
  success: boolean;
  output?: Record<string, unknown>;
  error?: WorkflowError;
  touchpointId?: string;
  nextStepId?: string;
  executedAt: Date;
}

/**
 * Cross-channel attribution configuration
 */
export interface AttributionConfig {
  model: AttributionModel;
  lookbackDays: number;
  customWeights?: Record<ChannelType, number>;
  excludeChannels?: ChannelType[];
}

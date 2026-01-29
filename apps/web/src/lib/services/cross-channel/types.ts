/**
 * Cross-Channel Workflow Types
 *
 * Defines types for cross-channel workflows that orchestrate actions
 * across social, voice, email, and chat channels - all powered by Brand Brain.
 *
 * "One Brain, Many Voices" - Consistent brand experience across channels.
 */

import {
  ChannelType,
  TouchpointAction,
  AttributionModel,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCategory,
  WorkflowStatus,
} from "@epic-ai/database";

// Re-export for convenience
export {
  ChannelType,
  TouchpointAction,
  AttributionModel,
  WorkflowTrigger,
  WorkflowAction,
  WorkflowCategory,
  WorkflowStatus,
};

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

// WorkflowCategory is now imported from Prisma (see imports above)

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
  status: WorkflowStatus;
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

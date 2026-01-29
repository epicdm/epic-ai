/**
 * Voice Triggers for Cross-Channel Workflows
 *
 * Triggers automations based on voice events like call completion.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { prisma } from "@epic-ai/database";
import {
  WorkflowTrigger,
  CallOutcome,
  ChannelType,
} from "@epic-ai/database";
import { createWorkflowExecutor, WorkflowContext } from "../workflow-executor";

/**
 * Context from a completed call
 */
export interface CallCompletedContext {
  callLogId: string;
  organizationId: string;
  agentId?: string;
  brandId?: string;
  leadId?: string;
  customerId?: string;
  phoneNumber?: string;
  callerNumber?: string;
  direction: "INBOUND" | "OUTBOUND";
  duration: number;
  outcome: CallOutcome;
  sentiment?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context from a scheduled call
 */
export interface CallScheduledContext {
  organizationId: string;
  agentId?: string;
  brandId?: string;
  leadId?: string;
  customerId?: string;
  phoneNumber: string;
  scheduledAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Check and trigger automations when a call ends
 *
 * This is called from the voice webhook when a call completes.
 * It finds matching automations and starts workflow instances.
 */
export async function triggerOnCallCompleted(
  context: CallCompletedContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    // Find automations that should trigger on call.completed event
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.VOICE,
        },
      },
    });

    if (automations.length === 0) {
      return { triggered: 0, instances: [] };
    }

    console.log(
      `[VoiceTriggers] Found ${automations.length} potential automations for call.completed`
    );

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      // Check if this automation triggers on call.completed
      if (triggerConfig.event !== "call.completed") {
        continue;
      }

      // Evaluate trigger conditions
      if (!evaluateCallConditions(triggerConfig, context)) {
        console.log(
          `[VoiceTriggers] Automation ${automation.id} conditions not met, skipping`
        );
        continue;
      }

      // Build workflow context
      const workflowContext: WorkflowContext = {
        callLogId: context.callLogId,
        leadId: context.leadId,
        customerId: context.customerId,
        phone: context.callerNumber || context.phoneNumber,
        brandBrainId: automation.brandId ? undefined : undefined, // Will be resolved by executor
        metadata: {
          triggerEvent: "call.completed",
          callDirection: context.direction,
          callDuration: context.duration,
          callOutcome: context.outcome,
          callSentiment: context.sentiment,
          callSummary: context.summary,
          ...context.metadata,
        },
      };

      // Start the workflow
      try {
        const executor = createWorkflowExecutor(
          context.organizationId,
          automation.brandId || undefined
        );

        const result = await executor.startWorkflow(automation.id, workflowContext);
        instances.push(result.instanceId);

        console.log(
          `[VoiceTriggers] Started workflow instance ${result.instanceId} for automation ${automation.id}`
        );
      } catch (error) {
        console.error(
          `[VoiceTriggers] Failed to start workflow for automation ${automation.id}:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[VoiceTriggers] Error in triggerOnCallCompleted:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations when a call is scheduled
 */
export async function triggerOnCallScheduled(
  context: CallScheduledContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.VOICE,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "call.scheduled") {
        continue;
      }

      const workflowContext: WorkflowContext = {
        leadId: context.leadId,
        customerId: context.customerId,
        phone: context.phoneNumber,
        metadata: {
          triggerEvent: "call.scheduled",
          scheduledAt: context.scheduledAt.toISOString(),
          ...context.metadata,
        },
      };

      try {
        const executor = createWorkflowExecutor(
          context.organizationId,
          automation.brandId || undefined
        );

        const result = await executor.startWorkflow(automation.id, workflowContext);
        instances.push(result.instanceId);
      } catch (error) {
        console.error(
          `[VoiceTriggers] Failed to start workflow for call.scheduled:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[VoiceTriggers] Error in triggerOnCallScheduled:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations for missed calls
 */
export async function triggerOnCallMissed(context: {
  organizationId: string;
  callLogId: string;
  callerNumber: string;
  phoneNumber?: string;
  agentId?: string;
  brandId?: string;
}): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.VOICE,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "call.missed") {
        continue;
      }

      const workflowContext: WorkflowContext = {
        callLogId: context.callLogId,
        phone: context.callerNumber,
        metadata: {
          triggerEvent: "call.missed",
          callerNumber: context.callerNumber,
          phoneNumber: context.phoneNumber,
        },
      };

      try {
        const executor = createWorkflowExecutor(
          context.organizationId,
          automation.brandId || undefined
        );

        const result = await executor.startWorkflow(automation.id, workflowContext);
        instances.push(result.instanceId);
      } catch (error) {
        console.error(
          `[VoiceTriggers] Failed to start workflow for call.missed:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[VoiceTriggers] Error in triggerOnCallMissed:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Evaluate trigger conditions for a call
 */
function evaluateCallConditions(
  triggerConfig: Record<string, unknown>,
  context: CallCompletedContext
): boolean {
  const conditions = triggerConfig.conditions as Array<{
    field: string;
    operator: string;
    value: unknown;
  }> | undefined;

  // If no conditions, trigger for all calls
  if (!conditions || conditions.length === 0) {
    return true;
  }

  // Evaluate each condition
  for (const condition of conditions) {
    const value = getContextValue(context, condition.field);

    switch (condition.operator) {
      case "equals":
        if (value !== condition.value) return false;
        break;
      case "not_equals":
        if (value === condition.value) return false;
        break;
      case "greater_than":
        if (Number(value) <= Number(condition.value)) return false;
        break;
      case "less_than":
        if (Number(value) >= Number(condition.value)) return false;
        break;
      case "contains":
        if (!String(value).includes(String(condition.value))) return false;
        break;
      case "in_list":
        if (
          !Array.isArray(condition.value) ||
          !condition.value.includes(value)
        ) {
          return false;
        }
        break;
      default:
        // Unknown operator, skip
        break;
    }
  }

  return true;
}

/**
 * Get a value from the call context by field path
 */
function getContextValue(
  context: CallCompletedContext,
  field: string
): unknown {
  const fieldMap: Record<string, unknown> = {
    duration: context.duration,
    outcome: context.outcome,
    direction: context.direction,
    sentiment: context.sentiment,
    agentId: context.agentId,
    brandId: context.brandId,
    leadId: context.leadId,
    customerId: context.customerId,
  };

  if (field in fieldMap) {
    return fieldMap[field];
  }

  // Check metadata
  if (field.startsWith("metadata.") && context.metadata) {
    const metaField = field.replace("metadata.", "");
    return context.metadata[metaField];
  }

  return undefined;
}

/**
 * Common conditions for call triggers
 */
export const COMMON_CALL_CONDITIONS = {
  // Trigger for completed calls with positive outcomes
  positiveOutcome: {
    conditions: [
      { field: "outcome", operator: "in_list", value: ["COMPLETED", "CALLBACK_SCHEDULED"] },
    ],
  },

  // Trigger for long calls (potential high-value interactions)
  longCall: {
    conditions: [
      { field: "duration", operator: "greater_than", value: 300 }, // 5 minutes
      { field: "outcome", operator: "equals", value: "COMPLETED" },
    ],
  },

  // Trigger for inbound calls
  inboundOnly: {
    conditions: [{ field: "direction", operator: "equals", value: "INBOUND" }],
  },

  // Trigger for outbound calls
  outboundOnly: {
    conditions: [{ field: "direction", operator: "equals", value: "OUTBOUND" }],
  },

  // Trigger for calls with positive sentiment
  positiveSentiment: {
    conditions: [{ field: "sentiment", operator: "equals", value: "positive" }],
  },
};

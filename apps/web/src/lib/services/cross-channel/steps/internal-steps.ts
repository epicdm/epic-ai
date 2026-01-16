/**
 * Internal Step Handlers
 *
 * Executes internal workflow actions like conditions, waits, notifications,
 * lead updates, and attribution recording.
 */

import { prisma } from "@epic-ai/database";
import { ChannelType } from "@epic-ai/database";
import { WorkflowStep, WorkflowCondition } from "../types";
import type { StepExecutionResult } from "../workflow-executor";

/**
 * Step configurations
 */
interface WaitConfig {
  minutes?: number;
  hours?: number;
  days?: number;
  until?: string; // ISO date string
  businessHoursOnly?: boolean;
}

interface ConditionConfig {
  conditions: WorkflowCondition[];
  logic?: "and" | "or";
  trueBranch?: string;
  falseBranch?: string;
}

interface UpdateLeadConfig {
  leadId?: string; // Will use context.leadId if not provided
  status?: string;
  score?: number;
  scoreAdjustment?: number; // +/- adjustment
  tags?: string[];
  customFields?: Record<string, unknown>;
}

interface NotifyTeamConfig {
  channel?: "email" | "slack" | "in_app";
  recipients?: string[]; // User IDs or emails
  message: string;
  subject?: string;
  urgency?: "low" | "normal" | "high";
}

interface AiAnalyzeConfig {
  analysisType: "sentiment" | "intent" | "summary" | "next_action";
  inputField?: string; // Context field to analyze
  outputField?: string; // Where to store result in context
}

interface AttributeConfig {
  action: string;
  actionDetail?: string;
  channel?: ChannelType;
  channelName?: string;
  engagementScore?: number;
  estimatedValue?: number;
}

/**
 * Execute an internal step
 */
export async function executeInternalStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  switch (step.action) {
    case "wait":
      return executeWait(step, context);
    case "condition":
      return executeCondition(step, context);
    case "update_lead":
      return executeUpdateLead(step, context, organizationId);
    case "notify_team":
      return executeNotifyTeam(step, context, organizationId);
    case "ai_analyze":
      return executeAiAnalyze(step, context, organizationId, brandId);
    case "attribute":
      return executeAttribute(step, context, organizationId, brandId);
    case "end":
      return executeEnd(step, context);
    default:
      return {
        success: false,
        error: {
          message: `Unknown internal action: ${step.action}`,
          retryable: false,
        },
      };
  }
}

/**
 * Execute wait step - pause workflow execution
 */
async function executeWait(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<StepExecutionResult> {
  const config = step.config as WaitConfig;

  try {
    let waitUntil: Date;

    if (config.until) {
      waitUntil = new Date(config.until);
    } else {
      const totalMinutes =
        (config.minutes || 0) +
        (config.hours || 0) * 60 +
        (config.days || 0) * 24 * 60;

      if (totalMinutes <= 0) {
        return {
          success: false,
          error: {
            message: "Wait duration must be greater than 0",
            retryable: false,
          },
        };
      }

      waitUntil = new Date(Date.now() + totalMinutes * 60 * 1000);
    }

    // If business hours only, adjust the wait time
    if (config.businessHoursOnly) {
      waitUntil = adjustToBusinessHours(waitUntil);
    }

    return {
      success: true,
      output: {
        waitUntil: waitUntil.toISOString(),
        businessHoursOnly: config.businessHoursOnly,
        action: "pause",
      },
    };
  } catch (error) {
    console.error("Error executing wait:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to set wait",
        retryable: false,
      },
    };
  }
}

/**
 * Adjust time to next business hours (9 AM - 5 PM, Mon-Fri)
 */
function adjustToBusinessHours(date: Date): Date {
  const adjusted = new Date(date);
  const day = adjusted.getDay();
  const hour = adjusted.getHours();

  // If weekend, move to Monday 9 AM
  if (day === 0) {
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(9, 0, 0, 0);
  } else if (day === 6) {
    adjusted.setDate(adjusted.getDate() + 2);
    adjusted.setHours(9, 0, 0, 0);
  }
  // If before 9 AM, move to 9 AM
  else if (hour < 9) {
    adjusted.setHours(9, 0, 0, 0);
  }
  // If after 5 PM, move to next business day 9 AM
  else if (hour >= 17) {
    adjusted.setDate(adjusted.getDate() + (day === 5 ? 3 : 1));
    adjusted.setHours(9, 0, 0, 0);
  }

  return adjusted;
}

/**
 * Execute condition step - evaluate and branch
 */
async function executeCondition(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<StepExecutionResult> {
  const config = step.config as ConditionConfig;

  try {
    if (!config.conditions || config.conditions.length === 0) {
      return {
        success: false,
        error: {
          message: "Conditions required for condition step",
          retryable: false,
        },
      };
    }

    const logic = config.logic || "and";
    const results = config.conditions.map((c) => evaluateCondition(c, context));
    const passed = logic === "and" ? results.every((r) => r) : results.some((r) => r);

    const nextStepId = passed ? config.trueBranch : config.falseBranch;

    return {
      success: true,
      output: {
        conditionsPassed: passed,
        evaluatedConditions: config.conditions.map((c, i) => ({
          field: c.field,
          operator: c.operator,
          expected: c.value,
          result: results[i],
        })),
      },
      nextStepId,
    };
  } catch (error) {
    console.error("Error executing condition:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to evaluate condition",
        retryable: false,
      },
    };
  }
}

/**
 * Evaluate a single condition
 */
function evaluateCondition(
  condition: WorkflowCondition,
  context: Record<string, unknown>
): boolean {
  const value = getNestedValue(context, condition.field);

  switch (condition.operator) {
    case "equals":
      return value === condition.value;
    case "not_equals":
      return value !== condition.value;
    case "contains":
      return String(value).includes(String(condition.value));
    case "not_contains":
      return !String(value).includes(String(condition.value));
    case "greater_than":
      return Number(value) > Number(condition.value);
    case "less_than":
      return Number(value) < Number(condition.value);
    case "is_empty":
      return value === null || value === undefined || value === "";
    case "is_not_empty":
      return value !== null && value !== undefined && value !== "";
    case "in_list":
      return Array.isArray(condition.value) && condition.value.includes(value);
    case "not_in_list":
      return Array.isArray(condition.value) && !condition.value.includes(value);
    default:
      return false;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object"
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj as unknown);
}

/**
 * Execute update lead step
 */
async function executeUpdateLead(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string
): Promise<StepExecutionResult> {
  const config = step.config as UpdateLeadConfig;

  try {
    const leadId = config.leadId || (context.leadId as string);

    if (!leadId) {
      return {
        success: false,
        error: {
          message: "Lead ID required for update_lead action",
          retryable: false,
        },
      };
    }

    // Get current lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return {
        success: false,
        error: {
          message: `Lead not found: ${leadId}`,
          retryable: false,
        },
      };
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (config.status) {
      updateData.status = config.status;
    }

    if (config.score !== undefined) {
      updateData.leadScore = config.score;
    } else if (config.scoreAdjustment) {
      updateData.leadScore = Math.max(0, Math.min(100, (lead.leadScore || 0) + config.scoreAdjustment));
    }

    if (config.tags && config.tags.length > 0) {
      // Merge tags
      const existingTags = lead.tags || [];
      const newTags = [...new Set([...existingTags, ...config.tags])];
      updateData.tags = newTags;
    }

    if (config.customFields) {
      const existingCustomFields = (lead.customFields as Record<string, unknown>) || {};
      updateData.customFields = {
        ...existingCustomFields,
        ...config.customFields,
      };
    }

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    return {
      success: true,
      output: {
        leadId,
        updatedFields: Object.keys(updateData),
        newScore: updatedLead.leadScore,
        newStatus: updatedLead.status,
      },
    };
  } catch (error) {
    console.error("Error updating lead:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to update lead",
        retryable: true,
      },
    };
  }
}

/**
 * Execute notify team step
 */
async function executeNotifyTeam(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string
): Promise<StepExecutionResult> {
  const config = step.config as NotifyTeamConfig;

  try {
    if (!config.message) {
      return {
        success: false,
        error: {
          message: "Message required for notify_team action",
          retryable: false,
        },
      };
    }

    const channel = config.channel || "in_app";
    const urgency = config.urgency || "normal";

    // Interpolate context variables in message
    let message = config.message;
    const placeholders = message.match(/\{\{([^}]+)\}\}/g) || [];
    for (const placeholder of placeholders) {
      const key = placeholder.replace(/\{\{|\}\}/g, "").trim();
      const value = getNestedValue(context, key);
      message = message.replace(placeholder, String(value || ""));
    }

    // In a real implementation, this would send notifications via email, Slack, etc.
    // For now, we log the notification
    console.log(`[Workflow] Team notification (${channel}, ${urgency}): ${message}`);

    // Could create a notification record in the database
    // await prisma.notification.create({ ... });

    return {
      success: true,
      output: {
        channel,
        urgency,
        message,
        recipients: config.recipients || ["org_admins"],
        status: "sent",
      },
    };
  } catch (error) {
    console.error("Error sending notification:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to send notification",
        retryable: true,
      },
    };
  }
}

/**
 * Execute AI analysis step
 */
async function executeAiAnalyze(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as AiAnalyzeConfig;

  try {
    if (!config.analysisType) {
      return {
        success: false,
        error: {
          message: "Analysis type required for ai_analyze action",
          retryable: false,
        },
      };
    }

    // Get input data
    const inputField = config.inputField || "lastStepResult";
    const inputData = getNestedValue(context, inputField);

    if (!inputData) {
      return {
        success: false,
        error: {
          message: `Input field not found: ${inputField}`,
          retryable: false,
        },
      };
    }

    // In a real implementation, this would call OpenAI or another AI service
    // For now, we return a placeholder analysis
    let analysisResult: Record<string, unknown>;

    switch (config.analysisType) {
      case "sentiment":
        analysisResult = {
          sentiment: "positive",
          confidence: 0.85,
          details: "Placeholder sentiment analysis",
        };
        break;
      case "intent":
        analysisResult = {
          primaryIntent: "information_seeking",
          confidence: 0.78,
          secondaryIntents: ["purchase_interest"],
        };
        break;
      case "summary":
        analysisResult = {
          summary: "Placeholder summary of the input data",
          keyPoints: ["Point 1", "Point 2"],
        };
        break;
      case "next_action":
        analysisResult = {
          recommendedAction: "follow_up_call",
          confidence: 0.72,
          reasoning: "Based on engagement patterns",
        };
        break;
      default:
        analysisResult = {
          result: "Analysis completed",
          type: config.analysisType,
        };
    }

    console.log(`[Workflow] AI Analysis (${config.analysisType}):`, analysisResult);

    return {
      success: true,
      output: {
        analysisType: config.analysisType,
        result: analysisResult,
        outputField: config.outputField || "aiAnalysis",
      },
    };
  } catch (error) {
    console.error("Error executing AI analysis:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to execute AI analysis",
        retryable: true,
      },
    };
  }
}

/**
 * Execute attribution touchpoint recording
 */
async function executeAttribute(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as AttributeConfig;

  try {
    if (!config.action) {
      return {
        success: false,
        error: {
          message: "Action required for attribute step",
          retryable: false,
        },
      };
    }

    // Create touchpoint
    const touchpoint = await prisma.customerTouchpoint.create({
      data: {
        organizationId,
        brandId,
        journeyId: context.journeyId as string || undefined,
        customerId: context.customerId as string || undefined,
        anonymousId: context.anonymousId as string || undefined,
        email: context.email as string || undefined,
        phone: context.phone as string || undefined,
        channelType: config.channel || ChannelType.SOCIAL,
        channelName: config.channelName || "Workflow",
        action: config.action,
        actionDetail: config.actionDetail,
        sourceType: "workflow",
        sourceId: context.workflowInstanceId as string,
        engagementScore: config.engagementScore || 0,
        estimatedValue: config.estimatedValue,
        metadata: {
          workflowStep: step.id,
          stepConfig: config,
        },
      },
    });

    return {
      success: true,
      output: {
        touchpointId: touchpoint.id,
        action: config.action,
        channel: config.channel,
      },
      touchpointId: touchpoint.id,
    };
  } catch (error) {
    console.error("Error recording attribution:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to record attribution",
        retryable: true,
      },
    };
  }
}

/**
 * Execute end step - terminate workflow
 */
async function executeEnd(
  step: WorkflowStep,
  context: Record<string, unknown>
): Promise<StepExecutionResult> {
  return {
    success: true,
    output: {
      completed: true,
      finalContext: context,
    },
    nextStepId: undefined, // Signals workflow completion
  };
}

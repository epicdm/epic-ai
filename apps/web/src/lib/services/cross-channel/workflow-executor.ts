/**
 * Workflow Executor
 *
 * Orchestrates cross-channel workflow execution, managing the lifecycle
 * of workflow instances and coordinating step execution across channels.
 *
 * "One Brain, Many Voices" - Consistent brand experience across all channels.
 */

import { prisma } from "@epic-ai/database";
import {
  WorkflowStatus,
  WorkflowAction,
  ChannelType,
} from "@epic-ai/database";
import {
  WorkflowStep,
  WorkflowCondition,
  ConditionOperator,
} from "./types";
import { executeSocialStep } from "./steps/social-steps";
import { executeVoiceStep } from "./steps/voice-steps";
import { executeInternalStep } from "./steps/internal-steps";

/**
 * Context passed to workflow execution
 */
export interface WorkflowContext {
  leadId?: string;
  customerId?: string;
  journeyId?: string;
  callLogId?: string;
  contentItemId?: string;
  email?: string;
  phone?: string;
  brandBrainId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Result of a step execution
 */
export interface StepExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: {
    message: string;
    code?: string;
    retryable: boolean;
  };
  touchpointId?: string;
  contentItemId?: string;
  callLogId?: string;
  nextStepId?: string;
}

/**
 * Workflow Executor Class
 *
 * Manages the execution of cross-channel workflows.
 */
export class WorkflowExecutor {
  private organizationId: string;
  private brandId?: string;

  constructor(organizationId: string, brandId?: string) {
    this.organizationId = organizationId;
    this.brandId = brandId;
  }

  /**
   * Start a new workflow instance from an automation
   */
  async startWorkflow(
    automationId: string,
    context: WorkflowContext
  ): Promise<{ instanceId: string; status: WorkflowStatus }> {
    // Get the automation
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      throw new Error(`Automation not found: ${automationId}`);
    }

    if (!automation.isActive) {
      throw new Error(`Automation is not active: ${automationId}`);
    }

    // Create workflow instance
    const instance = await prisma.workflowInstance.create({
      data: {
        automationId,
        organizationId: this.organizationId,
        brandId: this.brandId,
        leadId: context.leadId,
        customerId: context.customerId,
        journeyId: context.journeyId,
        callLogId: context.callLogId,
        contentItemId: context.contentItemId,
        status: WorkflowStatus.RUNNING,
        currentStepId: automation.entryStepId,
        completedSteps: [],
        context: context as object,
        results: {},
        errors: [],
        channelsUsed: [],
      },
    });

    // Update automation run count
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        totalRuns: { increment: 1 },
      },
    });

    // Execute the entry step
    await this.executeCurrentStep(instance.id);

    // Get updated instance status
    const updatedInstance = await prisma.workflowInstance.findUnique({
      where: { id: instance.id },
      select: { status: true },
    });

    return {
      instanceId: instance.id,
      status: updatedInstance?.status || WorkflowStatus.RUNNING,
    };
  }

  /**
   * Execute the current step of a workflow instance
   */
  async executeCurrentStep(instanceId: string): Promise<StepExecutionResult> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        automation: true,
      },
    });

    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.RUNNING) {
      return {
        success: false,
        error: {
          message: `Workflow is not running: ${instance.status}`,
          retryable: false,
        },
      };
    }

    // Get the current step from automation steps
    const steps = instance.automation.steps as WorkflowStep[];
    const currentStep = steps.find((s) => s.id === instance.currentStepId);

    if (!currentStep) {
      // No more steps - complete the workflow
      await this.completeWorkflow(instanceId, true);
      return { success: true, output: { completed: true } };
    }

    // Check step conditions
    if (currentStep.conditions && currentStep.conditions.length > 0) {
      const context = instance.context as Record<string, unknown>;
      const conditionsMet = this.evaluateConditions(
        currentStep.conditions,
        context,
        currentStep.conditionLogic || "and"
      );

      if (!conditionsMet) {
        // Skip this step, move to next
        const nextStepId = currentStep.onFailure || this.findNextStep(steps, currentStep.id);
        if (nextStepId) {
          await this.advanceToStep(instanceId, nextStepId);
          return this.executeCurrentStep(instanceId);
        } else {
          await this.completeWorkflow(instanceId, true);
          return { success: true, output: { skipped: true } };
        }
      }
    }

    // Handle delay
    if (currentStep.delayMinutes && currentStep.delayMinutes > 0) {
      const scheduledTime = new Date(Date.now() + currentStep.delayMinutes * 60 * 1000);
      await prisma.workflowInstance.update({
        where: { id: instanceId },
        data: {
          status: WorkflowStatus.PAUSED,
          scheduledNextAt: scheduledTime,
        },
      });
      return {
        success: true,
        output: { delayed: true, scheduledAt: scheduledTime.toISOString() },
      };
    }

    // Execute the step
    const result = await this.executeStep(instance, currentStep);

    // Record step execution
    await prisma.workflowStepExecution.create({
      data: {
        instanceId,
        stepId: currentStep.id,
        action: currentStep.action as WorkflowAction,
        channel: currentStep.channel as ChannelType,
        success: result.success,
        output: result.output as object || {},
        errorMessage: result.error?.message,
        retryCount: 0,
        touchpointId: result.touchpointId,
        contentItemId: result.contentItemId,
        callLogId: result.callLogId,
        nextStepId: result.nextStepId,
      },
    });

    // Update instance with results
    const instanceContext = instance.context as Record<string, unknown>;
    const instanceResults = instance.results as Record<string, unknown>;
    const channelsUsed = new Set(instance.channelsUsed);

    if (currentStep.channel) {
      channelsUsed.add(currentStep.channel as ChannelType);
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        context: {
          ...instanceContext,
          lastStepResult: result,
        },
        results: {
          ...instanceResults,
          [currentStep.id]: result,
        },
        completedSteps: [...instance.completedSteps, currentStep.id],
        touchpointsCreated: result.touchpointId
          ? instance.touchpointsCreated + 1
          : instance.touchpointsCreated,
        channelsUsed: Array.from(channelsUsed),
      },
    });

    if (!result.success) {
      // Handle failure
      if (result.error?.retryable) {
        // Could implement retry logic here
        const errors = instance.errors as Array<Record<string, unknown>>;
        await prisma.workflowInstance.update({
          where: { id: instanceId },
          data: {
            errors: [
              ...errors,
              {
                stepId: currentStep.id,
                timestamp: new Date().toISOString(),
                message: result.error.message,
                code: result.error.code,
                retryable: true,
                retryCount: 1,
              },
            ],
          },
        });
      }

      // Check for failure path
      if (currentStep.onFailure) {
        await this.advanceToStep(instanceId, currentStep.onFailure);
        return this.executeCurrentStep(instanceId);
      } else {
        await this.completeWorkflow(instanceId, false);
        return result;
      }
    }

    // Determine next step
    let nextStepId = result.nextStepId || currentStep.onSuccess;

    // Check for conditional branches
    if (currentStep.branches && currentStep.branches.length > 0) {
      const context = {
        ...(instance.context as Record<string, unknown>),
        lastStepResult: result,
      };
      for (const branch of currentStep.branches) {
        if (this.evaluateConditions([branch.condition], context, "and")) {
          nextStepId = branch.nextStepId;
          break;
        }
      }
    }

    // If no explicit next step, find the next sequential step
    if (!nextStepId) {
      nextStepId = this.findNextStep(steps, currentStep.id);
    }

    // Advance or complete
    if (nextStepId && currentStep.action !== "end") {
      await this.advanceToStep(instanceId, nextStepId);
      // Continue execution (for immediate steps)
      return this.executeCurrentStep(instanceId);
    } else {
      await this.completeWorkflow(instanceId, true);
      return result;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    instance: {
      id: string;
      organizationId: string;
      brandId: string | null;
      context: unknown;
      automation: { id: string };
    },
    step: WorkflowStep
  ): Promise<StepExecutionResult> {
    const context = instance.context as Record<string, unknown>;

    // Route to appropriate handler based on action type
    switch (step.action) {
      // Social actions
      case "social_post":
      case "social_dm":
      case "social_engage":
        return executeSocialStep(
          step,
          context,
          instance.organizationId,
          instance.brandId || undefined
        );

      // Voice actions
      case "voice_call_outbound":
      case "voice_call_schedule":
      case "voice_sms":
        return executeVoiceStep(
          step,
          context,
          instance.organizationId,
          instance.brandId || undefined
        );

      // Internal actions
      case "wait":
      case "condition":
      case "update_lead":
      case "notify_team":
      case "ai_analyze":
      case "attribute":
      case "end":
        return executeInternalStep(
          step,
          context,
          instance.organizationId,
          instance.brandId || undefined
        );

      default:
        return {
          success: false,
          error: {
            message: `Unknown action type: ${step.action}`,
            retryable: false,
          },
        };
    }
  }

  /**
   * Resume a paused workflow
   */
  async resumeWorkflow(instanceId: string): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.PAUSED) {
      throw new Error(`Workflow is not paused: ${instance.status}`);
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowStatus.RUNNING,
        scheduledNextAt: null,
      },
    });

    await this.executeCurrentStep(instanceId);
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(instanceId: string): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (
      instance.status === WorkflowStatus.COMPLETED ||
      instance.status === WorkflowStatus.CANCELLED
    ) {
      throw new Error(`Workflow already finished: ${instance.status}`);
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }

  /**
   * Pause a running workflow
   */
  async pauseWorkflow(instanceId: string): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new Error(`Workflow instance not found: ${instanceId}`);
    }

    if (instance.status !== WorkflowStatus.RUNNING) {
      throw new Error(`Workflow is not running: ${instance.status}`);
    }

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowStatus.PAUSED,
      },
    });
  }

  /**
   * Get workflow instance status
   */
  async getInstanceStatus(instanceId: string) {
    return prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        automation: {
          select: {
            name: true,
            category: true,
          },
        },
        stepExecutions: {
          orderBy: { executedAt: "asc" },
        },
      },
    });
  }

  /**
   * List instances for an automation
   */
  async listInstances(automationId: string, options?: {
    status?: WorkflowStatus;
    limit?: number;
    offset?: number;
  }) {
    return prisma.workflowInstance.findMany({
      where: {
        automationId,
        ...(options?.status && { status: options.status }),
      },
      orderBy: { startedAt: "desc" },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        stepExecutions: {
          orderBy: { executedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Advance workflow to a specific step
   */
  private async advanceToStep(instanceId: string, stepId: string): Promise<void> {
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStepId: stepId,
      },
    });
  }

  /**
   * Complete a workflow instance
   */
  private async completeWorkflow(instanceId: string, success: boolean): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) return;

    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: success ? WorkflowStatus.COMPLETED : WorkflowStatus.FAILED,
        completedAt: new Date(),
      },
    });

    // Update automation stats
    await prisma.automation.update({
      where: { id: instance.automationId },
      data: success
        ? { successfulRuns: { increment: 1 } }
        : { failedRuns: { increment: 1 } },
    });
  }

  /**
   * Find the next sequential step
   */
  private findNextStep(steps: WorkflowStep[], currentStepId: string): string | null {
    const currentIndex = steps.findIndex((s) => s.id === currentStepId);
    if (currentIndex === -1 || currentIndex >= steps.length - 1) {
      return null;
    }
    return steps[currentIndex + 1].id;
  }

  /**
   * Evaluate workflow conditions
   */
  private evaluateConditions(
    conditions: WorkflowCondition[],
    context: Record<string, unknown>,
    logic: "and" | "or"
  ): boolean {
    const results = conditions.map((c) => this.evaluateCondition(c, context));
    return logic === "and"
      ? results.every((r) => r)
      : results.some((r) => r);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: WorkflowCondition,
    context: Record<string, unknown>
  ): boolean {
    const value = this.getNestedValue(context, condition.field);

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
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((current, key) => {
      return current && typeof current === "object"
        ? (current as Record<string, unknown>)[key]
        : undefined;
    }, obj as unknown);
  }
}

/**
 * Create a workflow executor instance
 */
export function createWorkflowExecutor(
  organizationId: string,
  brandId?: string
): WorkflowExecutor {
  return new WorkflowExecutor(organizationId, brandId);
}

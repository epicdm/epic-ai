/**
 * Voice Channel Step Handlers
 *
 * Executes voice-related actions within cross-channel workflows.
 * Integrates with Voice AI agents and SMS services.
 */

import { prisma } from "@epic-ai/database";
import { ChannelType, CallDirection, CallStatus } from "@epic-ai/database";
import { WorkflowStep } from "../types";
import type { StepExecutionResult } from "../workflow-executor";

/**
 * Voice step configurations
 */
interface VoiceCallOutboundConfig {
  agentId?: string;
  phoneNumber: string;
  topic?: string;
  context?: Record<string, unknown>;
  maxDurationMinutes?: number;
  useBrandVoice?: boolean;
}

interface VoiceCallScheduleConfig {
  agentId?: string;
  phoneNumber: string;
  scheduledAt: string;
  topic?: string;
  context?: Record<string, unknown>;
  reminder?: boolean;
  reminderMinutesBefore?: number;
}

interface VoiceSmsConfig {
  phoneNumber: string;
  message: string;
  useAiGeneration?: boolean;
  useBrandVoice?: boolean;
}

/**
 * Execute a voice step
 */
export async function executeVoiceStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  switch (step.action) {
    case "voice_call_outbound":
      return executeVoiceCallOutbound(step, context, organizationId, brandId);
    case "voice_call_schedule":
      return executeVoiceCallSchedule(step, context, organizationId, brandId);
    case "voice_sms":
      return executeVoiceSms(step, context, organizationId, brandId);
    default:
      return {
        success: false,
        error: {
          message: `Unknown voice action: ${step.action}`,
          retryable: false,
        },
      };
  }
}

/**
 * Execute outbound voice call
 */
async function executeVoiceCallOutbound(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as VoiceCallOutboundConfig;

  try {
    // Validate phone number
    if (!config.phoneNumber) {
      // Try to get from context
      const phone = context.phone as string;
      if (!phone) {
        return {
          success: false,
          error: {
            message: "Phone number required for outbound call",
            retryable: false,
          },
        };
      }
      config.phoneNumber = phone;
    }

    // Get or select voice agent
    let agentId = config.agentId;
    if (!agentId) {
      // Find an active outbound agent
      const agent = await prisma.voiceAgent.findFirst({
        where: {
          organizationId,
          ...(brandId && { brandId }),
          isActive: true,
          capabilities: { has: "outbound" },
        },
        select: { id: true },
      });

      if (!agent) {
        return {
          success: false,
          error: {
            message: "No active outbound voice agent found",
            retryable: false,
          },
        };
      }
      agentId = agent.id;
    }

    // Create call log entry
    const callLog = await prisma.callLog.create({
      data: {
        agentId,
        organizationId,
        brandId,
        direction: CallDirection.OUTBOUND,
        status: CallStatus.INITIATED,
        fromNumber: "", // Will be populated by voice service
        toNumber: config.phoneNumber,
        triggeredBySocial: context.contentItemId ? true : false,
        socialPostId: context.contentItemId as string || undefined,
        workflowInstanceId: context.workflowInstanceId as string || undefined,
        metadata: {
          workflowStep: step.id,
          topic: config.topic,
          callContext: config.context,
          source: "cross-channel-workflow",
        },
      },
    });

    // In a real implementation, this would trigger the voice service
    // to initiate the call. For now, we create the call log and
    // the voice service would pick it up or we'd call it directly.
    console.log(`[Workflow] Initiating outbound call to ${config.phoneNumber} with agent ${agentId}`);

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          phone: config.phoneNumber,
          channelType: ChannelType.VOICE,
          channelName: "Voice AI",
          channelId: agentId,
          action: step.touchpointAction || "call_initiated",
          actionDetail: `Outbound call initiated to ${config.phoneNumber}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            callLogId: callLog.id,
            agentId,
            topic: config.topic,
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        callLogId: callLog.id,
        agentId,
        phoneNumber: config.phoneNumber,
        status: "initiated",
      },
      callLogId: callLog.id,
      touchpointId,
    };
  } catch (error) {
    console.error("Error executing outbound call:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to initiate call",
        retryable: true,
      },
    };
  }
}

/**
 * Schedule a voice call for later
 */
async function executeVoiceCallSchedule(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as VoiceCallScheduleConfig;

  try {
    // Validate required fields
    if (!config.phoneNumber) {
      const phone = context.phone as string;
      if (!phone) {
        return {
          success: false,
          error: {
            message: "Phone number required for scheduled call",
            retryable: false,
          },
        };
      }
      config.phoneNumber = phone;
    }

    if (!config.scheduledAt) {
      return {
        success: false,
        error: {
          message: "Scheduled time required for scheduled call",
          retryable: false,
        },
      };
    }

    // Get or select voice agent
    let agentId = config.agentId;
    if (!agentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: {
          organizationId,
          ...(brandId && { brandId }),
          isActive: true,
          capabilities: { has: "outbound" },
        },
        select: { id: true },
      });

      if (!agent) {
        return {
          success: false,
          error: {
            message: "No active outbound voice agent found",
            retryable: false,
          },
        };
      }
      agentId = agent.id;
    }

    const scheduledDate = new Date(config.scheduledAt);

    // Create scheduled call log
    const callLog = await prisma.callLog.create({
      data: {
        agentId,
        organizationId,
        brandId,
        direction: CallDirection.OUTBOUND,
        status: CallStatus.INITIATED, // Will be changed to a scheduled status
        fromNumber: "",
        toNumber: config.phoneNumber,
        scheduledAt: scheduledDate,
        triggeredBySocial: context.contentItemId ? true : false,
        socialPostId: context.contentItemId as string || undefined,
        workflowInstanceId: context.workflowInstanceId as string || undefined,
        metadata: {
          workflowStep: step.id,
          topic: config.topic,
          callContext: config.context,
          scheduled: true,
          reminderEnabled: config.reminder,
          reminderMinutesBefore: config.reminderMinutesBefore,
          source: "cross-channel-workflow",
        },
      },
    });

    console.log(`[Workflow] Scheduled call to ${config.phoneNumber} at ${scheduledDate.toISOString()}`);

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          phone: config.phoneNumber,
          channelType: ChannelType.VOICE,
          channelName: "Voice AI",
          channelId: agentId,
          action: step.touchpointAction || "call_scheduled",
          actionDetail: `Call scheduled for ${scheduledDate.toISOString()}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            callLogId: callLog.id,
            agentId,
            scheduledAt: scheduledDate.toISOString(),
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        callLogId: callLog.id,
        agentId,
        phoneNumber: config.phoneNumber,
        scheduledAt: scheduledDate.toISOString(),
        status: "scheduled",
      },
      callLogId: callLog.id,
      touchpointId,
    };
  } catch (error) {
    console.error("Error scheduling call:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to schedule call",
        retryable: true,
      },
    };
  }
}

/**
 * Send SMS message
 */
async function executeVoiceSms(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as VoiceSmsConfig;

  try {
    // Validate required fields
    if (!config.phoneNumber) {
      const phone = context.phone as string;
      if (!phone) {
        return {
          success: false,
          error: {
            message: "Phone number required for SMS",
            retryable: false,
          },
        };
      }
      config.phoneNumber = phone;
    }

    if (!config.message) {
      return {
        success: false,
        error: {
          message: "Message required for SMS",
          retryable: false,
        },
      };
    }

    // In a real implementation, this would call an SMS service (Twilio, etc.)
    // For now, we log the SMS action
    console.log(`[Workflow] Sending SMS to ${config.phoneNumber}: ${config.message}`);

    // Create a record of the SMS (could be a separate model, but using call log for now)
    const smsLog = await prisma.callLog.create({
      data: {
        agentId: "sms", // Special identifier for SMS
        organizationId,
        brandId,
        direction: CallDirection.OUTBOUND,
        status: CallStatus.COMPLETED,
        fromNumber: "",
        toNumber: config.phoneNumber,
        duration: 0,
        triggeredBySocial: context.contentItemId ? true : false,
        socialPostId: context.contentItemId as string || undefined,
        workflowInstanceId: context.workflowInstanceId as string || undefined,
        metadata: {
          type: "sms",
          workflowStep: step.id,
          message: config.message,
          source: "cross-channel-workflow",
        },
      },
    });

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          phone: config.phoneNumber,
          channelType: ChannelType.VOICE, // SMS is part of voice channel
          channelName: "SMS",
          action: step.touchpointAction || "sms_sent",
          actionDetail: `SMS sent to ${config.phoneNumber}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            smsLogId: smsLog.id,
            messagePreview: config.message.substring(0, 50),
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        smsLogId: smsLog.id,
        phoneNumber: config.phoneNumber,
        status: "sent",
      },
      touchpointId,
    };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to send SMS",
        retryable: true,
      },
    };
  }
}

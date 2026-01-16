/**
 * Social Channel Step Handlers
 *
 * Executes social media actions within cross-channel workflows.
 * Integrates with the Content Factory and Social Publishing services.
 */

import { prisma } from "@epic-ai/database";
import { ChannelType, ContentStatus, ContentType } from "@epic-ai/database";
import { WorkflowStep } from "../types";
import type { StepExecutionResult } from "../workflow-executor";

/**
 * Social step configuration
 */
interface SocialPostConfig {
  platform?: "twitter" | "linkedin" | "facebook" | "instagram";
  platforms?: string[];
  content?: string;
  useAiGeneration?: boolean;
  topic?: string;
  contentPillarId?: string;
  useBrandVoice?: boolean;
  scheduleAt?: string;
  mediaUrls?: string[];
}

interface SocialDmConfig {
  platform: "twitter" | "linkedin" | "facebook" | "instagram";
  recipientId: string;
  message: string;
  useAiGeneration?: boolean;
  useBrandVoice?: boolean;
}

interface SocialEngageConfig {
  platform: "twitter" | "linkedin" | "facebook" | "instagram";
  postId: string;
  action: "like" | "comment" | "share";
  comment?: string;
}

/**
 * Execute a social step
 */
export async function executeSocialStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  switch (step.action) {
    case "social_post":
      return executeSocialPost(step, context, organizationId, brandId);
    case "social_dm":
      return executeSocialDm(step, context, organizationId, brandId);
    case "social_engage":
      return executeSocialEngage(step, context, organizationId, brandId);
    default:
      return {
        success: false,
        error: {
          message: `Unknown social action: ${step.action}`,
          retryable: false,
        },
      };
  }
}

/**
 * Execute social post action
 */
async function executeSocialPost(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as SocialPostConfig;

  try {
    // Get brand brain if needed for AI generation
    let brandBrainId: string | undefined;
    if (config.useBrandVoice !== false || config.useAiGeneration) {
      const brandBrain = await prisma.brandBrain.findFirst({
        where: {
          organizationId,
          ...(brandId && { brandId }),
        },
        select: { id: true },
      });
      brandBrainId = brandBrain?.id;
    }

    // Determine content
    let content = config.content;

    // If using AI generation, we'd call the content factory here
    // For now, we'll create a content item that can be processed later
    if (config.useAiGeneration && !content) {
      content = `[AI-generated content for topic: ${config.topic || "general"}]`;
    }

    if (!content) {
      return {
        success: false,
        error: {
          message: "No content provided for social post",
          retryable: false,
        },
      };
    }

    // Determine platforms
    const platforms = config.platforms || (config.platform ? [config.platform] : ["twitter"]);

    // Create content item
    const contentItem = await prisma.contentItem.create({
      data: {
        organizationId,
        brandId,
        type: ContentType.POST,
        title: config.topic || "Workflow Generated Post",
        content,
        status: config.scheduleAt ? ContentStatus.SCHEDULED : ContentStatus.DRAFT,
        aiGenerated: config.useAiGeneration || false,
        brandBrainId,
        contentPillarId: config.contentPillarId,
        triggeredByVoice: context.callLogId ? true : false,
        voiceAgentId: context.voiceAgentId as string || undefined,
        callLogId: context.callLogId as string || undefined,
        workflowInstanceId: context.workflowInstanceId as string || undefined,
        metadata: {
          workflowStep: step.id,
          platforms,
          source: "cross-channel-workflow",
        },
      },
    });

    // Create platform variations
    for (const platform of platforms) {
      await prisma.contentVariation.create({
        data: {
          contentItemId: contentItem.id,
          platform,
          content,
          optimizedForPlatform: false,
          characterCount: content.length,
        },
      });
    }

    // If scheduled, create publishing schedule
    if (config.scheduleAt) {
      const scheduledDate = new Date(config.scheduleAt);
      for (const platform of platforms) {
        // Get social account for platform
        const socialAccount = await prisma.socialAccount.findFirst({
          where: {
            organizationId,
            platform,
            isActive: true,
          },
        });

        if (socialAccount) {
          await prisma.publishingSchedule.create({
            data: {
              contentItemId: contentItem.id,
              socialAccountId: socialAccount.id,
              scheduledAt: scheduledDate,
              status: "PENDING",
            },
          });
        }
      }

      // Update content status
      await prisma.contentItem.update({
        where: { id: contentItem.id },
        data: { status: ContentStatus.SCHEDULED },
      });
    }

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          email: context.email as string || undefined,
          channelType: ChannelType.SOCIAL,
          channelName: platforms.join(", "),
          action: step.touchpointAction || "content_created",
          actionDetail: `Created social post: ${contentItem.title}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            contentItemId: contentItem.id,
            platforms,
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        contentItemId: contentItem.id,
        platforms,
        status: config.scheduleAt ? "scheduled" : "draft",
        scheduledAt: config.scheduleAt,
      },
      contentItemId: contentItem.id,
      touchpointId,
    };
  } catch (error) {
    console.error("Error executing social post:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to create social post",
        retryable: true,
      },
    };
  }
}

/**
 * Execute social DM action
 */
async function executeSocialDm(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as SocialDmConfig;

  try {
    if (!config.platform || !config.recipientId) {
      return {
        success: false,
        error: {
          message: "Platform and recipient required for social DM",
          retryable: false,
        },
      };
    }

    // Get social account for platform
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        organizationId,
        platform: config.platform,
        isActive: true,
      },
    });

    if (!socialAccount) {
      return {
        success: false,
        error: {
          message: `No active ${config.platform} account found`,
          retryable: false,
        },
      };
    }

    // For now, log the DM action - actual implementation would use platform APIs
    // This is a placeholder for the actual DM sending logic
    console.log(`[Workflow] Sending DM on ${config.platform} to ${config.recipientId}`);

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          email: context.email as string || undefined,
          channelType: ChannelType.SOCIAL,
          channelName: config.platform,
          action: step.touchpointAction || "message_sent",
          actionDetail: `Sent DM on ${config.platform}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            recipientId: config.recipientId,
            platform: config.platform,
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        platform: config.platform,
        recipientId: config.recipientId,
        status: "sent",
      },
      touchpointId,
    };
  } catch (error) {
    console.error("Error executing social DM:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to send DM",
        retryable: true,
      },
    };
  }
}

/**
 * Execute social engage action (like, comment, share)
 */
async function executeSocialEngage(
  step: WorkflowStep,
  context: Record<string, unknown>,
  organizationId: string,
  brandId?: string
): Promise<StepExecutionResult> {
  const config = step.config as SocialEngageConfig;

  try {
    if (!config.platform || !config.postId || !config.action) {
      return {
        success: false,
        error: {
          message: "Platform, post ID, and action required for social engagement",
          retryable: false,
        },
      };
    }

    // Get social account for platform
    const socialAccount = await prisma.socialAccount.findFirst({
      where: {
        organizationId,
        platform: config.platform,
        isActive: true,
      },
    });

    if (!socialAccount) {
      return {
        success: false,
        error: {
          message: `No active ${config.platform} account found`,
          retryable: false,
        },
      };
    }

    // Placeholder for actual engagement logic
    console.log(`[Workflow] ${config.action} on ${config.platform} post ${config.postId}`);

    // Record touchpoint if configured
    let touchpointId: string | undefined;
    if (step.recordTouchpoint) {
      const touchpoint = await prisma.customerTouchpoint.create({
        data: {
          organizationId,
          brandId,
          journeyId: context.journeyId as string || undefined,
          customerId: context.customerId as string || undefined,
          channelType: ChannelType.SOCIAL,
          channelName: config.platform,
          action: step.touchpointAction || "engagement",
          actionDetail: `${config.action} on post ${config.postId}`,
          sourceType: "workflow",
          sourceId: context.workflowInstanceId as string,
          metadata: {
            postId: config.postId,
            engagementType: config.action,
          },
        },
      });
      touchpointId = touchpoint.id;
    }

    return {
      success: true,
      output: {
        platform: config.platform,
        postId: config.postId,
        action: config.action,
        status: "completed",
      },
      touchpointId,
    };
  } catch (error) {
    console.error("Error executing social engage:", error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Failed to engage",
        retryable: true,
      },
    };
  }
}

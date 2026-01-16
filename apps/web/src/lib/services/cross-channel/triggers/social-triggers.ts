/**
 * Social Triggers for Cross-Channel Workflows
 *
 * Triggers automations based on social media events like high engagement,
 * new followers, mentions, and content performance.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { prisma } from "@epic-ai/database";
import {
  WorkflowTrigger,
  ChannelType,
} from "@epic-ai/database";
import { createWorkflowExecutor, WorkflowContext } from "../workflow-executor";

/**
 * Context for high engagement trigger
 */
export interface HighEngagementContext {
  organizationId: string;
  brandId?: string;
  contentItemId: string;
  platform: string;
  engagementScore: number;
  engagementRate: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  leadId?: string;
  customerId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context for new follower trigger
 */
export interface NewFollowerContext {
  organizationId: string;
  brandId?: string;
  platform: string;
  followerId?: string;
  followerHandle?: string;
  followerName?: string;
  isHighValue?: boolean;
  leadId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context for mention trigger
 */
export interface MentionContext {
  organizationId: string;
  brandId?: string;
  platform: string;
  mentionId: string;
  authorHandle: string;
  authorName?: string;
  content: string;
  sentiment?: "positive" | "negative" | "neutral";
  isInfluencer?: boolean;
  followerCount?: number;
  leadId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Context for content performance threshold trigger
 */
export interface ContentPerformanceContext {
  organizationId: string;
  brandId?: string;
  contentItemId: string;
  platform: string;
  metric: string;
  value: number;
  threshold: number;
  contentType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Trigger automations when engagement score exceeds threshold
 *
 * Example: When a post gets unusually high engagement, trigger a
 * workflow to schedule a follow-up call with engaged leads.
 */
export async function triggerOnHighEngagement(
  context: HighEngagementContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.SOCIAL,
        },
      },
    });

    if (automations.length === 0) {
      return { triggered: 0, instances: [] };
    }

    console.log(
      `[SocialTriggers] Found ${automations.length} potential automations for social.high_engagement`
    );

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "social.high_engagement") {
        continue;
      }

      // Check engagement threshold
      const threshold = (triggerConfig.engagementThreshold as number) || 80;
      if (context.engagementScore < threshold) {
        console.log(
          `[SocialTriggers] Engagement ${context.engagementScore} below threshold ${threshold}`
        );
        continue;
      }

      // Check platform filter if specified
      const platforms = triggerConfig.platforms as string[] | undefined;
      if (platforms && !platforms.includes(context.platform)) {
        continue;
      }

      const workflowContext: WorkflowContext = {
        contentItemId: context.contentItemId,
        leadId: context.leadId,
        customerId: context.customerId,
        metadata: {
          triggerEvent: "social.high_engagement",
          platform: context.platform,
          engagementScore: context.engagementScore,
          engagementRate: context.engagementRate,
          impressions: context.impressions,
          likes: context.likes,
          comments: context.comments,
          shares: context.shares,
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

        console.log(
          `[SocialTriggers] Started workflow ${result.instanceId} for high engagement`
        );
      } catch (error) {
        console.error(
          `[SocialTriggers] Failed to start workflow:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[SocialTriggers] Error in triggerOnHighEngagement:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations when a new follower is detected
 */
export async function triggerOnNewFollower(
  context: NewFollowerContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.SOCIAL,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "social.new_follower") {
        continue;
      }

      // Check if we only want high-value followers
      const highValueOnly = triggerConfig.highValueOnly as boolean;
      if (highValueOnly && !context.isHighValue) {
        continue;
      }

      // Check platform filter
      const platforms = triggerConfig.platforms as string[] | undefined;
      if (platforms && !platforms.includes(context.platform)) {
        continue;
      }

      const workflowContext: WorkflowContext = {
        leadId: context.leadId,
        metadata: {
          triggerEvent: "social.new_follower",
          platform: context.platform,
          followerId: context.followerId,
          followerHandle: context.followerHandle,
          followerName: context.followerName,
          isHighValue: context.isHighValue,
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
          `[SocialTriggers] Failed to start workflow for new_follower:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[SocialTriggers] Error in triggerOnNewFollower:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations when the brand is mentioned
 */
export async function triggerOnMention(
  context: MentionContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.SOCIAL,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "social.mention") {
        continue;
      }

      // Check sentiment filter
      const sentimentFilter = triggerConfig.sentiment as string | undefined;
      if (sentimentFilter && context.sentiment !== sentimentFilter) {
        continue;
      }

      // Check influencer filter
      const influencerOnly = triggerConfig.influencerOnly as boolean;
      if (influencerOnly && !context.isInfluencer) {
        continue;
      }

      // Check platform filter
      const platforms = triggerConfig.platforms as string[] | undefined;
      if (platforms && !platforms.includes(context.platform)) {
        continue;
      }

      const workflowContext: WorkflowContext = {
        leadId: context.leadId,
        metadata: {
          triggerEvent: "social.mention",
          platform: context.platform,
          mentionId: context.mentionId,
          authorHandle: context.authorHandle,
          authorName: context.authorName,
          content: context.content,
          sentiment: context.sentiment,
          isInfluencer: context.isInfluencer,
          followerCount: context.followerCount,
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
          `[SocialTriggers] Failed to start workflow for mention:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[SocialTriggers] Error in triggerOnMention:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations when content performance exceeds a threshold
 */
export async function triggerOnContentPerformance(
  context: ContentPerformanceContext
): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.SOCIAL,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "social.content_threshold") {
        continue;
      }

      // Check metric matches
      const metricFilter = triggerConfig.metric as string | undefined;
      if (metricFilter && metricFilter !== context.metric) {
        continue;
      }

      // Check value exceeds threshold
      const thresholdConfig = triggerConfig.threshold as number | undefined;
      const threshold = thresholdConfig ?? context.threshold;
      if (context.value < threshold) {
        continue;
      }

      // Check platform filter
      const platforms = triggerConfig.platforms as string[] | undefined;
      if (platforms && !platforms.includes(context.platform)) {
        continue;
      }

      const workflowContext: WorkflowContext = {
        contentItemId: context.contentItemId,
        metadata: {
          triggerEvent: "social.content_threshold",
          platform: context.platform,
          metric: context.metric,
          value: context.value,
          threshold: threshold,
          contentType: context.contentType,
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
          `[SocialTriggers] Failed to start workflow for content_threshold:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[SocialTriggers] Error in triggerOnContentPerformance:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Trigger automations when content is published
 */
export async function triggerOnContentPublished(context: {
  organizationId: string;
  brandId?: string;
  contentItemId: string;
  platform: string;
  contentType?: string;
  postUrl?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ triggered: number; instances: string[] }> {
  const instances: string[] = [];

  try {
    const automations = await prisma.automation.findMany({
      where: {
        organizationId: context.organizationId,
        isActive: true,
        trigger: WorkflowTrigger.EVENT,
        channels: {
          has: ChannelType.SOCIAL,
        },
      },
    });

    for (const automation of automations) {
      const triggerConfig = automation.triggerConfig as Record<string, unknown>;

      if (triggerConfig.event !== "social.content_published") {
        continue;
      }

      // Check platform filter
      const platforms = triggerConfig.platforms as string[] | undefined;
      if (platforms && !platforms.includes(context.platform)) {
        continue;
      }

      const workflowContext: WorkflowContext = {
        contentItemId: context.contentItemId,
        metadata: {
          triggerEvent: "social.content_published",
          platform: context.platform,
          contentType: context.contentType,
          postUrl: context.postUrl,
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
          `[SocialTriggers] Failed to start workflow for content_published:`,
          error
        );
      }
    }

    return { triggered: instances.length, instances };
  } catch (error) {
    console.error("[SocialTriggers] Error in triggerOnContentPublished:", error);
    return { triggered: 0, instances: [] };
  }
}

/**
 * Common trigger configurations for social events
 */
export const COMMON_SOCIAL_TRIGGERS = {
  // High engagement leads to voice follow-up
  engagementToCall: {
    event: "social.high_engagement",
    engagementThreshold: 80,
    description: "Trigger voice outreach when engagement exceeds 80%",
  },

  // Influencer mentions trigger immediate response
  influencerMention: {
    event: "social.mention",
    influencerOnly: true,
    description: "Alert team when brand is mentioned by influencers",
  },

  // Viral content triggers cross-posting
  viralContent: {
    event: "social.content_threshold",
    metric: "shares",
    threshold: 100,
    description: "Cross-post when content goes viral",
  },

  // New high-value follower triggers outreach
  highValueFollower: {
    event: "social.new_follower",
    highValueOnly: true,
    description: "Outreach to high-value new followers",
  },

  // Negative mention triggers support workflow
  negativeMention: {
    event: "social.mention",
    sentiment: "negative",
    description: "Route negative mentions to support team",
  },
};

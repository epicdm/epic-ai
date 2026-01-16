/**
 * Cross-Channel Service
 *
 * Orchestrates marketing workflows across multiple channels (social, voice, email, chat)
 * all powered by Brand Brain for consistent brand voice.
 *
 * "One Brain, Many Voices" Architecture:
 * - Brand Brain provides consistent personality across all channels
 * - Workflows coordinate touchpoints across channels
 * - Attribution tracks customer journeys
 * - AI optimizes timing and content per channel
 */

// Export types
export * from "./types";

// Export workflow executor
export {
  WorkflowExecutor,
  createWorkflowExecutor,
  type WorkflowContext,
  type StepExecutionResult,
} from "./workflow-executor";

// Export workflow templates
export {
  WORKFLOW_TEMPLATES,
  LEAD_NURTURE_WORKFLOW,
  CUSTOMER_ONBOARDING_WORKFLOW,
  RE_ENGAGEMENT_WORKFLOW,
  EVENT_PROMOTION_WORKFLOW,
  SALES_OUTREACH_WORKFLOW,
  getWorkflowTemplate,
  getTemplatesByCategory,
  getTemplatesByChannels,
} from "./workflow-templates";

// Export cross-channel triggers
export {
  // Voice triggers
  triggerOnCallCompleted,
  triggerOnCallScheduled,
  triggerOnCallMissed,
  COMMON_CALL_CONDITIONS,
  type CallCompletedContext,
  type CallScheduledContext,
  // Social triggers
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
  // Trigger events
  TRIGGER_EVENTS,
  TRIGGER_EVENT_METADATA,
  getTriggersForChannel,
  getAllTriggers,
  type TriggerEvent,
} from "./triggers";

import { ChannelType, AttributionModel } from "@epic-ai/database";
import { prisma } from "@epic-ai/database";
import {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowCategory,
  AttributionConfig,
  TouchpointAction,
} from "./types";
import { WORKFLOW_TEMPLATES } from "./workflow-templates";

/**
 * Cross-Channel Service Class
 *
 * Manages cross-channel workflows, attribution, and channel configurations.
 */
export class CrossChannelService {
  private organizationId: string;
  private brandId?: string;

  constructor(organizationId: string, brandId?: string) {
    this.organizationId = organizationId;
    this.brandId = brandId;
  }

  /**
   * Get all available workflow templates
   */
  getAvailableTemplates(): WorkflowTemplate[] {
    return Object.values(WORKFLOW_TEMPLATES);
  }

  /**
   * Get templates filtered by category
   */
  getTemplatesByCategory(category: WorkflowCategory): WorkflowTemplate[] {
    return Object.values(WORKFLOW_TEMPLATES).filter(
      (t) => t.category === category
    );
  }

  /**
   * Record a customer touchpoint
   */
  async recordTouchpoint(params: {
    channelType: ChannelType;
    channelName?: string;
    channelId?: string;
    action: TouchpointAction;
    actionDetail?: string;
    customerId?: string;
    anonymousId?: string;
    email?: string;
    phone?: string;
    sourceType?: string;
    sourceId?: string;
    sourceUrl?: string;
    sourceTitle?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    utmContent?: string;
    utmTerm?: string;
    referrer?: string;
    engagementScore?: number;
    estimatedValue?: number;
    deviceType?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ id: string; journeyId?: string }> {
    // Find or create journey
    let journey = await this.findOrCreateJourney({
      customerId: params.customerId,
      anonymousId: params.anonymousId,
      email: params.email,
      phone: params.phone,
    });

    // Create touchpoint
    const touchpoint = await prisma.customerTouchpoint.create({
      data: {
        organizationId: this.organizationId,
        brandId: this.brandId,
        journeyId: journey?.id,
        customerId: params.customerId,
        anonymousId: params.anonymousId,
        email: params.email,
        phone: params.phone,
        channelType: params.channelType,
        channelName: params.channelName,
        channelId: params.channelId,
        action: params.action,
        actionDetail: params.actionDetail,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        sourceUrl: params.sourceUrl,
        sourceTitle: params.sourceTitle,
        utmSource: params.utmSource,
        utmMedium: params.utmMedium,
        utmCampaign: params.utmCampaign,
        utmContent: params.utmContent,
        utmTerm: params.utmTerm,
        referrer: params.referrer,
        engagementScore: params.engagementScore || 0,
        estimatedValue: params.estimatedValue,
        deviceType: params.deviceType,
        sessionId: params.sessionId,
        metadata: params.metadata as object,
      },
    });

    // Update journey stats
    if (journey) {
      await this.updateJourneyStats(journey.id, params.channelType);
    }

    return {
      id: touchpoint.id,
      journeyId: journey?.id,
    };
  }

  /**
   * Find or create a customer journey
   */
  private async findOrCreateJourney(params: {
    customerId?: string;
    anonymousId?: string;
    email?: string;
    phone?: string;
  }): Promise<{ id: string } | null> {
    if (!params.customerId && !params.anonymousId && !params.email && !params.phone) {
      return null;
    }

    // Try to find existing journey
    const existingJourney = await prisma.customerJourney.findFirst({
      where: {
        organizationId: this.organizationId,
        OR: [
          params.customerId ? { customerId: params.customerId } : {},
          params.email ? { email: params.email } : {},
          params.phone ? { phone: params.phone } : {},
          params.anonymousId ? { anonymousId: params.anonymousId } : {},
        ].filter((o) => Object.keys(o).length > 0),
      },
      select: { id: true },
    });

    if (existingJourney) {
      return existingJourney;
    }

    // Create new journey
    const newJourney = await prisma.customerJourney.create({
      data: {
        organizationId: this.organizationId,
        brandId: this.brandId,
        customerId: params.customerId,
        anonymousId: params.anonymousId,
        email: params.email,
        phone: params.phone,
        status: "active",
      },
      select: { id: true },
    });

    return newJourney;
  }

  /**
   * Update journey statistics after a new touchpoint
   */
  private async updateJourneyStats(
    journeyId: string,
    channelType: ChannelType
  ): Promise<void> {
    const touchpoints = await prisma.customerTouchpoint.findMany({
      where: { journeyId },
      orderBy: { occurredAt: "asc" },
      select: {
        channelType: true,
        occurredAt: true,
      },
    });

    const uniqueChannels = new Set(touchpoints.map((t) => t.channelType));
    const channelBreakdown: Record<string, number> = {};

    touchpoints.forEach((t) => {
      channelBreakdown[t.channelType] =
        (channelBreakdown[t.channelType] || 0) + 1;
    });

    const firstTouch = touchpoints[0];
    const lastTouch = touchpoints[touchpoints.length - 1];

    await prisma.customerJourney.update({
      where: { id: journeyId },
      data: {
        totalTouchpoints: touchpoints.length,
        uniqueChannels: uniqueChannels.size,
        channelBreakdown: channelBreakdown,
        firstTouchChannel: firstTouch?.channelType,
        firstTouchAt: firstTouch?.occurredAt,
        lastTouchChannel: lastTouch?.channelType,
        lastTouchAt: lastTouch?.occurredAt,
      },
    });
  }

  /**
   * Record a conversion with attribution
   */
  async recordConversion(params: {
    journeyId: string;
    conversionType: string;
    conversionValue: number;
    currency?: string;
    sourceType?: string;
    sourceId?: string;
    attributionModel?: AttributionModel;
  }): Promise<{ id: string; channelAttribution: Record<string, unknown> }> {
    const model = params.attributionModel || AttributionModel.LINEAR;

    // Get touchpoints for attribution
    const touchpoints = await prisma.customerTouchpoint.findMany({
      where: { journeyId: params.journeyId },
      orderBy: { occurredAt: "asc" },
    });

    // Calculate attribution
    const { channelAttribution, touchpointAttribution } =
      this.calculateAttribution(touchpoints, params.conversionValue, model);

    // Create conversion record
    const conversion = await prisma.crossChannelConversion.create({
      data: {
        organizationId: this.organizationId,
        brandId: this.brandId,
        journeyId: params.journeyId,
        conversionType: params.conversionType,
        conversionValue: params.conversionValue,
        currency: params.currency || "USD",
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        attributionModel: model,
        channelAttribution: channelAttribution as object,
        touchpointAttribution: touchpointAttribution as object,
        brandBrainContribution: true,
      },
    });

    // Update journey as converted
    await prisma.customerJourney.update({
      where: { id: params.journeyId },
      data: {
        isConverted: true,
        conversionValue: params.conversionValue,
        convertedAt: new Date(),
        status: "converted",
      },
    });

    return {
      id: conversion.id,
      channelAttribution,
    };
  }

  /**
   * Calculate attribution based on model
   */
  private calculateAttribution(
    touchpoints: Array<{ id: string; channelType: ChannelType }>,
    totalValue: number,
    model: AttributionModel
  ): {
    channelAttribution: Record<string, { value: number; percent: number }>;
    touchpointAttribution: Array<{
      touchpointId: string;
      value: number;
      percent: number;
    }>;
  } {
    const channelAttribution: Record<
      string,
      { value: number; percent: number }
    > = {};
    const touchpointAttribution: Array<{
      touchpointId: string;
      value: number;
      percent: number;
    }> = [];

    if (touchpoints.length === 0) {
      return { channelAttribution, touchpointAttribution };
    }

    let weights: number[] = [];

    switch (model) {
      case AttributionModel.FIRST_TOUCH:
        weights = touchpoints.map((_, i) => (i === 0 ? 1 : 0));
        break;

      case AttributionModel.LAST_TOUCH:
        weights = touchpoints.map((_, i) =>
          i === touchpoints.length - 1 ? 1 : 0
        );
        break;

      case AttributionModel.LINEAR:
        weights = touchpoints.map(() => 1 / touchpoints.length);
        break;

      case AttributionModel.TIME_DECAY:
        // More recent touchpoints get more credit
        const decayRate = 0.7;
        weights = touchpoints.map((_, i) =>
          Math.pow(decayRate, touchpoints.length - 1 - i)
        );
        const sumDecay = weights.reduce((a, b) => a + b, 0);
        weights = weights.map((w) => w / sumDecay);
        break;

      case AttributionModel.POSITION:
        // U-shaped: 40% first, 40% last, 20% middle
        if (touchpoints.length === 1) {
          weights = [1];
        } else if (touchpoints.length === 2) {
          weights = [0.5, 0.5];
        } else {
          const middleCount = touchpoints.length - 2;
          const middleWeight = 0.2 / middleCount;
          weights = touchpoints.map((_, i) => {
            if (i === 0) return 0.4;
            if (i === touchpoints.length - 1) return 0.4;
            return middleWeight;
          });
        }
        break;

      default:
        weights = touchpoints.map(() => 1 / touchpoints.length);
    }

    // Calculate touchpoint attribution
    touchpoints.forEach((tp, i) => {
      const value = totalValue * weights[i];
      const percent = weights[i] * 100;

      touchpointAttribution.push({
        touchpointId: tp.id,
        value,
        percent,
      });

      // Aggregate by channel
      if (!channelAttribution[tp.channelType]) {
        channelAttribution[tp.channelType] = { value: 0, percent: 0 };
      }
      channelAttribution[tp.channelType].value += value;
      channelAttribution[tp.channelType].percent += percent;
    });

    return { channelAttribution, touchpointAttribution };
  }

  /**
   * Get enabled channels for the organization
   */
  async getEnabledChannels(): Promise<ChannelType[]> {
    const configs = await prisma.channelConfig.findMany({
      where: {
        organizationId: this.organizationId,
        brandId: this.brandId,
        isEnabled: true,
      },
      select: { channelType: true },
    });

    return configs.map((c) => c.channelType);
  }

  /**
   * Enable a channel
   */
  async enableChannel(
    channelType: ChannelType,
    config?: Record<string, unknown>
  ): Promise<void> {
    await prisma.channelConfig.upsert({
      where: {
        organizationId_brandId_channelType: {
          organizationId: this.organizationId,
          brandId: this.brandId || "",
          channelType,
        },
      },
      update: {
        isEnabled: true,
        config: config as object,
        enabledAt: new Date(),
      },
      create: {
        organizationId: this.organizationId,
        brandId: this.brandId,
        channelType,
        isEnabled: true,
        config: config as object || {},
        enabledAt: new Date(),
      },
    });
  }

  /**
   * Get channel performance metrics
   */
  async getChannelPerformance(
    periodType: "daily" | "weekly" | "monthly",
    channelType?: ChannelType
  ): Promise<
    Array<{
      channelType: ChannelType;
      touchpoints: number;
      conversions: number;
      revenue: number;
      conversionRate: number;
    }>
  > {
    const where: Record<string, unknown> = {
      organizationId: this.organizationId,
      periodType,
    };

    if (this.brandId) {
      where.brandId = this.brandId;
    }

    if (channelType) {
      where.channelType = channelType;
    }

    const snapshots = await prisma.channelPerformanceSnapshot.findMany({
      where,
      orderBy: { periodStart: "desc" },
      take: 30,
    });

    // Aggregate by channel
    const aggregated: Record<
      string,
      {
        touchpoints: number;
        conversions: number;
        revenue: number;
      }
    > = {};

    snapshots.forEach((s) => {
      if (!aggregated[s.channelType]) {
        aggregated[s.channelType] = {
          touchpoints: 0,
          conversions: 0,
          revenue: 0,
        };
      }
      aggregated[s.channelType].touchpoints += s.totalTouchpoints;
      aggregated[s.channelType].conversions += s.conversions;
      aggregated[s.channelType].revenue += Number(s.totalRevenue);
    });

    return Object.entries(aggregated).map(([channel, metrics]) => ({
      channelType: channel as ChannelType,
      touchpoints: metrics.touchpoints,
      conversions: metrics.conversions,
      revenue: metrics.revenue,
      conversionRate:
        metrics.touchpoints > 0
          ? (metrics.conversions / metrics.touchpoints) * 100
          : 0,
    }));
  }

  /**
   * Get customer journey by ID
   */
  async getJourney(journeyId: string) {
    return prisma.customerJourney.findUnique({
      where: { id: journeyId },
      include: {
        touchpoints: {
          orderBy: { occurredAt: "asc" },
        },
        conversions: true,
      },
    });
  }

  /**
   * Get journeys for a customer
   */
  async getCustomerJourneys(params: {
    customerId?: string;
    email?: string;
    phone?: string;
  }) {
    return prisma.customerJourney.findMany({
      where: {
        organizationId: this.organizationId,
        OR: [
          params.customerId ? { customerId: params.customerId } : {},
          params.email ? { email: params.email } : {},
          params.phone ? { phone: params.phone } : {},
        ].filter((o) => Object.keys(o).length > 0),
      },
      include: {
        touchpoints: {
          orderBy: { occurredAt: "asc" },
        },
        conversions: true,
      },
      orderBy: { startedAt: "desc" },
    });
  }
}

/**
 * Create a cross-channel service instance
 */
export function createCrossChannelService(
  organizationId: string,
  brandId?: string
): CrossChannelService {
  return new CrossChannelService(organizationId, brandId);
}

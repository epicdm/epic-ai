/**
 * Single Customer Journey API - Get journey details with full touchpoint history
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - Get a single journey with all touchpoints
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    const journey = await prisma.customerJourney.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        touchpoints: {
          orderBy: { occurredAt: "asc" },
        },
        conversions: {
          orderBy: { convertedAt: "desc" },
        },
      },
    });

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 });
    }

    // Group touchpoints by channel for visualization
    const touchpointsByChannel: Record<string, typeof journey.touchpoints> = {};
    journey.touchpoints.forEach((tp) => {
      const channel = tp.channelType;
      if (!touchpointsByChannel[channel]) {
        touchpointsByChannel[channel] = [];
      }
      touchpointsByChannel[channel].push(tp);
    });

    // Calculate channel engagement scores
    const channelEngagement: Record<string, { count: number; avgScore: number; totalScore: number }> = {};
    journey.touchpoints.forEach((tp) => {
      const channel = tp.channelType;
      if (!channelEngagement[channel]) {
        channelEngagement[channel] = { count: 0, avgScore: 0, totalScore: 0 };
      }
      channelEngagement[channel].count++;
      channelEngagement[channel].totalScore += tp.engagementScore;
    });

    Object.keys(channelEngagement).forEach((channel) => {
      const data = channelEngagement[channel];
      data.avgScore = Math.round((data.totalScore / data.count) * 10) / 10;
    });

    return NextResponse.json({
      journey: {
        id: journey.id,
        customerId: journey.customerId,
        anonymousId: journey.anonymousId,
        email: journey.email,
        phone: journey.phone,
        fullName: journey.fullName,
        status: journey.status,
        isConverted: journey.isConverted,
        conversionValue: journey.conversionValue ? Number(journey.conversionValue) : null,
        convertedAt: journey.convertedAt,
        totalTouchpoints: journey.totalTouchpoints,
        uniqueChannels: journey.uniqueChannels,
        firstTouchChannel: journey.firstTouchChannel,
        firstTouchAt: journey.firstTouchAt,
        lastTouchChannel: journey.lastTouchChannel,
        lastTouchAt: journey.lastTouchAt,
        channelBreakdown: journey.channelBreakdown,
        attributionScores: journey.attributionScores,
        startedAt: journey.startedAt,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt,
      },
      touchpoints: journey.touchpoints.map((tp) => ({
        id: tp.id,
        channelType: tp.channelType,
        channelName: tp.channelName,
        action: tp.action,
        actionDetail: tp.actionDetail,
        sourceType: tp.sourceType,
        sourceTitle: tp.sourceTitle,
        sourceUrl: tp.sourceUrl,
        engagementScore: tp.engagementScore,
        estimatedValue: tp.estimatedValue ? Number(tp.estimatedValue) : null,
        deviceType: tp.deviceType,
        utmSource: tp.utmSource,
        utmMedium: tp.utmMedium,
        utmCampaign: tp.utmCampaign,
        occurredAt: tp.occurredAt,
      })),
      touchpointsByChannel,
      channelEngagement,
      conversions: journey.conversions.map((c) => ({
        id: c.id,
        conversionValue: c.conversionValue ? Number(c.conversionValue) : null,
        conversionType: c.conversionType,
        channelAttribution: c.channelAttribution,
        attributionModel: c.attributionModel,
        convertedAt: c.convertedAt,
      })),
    });
  } catch (error) {
    console.error("Error getting journey:", error);
    return NextResponse.json(
      { error: "Failed to get journey" },
      { status: 500 }
    );
  }
}

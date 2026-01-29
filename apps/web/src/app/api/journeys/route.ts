/**
 * Customer Journeys API - Cross-Channel Journey Tracking
 * Returns customer journey data with touchpoints across channels
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - Get customer journeys with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ journeys: [], stats: getEmptyStats() });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");
    const status = searchParams.get("status"); // active, converted, dormant
    const channel = searchParams.get("channel"); // SOCIAL, VOICE, EMAIL, etc.
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    startDate.setHours(0, 0, 0, 0);

    // Build where clause
    const where: Record<string, unknown> = {
      organizationId: org.id,
      startedAt: { gte: startDate },
    };

    if (status) {
      where.status = status;
    }

    if (channel) {
      where.OR = [
        { firstTouchChannel: channel },
        { lastTouchChannel: channel },
      ];
    }

    // Fetch journeys with touchpoints
    const [journeys, totalCount, stats] = await Promise.all([
      prisma.customerJourney.findMany({
        where,
        include: {
          touchpoints: {
            orderBy: { occurredAt: "asc" },
            select: {
              id: true,
              channelType: true,
              channelName: true,
              action: true,
              actionDetail: true,
              engagementScore: true,
              occurredAt: true,
              sourceTitle: true,
            },
          },
          _count: {
            select: { conversions: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.customerJourney.count({ where }),

      // Aggregate stats
      getJourneyStats(org.id, startDate),
    ]);

    return NextResponse.json({
      journeys: journeys.map((j) => ({
        id: j.id,
        customerId: j.customerId,
        email: j.email,
        phone: j.phone,
        fullName: j.fullName,
        status: j.status,
        isConverted: j.isConverted,
        conversionValue: j.conversionValue ? Number(j.conversionValue) : null,
        convertedAt: j.convertedAt,
        totalTouchpoints: j.totalTouchpoints,
        uniqueChannels: j.uniqueChannels,
        firstTouchChannel: j.firstTouchChannel,
        firstTouchAt: j.firstTouchAt,
        lastTouchChannel: j.lastTouchChannel,
        lastTouchAt: j.lastTouchAt,
        channelBreakdown: j.channelBreakdown,
        startedAt: j.startedAt,
        touchpoints: j.touchpoints,
        conversionsCount: j._count.conversions,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats,
    });
  } catch (error) {
    console.error("Error getting journeys:", error);
    // Return detailed error in development
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to get journeys", details: process.env.NODE_ENV === "development" ? errorMessage : undefined },
      { status: 500 }
    );
  }
}

async function getJourneyStats(orgId: string, startDate: Date) {
  const [
    totalJourneys,
    convertedJourneys,
    multiChannelJourneys,
    avgStats,
    channelBreakdown,
  ] = await Promise.all([
    prisma.customerJourney.count({
      where: { organizationId: orgId, startedAt: { gte: startDate } },
    }),

    prisma.customerJourney.count({
      where: {
        organizationId: orgId,
        startedAt: { gte: startDate },
        isConverted: true,
      },
    }),

    prisma.customerJourney.count({
      where: {
        organizationId: orgId,
        startedAt: { gte: startDate },
        uniqueChannels: { gte: 2 },
      },
    }),

    prisma.customerJourney.aggregate({
      where: { organizationId: orgId, startedAt: { gte: startDate } },
      _avg: {
        totalTouchpoints: true,
        uniqueChannels: true,
      },
      _sum: {
        conversionValue: true,
      },
    }),

    prisma.customerTouchpoint.groupBy({
      by: ["channelType"],
      where: { organizationId: orgId, occurredAt: { gte: startDate } },
      _count: true,
    }),
  ]);

  const conversionRate =
    totalJourneys > 0 ? (convertedJourneys / totalJourneys) * 100 : 0;
  const synergyRate =
    totalJourneys > 0 ? (multiChannelJourneys / totalJourneys) * 100 : 0;

  return {
    totalJourneys,
    convertedJourneys,
    multiChannelJourneys,
    conversionRate: Math.round(conversionRate * 10) / 10,
    synergyRate: Math.round(synergyRate * 10) / 10,
    avgTouchpoints: Math.round((avgStats._avg?.totalTouchpoints || 0) * 10) / 10,
    avgChannels: Math.round((avgStats._avg?.uniqueChannels || 0) * 10) / 10,
    totalConversionValue: Number(avgStats._sum?.conversionValue || 0),
    channelBreakdown: channelBreakdown.map((c) => ({
      channel: c.channelType,
      count: c._count,
    })),
  };
}

function getEmptyStats() {
  return {
    totalJourneys: 0,
    convertedJourneys: 0,
    multiChannelJourneys: 0,
    conversionRate: 0,
    synergyRate: 0,
    avgTouchpoints: 0,
    avgChannels: 0,
    totalConversionValue: 0,
    channelBreakdown: [],
  };
}

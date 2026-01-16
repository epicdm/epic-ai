/**
 * Cross-Channel Insights API
 * Provides analytics, attribution insights, and AI-powered recommendations
 * for cross-channel marketing performance.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma, ChannelType, AttributionModel } from "@epic-ai/database";

interface ChannelStats {
  channel: ChannelType;
  touchpoints: number;
  conversions: number;
  revenue: number;
  avgEngagement: number;
  conversionRate: number;
}

interface JourneyPath {
  path: string[];
  count: number;
  conversions: number;
  avgValue: number;
  conversionRate: number;
}

interface SynergyPair {
  channel1: ChannelType;
  channel2: ChannelType;
  coOccurrences: number;
  conversions: number;
  synergyScore: number;
}

/**
 * GET - Get comprehensive cross-channel insights
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ insights: getEmptyInsights() });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");
    const attributionModel = (searchParams.get("model") as AttributionModel) || AttributionModel.LINEAR;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all required data in parallel
    const [
      channelStats,
      journeyData,
      conversionData,
      touchpointPairs,
      channelPerformance,
    ] = await Promise.all([
      // Channel-level stats
      getChannelStats(org.id, startDate),

      // Journey data for path analysis
      getJourneyPathData(org.id, startDate),

      // Conversion attribution data
      getConversionAttribution(org.id, startDate, attributionModel),

      // Touchpoint co-occurrence for synergy
      getTouchpointCoOccurrence(org.id, startDate),

      // Channel performance over time
      getChannelPerformanceTimeline(org.id, startDate),
    ]);

    // Calculate insights
    const synergyPairs = calculateSynergyPairs(touchpointPairs);
    const topPaths = calculateTopPaths(journeyData);
    const channelAttribution = calculateChannelAttribution(conversionData);
    const recommendations = generateRecommendations(
      channelStats,
      synergyPairs,
      topPaths,
      channelAttribution
    );

    return NextResponse.json({
      insights: {
        period,
        attributionModel,
        summary: {
          totalJourneys: journeyData.length,
          convertedJourneys: journeyData.filter((j) => j.isConverted).length,
          totalTouchpoints: channelStats.reduce((sum, c) => sum + c.touchpoints, 0),
          totalRevenue: channelStats.reduce((sum, c) => sum + c.revenue, 0),
          avgChannelsPerJourney:
            journeyData.length > 0
              ? Math.round(
                  (journeyData.reduce((sum, j) => sum + j.uniqueChannels, 0) /
                    journeyData.length) *
                    10
                ) / 10
              : 0,
          overallConversionRate:
            journeyData.length > 0
              ? Math.round(
                  (journeyData.filter((j) => j.isConverted).length /
                    journeyData.length) *
                    1000
                ) / 10
              : 0,
        },
        channelPerformance: channelStats,
        channelAttribution,
        synergyAnalysis: {
          topPairs: synergyPairs.slice(0, 5),
          crossChannelLift: calculateCrossChannelLift(journeyData),
        },
        journeyPaths: {
          topConvertingPaths: topPaths.converting.slice(0, 5),
          mostCommonPaths: topPaths.common.slice(0, 5),
        },
        timeline: channelPerformance,
        recommendations,
      },
    });
  } catch (error) {
    console.error("Error getting cross-channel insights:", error);
    return NextResponse.json(
      { error: "Failed to get insights" },
      { status: 500 }
    );
  }
}

async function getChannelStats(
  orgId: string,
  startDate: Date
): Promise<ChannelStats[]> {
  const touchpointStats = await prisma.customerTouchpoint.groupBy({
    by: ["channelType"],
    where: {
      organizationId: orgId,
      occurredAt: { gte: startDate },
    },
    _count: true,
    _avg: { engagementScore: true },
  });

  const conversionStats = await prisma.crossChannelConversion.findMany({
    where: {
      organizationId: orgId,
      convertedAt: { gte: startDate },
    },
    select: {
      channelAttribution: true,
      conversionValue: true,
    },
  });

  // Aggregate conversion data by channel
  const channelConversions: Record<string, { count: number; value: number }> = {};

  conversionStats.forEach((conv) => {
    const attribution = conv.channelAttribution as Record<
      string,
      { value: number; percent: number }
    >;
    Object.entries(attribution).forEach(([channel, data]) => {
      if (!channelConversions[channel]) {
        channelConversions[channel] = { count: 0, value: 0 };
      }
      channelConversions[channel].count += data.percent / 100;
      channelConversions[channel].value += data.value;
    });
  });

  return touchpointStats.map((stat) => {
    const convData = channelConversions[stat.channelType] || { count: 0, value: 0 };
    return {
      channel: stat.channelType as ChannelType,
      touchpoints: stat._count,
      conversions: Math.round(convData.count),
      revenue: Math.round(convData.value * 100) / 100,
      avgEngagement: Math.round((stat._avg?.engagementScore || 0) * 10) / 10,
      conversionRate:
        stat._count > 0
          ? Math.round((convData.count / stat._count) * 1000) / 10
          : 0,
    };
  });
}

async function getJourneyPathData(orgId: string, startDate: Date) {
  return prisma.customerJourney.findMany({
    where: {
      organizationId: orgId,
      startedAt: { gte: startDate },
    },
    select: {
      id: true,
      isConverted: true,
      uniqueChannels: true,
      conversionValue: true,
      channelBreakdown: true,
      touchpoints: {
        orderBy: { occurredAt: "asc" },
        select: { channelType: true },
      },
    },
  });
}

async function getConversionAttribution(
  orgId: string,
  startDate: Date,
  model: AttributionModel
) {
  return prisma.crossChannelConversion.findMany({
    where: {
      organizationId: orgId,
      convertedAt: { gte: startDate },
      attributionModel: model,
    },
    select: {
      channelAttribution: true,
      conversionValue: true,
      conversionType: true,
    },
  });
}

async function getTouchpointCoOccurrence(orgId: string, startDate: Date) {
  // Get journeys with their channel sequences
  const journeys = await prisma.customerJourney.findMany({
    where: {
      organizationId: orgId,
      startedAt: { gte: startDate },
      uniqueChannels: { gte: 2 },
    },
    select: {
      id: true,
      isConverted: true,
      touchpoints: {
        orderBy: { occurredAt: "asc" },
        select: { channelType: true },
      },
    },
  });

  // Count co-occurrences
  const pairs: Record<string, { count: number; conversions: number }> = {};

  journeys.forEach((journey) => {
    const channels = [...new Set(journey.touchpoints.map((t) => t.channelType))];

    // Generate all pairs
    for (let i = 0; i < channels.length; i++) {
      for (let j = i + 1; j < channels.length; j++) {
        const key = [channels[i], channels[j]].sort().join("|");
        if (!pairs[key]) {
          pairs[key] = { count: 0, conversions: 0 };
        }
        pairs[key].count++;
        if (journey.isConverted) {
          pairs[key].conversions++;
        }
      }
    }
  });

  return pairs;
}

async function getChannelPerformanceTimeline(orgId: string, startDate: Date) {
  const snapshots = await prisma.channelPerformanceSnapshot.findMany({
    where: {
      organizationId: orgId,
      periodStart: { gte: startDate },
      periodType: "daily",
    },
    orderBy: { periodStart: "asc" },
    select: {
      channelType: true,
      periodStart: true,
      totalTouchpoints: true,
      conversions: true,
      totalRevenue: true,
      avgEngagementScore: true,
    },
  });

  // Group by date
  const byDate: Record<
    string,
    Record<string, { touchpoints: number; conversions: number; revenue: number }>
  > = {};

  snapshots.forEach((s) => {
    const dateKey = s.periodStart.toISOString().split("T")[0];
    if (!byDate[dateKey]) {
      byDate[dateKey] = {};
    }
    byDate[dateKey][s.channelType] = {
      touchpoints: s.totalTouchpoints,
      conversions: s.conversions,
      revenue: Number(s.totalRevenue),
    };
  });

  return Object.entries(byDate)
    .map(([date, channels]) => ({
      date,
      channels,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function calculateSynergyPairs(
  pairs: Record<string, { count: number; conversions: number }>
): SynergyPair[] {
  return Object.entries(pairs)
    .map(([key, data]) => {
      const [channel1, channel2] = key.split("|") as [ChannelType, ChannelType];
      const conversionRate = data.count > 0 ? data.conversions / data.count : 0;
      return {
        channel1,
        channel2,
        coOccurrences: data.count,
        conversions: data.conversions,
        synergyScore: Math.round(conversionRate * 100),
      };
    })
    .sort((a, b) => b.synergyScore - a.synergyScore);
}

function calculateTopPaths(
  journeys: Array<{
    isConverted: boolean;
    conversionValue: unknown;
    touchpoints: Array<{ channelType: string }>;
  }>
): { converting: JourneyPath[]; common: JourneyPath[] } {
  const pathStats: Record<
    string,
    { count: number; conversions: number; totalValue: number }
  > = {};

  journeys.forEach((journey) => {
    // Get unique ordered channel path
    const path: string[] = [];
    let lastChannel = "";
    journey.touchpoints.forEach((t) => {
      if (t.channelType !== lastChannel) {
        path.push(t.channelType);
        lastChannel = t.channelType;
      }
    });

    const pathKey = path.join(" → ");
    if (!pathStats[pathKey]) {
      pathStats[pathKey] = { count: 0, conversions: 0, totalValue: 0 };
    }
    pathStats[pathKey].count++;
    if (journey.isConverted) {
      pathStats[pathKey].conversions++;
      pathStats[pathKey].totalValue += Number(journey.conversionValue || 0);
    }
  });

  const paths = Object.entries(pathStats).map(([pathStr, stats]) => ({
    path: pathStr.split(" → "),
    count: stats.count,
    conversions: stats.conversions,
    avgValue:
      stats.conversions > 0
        ? Math.round((stats.totalValue / stats.conversions) * 100) / 100
        : 0,
    conversionRate:
      stats.count > 0 ? Math.round((stats.conversions / stats.count) * 1000) / 10 : 0,
  }));

  return {
    converting: [...paths]
      .filter((p) => p.conversions > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate),
    common: [...paths].sort((a, b) => b.count - a.count),
  };
}

function calculateChannelAttribution(
  conversions: Array<{
    channelAttribution: unknown;
    conversionValue: unknown;
    conversionType: string;
  }>
): Array<{ channel: string; attributedValue: number; attributedPercent: number; conversions: number }> {
  const totals: Record<string, { value: number; count: number }> = {};
  let grandTotal = 0;

  conversions.forEach((conv) => {
    const attribution = conv.channelAttribution as Record<
      string,
      { value: number; percent: number }
    >;
    Object.entries(attribution).forEach(([channel, data]) => {
      if (!totals[channel]) {
        totals[channel] = { value: 0, count: 0 };
      }
      totals[channel].value += data.value;
      totals[channel].count += data.percent / 100;
    });
    grandTotal += Number(conv.conversionValue || 0);
  });

  return Object.entries(totals)
    .map(([channel, data]) => ({
      channel,
      attributedValue: Math.round(data.value * 100) / 100,
      attributedPercent: grandTotal > 0 ? Math.round((data.value / grandTotal) * 1000) / 10 : 0,
      conversions: Math.round(data.count),
    }))
    .sort((a, b) => b.attributedValue - a.attributedValue);
}

function calculateCrossChannelLift(
  journeys: Array<{ isConverted: boolean; uniqueChannels: number }>
): { singleChannel: number; multiChannel: number; lift: number } {
  const single = journeys.filter((j) => j.uniqueChannels === 1);
  const multi = journeys.filter((j) => j.uniqueChannels >= 2);

  const singleConvRate =
    single.length > 0
      ? single.filter((j) => j.isConverted).length / single.length
      : 0;
  const multiConvRate =
    multi.length > 0
      ? multi.filter((j) => j.isConverted).length / multi.length
      : 0;

  return {
    singleChannel: Math.round(singleConvRate * 1000) / 10,
    multiChannel: Math.round(multiConvRate * 1000) / 10,
    lift:
      singleConvRate > 0
        ? Math.round(((multiConvRate - singleConvRate) / singleConvRate) * 100)
        : 0,
  };
}

function generateRecommendations(
  channelStats: ChannelStats[],
  synergyPairs: SynergyPair[],
  topPaths: { converting: JourneyPath[]; common: JourneyPath[] },
  channelAttribution: Array<{ channel: string; attributedValue: number }>
): string[] {
  const recommendations: string[] = [];

  // Find underutilized high-performing channels
  const highEngagement = channelStats
    .filter((c) => c.avgEngagement >= 70)
    .sort((a, b) => a.touchpoints - b.touchpoints);
  if (highEngagement.length > 0) {
    const channel = highEngagement[0];
    if (channel.touchpoints < 50) {
      recommendations.push(
        `Increase ${channel.channel} activity - high engagement (${channel.avgEngagement}%) but low volume`
      );
    }
  }

  // Identify high-synergy pairs
  const topSynergy = synergyPairs[0];
  if (topSynergy && topSynergy.synergyScore >= 30) {
    recommendations.push(
      `${topSynergy.channel1} + ${topSynergy.channel2} shows strong synergy (${topSynergy.synergyScore}% conversion rate) - create integrated campaigns`
    );
  }

  // Best converting path
  if (topPaths.converting.length > 0) {
    const bestPath = topPaths.converting[0];
    if (bestPath.conversions >= 3) {
      recommendations.push(
        `Optimize for path: ${bestPath.path.join(" → ")} (${bestPath.conversionRate}% conversion rate)`
      );
    }
  }

  // Attribution insights
  if (channelAttribution.length >= 2) {
    const topChannel = channelAttribution[0];
    recommendations.push(
      `${topChannel.channel} drives ${topChannel.attributedPercent}% of attributed revenue - ensure consistent brand voice`
    );
  }

  // Add generic if no specific recommendations
  if (recommendations.length === 0) {
    recommendations.push(
      "Enable more channels to unlock cross-channel synergy benefits",
      "Track touchpoints across all customer interactions for better attribution"
    );
  }

  return recommendations.slice(0, 5);
}

function getEmptyInsights() {
  return {
    period: 30,
    attributionModel: "LINEAR",
    summary: {
      totalJourneys: 0,
      convertedJourneys: 0,
      totalTouchpoints: 0,
      totalRevenue: 0,
      avgChannelsPerJourney: 0,
      overallConversionRate: 0,
    },
    channelPerformance: [],
    channelAttribution: [],
    synergyAnalysis: {
      topPairs: [],
      crossChannelLift: { singleChannel: 0, multiChannel: 0, lift: 0 },
    },
    journeyPaths: {
      topConvertingPaths: [],
      mostCommonPaths: [],
    },
    timeline: [],
    recommendations: [
      "Enable channels to start tracking cross-channel performance",
      "Connect your social, voice, and email channels for unified insights",
    ],
  };
}

/**
 * Analytics Aggregator - Creates period snapshots from post analytics
 *
 * PKG-025: Analytics & Learning Loop
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, AnalyticsPeriod } from '@prisma/client';

interface AggregatedStats {
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  avgImpressions: number;
  avgEngagements: number;
  topPostId: string | null;
  topHashtags: string[];
  bestDayOfWeek: number | null;
  bestHourOfDay: number | null;
  postsWithMedia: number;
  postsWithHashtags: number;
  postsWithLinks: number;
}

/**
 * Aggregate analytics for a time period
 */
export async function aggregateAnalytics(
  orgId: string,
  startDate: Date,
  endDate: Date,
  platform?: string
): Promise<AggregatedStats> {
  const where: any = {
    orgId,
    publishedAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (platform) {
    where.platform = platform;
  }

  // Get all analytics for the period
  const analytics = await prisma.postAnalytics.findMany({
    where,
    orderBy: { engagements: 'desc' },
    include: {
      variation: {
        select: { text: true },
      },
    },
  });

  if (analytics.length === 0) {
    return {
      totalPosts: 0,
      totalImpressions: 0,
      totalEngagements: 0,
      avgEngagementRate: 0,
      avgImpressions: 0,
      avgEngagements: 0,
      topPostId: null,
      topHashtags: [],
      bestDayOfWeek: null,
      bestHourOfDay: null,
      postsWithMedia: 0,
      postsWithHashtags: 0,
      postsWithLinks: 0,
    };
  }

  // Calculate totals
  const totalPosts = analytics.length;
  const totalImpressions = analytics.reduce((sum, a) => sum + a.impressions, 0);
  const totalEngagements = analytics.reduce((sum, a) => sum + a.engagements, 0);

  // Calculate averages
  const avgEngagementRate =
    analytics.reduce((sum, a) => sum + a.engagementRate, 0) / totalPosts;
  const avgImpressions = totalImpressions / totalPosts;
  const avgEngagements = totalEngagements / totalPosts;

  // Top post (by engagement)
  const topPostId = analytics[0]?.variationId || null;

  // Analyze hashtag performance
  const hashtagPerformance: Record<string, { count: number; avgEngagement: number }> = {};
  for (const a of analytics) {
    if (a.hasHashtags && a.variation?.text) {
      const hashtags = a.variation.text.match(/#\w+/g) || [];
      for (const tag of hashtags) {
        const normalized = tag.toLowerCase();
        if (!hashtagPerformance[normalized]) {
          hashtagPerformance[normalized] = { count: 0, avgEngagement: 0 };
        }
        hashtagPerformance[normalized].count++;
        hashtagPerformance[normalized].avgEngagement += a.engagementRate;
      }
    }
  }

  // Calculate average engagement per hashtag and sort
  const topHashtags = Object.entries(hashtagPerformance)
    .map(([tag, data]) => ({
      tag,
      avgEngagement: data.avgEngagement / data.count,
      count: data.count,
    }))
    .filter((h) => h.count >= 2) // At least 2 uses
    .sort((a, b) => b.avgEngagement - a.avgEngagement)
    .slice(0, 10)
    .map((h) => h.tag);

  // Best day of week
  const dayPerformance: Record<number, { count: number; totalEngagement: number }> = {};
  for (const a of analytics) {
    if (!dayPerformance[a.dayOfWeek]) {
      dayPerformance[a.dayOfWeek] = { count: 0, totalEngagement: 0 };
    }
    dayPerformance[a.dayOfWeek].count++;
    dayPerformance[a.dayOfWeek].totalEngagement += a.engagementRate;
  }

  const bestDay = Object.entries(dayPerformance)
    .map(([day, data]) => ({
      day: parseInt(day),
      avgEngagement: data.totalEngagement / data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

  // Best hour of day
  const hourPerformance: Record<number, { count: number; totalEngagement: number }> = {};
  for (const a of analytics) {
    if (!hourPerformance[a.hourOfDay]) {
      hourPerformance[a.hourOfDay] = { count: 0, totalEngagement: 0 };
    }
    hourPerformance[a.hourOfDay].count++;
    hourPerformance[a.hourOfDay].totalEngagement += a.engagementRate;
  }

  const bestHour = Object.entries(hourPerformance)
    .map(([hour, data]) => ({
      hour: parseInt(hour),
      avgEngagement: data.totalEngagement / data.count,
    }))
    .sort((a, b) => b.avgEngagement - a.avgEngagement)[0];

  // Content type counts
  const postsWithMedia = analytics.filter((a) => a.hasMedia).length;
  const postsWithHashtags = analytics.filter((a) => a.hasHashtags).length;
  const postsWithLinks = analytics.filter((a) => a.hasLinks).length;

  return {
    totalPosts,
    totalImpressions,
    totalEngagements,
    avgEngagementRate,
    avgImpressions,
    avgEngagements,
    topPostId,
    topHashtags,
    bestDayOfWeek: bestDay?.day ?? null,
    bestHourOfDay: bestHour?.hour ?? null,
    postsWithMedia,
    postsWithHashtags,
    postsWithLinks,
  };
}

/**
 * Create or update analytics snapshot
 */
export async function createAnalyticsSnapshot(
  orgId: string,
  periodType: AnalyticsPeriod,
  periodStart: Date,
  platform?: SocialPlatform
): Promise<void> {
  // Calculate period end
  const periodEnd = new Date(periodStart);
  switch (periodType) {
    case 'DAILY':
      periodEnd.setDate(periodEnd.getDate() + 1);
      break;
    case 'WEEKLY':
      periodEnd.setDate(periodEnd.getDate() + 7);
      break;
    case 'MONTHLY':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
  }
  periodEnd.setMilliseconds(periodEnd.getMilliseconds() - 1);

  // Aggregate stats
  const stats = await aggregateAnalytics(orgId, periodStart, periodEnd, platform);

  // Get follower data
  const accounts = await prisma.socialAccount.findMany({
    where: {
      brand: { organizationId: orgId },
      ...(platform ? { platform } : {}),
    },
    select: { followerCount: true },
  });

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followerCount || 0), 0);

  // Upsert snapshot
  await prisma.analyticsSnapshot.upsert({
    where: {
      orgId_periodType_periodStart_platform: {
        orgId,
        periodType,
        periodStart,
        platform: platform || null,
      },
    },
    create: {
      orgId,
      periodType,
      periodStart,
      periodEnd,
      platform: platform || null,
      totalPosts: stats.totalPosts,
      totalImpressions: stats.totalImpressions,
      totalEngagements: stats.totalEngagements,
      totalFollowers,
      avgEngagementRate: stats.avgEngagementRate,
      avgImpressions: stats.avgImpressions,
      avgEngagements: stats.avgEngagements,
      topPostId: stats.topPostId,
      topHashtags: stats.topHashtags,
      bestDayOfWeek: stats.bestDayOfWeek,
      bestHourOfDay: stats.bestHourOfDay,
      postsWithMedia: stats.postsWithMedia,
      postsWithHashtags: stats.postsWithHashtags,
      postsWithLinks: stats.postsWithLinks,
    },
    update: {
      periodEnd,
      totalPosts: stats.totalPosts,
      totalImpressions: stats.totalImpressions,
      totalEngagements: stats.totalEngagements,
      totalFollowers,
      avgEngagementRate: stats.avgEngagementRate,
      avgImpressions: stats.avgImpressions,
      avgEngagements: stats.avgEngagements,
      topPostId: stats.topPostId,
      topHashtags: stats.topHashtags,
      bestDayOfWeek: stats.bestDayOfWeek,
      bestHourOfDay: stats.bestHourOfDay,
      postsWithMedia: stats.postsWithMedia,
      postsWithHashtags: stats.postsWithHashtags,
      postsWithLinks: stats.postsWithLinks,
    },
  });
}

/**
 * Generate all snapshots for an org (daily, weekly, monthly)
 */
export async function generateSnapshots(orgId: string): Promise<void> {
  const now = new Date();

  // Daily snapshot for yesterday
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  await createAnalyticsSnapshot(orgId, 'DAILY', yesterday);

  // Weekly snapshot for last week (starts on Monday)
  const lastWeek = new Date(now);
  const dayOfWeek = lastWeek.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  lastWeek.setDate(lastWeek.getDate() - daysToMonday - 7);
  lastWeek.setHours(0, 0, 0, 0);
  await createAnalyticsSnapshot(orgId, 'WEEKLY', lastWeek);

  // Monthly snapshot for last month
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  await createAnalyticsSnapshot(orgId, 'MONTHLY', lastMonth);

  // Also create per-platform snapshots
  const platforms: SocialPlatform[] = ['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM'];
  for (const platform of platforms) {
    await createAnalyticsSnapshot(orgId, 'DAILY', yesterday, platform);
    await createAnalyticsSnapshot(orgId, 'WEEKLY', lastWeek, platform);
  }
}

/**
 * Get analytics overview for an org
 */
export async function getAnalyticsOverview(
  orgId: string,
  days: number = 30,
  platform?: SocialPlatform
): Promise<{
  stats: AggregatedStats;
  recentPosts: any[];
  trends: any[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();

  // Get aggregated stats
  const stats = await aggregateAnalytics(orgId, startDate, endDate, platform);

  // Get recent analytics
  const recentPosts = await prisma.postAnalytics.findMany({
    where: {
      orgId,
      publishedAt: { gte: startDate },
      ...(platform ? { platform } : {}),
    },
    include: {
      variation: {
        select: {
          id: true,
          text: true,
          postUrl: true,
          publishedAt: true,
          platform: true,
        },
      },
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  });

  // Get daily snapshots for trends
  const trends = await prisma.analyticsSnapshot.findMany({
    where: {
      orgId,
      periodType: 'DAILY',
      periodStart: { gte: startDate },
      platform: platform || null,
    },
    orderBy: { periodStart: 'asc' },
  });

  return { stats, recentPosts, trends };
}

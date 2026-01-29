/**
 * Analytics Analyzer
 * Analyzes content performance and generates insights
 */

import { prisma } from '@epic-ai/database';

export interface ContentAnalysis {
  topHashtags: string[];
  topMentions: string[];
  avgEngagement: number;
  totalReach: number;
  bestPerformingContent: {
    contentId: string;
    engagementRate: number;
  }[];
}

export interface HashtagAnalysis {
  hashtag: string;
  usageCount: number;
  avgEngagement: number;
}

export interface BestPostingTime {
  dayOfWeek: number;
  hour: number;
  avgEngagement: number;
}

export class AnalyticsAnalyzer {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Analyze content performance
   */
  async analyzeContentPerformance(days: number = 30): Promise<ContentAnalysis> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get brand's org ID
    const brand = await prisma.brand.findUnique({
      where: { id: this.brandId },
      select: { organizationId: true },
    });

    if (!brand) {
      return {
        topHashtags: [],
        topMentions: [],
        avgEngagement: 0,
        totalReach: 0,
        bestPerformingContent: [],
      };
    }

    // Get analytics for the period
    const analytics = await prisma.postAnalytics.findMany({
      where: {
        orgId: brand.organizationId,
        publishedAt: { gte: startDate },
      },
      include: {
        variation: {
          select: { contentId: true, text: true },
        },
      },
      orderBy: { engagementRate: 'desc' },
    });

    if (analytics.length === 0) {
      return {
        topHashtags: [],
        topMentions: [],
        avgEngagement: 0,
        totalReach: 0,
        bestPerformingContent: [],
      };
    }

    // Extract hashtags from content
    const hashtagCounts = new Map<string, number>();
    const mentionCounts = new Map<string, number>();

    for (const a of analytics) {
      const text = a.variation?.text || '';
      const hashtags = text.match(/#\w+/g) || [];
      const mentions = text.match(/@\w+/g) || [];

      for (const tag of hashtags) {
        hashtagCounts.set(tag.toLowerCase(), (hashtagCounts.get(tag.toLowerCase()) || 0) + 1);
      }
      for (const mention of mentions) {
        mentionCounts.set(mention.toLowerCase(), (mentionCounts.get(mention.toLowerCase()) || 0) + 1);
      }
    }

    // Sort hashtags by count
    const topHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    const topMentions = Array.from(mentionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([mention]) => mention);

    // Calculate averages
    const totalReach = analytics.reduce((sum, a) => sum + a.reach, 0);
    const avgEngagement =
      analytics.reduce((sum, a) => sum + Number(a.engagementRate || 0), 0) / analytics.length;

    // Best performing content
    const bestPerformingContent = analytics
      .filter(a => a.variation?.contentId)
      .slice(0, 5)
      .map(a => ({
        contentId: a.variation!.contentId,
        engagementRate: Number(a.engagementRate || 0),
      }));

    return {
      topHashtags,
      topMentions,
      avgEngagement,
      totalReach,
      bestPerformingContent,
    };
  }

  /**
   * Get best posting times based on engagement data
   */
  async getBestPostingTimes(days: number = 30): Promise<BestPostingTime[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const brand = await prisma.brand.findUnique({
      where: { id: this.brandId },
      select: { organizationId: true },
    });

    if (!brand) return [];

    // Get analytics grouped by day and hour
    const analytics = await prisma.postAnalytics.findMany({
      where: {
        orgId: brand.organizationId,
        publishedAt: { gte: startDate },
      },
      select: {
        dayOfWeek: true,
        hourOfDay: true,
        engagementRate: true,
      },
    });

    if (analytics.length === 0) return [];

    // Group by day + hour
    const timeSlots = new Map<string, { total: number; count: number }>();

    for (const a of analytics) {
      const key = `${a.dayOfWeek}-${a.hourOfDay}`;
      const existing = timeSlots.get(key) || { total: 0, count: 0 };
      existing.total += Number(a.engagementRate || 0);
      existing.count += 1;
      timeSlots.set(key, existing);
    }

    // Calculate averages and sort
    const results: BestPostingTime[] = [];
    for (const [key, value] of timeSlots.entries()) {
      const [dayOfWeek, hour] = key.split('-').map(Number);
      results.push({
        dayOfWeek,
        hour,
        avgEngagement: value.total / value.count,
      });
    }

    return results.sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 10);
  }

  /**
   * Analyze hashtag performance
   */
  async analyzeHashtags(days: number = 30): Promise<HashtagAnalysis[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const brand = await prisma.brand.findUnique({
      where: { id: this.brandId },
      select: { organizationId: true },
    });

    if (!brand) return [];

    const analytics = await prisma.postAnalytics.findMany({
      where: {
        orgId: brand.organizationId,
        publishedAt: { gte: startDate },
        hasHashtags: true,
      },
      include: {
        variation: {
          select: { text: true },
        },
      },
    });

    if (analytics.length === 0) return [];

    // Aggregate hashtag performance
    const hashtagStats = new Map<string, { totalEngagement: number; count: number }>();

    for (const a of analytics) {
      const text = a.variation?.text || '';
      const hashtags = text.match(/#\w+/g) || [];

      for (const tag of hashtags) {
        const lowercaseTag = tag.toLowerCase();
        const existing = hashtagStats.get(lowercaseTag) || { totalEngagement: 0, count: 0 };
        existing.totalEngagement += Number(a.engagementRate || 0);
        existing.count += 1;
        hashtagStats.set(lowercaseTag, existing);
      }
    }

    const results: HashtagAnalysis[] = [];
    for (const [hashtag, stats] of hashtagStats.entries()) {
      results.push({
        hashtag,
        usageCount: stats.count,
        avgEngagement: stats.totalEngagement / stats.count,
      });
    }

    return results.sort((a, b) => b.avgEngagement - a.avgEngagement).slice(0, 20);
  }

  /**
   * Get content recommendations based on analytics
   */
  async getContentRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // Analyze recent performance
    const performance = await this.analyzeContentPerformance(30);
    const bestTimes = await this.getBestPostingTimes(30);
    const hashtagAnalysis = await this.analyzeHashtags(30);

    // Generate recommendations
    if (performance.avgEngagement < 2) {
      recommendations.push('Consider adding more engaging elements like questions or calls-to-action');
    }

    if (performance.topHashtags.length > 0) {
      recommendations.push(
        `Your top performing hashtags are: ${performance.topHashtags.slice(0, 3).join(', ')}`
      );
    }

    if (bestTimes.length > 0) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const best = bestTimes[0];
      recommendations.push(
        `Best posting time: ${days[best.dayOfWeek]} at ${best.hour}:00 (${best.avgEngagement.toFixed(1)}% avg engagement)`
      );
    }

    if (hashtagAnalysis.length > 0) {
      const topHashtag = hashtagAnalysis[0];
      recommendations.push(
        `${topHashtag.hashtag} has your highest engagement at ${topHashtag.avgEngagement.toFixed(1)}%`
      );
    }

    if (performance.totalReach === 0) {
      recommendations.push('Start publishing content to build your analytics baseline');
    }

    return recommendations;
  }
}

/**
 * Export default analyzer
 */
export async function analyzePerformance(
  brandId: string,
  days: number = 30
): Promise<ContentAnalysis> {
  const analyzer = new AnalyticsAnalyzer(brandId);
  return analyzer.analyzeContentPerformance(days);
}

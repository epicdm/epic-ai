/**
 * Analytics Analyzer
 * Analyzes content performance and generates insights
 */

import OpenAI from 'openai';
import { prisma } from '@epic-ai/database';
import type { ContentItem, ContentAnalytics } from '@prisma/client';
import type {
  AggregatedMetrics,
  ContentInsight,
  LearningData,
  PerformanceTrend,
} from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AnalyticsAnalyzer {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Get aggregated metrics for a time period
   */
  async getAggregatedMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<AggregatedMetrics> {
    const analytics = await prisma.contentAnalytics.findMany({
      where: {
        content: { brandId: this.brandId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        content: {
          select: {
            id: true,
            contentType: true,
            publishedAt: true,
          },
        },
      },
    });

    // Calculate totals
    const totals = analytics.reduce(
      (acc, a) => ({
        impressions: acc.impressions + a.impressions,
        engagements: acc.engagements + a.engagements,
        reach: acc.reach + (a.reach || 0),
      }),
      { impressions: 0, engagements: 0, reach: 0 }
    );

    const avgEngagementRate = totals.impressions > 0
      ? (totals.engagements / totals.impressions) * 100
      : 0;

    // Group by content type
    const byType = new Map<string, { total: number; count: number }>();
    for (const a of analytics) {
      const type = a.content.contentType;
      const existing = byType.get(type) || { total: 0, count: 0 };
      byType.set(type, {
        total: existing.total + a.engagementRate,
        count: existing.count + 1,
      });
    }

    const topContentTypes = Array.from(byType.entries())
      .map(([type, data]) => ({
        type: type as ContentItem['contentType'],
        avgEngagement: data.total / data.count,
      }))
      .sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Top performing content
    const topPerformingContent = analytics
      .sort((a, b) => b.engagementRate - a.engagementRate)
      .slice(0, 10)
      .map((a) => ({
        contentId: a.contentId,
        engagementRate: a.engagementRate,
      }));

    // Performance by platform
    const byPlatform = new Map<string, { impressions: number; engagements: number; count: number }>();
    for (const a of analytics) {
      const platform = a.platform;
      const existing = byPlatform.get(platform) || { impressions: 0, engagements: 0, count: 0 };
      byPlatform.set(platform, {
        impressions: existing.impressions + a.impressions,
        engagements: existing.engagements + a.engagements,
        count: existing.count + 1,
      });
    }

    const performanceByPlatform = Object.fromEntries(
      Array.from(byPlatform.entries()).map(([platform, data]) => [
        platform,
        {
          impressions: data.impressions,
          engagements: data.engagements,
          avgEngagementRate: data.impressions > 0
            ? (data.engagements / data.impressions) * 100
            : 0,
        },
      ])
    ) as AggregatedMetrics['performanceByPlatform'];

    // Performance by day of week
    const byDayOfWeek = new Map<number, { total: number; count: number }>();
    for (const a of analytics) {
      if (a.content.publishedAt) {
        const day = a.content.publishedAt.getDay();
        const existing = byDayOfWeek.get(day) || { total: 0, count: 0 };
        byDayOfWeek.set(day, {
          total: existing.total + a.engagementRate,
          count: existing.count + 1,
        });
      }
    }

    const performanceByDayOfWeek = Object.fromEntries(
      Array.from(byDayOfWeek.entries()).map(([day, data]) => [
        day,
        {
          avgEngagement: data.total / data.count,
          postCount: data.count,
        },
      ])
    ) as AggregatedMetrics['performanceByDayOfWeek'];

    // Performance by hour
    const byHour = new Map<number, { total: number; count: number }>();
    for (const a of analytics) {
      if (a.content.publishedAt) {
        const hour = a.content.publishedAt.getHours();
        const existing = byHour.get(hour) || { total: 0, count: 0 };
        byHour.set(hour, {
          total: existing.total + a.engagementRate,
          count: existing.count + 1,
        });
      }
    }

    const performanceByHour = Object.fromEntries(
      Array.from(byHour.entries()).map(([hour, data]) => [
        hour,
        {
          avgEngagement: data.total / data.count,
          postCount: data.count,
        },
      ])
    ) as AggregatedMetrics['performanceByHour'];

    return {
      totalImpressions: totals.impressions,
      totalEngagements: totals.engagements,
      totalReach: totals.reach,
      avgEngagementRate,
      topContentTypes,
      topPerformingContent,
      performanceByPlatform,
      performanceByDayOfWeek,
      performanceByHour,
    };
  }

  /**
   * Generate AI-powered insights from analytics
   */
  async generateInsights(
    metrics: AggregatedMetrics,
    contentSamples: ContentItem[]
  ): Promise<ContentInsight[]> {
    const topContent = contentSamples
      .slice(0, 5)
      .map((c) => ({
        content: c.content.slice(0, 200),
        type: c.contentType,
        hashtags: c.hashtags,
      }));

    const bottomContent = contentSamples
      .slice(-5)
      .map((c) => ({
        content: c.content.slice(0, 200),
        type: c.contentType,
        hashtags: c.hashtags,
      }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a social media analytics expert. Analyze performance data and generate actionable insights.

Return insights in JSON format:
{
  "insights": [
    {
      "type": "topic|format|timing|hashtag|length",
      "insight": "What we observed",
      "recommendation": "What to do about it",
      "confidence": 0.8
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Analyze this social media performance data:

Aggregated Metrics:
- Total Impressions: ${metrics.totalImpressions}
- Total Engagements: ${metrics.totalEngagements}
- Avg Engagement Rate: ${metrics.avgEngagementRate.toFixed(2)}%

Top Content Types:
${metrics.topContentTypes.map((t) => `- ${t.type}: ${t.avgEngagement.toFixed(2)}% avg engagement`).join('\n')}

Best Performing Days:
${Object.entries(metrics.performanceByDayOfWeek)
  .sort(([, a], [, b]) => b.avgEngagement - a.avgEngagement)
  .slice(0, 3)
  .map(([day, data]) => `- Day ${day}: ${data.avgEngagement.toFixed(2)}% avg engagement`)
  .join('\n')}

Best Performing Hours:
${Object.entries(metrics.performanceByHour)
  .sort(([, a], [, b]) => b.avgEngagement - a.avgEngagement)
  .slice(0, 3)
  .map(([hour, data]) => `- ${hour}:00: ${data.avgEngagement.toFixed(2)}% avg engagement`)
  .join('\n')}

Top Performing Content Samples:
${JSON.stringify(topContent, null, 2)}

Underperforming Content Samples:
${JSON.stringify(bottomContent, null, 2)}

Generate 5-7 specific, actionable insights.`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    const insights: ContentInsight[] = (result.insights || []).map(
      (insight: ContentInsight) => ({
        ...insight,
        dataPoints: metrics.topPerformingContent.length,
      })
    );

    return insights;
  }

  /**
   * Generate learning data for content optimization
   */
  async generateLearningData(
    period: 'week' | 'month' | 'quarter'
  ): Promise<LearningData> {
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
    }

    // Get metrics
    const metrics = await this.getAggregatedMetrics(startDate, now);

    // Get content samples sorted by engagement
    const content = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        publishedAt: { gte: startDate, lte: now },
        status: 'PUBLISHED',
      },
      include: {
        analytics: true,
      },
      orderBy: {
        analytics: {
          engagementRate: 'desc',
        },
      },
    });

    // Generate insights
    const insights = await this.generateInsights(metrics, content);

    // Extract top performing attributes
    const topContent = content.slice(0, Math.ceil(content.length * 0.2));
    const bottomContent = content.slice(-Math.ceil(content.length * 0.2));

    // Analyze hashtags
    const topHashtags = new Map<string, number>();
    const bottomHashtags = new Map<string, number>();

    for (const c of topContent) {
      const hashtags = c.hashtags as string[] || [];
      for (const tag of hashtags) {
        topHashtags.set(tag, (topHashtags.get(tag) || 0) + 1);
      }
    }

    for (const c of bottomContent) {
      const hashtags = c.hashtags as string[] || [];
      for (const tag of hashtags) {
        bottomHashtags.set(tag, (bottomHashtags.get(tag) || 0) + 1);
      }
    }

    // Best posting times
    const postingTimes = Object.entries(metrics.performanceByHour)
      .flatMap(([hour, data]) =>
        Object.entries(metrics.performanceByDayOfWeek).map(([day, dayData]) => ({
          dayOfWeek: parseInt(day),
          hour: parseInt(hour),
          avgEngagement: (data.avgEngagement + dayData.avgEngagement) / 2,
        }))
      )
      .sort((a, b) => b.avgEngagement - a.avgEngagement)
      .slice(0, 5);

    return {
      brandId: this.brandId,
      period,
      insights,
      topPerformingAttributes: {
        topics: [], // Would need topic extraction
        formats: metrics.topContentTypes.slice(0, 3).map((t) => t.type),
        hashtags: Array.from(topHashtags.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([tag]) => tag),
        postLengths: [], // Would need length analysis
        postingTimes,
      },
      underperformingAttributes: {
        topics: [],
        hashtags: Array.from(bottomHashtags.entries())
          .filter(([tag]) => !topHashtags.has(tag))
          .slice(0, 5)
          .map(([tag]) => tag),
      },
      recommendedChanges: insights
        .filter((i) => i.confidence > 0.7)
        .map((i) => ({
          category: i.type,
          current: i.insight,
          recommended: i.recommendation,
          expectedImprovement: i.confidence * 20, // Rough estimate
        })),
    };
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    startDate: Date,
    endDate: Date,
    granularity: 'day' | 'week' | 'month'
  ): Promise<PerformanceTrend[]> {
    const analytics = await prisma.contentAnalytics.findMany({
      where: {
        content: { brandId: this.brandId },
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        content: {
          select: { publishedAt: true },
        },
      },
    });

    // Group by time period
    const groups = new Map<string, ContentAnalytics[]>();

    for (const a of analytics) {
      const date = a.content.publishedAt || a.createdAt;
      let key: string;

      switch (granularity) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(a);
    }

    return Array.from(groups.entries())
      .map(([dateStr, items]) => {
        const impressions = items.reduce((sum, i) => sum + i.impressions, 0);
        const engagements = items.reduce((sum, i) => sum + i.engagements, 0);

        return {
          date: new Date(dateStr),
          impressions,
          engagements,
          engagementRate: impressions > 0 ? (engagements / impressions) * 100 : 0,
          postCount: items.length,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

/**
 * Analytics Types
 * Types for content and ad performance analytics
 */

import type { SocialPlatform, ContentType } from '@prisma/client';

export interface ContentPerformance {
  contentId: string;
  platform: SocialPlatform;
  impressions: number;
  reach?: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clicks?: number;
  videoViews?: number;
  engagementRate: number;
  fetchedAt: Date;
}

export interface AggregatedMetrics {
  totalImpressions: number;
  totalEngagements: number;
  totalReach: number;
  avgEngagementRate: number;
  topContentTypes: { type: ContentType; avgEngagement: number }[];
  topPerformingContent: { contentId: string; engagementRate: number }[];
  performanceByPlatform: Record<SocialPlatform, {
    impressions: number;
    engagements: number;
    avgEngagementRate: number;
  }>;
  performanceByDayOfWeek: Record<number, {
    avgEngagement: number;
    postCount: number;
  }>;
  performanceByHour: Record<number, {
    avgEngagement: number;
    postCount: number;
  }>;
}

export interface ContentInsight {
  type: 'topic' | 'format' | 'timing' | 'hashtag' | 'length';
  insight: string;
  recommendation: string;
  confidence: number; // 0-1
  dataPoints: number; // How many posts this is based on
}

export interface LearningData {
  brandId: string;
  period: 'week' | 'month' | 'quarter';
  insights: ContentInsight[];
  topPerformingAttributes: {
    topics: string[];
    formats: ContentType[];
    hashtags: string[];
    postLengths: { min: number; max: number; avgEngagement: number }[];
    postingTimes: { dayOfWeek: number; hour: number; avgEngagement: number }[];
  };
  underperformingAttributes: {
    topics: string[];
    hashtags: string[];
  };
  recommendedChanges: {
    category: string;
    current: string;
    recommended: string;
    expectedImprovement: number;
  }[];
}

export interface PerformanceTrend {
  date: Date;
  impressions: number;
  engagements: number;
  engagementRate: number;
  postCount: number;
}

/**
 * Social Metrics Collector
 * Fetches performance metrics from social platforms
 */

import type { SocialPlatform, SocialAccount } from '@prisma/client';
import type { ContentPerformance } from '../types';

interface PlatformMetrics {
  impressions: number;
  reach?: number;
  engagements: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  clicks?: number;
  videoViews?: number;
}

export class SocialMetricsCollector {
  /**
   * Fetch metrics for a post from its platform
   */
  async fetchMetrics(
    postId: string,
    platform: SocialPlatform,
    account: SocialAccount
  ): Promise<ContentPerformance | null> {
    try {
      let metrics: PlatformMetrics;

      switch (platform) {
        case 'TWITTER':
          metrics = await this.fetchTwitterMetrics(postId, account.accessToken);
          break;
        case 'LINKEDIN':
          metrics = await this.fetchLinkedInMetrics(postId, account.accessToken);
          break;
        case 'FACEBOOK':
        case 'INSTAGRAM':
          metrics = await this.fetchMetaMetrics(postId, account.accessToken, platform);
          break;
        default:
          return null;
      }

      const engagementRate = metrics.impressions > 0
        ? ((metrics.engagements / metrics.impressions) * 100)
        : 0;

      return {
        contentId: postId,
        platform,
        ...metrics,
        engagementRate,
        fetchedAt: new Date(),
      };
    } catch (error) {
      console.error(`Failed to fetch metrics for ${platform}:`, error);
      return null;
    }
  }

  private async fetchTwitterMetrics(
    postId: string,
    accessToken: string
  ): Promise<PlatformMetrics> {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${postId}?` +
        new URLSearchParams({
          'tweet.fields': 'public_metrics',
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter metrics');
    }

    const data = await response.json();
    const metrics = data.data?.public_metrics || {};

    return {
      impressions: metrics.impression_count || 0,
      engagements:
        (metrics.like_count || 0) +
        (metrics.retweet_count || 0) +
        (metrics.reply_count || 0) +
        (metrics.quote_count || 0),
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
      clicks: metrics.url_link_clicks || 0,
    };
  }

  private async fetchLinkedInMetrics(
    postId: string,
    accessToken: string
  ): Promise<PlatformMetrics> {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${postId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn metrics');
    }

    const data = await response.json();

    // Get share statistics
    const statsResponse = await fetch(
      `https://api.linkedin.com/v2/organizationalEntityShareStatistics?` +
        new URLSearchParams({
          q: 'organizationalEntity',
          shares: postId,
        }),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    const statsData = statsResponse.ok ? await statsResponse.json() : { elements: [] };
    const stats = statsData.elements?.[0]?.totalShareStatistics || {};

    return {
      impressions: stats.impressionCount || 0,
      reach: stats.uniqueImpressionsCount || 0,
      engagements:
        (data.likesSummary?.totalLikes || 0) +
        (data.commentsSummary?.totalFirstLevelComments || 0) +
        (stats.shareCount || 0),
      likes: data.likesSummary?.totalLikes || 0,
      comments: data.commentsSummary?.totalFirstLevelComments || 0,
      shares: stats.shareCount || 0,
      clicks: stats.clickCount || 0,
    };
  }

  private async fetchMetaMetrics(
    postId: string,
    accessToken: string,
    platform: SocialPlatform
  ): Promise<PlatformMetrics> {
    const isInstagram = platform === 'INSTAGRAM';
    const metrics = isInstagram
      ? 'impressions,reach,engagement,saved'
      : 'post_impressions,post_engaged_users,post_reactions_by_type_total';

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}/insights?` +
        new URLSearchParams({
          metric: metrics,
          access_token: accessToken,
        })
    );

    if (!response.ok) {
      // Fallback to basic metrics
      const basicResponse = await fetch(
        `https://graph.facebook.com/v18.0/${postId}?` +
          new URLSearchParams({
            fields: isInstagram
              ? 'like_count,comments_count'
              : 'shares,reactions.summary(total_count),comments.summary(total_count)',
            access_token: accessToken,
          })
      );

      if (!basicResponse.ok) {
        throw new Error('Failed to fetch Meta metrics');
      }

      const basicData = await basicResponse.json();

      return {
        impressions: 0,
        engagements:
          (basicData.like_count || basicData.reactions?.summary?.total_count || 0) +
          (basicData.comments_count || basicData.comments?.summary?.total_count || 0) +
          (basicData.shares?.count || 0),
        likes: basicData.like_count || basicData.reactions?.summary?.total_count || 0,
        comments: basicData.comments_count || basicData.comments?.summary?.total_count || 0,
        shares: basicData.shares?.count || 0,
        saves: basicData.saved || 0,
      };
    }

    const data = await response.json();
    const insightsMap: Record<string, number> = {};
    for (const insight of data.data || []) {
      insightsMap[insight.name] = insight.values?.[0]?.value || 0;
    }

    if (isInstagram) {
      return {
        impressions: insightsMap.impressions || 0,
        reach: insightsMap.reach || 0,
        engagements: insightsMap.engagement || 0,
        likes: 0, // Need separate call
        comments: 0,
        shares: 0,
        saves: insightsMap.saved || 0,
      };
    }

    return {
      impressions: insightsMap.post_impressions || 0,
      engagements: insightsMap.post_engaged_users || 0,
      likes: insightsMap.post_reactions_by_type_total?.like || 0,
      comments: 0,
      shares: 0,
    };
  }
}

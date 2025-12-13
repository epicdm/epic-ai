/**
 * Metrics Collector - Fetches analytics from platform APIs
 *
 * PKG-025: Analytics & Learning Loop
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform } from '@prisma/client';

interface CollectedMetrics {
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  saves?: number;
  videoViews?: number;
  profileVisits?: number;
}

/**
 * Fetch tweet metrics from Twitter API
 */
async function fetchTwitterMetrics(
  accessToken: string,
  tweetId: string
): Promise<CollectedMetrics | null> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error('Twitter metrics fetch failed:', response.status);
      return null;
    }

    const data = await response.json();
    const metrics = data.data?.public_metrics;

    if (!metrics) return null;

    return {
      impressions: metrics.impression_count || 0,
      reach: metrics.impression_count || 0, // Twitter doesn't separate reach
      likes: metrics.like_count || 0,
      comments: metrics.reply_count || 0,
      shares: metrics.retweet_count + (metrics.quote_count || 0),
      clicks: 0, // Requires elevated access
    };
  } catch (error) {
    console.error('Error fetching Twitter metrics:', error);
    return null;
  }
}

/**
 * Fetch LinkedIn post metrics
 * Note: LinkedIn API has limited metrics access
 */
async function fetchLinkedInMetrics(
  accessToken: string,
  postUrn: string
): Promise<CollectedMetrics | null> {
  try {
    // LinkedIn's socialActions API
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    if (!response.ok) {
      // LinkedIn may return 404 for new posts
      return {
        impressions: 0,
        reach: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
      };
    }

    const data = await response.json();

    return {
      impressions: 0, // Requires organization analytics access
      reach: 0,
      likes: data.likesSummary?.totalLikes || 0,
      comments: data.commentsSummary?.totalComments || 0,
      shares: 0, // Not directly available
      clicks: 0,
    };
  } catch (error) {
    console.error('Error fetching LinkedIn metrics:', error);
    return null;
  }
}

/**
 * Fetch Meta (Facebook/Instagram) post metrics
 */
async function fetchMetaMetrics(
  accessToken: string,
  postId: string,
  platform: 'FACEBOOK' | 'INSTAGRAM'
): Promise<CollectedMetrics | null> {
  try {
    const fields =
      platform === 'INSTAGRAM'
        ? 'like_count,comments_count,shares_count,reach,impressions,saved'
        : 'likes.summary(true),comments.summary(true),shares,reach,impressions';

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      console.error('Meta metrics fetch failed:', response.status);
      return null;
    }

    const data = await response.json();

    if (platform === 'INSTAGRAM') {
      return {
        impressions: data.impressions || 0,
        reach: data.reach || 0,
        likes: data.like_count || 0,
        comments: data.comments_count || 0,
        shares: data.shares_count || 0,
        clicks: 0,
        saves: data.saved || 0,
      };
    }

    return {
      impressions: data.impressions || 0,
      reach: data.reach || 0,
      likes: data.likes?.summary?.total_count || 0,
      comments: data.comments?.summary?.total_count || 0,
      shares: data.shares?.count || 0,
      clicks: 0,
    };
  } catch (error) {
    console.error('Error fetching Meta metrics:', error);
    return null;
  }
}

/**
 * Fetch metrics from platform API
 */
async function fetchPlatformMetrics(
  platform: string,
  accessToken: string,
  platformPostId: string
): Promise<CollectedMetrics | null> {
  switch (platform) {
    case 'TWITTER':
      return fetchTwitterMetrics(accessToken, platformPostId);

    case 'LINKEDIN':
      return fetchLinkedInMetrics(accessToken, platformPostId);

    case 'FACEBOOK':
      return fetchMetaMetrics(accessToken, platformPostId, 'FACEBOOK');

    case 'INSTAGRAM':
      return fetchMetaMetrics(accessToken, platformPostId, 'INSTAGRAM');

    default:
      return null;
  }
}

/**
 * Analyze content characteristics for learning
 */
function analyzeContent(content: string): {
  contentLength: number;
  hasHashtags: boolean;
  hashtagCount: number;
  hasEmojis: boolean;
  hasLinks: boolean;
  hasQuestion: boolean;
  hasCTA: boolean;
} {
  const hashtagMatches = content.match(/#\w+/g) || [];
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const hasEmojis = emojiRegex.test(content);
  const urlRegex = /https?:\/\/[^\s]+/g;
  const hasLinks = urlRegex.test(content);
  const hasQuestion = content.includes('?');

  // Check for common CTAs
  const ctaPatterns = [
    /click/i,
    /link in bio/i,
    /check out/i,
    /learn more/i,
    /sign up/i,
    /register/i,
    /download/i,
    /subscribe/i,
    /follow/i,
    /share/i,
    /comment/i,
    /let me know/i,
    /what do you think/i,
    /tell us/i,
  ];
  const hasCTA = ctaPatterns.some((pattern) => pattern.test(content));

  return {
    contentLength: content.length,
    hasHashtags: hashtagMatches.length > 0,
    hashtagCount: hashtagMatches.length,
    hasEmojis,
    hasLinks,
    hasQuestion,
    hasCTA,
  };
}

/**
 * Collect metrics for a single content variation
 */
export async function collectVariationMetrics(variationId: string): Promise<boolean> {
  const variation = await prisma.contentVariation.findUnique({
    where: { id: variationId },
    include: {
      account: true,
      content: {
        include: {
          brand: true,
        },
      },
      analytics: true,
    },
  });

  if (!variation || !variation.account || !variation.postId) {
    return false;
  }

  // Get access token
  const accessToken = variation.account.accessToken;
  if (!accessToken) {
    return false;
  }

  // Fetch metrics from platform
  const metrics = await fetchPlatformMetrics(
    variation.platform,
    accessToken,
    variation.postId
  );

  if (!metrics) {
    return false;
  }

  // Analyze content
  const contentAnalysis = analyzeContent(variation.text);

  // Calculate engagement rate
  const totalEngagements =
    metrics.likes + metrics.comments + metrics.shares + (metrics.clicks || 0);
  const engagementRate =
    metrics.impressions > 0 ? (totalEngagements / metrics.impressions) * 100 : 0;

  // Get publish time info
  const publishedAt = variation.publishedAt || new Date();
  const dayOfWeek = publishedAt.getDay();
  const hourOfDay = publishedAt.getHours();

  const orgId = variation.content.brand.organizationId;

  // Create or update analytics
  if (variation.analytics) {
    await prisma.postAnalytics.update({
      where: { id: variation.analytics.id },
      data: {
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: totalEngagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves || 0,
        clicks: metrics.clicks,
        engagementRate,
        videoViews: metrics.videoViews,
        profileVisits: metrics.profileVisits || 0,
        lastFetched: new Date(),
        fetchCount: { increment: 1 },
      },
    });
  } else {
    await prisma.postAnalytics.create({
      data: {
        orgId,
        variationId: variation.id,
        platform: variation.platform,
        accountId: variation.account.id,
        impressions: metrics.impressions,
        reach: metrics.reach,
        engagements: totalEngagements,
        likes: metrics.likes,
        comments: metrics.comments,
        shares: metrics.shares,
        saves: metrics.saves || 0,
        clicks: metrics.clicks,
        engagementRate,
        videoViews: metrics.videoViews,
        profileVisits: metrics.profileVisits || 0,
        ...contentAnalysis,
        hasMedia: !!variation.mediaUrl,
        publishedAt,
        dayOfWeek,
        hourOfDay,
      },
    });
  }

  return true;
}

/**
 * Collect metrics for all recent published variations in an org
 */
export async function collectOrgMetrics(orgId: string): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const stats = { processed: 0, updated: 0, errors: 0 };

  // Get published variations from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const variations = await prisma.contentVariation.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: { gte: thirtyDaysAgo },
      postId: { not: null },
      content: {
        brand: { organizationId: orgId },
      },
    },
    include: {
      analytics: true,
    },
    orderBy: { publishedAt: 'desc' },
  });

  for (const variation of variations) {
    stats.processed++;

    // Skip if recently fetched (within 1 hour)
    if (
      variation.analytics &&
      variation.analytics.lastFetched > new Date(Date.now() - 60 * 60 * 1000)
    ) {
      continue;
    }

    try {
      const success = await collectVariationMetrics(variation.id);
      if (success) {
        stats.updated++;
      }
    } catch (error) {
      console.error(`Error collecting metrics for variation ${variation.id}:`, error);
      stats.errors++;
    }

    // Rate limit: wait between API calls
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return stats;
}

/**
 * Collect metrics for all organizations (called by cron)
 */
export async function collectAllMetrics(): Promise<{
  orgsProcessed: number;
  totalUpdated: number;
}> {
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  });

  let totalUpdated = 0;

  for (const org of orgs) {
    const result = await collectOrgMetrics(org.id);
    totalUpdated += result.updated;
  }

  return {
    orgsProcessed: orgs.length,
    totalUpdated,
  };
}

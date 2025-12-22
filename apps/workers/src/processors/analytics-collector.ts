/**
 * Analytics Collector Processor
 *
 * Handles SYNC_ANALYTICS jobs by fetching metrics from social platform APIs
 * and generating AI-powered learnings for Brand Brain.
 *
 * Implements:
 * - T036: Create analytics-collector processor
 * - T038: Integrate with Analytics service patterns
 * - T039: Rate limit detection and exponential backoff
 * - T040: Expired OAuth token detection (mark as EXPIRED status)
 * - T041: BrandLearning generation from aggregated metrics
 *
 * @module processors/analytics-collector
 */

import type { Job } from 'bullmq';
import OpenAI from 'openai';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import {
  JobType,
  type AnalyticsSyncPayload,
  type AnalyticsSyncResult,
} from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'AnalyticsCollector';

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// Types
// =============================================================================

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

interface RateLimitInfo {
  isLimited: boolean;
  retryAfterMs?: number;
  remainingRequests?: number;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
  requiresReauth?: boolean;
}

// =============================================================================
// Rate Limit Tracking (T039)
// =============================================================================

/**
 * Rate limit state per platform
 * Key: platform-accountId
 */
const rateLimitState: Map<
  string,
  {
    lastLimited: number;
    backoffMs: number;
    consecutiveFailures: number;
  }
> = new Map();

/**
 * Base backoff time in milliseconds
 */
const BASE_BACKOFF_MS = 60_000; // 1 minute

/**
 * Maximum backoff time in milliseconds
 */
const MAX_BACKOFF_MS = 30 * 60_000; // 30 minutes

/**
 * Check if we should skip due to rate limiting
 */
function shouldSkipDueToRateLimit(platform: string, accountId: string): boolean {
  const key = `${platform}-${accountId}`;
  const state = rateLimitState.get(key);

  if (!state) return false;

  const timeSinceLimit = Date.now() - state.lastLimited;
  return timeSinceLimit < state.backoffMs;
}

/**
 * Update rate limit state with exponential backoff
 */
function updateRateLimitState(
  platform: string,
  accountId: string,
  isLimited: boolean,
  retryAfterMs?: number
): void {
  const key = `${platform}-${accountId}`;
  const currentState = rateLimitState.get(key);

  if (isLimited) {
    const consecutiveFailures = (currentState?.consecutiveFailures || 0) + 1;
    const backoffMs = retryAfterMs || Math.min(BASE_BACKOFF_MS * Math.pow(2, consecutiveFailures - 1), MAX_BACKOFF_MS);

    rateLimitState.set(key, {
      lastLimited: Date.now(),
      backoffMs,
      consecutiveFailures,
    });

    logger.warn(COMPONENT, `Rate limited on ${platform}`, {
      accountId,
      backoffMs,
      consecutiveFailures,
    });
  } else if (currentState) {
    // Reset on success
    rateLimitState.delete(key);
  }
}

// =============================================================================
// Platform API Clients (T038, T039, T040)
// =============================================================================

/**
 * Fetch metrics from Twitter API v2
 */
async function fetchTwitterMetrics(
  accessToken: string,
  postId: string
): Promise<ApiResponse<CollectedMetrics>> {
  try {
    const response = await fetch(
      `https://api.twitter.com/2/tweets/${postId}?tweet.fields=public_metrics`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // Check for rate limiting
    const rateLimitRemaining = response.headers.get('x-rate-limit-remaining');
    const rateLimitReset = response.headers.get('x-rate-limit-reset');

    const rateLimitInfo: RateLimitInfo = {
      isLimited: response.status === 429,
      remainingRequests: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
      retryAfterMs: rateLimitReset
        ? (parseInt(rateLimitReset) * 1000 - Date.now())
        : undefined,
    };

    // Check for auth errors (T040)
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: `Twitter auth error: ${response.status}`,
        requiresReauth: true,
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limited',
        rateLimitInfo,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Twitter API error: ${response.status}`,
        rateLimitInfo,
      };
    }

    const data = (await response.json()) as {
      data?: { public_metrics?: Record<string, number> };
    };
    const metrics = data.data?.public_metrics;

    if (!metrics) {
      return { success: false, error: 'No metrics data' };
    }

    return {
      success: true,
      data: {
        impressions: metrics.impression_count || 0,
        reach: metrics.impression_count || 0,
        likes: metrics.like_count || 0,
        comments: metrics.reply_count || 0,
        shares: (metrics.retweet_count || 0) + (metrics.quote_count || 0),
        clicks: 0,
      },
      rateLimitInfo,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch metrics from LinkedIn API
 */
async function fetchLinkedInMetrics(
  accessToken: string,
  postUrn: string
): Promise<ApiResponse<CollectedMetrics>> {
  try {
    const response = await fetch(
      `https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      }
    );

    // Check for auth errors (T040)
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: `LinkedIn auth error: ${response.status}`,
        requiresReauth: true,
      };
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      return {
        success: false,
        error: 'Rate limited',
        rateLimitInfo: {
          isLimited: true,
          retryAfterMs: retryAfter ? parseInt(retryAfter) * 1000 : undefined,
        },
      };
    }

    // LinkedIn returns 404 for new posts
    if (response.status === 404) {
      return {
        success: true,
        data: {
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
        },
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `LinkedIn API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      likesSummary?: { totalLikes?: number };
      commentsSummary?: { totalComments?: number };
    };

    return {
      success: true,
      data: {
        impressions: 0,
        reach: 0,
        likes: data.likesSummary?.totalLikes || 0,
        comments: data.commentsSummary?.totalComments || 0,
        shares: 0,
        clicks: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch metrics from Meta Graph API (Facebook/Instagram)
 */
async function fetchMetaMetrics(
  accessToken: string,
  postId: string,
  platform: 'FACEBOOK' | 'INSTAGRAM'
): Promise<ApiResponse<CollectedMetrics>> {
  try {
    const fields =
      platform === 'INSTAGRAM'
        ? 'like_count,comments_count,shares_count,reach,impressions,saved'
        : 'likes.summary(true),comments.summary(true),shares,reach,impressions';

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${postId}?fields=${fields}&access_token=${accessToken}`
    );

    // Check for auth errors (T040)
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: `Meta auth error: ${response.status}`,
        requiresReauth: true,
      };
    }

    if (response.status === 429) {
      return {
        success: false,
        error: 'Rate limited',
        rateLimitInfo: { isLimited: true },
      };
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as {
        error?: { code?: number; message?: string };
      };
      // Check for specific OAuth errors in response body
      if (errorData.error?.code === 190 || errorData.error?.code === 102) {
        return {
          success: false,
          error: `Meta OAuth error: ${errorData.error?.message}`,
          requiresReauth: true,
        };
      }
      return {
        success: false,
        error: `Meta API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      impressions?: number;
      reach?: number;
      like_count?: number;
      comments_count?: number;
      shares_count?: number;
      saved?: number;
      likes?: { summary?: { total_count?: number } };
      comments?: { summary?: { total_count?: number } };
      shares?: { count?: number };
    };

    if (platform === 'INSTAGRAM') {
      return {
        success: true,
        data: {
          impressions: data.impressions || 0,
          reach: data.reach || 0,
          likes: data.like_count || 0,
          comments: data.comments_count || 0,
          shares: data.shares_count || 0,
          clicks: 0,
          saves: data.saved || 0,
        },
      };
    }

    return {
      success: true,
      data: {
        impressions: data.impressions || 0,
        reach: data.reach || 0,
        likes: data.likes?.summary?.total_count || 0,
        comments: data.comments?.summary?.total_count || 0,
        shares: data.shares?.count || 0,
        clicks: 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Fetch metrics from appropriate platform API
 */
async function fetchPlatformMetrics(
  platform: string,
  accessToken: string,
  postId: string
): Promise<ApiResponse<CollectedMetrics>> {
  switch (platform) {
    case 'TWITTER':
      return fetchTwitterMetrics(accessToken, postId);
    case 'LINKEDIN':
      return fetchLinkedInMetrics(accessToken, postId);
    case 'FACEBOOK':
      return fetchMetaMetrics(accessToken, postId, 'FACEBOOK');
    case 'INSTAGRAM':
      return fetchMetaMetrics(accessToken, postId, 'INSTAGRAM');
    default:
      return { success: false, error: `Unsupported platform: ${platform}` };
  }
}

// =============================================================================
// OAuth Token Handling (T040)
// =============================================================================

/**
 * Mark social account as needing reauthorization
 */
async function markAccountAsExpired(accountId: string, error: string): Promise<void> {
  try {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        status: 'EXPIRED',
        lastError: error,
        updatedAt: new Date(),
      },
    });

    logger.warn(COMPONENT, `Marked account ${accountId} as EXPIRED`, { error });
  } catch (err) {
    logger.error(COMPONENT, `Failed to mark account as expired`, {
      accountId,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Content Analysis
// =============================================================================

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

  const ctaPatterns = [
    /click/i, /link in bio/i, /check out/i, /learn more/i, /sign up/i,
    /register/i, /download/i, /subscribe/i, /follow/i, /share/i,
    /comment/i, /let me know/i, /what do you think/i, /tell us/i,
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

// =============================================================================
// Learning Generation (T041)
// =============================================================================

/**
 * Generate AI-powered learnings from analytics data
 */
async function generateLearningsForBrand(
  brandId: string,
  newMetricsCount: number
): Promise<number> {
  // Only generate learnings if we have meaningful new data
  if (newMetricsCount < 3) {
    logger.debug(COMPONENT, `Skipping learning generation - not enough new metrics`, {
      brandId,
      newMetricsCount,
    });
    return 0;
  }

  try {
    // Get brand and brand brain
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        brandBrain: true,
        organization: { select: { id: true } },
      },
    });

    if (!brand?.brandBrain) {
      return 0;
    }

    // Check if we've analyzed recently (within 24 hours)
    const lastAnalyzed = brand.brandBrain.lastAnalyzedAt;
    if (lastAnalyzed && Date.now() - lastAnalyzed.getTime() < 24 * 60 * 60 * 1000) {
      logger.debug(COMPONENT, `Skipping learning generation - analyzed recently`, { brandId });
      return 0;
    }

    // Get analytics from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const analytics = await prisma.postAnalytics.findMany({
      where: {
        orgId: brand.organizationId,
        publishedAt: { gte: thirtyDaysAgo },
      },
      include: {
        variation: { select: { text: true } },
      },
      orderBy: { engagementRate: 'desc' },
    });

    if (analytics.length < 5) {
      return 0;
    }

    // Prepare analysis summary
    const topPosts = analytics.slice(0, 5).map((a) => ({
      content: a.variation?.text?.substring(0, 150) || '',
      platform: a.platform,
      engagementRate: a.engagementRate,
      dayOfWeek: a.dayOfWeek,
      hourOfDay: a.hourOfDay,
    }));

    const avgEngagement = analytics.reduce((sum, a) => sum + a.engagementRate, 0) / analytics.length;

    // Get existing learnings
    const existingLearnings = await prisma.brandLearning.findMany({
      where: { brainId: brand.brandBrain.id, isActive: true },
      select: { type: true, insight: true },
    });

    // Generate insights with AI
    const prompt = `Analyze this social media performance data and generate 2-3 actionable insights.

DATA:
- Total posts: ${analytics.length}
- Average engagement rate: ${avgEngagement.toFixed(2)}%
- Top performing posts: ${JSON.stringify(topPosts)}

EXISTING LEARNINGS (avoid duplicates):
${existingLearnings.map((l) => `- ${l.type}: ${l.insight}`).join('\n') || 'None'}

Generate NEW insights in JSON format:
{
  "learnings": [
    {
      "type": "BEST_TIME|BEST_FORMAT|BEST_TOPIC|TONE_ADJUSTMENT|PLATFORM_SPECIFIC|AVOID",
      "insight": "Specific actionable insight",
      "confidence": 0.8
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a social media analytics expert. Generate specific, actionable insights.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return 0;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    let learningsCreated = 0;

    const validTypes = [
      'BEST_TIME', 'BEST_HASHTAG', 'BEST_TOPIC', 'BEST_FORMAT',
      'AUDIENCE_INSIGHT', 'TONE_ADJUSTMENT', 'AVOID', 'PLATFORM_SPECIFIC',
    ];

    for (const learning of parsed.learnings || []) {
      if (!learning.insight || !learning.type) continue;

      // Check for duplicates
      const exists = existingLearnings.some(
        (l) => l.type === learning.type &&
               l.insight.toLowerCase().includes(learning.insight.toLowerCase().slice(0, 30))
      );

      if (!exists) {
        const learningType = validTypes.includes(learning.type) ? learning.type : 'AUDIENCE_INSIGHT';

        await prisma.brandLearning.create({
          data: {
            brainId: brand.brandBrain.id,
            type: learningType,
            insight: learning.insight,
            sourceData: { generatedFrom: 'analytics-sync', postCount: analytics.length },
            confidence: learning.confidence || 0.7,
            isActive: true,
          },
        });

        learningsCreated++;
        logger.info(COMPONENT, `Created new learning for brand ${brandId}`, {
          type: learningType,
          insight: learning.insight.substring(0, 50),
        });
      }
    }

    // Update last analyzed timestamp
    if (learningsCreated > 0) {
      await prisma.brandBrain.update({
        where: { id: brand.brandBrain.id },
        data: { lastAnalyzedAt: new Date() },
      });
    }

    return learningsCreated;
  } catch (error) {
    logger.error(COMPONENT, `Failed to generate learnings for brand ${brandId}`, {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

// =============================================================================
// Main Processor (T036)
// =============================================================================

/**
 * Sync analytics for a social account
 */
async function syncAnalytics(
  job: Job<JobData<AnalyticsSyncPayload>>
): Promise<AnalyticsSyncResult> {
  const startTime = Date.now();
  const { socialAccountId, platform, syncType } = job.data.payload;

  logger.info(COMPONENT, `Starting analytics sync for account ${socialAccountId}`, {
    platform,
    syncType,
  });

  // Check rate limit state
  if (shouldSkipDueToRateLimit(platform, socialAccountId)) {
    logger.warn(COMPONENT, `Skipping due to rate limit backoff`, {
      socialAccountId,
      platform,
    });
    return {
      postsUpdated: 0,
      metrics: { totalImpressions: 0, totalEngagements: 0, avgEngagementRate: 0 },
      learningsGenerated: 0,
      syncDurationMs: Date.now() - startTime,
      rateLimited: true,
    };
  }

  await reportProgress(job, 10, 'Loading social account...');

  // Get social account with brand info
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    include: {
      brand: { select: { id: true, organizationId: true } },
    },
  });

  if (!account) {
    throw new Error(`Social account not found: ${socialAccountId}`);
  }

  if (!account.accessToken) {
    throw new Error(`No access token for account: ${socialAccountId}`);
  }

  if (account.status !== 'CONNECTED') {
    logger.warn(COMPONENT, `Skipping - account not connected`, {
      socialAccountId,
      status: account.status,
    });
    return {
      postsUpdated: 0,
      metrics: { totalImpressions: 0, totalEngagements: 0, avgEngagementRate: 0 },
      learningsGenerated: 0,
      syncDurationMs: Date.now() - startTime,
      rateLimited: false,
    };
  }

  await reportProgress(job, 20, 'Fetching published content...');

  // Get published variations for this account
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const variations = await prisma.contentVariation.findMany({
    where: {
      accountId: socialAccountId,
      status: 'PUBLISHED',
      postId: { not: null },
      publishedAt: syncType === 'FULL' ? undefined : { gte: thirtyDaysAgo },
    },
    include: {
      analytics: true,
      content: { select: { brandId: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: syncType === 'FULL' ? 100 : 50,
  });

  logger.info(COMPONENT, `Found ${variations.length} variations to sync`);

  let postsUpdated = 0;
  let totalImpressions = 0;
  let totalEngagements = 0;
  let rateLimited = false;
  const brandIds = new Set<string>();

  await reportProgress(job, 30, `Processing ${variations.length} posts...`);

  for (let i = 0; i < variations.length; i++) {
    const variation = variations[i];
    const progress = 30 + Math.floor((i / variations.length) * 50);
    await reportProgress(job, progress, `Fetching metrics ${i + 1}/${variations.length}...`);

    // Skip if recently fetched (within 1 hour for incremental)
    if (
      syncType === 'INCREMENTAL' &&
      variation.analytics?.lastFetched &&
      Date.now() - variation.analytics.lastFetched.getTime() < 60 * 60 * 1000
    ) {
      continue;
    }

    // Fetch metrics from platform
    const result = await fetchPlatformMetrics(
      platform,
      account.accessToken,
      variation.postId!
    );

    // Handle rate limiting (T039)
    if (result.rateLimitInfo?.isLimited) {
      updateRateLimitState(platform, socialAccountId, true, result.rateLimitInfo.retryAfterMs);
      rateLimited = true;
      break;
    }

    // Handle auth errors (T040)
    if (result.requiresReauth) {
      await markAccountAsExpired(socialAccountId, result.error || 'Auth expired');
      throw new Error(`Account requires reauthorization: ${result.error}`);
    }

    if (!result.success || !result.data) {
      logger.warn(COMPONENT, `Failed to fetch metrics for post ${variation.postId}`, {
        error: result.error,
      });
      continue;
    }

    // Update rate limit state on success
    updateRateLimitState(platform, socialAccountId, false);

    const metrics = result.data;
    const contentAnalysis = analyzeContent(variation.text);

    // Calculate engagement
    const engagements = metrics.likes + metrics.comments + metrics.shares + (metrics.clicks || 0);
    const engagementRate = metrics.impressions > 0 ? (engagements / metrics.impressions) * 100 : 0;

    // Track totals
    totalImpressions += metrics.impressions;
    totalEngagements += engagements;

    // Get publish time info
    const publishedAt = variation.publishedAt || new Date();
    const dayOfWeek = publishedAt.getDay();
    const hourOfDay = publishedAt.getHours();

    // Create or update analytics record
    if (variation.analytics) {
      await prisma.postAnalytics.update({
        where: { id: variation.analytics.id },
        data: {
          impressions: metrics.impressions,
          reach: metrics.reach,
          engagements,
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
          orgId: account.brand.organizationId,
          variationId: variation.id,
          platform,
          accountId: socialAccountId,
          impressions: metrics.impressions,
          reach: metrics.reach,
          engagements,
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

    postsUpdated++;
    brandIds.add(variation.content.brandId);

    // Rate limit API calls (500ms between requests)
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  await reportProgress(job, 85, 'Generating learnings...');

  // Generate learnings for each brand (T041)
  let learningsGenerated = 0;
  for (const brandId of brandIds) {
    const learnings = await generateLearningsForBrand(brandId, postsUpdated);
    learningsGenerated += learnings;
  }

  // Update account last used timestamp
  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: { lastUsed: new Date() },
  });

  const avgEngagementRate = totalImpressions > 0
    ? (totalEngagements / totalImpressions) * 100
    : 0;

  const syncDurationMs = Date.now() - startTime;

  logger.info(COMPONENT, `Analytics sync completed for ${socialAccountId}`, {
    postsUpdated,
    totalImpressions,
    totalEngagements,
    avgEngagementRate: avgEngagementRate.toFixed(2),
    learningsGenerated,
    syncDurationMs,
    rateLimited,
  });

  return {
    postsUpdated,
    metrics: {
      totalImpressions,
      totalEngagements,
      avgEngagementRate,
    },
    learningsGenerated,
    syncDurationMs,
    rateLimited,
  };
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * Analytics collector processor for SYNC_ANALYTICS jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const analyticsCollectorProcessor = createProcessor<
  AnalyticsSyncPayload,
  AnalyticsSyncResult
>(JobType.SYNC_ANALYTICS, syncAnalytics);

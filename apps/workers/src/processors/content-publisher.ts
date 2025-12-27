/**
 * Content Publisher Processor
 *
 * Handles PUBLISH_CONTENT jobs by posting content to social platforms.
 *
 * Implements:
 * - T044: Post content to Twitter, LinkedIn, Meta
 * - Store post IDs for analytics tracking
 * - Handle platform-specific formatting
 *
 * @module processors/content-publisher
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import {
  JobType,
  type ContentPublishingPayload,
  type ContentPublishingResult,
  type SocialPlatform,
} from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'ContentPublisher';

/**
 * Platform-specific character limits
 */
const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
};

/**
 * Publishes content to a social platform
 */
async function publishContent(
  job: Job<JobData<ContentPublishingPayload>>
): Promise<ContentPublishingResult> {
  const startTime = Date.now();
  const { contentVariationId, socialAccountId, platform } = job.data.payload;

  logger.info(COMPONENT, `Starting content publication`, {
    contentVariationId,
    socialAccountId,
    platform,
  });

  try {
    await reportProgress(job, 10, 'Fetching content and account details...');

    // Get content variation with content item
    const variation = await prisma.contentVariation.findUnique({
      where: { id: contentVariationId },
      include: {
        content: true, // ContentItem relation
      },
    });

    if (!variation) {
      throw new Error(`Content variation not found: ${contentVariationId}`);
    }

    // Get social account
    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: {
        id: true,
        platform: true,
        accessToken: true,
        platformId: true,
        username: true,
        status: true,
        brandId: true,
      },
    });

    if (!account) {
      throw new Error(`Social account not found: ${socialAccountId}`);
    }

    if (account.status === 'EXPIRED') {
      throw new Error('Social account token has expired. Please reconnect the account.');
    }

    // Validate platform matches
    if (account.platform !== platform) {
      throw new Error(`Platform mismatch: account is ${account.platform}, requested ${platform}`);
    }

    // Validate we have required credentials
    if (!account.accessToken) {
      throw new Error('Social account has no access token. Please reconnect the account.');
    }

    if (!account.platformId) {
      throw new Error('Social account has no platform ID. Please reconnect the account.');
    }

    await reportProgress(job, 30, 'Preparing content...');

    // Prepare content with platform-specific formatting (use variation.text not .content)
    const textContent = prepareContent(variation.text, platform);

    // Validate content length
    const limit = PLATFORM_LIMITS[platform];
    if (textContent.length > limit) {
      throw new Error(`Content exceeds ${platform} limit: ${textContent.length} > ${limit}`);
    }

    await reportProgress(job, 50, `Publishing to ${platform}...`);

    // Publish to the appropriate platform
    const result = await publishToPlatform(
      platform,
      account.accessToken,
      account.platformId,
      textContent,
      variation.content?.mediaUrls as string[] | undefined
    );

    if (!result.success) {
      // Check if it's an auth error
      if (result.requiresReauth) {
        await markAccountAsExpired(socialAccountId);
      }
      throw new Error(result.error || 'Failed to publish content');
    }

    await reportProgress(job, 80, 'Updating records...');

    // Update the variation with post details
    await prisma.contentVariation.update({
      where: { id: contentVariationId },
      data: {
        publishedAt: new Date(),
        postId: result.postId,
        postUrl: result.permalink,
      },
    });

    // Get orgId from brand for analytics record
    const brand = await prisma.brand.findUnique({
      where: { id: account.brandId },
      select: { organizationId: true },
    });

    const publishedAt = new Date();
    if (brand?.organizationId) {
      // Create post analytics record for tracking
      await prisma.postAnalytics.create({
        data: {
          orgId: brand.organizationId,
          variationId: contentVariationId,
          platform,
          accountId: socialAccountId,
          publishedAt,
          dayOfWeek: publishedAt.getDay(),
          hourOfDay: publishedAt.getHours(),
          impressions: 0,
          reach: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
          engagementRate: 0,
        },
      });
    }

    await reportProgress(job, 100, 'Publication complete');

    const durationMs = Date.now() - startTime;

    logger.info(COMPONENT, `Content published successfully`, {
      contentVariationId,
      platform,
      postId: result.postId,
      permalink: result.permalink,
      durationMs,
    });

    return {
      postId: result.postId,
      publishedAt: new Date(),
      permalink: result.permalink,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(COMPONENT, `Content publication failed`, {
      contentVariationId,
      socialAccountId,
      platform,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Prepares content with platform-specific formatting
 */
function prepareContent(content: string, platform: SocialPlatform): string {
  switch (platform) {
    case 'TWITTER':
      // Twitter: Keep concise, optimize hashtags
      return content.trim();

    case 'LINKEDIN':
      // LinkedIn: Professional formatting, can use line breaks
      return content
        .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
        .trim();

    case 'FACEBOOK':
      // Facebook: Casual, can use emojis and formatting
      return content.trim();

    case 'INSTAGRAM':
      // Instagram: Caption with hashtags at the end
      return content.trim();

    default:
      return content.trim();
  }
}

/**
 * Publishes content to the specified platform
 */
async function publishToPlatform(
  platform: SocialPlatform,
  accessToken: string,
  platformUserId: string,
  content: string,
  mediaUrls?: string[]
): Promise<{
  success: boolean;
  postId: string;
  permalink: string;
  error?: string;
  requiresReauth?: boolean;
}> {
  switch (platform) {
    case 'TWITTER':
      return await publishToTwitter(accessToken, content, mediaUrls);
    case 'LINKEDIN':
      return await publishToLinkedIn(accessToken, platformUserId, content, mediaUrls);
    case 'FACEBOOK':
      return await publishToFacebook(accessToken, platformUserId, content, mediaUrls);
    case 'INSTAGRAM':
      return await publishToInstagram(accessToken, platformUserId, content, mediaUrls);
    default:
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `Unsupported platform: ${platform}`,
      };
  }
}

/**
 * Publish to Twitter/X
 */
async function publishToTwitter(
  accessToken: string,
  content: string,
  mediaUrls?: string[]
): Promise<{
  success: boolean;
  postId: string;
  permalink: string;
  error?: string;
  requiresReauth?: boolean;
}> {
  try {
    const body: Record<string, unknown> = { text: content };

    // Handle media if provided
    if (mediaUrls && mediaUrls.length > 0) {
      // TODO: Upload media and get media IDs
      // For now, skip media attachment
    }

    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `Twitter auth error: ${response.status}`,
        requiresReauth: true,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(COMPONENT, `Twitter publish failed: ${response.status}`, { errorText });
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `Twitter API error: ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      data?: { id?: string };
    };

    const postId = data.data?.id || '';
    const permalink = postId ? `https://twitter.com/i/status/${postId}` : '';

    return {
      success: true,
      postId,
      permalink,
    };
  } catch (error) {
    return {
      success: false,
      postId: '',
      permalink: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish to LinkedIn
 */
async function publishToLinkedIn(
  accessToken: string,
  platformUserId: string,
  content: string,
  mediaUrls?: string[]
): Promise<{
  success: boolean;
  postId: string;
  permalink: string;
  error?: string;
  requiresReauth?: boolean;
}> {
  try {
    const authorUrn = platformUserId.startsWith('urn:')
      ? platformUserId
      : `urn:li:person:${platformUserId}`;

    const body: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `LinkedIn auth error: ${response.status}`,
        requiresReauth: true,
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(COMPONENT, `LinkedIn publish failed: ${response.status}`, { errorText });
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `LinkedIn API error: ${response.status}`,
      };
    }

    // LinkedIn returns the post URN in the header
    const postUrn = response.headers.get('x-restli-id') || '';
    const postId = postUrn.replace('urn:li:share:', '');
    const permalink = postId
      ? `https://www.linkedin.com/feed/update/${postUrn}`
      : '';

    return {
      success: true,
      postId: postUrn,
      permalink,
    };
  } catch (error) {
    return {
      success: false,
      postId: '',
      permalink: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish to Facebook
 */
async function publishToFacebook(
  accessToken: string,
  pageId: string,
  content: string,
  mediaUrls?: string[]
): Promise<{
  success: boolean;
  postId: string;
  permalink: string;
  error?: string;
  requiresReauth?: boolean;
}> {
  try {
    const url = new URL(`https://graph.facebook.com/v18.0/${pageId}/feed`);

    const body = new URLSearchParams({
      message: content,
      access_token: accessToken,
    });

    // Add link if media URLs are provided
    if (mediaUrls && mediaUrls.length > 0) {
      body.set('link', mediaUrls[0]);
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = (await response.json()) as {
      id?: string;
      error?: { code?: number; message?: string };
    };

    if (data.error) {
      const requiresReauth =
        response.status === 401 ||
        data.error.code === 190 ||
        data.error.code === 102;

      return {
        success: false,
        postId: '',
        permalink: '',
        error: data.error.message || 'Facebook API error',
        requiresReauth,
      };
    }

    if (!response.ok || !data.id) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: `Facebook API error: ${response.status}`,
      };
    }

    const postId = data.id;
    const permalink = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

    return {
      success: true,
      postId,
      permalink,
    };
  } catch (error) {
    return {
      success: false,
      postId: '',
      permalink: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Publish to Instagram
 * Note: Instagram requires a two-step process for media posts
 */
async function publishToInstagram(
  accessToken: string,
  accountId: string,
  content: string,
  mediaUrls?: string[]
): Promise<{
  success: boolean;
  postId: string;
  permalink: string;
  error?: string;
  requiresReauth?: boolean;
}> {
  try {
    // Instagram requires media - can't post text-only
    if (!mediaUrls || mediaUrls.length === 0) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: 'Instagram requires at least one image to post',
      };
    }

    // Step 1: Create media container
    const createUrl = `https://graph.facebook.com/v18.0/${accountId}/media`;
    const createResponse = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image_url: mediaUrls[0],
        caption: content,
        access_token: accessToken,
      }).toString(),
    });

    const createData = (await createResponse.json()) as {
      id?: string;
      error?: { code?: number; message?: string };
    };

    if (createData.error) {
      const requiresReauth =
        createResponse.status === 401 ||
        createData.error.code === 190 ||
        createData.error.code === 102;

      return {
        success: false,
        postId: '',
        permalink: '',
        error: createData.error.message || 'Instagram container creation failed',
        requiresReauth,
      };
    }

    if (!createData.id) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: 'Failed to create Instagram media container',
      };
    }

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v18.0/${accountId}/media_publish`;
    const publishResponse = await fetch(publishUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: createData.id,
        access_token: accessToken,
      }).toString(),
    });

    const publishData = (await publishResponse.json()) as {
      id?: string;
      error?: { code?: number; message?: string };
    };

    if (publishData.error || !publishData.id) {
      return {
        success: false,
        postId: '',
        permalink: '',
        error: publishData.error?.message || 'Instagram publish failed',
      };
    }

    const postId = publishData.id;
    const permalink = `https://www.instagram.com/p/${postId}/`;

    return {
      success: true,
      postId,
      permalink,
    };
  } catch (error) {
    return {
      success: false,
      postId: '',
      permalink: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Marks a social account as expired
 */
async function markAccountAsExpired(socialAccountId: string): Promise<void> {
  try {
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: { status: 'EXPIRED' },
    });
    logger.info(COMPONENT, `Marked account ${socialAccountId} as EXPIRED`);
  } catch (err) {
    logger.error(COMPONENT, `Failed to mark account as expired: ${socialAccountId}`, {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * Content publisher processor for PUBLISH_CONTENT jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const contentPublisherProcessor = createProcessor<
  ContentPublishingPayload,
  ContentPublishingResult
>(JobType.PUBLISH_CONTENT, publishContent);

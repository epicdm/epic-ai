/**
 * Publishing Scheduler - Handles scheduled content publishing
 *
 * Features:
 * - Scheduled publishing via cron
 * - Rate limiting per platform
 * - Retry logic for failed posts
 * - Auto-scheduling with optimal times
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, ContentVariation, SocialAccount } from '@prisma/client';

// Platform rate limits (posts per hour)
const RATE_LIMITS: Record<string, number> = {
  TWITTER: 50,
  LINKEDIN: 100,
  FACEBOOK: 200,
  INSTAGRAM: 25,
  TIKTOK: 30,
  YOUTUBE: 10,
  THREADS: 50,
  BLUESKY: 50,
};

// In-memory rate limit tracking (resets on restart)
const recentPosts: Map<string, { count: number; resetAt: Date }> = new Map();

/**
 * Check if we're within rate limits
 */
function checkRateLimit(orgId: string, platform: string): boolean {
  const key = `${orgId}:${platform}`;
  const limit = RATE_LIMITS[platform] || 50;
  const now = new Date();

  const record = recentPosts.get(key);

  if (!record || record.resetAt < now) {
    recentPosts.set(key, {
      count: 1,
      resetAt: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
    });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Get optimal posting times for a platform
 */
export function getOptimalTimes(platform: string): string[] {
  const optimalTimes: Record<string, string[]> = {
    TWITTER: ['09:00', '12:00', '17:00', '20:00'],
    LINKEDIN: ['08:00', '10:00', '12:00', '17:00'],
    FACEBOOK: ['09:00', '13:00', '16:00', '20:00'],
    INSTAGRAM: ['11:00', '14:00', '19:00', '21:00'],
    TIKTOK: ['10:00', '14:00', '19:00', '22:00'],
    YOUTUBE: ['09:00', '12:00', '15:00', '18:00'],
    THREADS: ['09:00', '12:00', '17:00'],
    BLUESKY: ['09:00', '12:00', '17:00'],
  };

  return optimalTimes[platform] || ['09:00', '12:00', '17:00'];
}

interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Publish a single variation
 */
async function publishVariation(
  variation: ContentVariation & { account: SocialAccount | null }
): Promise<PublishResult> {
  if (!variation.account) {
    return { success: false, error: 'No account assigned' };
  }

  // Update variation status to publishing
  await prisma.contentVariation.update({
    where: { id: variation.id },
    data: { status: 'PUBLISHING' },
  });

  try {
    // Import platform clients dynamically
    const { TwitterClient } = await import('../social-publishing/clients/twitter');
    const { LinkedInClient } = await import('../social-publishing/clients/linkedin');
    const { MetaClient } = await import('../social-publishing/clients/meta');

    const tokens = {
      accessToken: variation.account.accessToken,
      refreshToken: variation.account.refreshToken || undefined,
      expiresAt: variation.account.tokenExpires || undefined,
    };

    const content = variation.text;
    const mediaUrls = variation.mediaUrl ? [variation.mediaUrl] : undefined;

    let result: PublishResult;

    switch (variation.platform) {
      case 'TWITTER': {
        const client = new TwitterClient(tokens);
        const res = await client.publish({ content, mediaUrls });
        result = { success: res.success, postId: res.postId, postUrl: res.postUrl, error: res.error };
        break;
      }

      case 'LINKEDIN': {
        const client = new LinkedInClient(tokens);
        const res = await client.publish({ content, mediaUrls });
        result = { success: res.success, postId: res.postId, postUrl: res.postUrl, error: res.error };
        break;
      }

      case 'FACEBOOK': {
        const client = new MetaClient(tokens, 'FACEBOOK');
        const res = await client.publish({ content, mediaUrls });
        result = { success: res.success, postId: res.postId, postUrl: res.postUrl, error: res.error };
        break;
      }

      case 'INSTAGRAM': {
        const client = new MetaClient(tokens, 'INSTAGRAM');
        const res = await client.publish({ content, mediaUrls, mediaType: 'image' });
        result = { success: res.success, postId: res.postId, postUrl: res.postUrl, error: res.error };
        break;
      }

      default:
        result = { success: false, error: `Unsupported platform: ${variation.platform}` };
    }

    // Update variation with result
    await prisma.contentVariation.update({
      where: { id: variation.id },
      data: {
        status: result.success ? 'PUBLISHED' : 'FAILED',
        postId: result.postId,
        postUrl: result.postUrl,
        publishedAt: result.success ? new Date() : undefined,
        error: result.error,
      },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.contentVariation.update({
      where: { id: variation.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    });

    return { success: false, error: errorMessage };
  }
}

/**
 * Process scheduled content
 * This should be called by a cron job every minute
 */
export async function processScheduledContent(): Promise<{
  processed: number;
  published: number;
  failed: number;
  rateLimited: number;
}> {
  const now = new Date();
  const stats = { processed: 0, published: 0, failed: 0, rateLimited: 0 };

  try {
    // Find all scheduled content that's due
    const dueContent = await prisma.contentItem.findMany({
      where: {
        status: 'SCHEDULED',
        approvalStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
        scheduledFor: { lte: now },
      },
      include: {
        brand: {
          include: { organization: true },
        },
        contentVariations: {
          where: {
            status: { in: ['APPROVED', 'SCHEDULED'] },
            accountId: { not: null },
          },
          include: {
            account: true,
          },
        },
      },
    });

    for (const content of dueContent) {
      stats.processed++;
      const orgId = content.brand.organizationId;

      // Update content status to publishing
      await prisma.contentItem.update({
        where: { id: content.id },
        data: { status: 'PUBLISHING' },
      });

      let anyPublished = false;
      let allDone = true;

      for (const variation of content.contentVariations) {
        if (!variation.account) continue;

        // Check rate limit
        if (!checkRateLimit(orgId, variation.platform)) {
          stats.rateLimited++;

          // Log rate limit
          await prisma.publishingLog.create({
            data: {
              orgId,
              variationId: variation.id,
              contentId: content.id,
              platform: variation.platform,
              accountId: variation.accountId,
              status: 'RATE_LIMITED',
              scheduledFor: content.scheduledFor,
              errorMessage: 'Rate limit exceeded, will retry',
              nextRetryAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 min
            },
          });

          // Update variation for retry
          await prisma.contentVariation.update({
            where: { id: variation.id },
            data: { status: 'SCHEDULED' },
          });

          allDone = false;
          continue;
        }

        // Publish the variation
        const result = await publishVariation(variation);

        // Log the attempt
        await prisma.publishingLog.create({
          data: {
            orgId,
            variationId: variation.id,
            contentId: content.id,
            platform: variation.platform,
            accountId: variation.accountId,
            status: result.success ? 'SUCCESS' : 'FAILED',
            platformPostId: result.postId,
            platformUrl: result.postUrl,
            scheduledFor: content.scheduledFor,
            errorMessage: result.error,
            completedAt: result.success ? new Date() : null,
          },
        });

        if (result.success) {
          anyPublished = true;
          stats.published++;
        } else {
          stats.failed++;
        }
      }

      // Update content final status
      const finalStatus = anyPublished
        ? 'PUBLISHED'
        : allDone
        ? 'FAILED'
        : 'SCHEDULED'; // Still has pending rate-limited items

      await prisma.contentItem.update({
        where: { id: content.id },
        data: {
          status: finalStatus,
          publishedAt: anyPublished ? new Date() : undefined,
        },
      });
    }

    // Process retries for rate-limited content
    await processRetries();

    return stats;
  } catch (error) {
    console.error('Error processing scheduled content:', error);
    return stats;
  }
}

/**
 * Process failed content that needs retry
 */
async function processRetries(): Promise<void> {
  const now = new Date();

  // Find logs that need retry
  const retryLogs = await prisma.publishingLog.findMany({
    where: {
      status: { in: ['RATE_LIMITED', 'FAILED'] },
      nextRetryAt: { lte: now },
      attemptNumber: { lt: 3 }, // Max 3 attempts
    },
    orderBy: { nextRetryAt: 'asc' },
    take: 10,
  });

  for (const log of retryLogs) {
    if (!log.variationId) continue;

    const variation = await prisma.contentVariation.findUnique({
      where: { id: log.variationId },
      include: {
        account: true,
        content: {
          include: {
            brand: { include: { organization: true } },
          },
        },
      },
    });

    if (!variation || !variation.account) continue;
    if (variation.status === 'PUBLISHED') continue;

    const orgId = variation.content.brand.organizationId;

    // Check rate limit
    if (!checkRateLimit(orgId, variation.platform)) {
      // Still rate limited, schedule another retry
      await prisma.publishingLog.update({
        where: { id: log.id },
        data: {
          attemptNumber: log.attemptNumber + 1,
          nextRetryAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 min
        },
      });
      continue;
    }

    // Try to publish again
    const result = await publishVariation(variation);

    // Update log
    await prisma.publishingLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SUCCESS' : 'FAILED',
        platformPostId: result.postId,
        platformUrl: result.postUrl,
        errorMessage: result.error,
        completedAt: result.success ? new Date() : null,
        attemptNumber: log.attemptNumber + 1,
        nextRetryAt: result.success
          ? null
          : log.attemptNumber >= 2
          ? null // No more retries
          : new Date(now.getTime() + 60 * 60 * 1000), // 1 hour
      },
    });
  }
}

/**
 * Auto-schedule content for the next week
 */
export async function autoScheduleContent(
  orgId: string,
  brandId: string,
  contentIds: string[],
  options?: {
    startDate?: Date;
    spreadAcrossDays?: boolean;
  }
): Promise<{ scheduled: number; dates: Date[] }> {
  const { startDate = new Date(), spreadAcrossDays = true } = options || {};
  const scheduledDates: Date[] = [];
  let scheduled = 0;

  // Get org's publishing schedules
  const schedules = await prisma.publishingSchedule.findMany({
    where: { orgId, isActive: true },
  });

  // Get existing scheduled content to avoid conflicts
  const existingScheduled = await prisma.contentItem.findMany({
    where: {
      brandId,
      status: 'SCHEDULED',
      scheduledFor: {
        gte: startDate,
        lte: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    select: { scheduledFor: true },
  });

  const existingTimes = new Set(
    existingScheduled.map((c) => c.scheduledFor?.toISOString())
  );

  // Generate available slots for the next week
  const slots: Date[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  for (let day = 0; day < 7; day++) {
    const dayOfWeek = currentDate.getDay();

    // Find applicable schedule for this day
    for (const schedule of schedules) {
      if (!schedule.activeDays.includes(dayOfWeek)) continue;

      for (const time of schedule.postingTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        const slotDate = new Date(currentDate);
        slotDate.setHours(hours, minutes, 0, 0);

        // Skip if in the past or already scheduled
        if (slotDate > startDate && !existingTimes.has(slotDate.toISOString())) {
          slots.push(slotDate);
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // If no schedules exist, use default optimal times
  if (slots.length === 0) {
    const defaultTimes = ['09:00', '12:00', '17:00'];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    for (let day = 0; day < 7; day++) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Skip weekends
        for (const time of defaultTimes) {
          const [hours, minutes] = time.split(':').map(Number);
          const slotDate = new Date(currentDate);
          slotDate.setHours(hours, minutes, 0, 0);
          if (slotDate > startDate) {
            slots.push(slotDate);
          }
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // Sort slots chronologically
  slots.sort((a, b) => a.getTime() - b.getTime());

  // Assign content to slots
  for (let i = 0; i < contentIds.length && i < slots.length; i++) {
    const contentId = contentIds[i];
    const slot = spreadAcrossDays ? slots[i] : slots[i % Math.min(3, slots.length)];

    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        scheduledFor: slot,
        status: 'SCHEDULED',
      },
    });

    // Also update variations
    await prisma.contentVariation.updateMany({
      where: {
        contentId,
        status: { in: ['PENDING', 'APPROVED'] },
      },
      data: { status: 'SCHEDULED' },
    });

    scheduledDates.push(slot);
    scheduled++;
  }

  return { scheduled, dates: scheduledDates };
}

/**
 * Get publishing stats for an organization
 */
export async function getPublishingStats(
  orgId: string,
  days: number = 7
): Promise<{
  total: number;
  success: number;
  failed: number;
  rateLimited: number;
  byPlatform: Record<string, { success: number; failed: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const logs = await prisma.publishingLog.findMany({
    where: {
      orgId,
      attemptedAt: { gte: startDate },
    },
  });

  const stats = {
    total: logs.length,
    success: 0,
    failed: 0,
    rateLimited: 0,
    byPlatform: {} as Record<string, { success: number; failed: number }>,
  };

  for (const log of logs) {
    if (log.status === 'SUCCESS') stats.success++;
    if (log.status === 'FAILED') stats.failed++;
    if (log.status === 'RATE_LIMITED') stats.rateLimited++;

    if (!stats.byPlatform[log.platform]) {
      stats.byPlatform[log.platform] = { success: 0, failed: 0 };
    }
    if (log.status === 'SUCCESS') stats.byPlatform[log.platform].success++;
    if (log.status === 'FAILED') stats.byPlatform[log.platform].failed++;
  }

  return stats;
}

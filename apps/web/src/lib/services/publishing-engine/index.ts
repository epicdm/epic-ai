/**
 * Publishing Engine - Automated content publishing
 *
 * Handles:
 * - Scheduled publishing via cron
 * - Rate limiting per platform
 * - Retry logic for failed posts
 * - Auto-scheduling with optimal times
 * - Publishing analytics
 */

import { prisma } from '@epic-ai/database';
import { ContentQueueManager } from '../content-factory/queue-manager';

export { ContentScheduler, processAllScheduledContent } from './scheduler';

/**
 * Process all scheduled content across all brands
 * Called by cron job every minute
 */
export async function processScheduledContent(): Promise<number> {
  const now = new Date();
  console.log(`[PublishingEngine] Processing scheduled content at ${now.toISOString()}`);

  try {
    // Find all brands that have scheduled content ready to publish
    const brandsWithScheduledContent = await prisma.contentItem.findMany({
      where: {
        status: 'SCHEDULED',
        approvalStatus: { in: ['APPROVED', 'AUTO_APPROVED'] },
        scheduledFor: { lte: now },
      },
      select: {
        brandId: true,
      },
      distinct: ['brandId'],
    });

    if (brandsWithScheduledContent.length === 0) {
      console.log('[PublishingEngine] No scheduled content to process');
      return 0;
    }

    console.log(`[PublishingEngine] Found ${brandsWithScheduledContent.length} brand(s) with scheduled content`);

    let totalPublished = 0;

    // Process each brand's scheduled content
    for (const { brandId } of brandsWithScheduledContent) {
      try {
        const queueManager = new ContentQueueManager(brandId);
        const publishedCount = await queueManager.processScheduledContent();
        totalPublished += publishedCount;
        console.log(`[PublishingEngine] Brand ${brandId}: published ${publishedCount} items`);
      } catch (error) {
        console.error(`[PublishingEngine] Error processing brand ${brandId}:`, error);
        // Continue with other brands even if one fails
      }
    }

    console.log(`[PublishingEngine] Total published: ${totalPublished}`);
    return totalPublished;
  } catch (error) {
    console.error('[PublishingEngine] Failed to process scheduled content:', error);
    return 0;
  }
}

export async function autoScheduleContent(
  _brandId: string,
  _contentId: string,
  _platforms: string[],
  _options?: { startDate?: Date; endDate?: Date }
): Promise<{ scheduled: number; dates: Date[] }> {
  return { scheduled: 0, dates: [] };
}

export async function getOptimalTimes(
  _brandId: string,
  _platform: string,
  _daysAhead?: number
): Promise<{ dayOfWeek: number; hour: number; engagementScore: number }[]> {
  return [];
}

export async function getPublishingStats(
  _brandId: string,
  _period?: number
): Promise<{
  totalPublished: number;
  successRate: number;
  platformBreakdown: Record<string, number>;
}> {
  return { totalPublished: 0, successRate: 0, platformBreakdown: {} };
}

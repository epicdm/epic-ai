/**
 * Cron Job: Generate Content
 * Runs every 4 hours to generate content for brands with autopilot enabled
 *
 * Schedule: 0 *\/4 * * * (every 4 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { ContentScheduler } from '@/lib/services/content-factory/scheduler';

// Verify cron secret
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured');
    return process.env.NODE_ENV === 'development';
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: {
    brandId: string;
    brandName: string;
    contentGenerated: number;
    error?: string;
  }[] = [];

  try {
    // Get brands with autopilot enabled that need content
    const brandsNeedingContent = await prisma.brand.findMany({
      where: {
        autopilotConfig: {
          enabled: true,
        },
      },
      include: {
        autopilotConfig: true,
        contentQueue: {
          where: {
            status: { in: ['DRAFT', 'PENDING', 'SCHEDULED'] },
            scheduledFor: { gt: new Date() },
          },
        },
      },
    });

    console.log(`[Cron] Checking ${brandsNeedingContent.length} brands for content generation`);

    for (const brand of brandsNeedingContent) {
      // Calculate how many posts are already scheduled
      const scheduledCount = brand.contentQueue.length;
      const postsPerWeek = brand.autopilotConfig?.postsPerWeek || 7;

      // If we have less than a week's worth scheduled, generate more
      if (scheduledCount < postsPerWeek) {
        try {
          const scheduler = new ContentScheduler(brand.id);
          const contentIds = await scheduler.generateWeeklyContent();

          results.push({
            brandId: brand.id,
            brandName: brand.name,
            contentGenerated: contentIds.length,
          });

          console.log(`[Cron] Generated ${contentIds.length} posts for "${brand.name}"`);
        } catch (error) {
          console.error(`[Cron] Failed to generate for "${brand.name}":`, error);
          results.push({
            brandId: brand.id,
            brandName: brand.name,
            contentGenerated: 0,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        console.log(`[Cron] Brand "${brand.name}" has ${scheduledCount} posts scheduled, skipping`);
      }
    }

    const duration = Date.now() - startTime;
    const totalGenerated = results.reduce((sum, r) => sum + r.contentGenerated, 0);

    console.log(`[Cron] Content generation completed in ${duration}ms: ${totalGenerated} posts created`);

    return NextResponse.json({
      success: true,
      duration,
      brandsProcessed: brandsNeedingContent.length,
      totalGenerated,
      results,
    });
  } catch (error) {
    console.error('[Cron] Content generation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

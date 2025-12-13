/**
 * Cron Job: Sync Analytics
 * Runs every 6 hours to sync performance metrics and update learnings
 *
 * Schedule: 0 *\/6 * * * (every 6 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { SocialMetricsCollector, FeedbackLoop } from '@/lib/services/analytics';

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
    metricsUpdated: number;
    learningsUpdated: boolean;
    error?: string;
  }[] = [];

  try {
    // Get all brands with published content
    const brands = await prisma.brand.findMany({
      where: {
        contentQueue: {
          some: {
            status: 'PUBLISHED',
            publishedAt: {
              // Only sync content from last 30 days
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      include: {
        socialAccounts: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    console.log(`[Cron] Syncing analytics for ${brands.length} brands`);

    const collector = new SocialMetricsCollector();

    for (const brand of brands) {
      let metricsUpdated = 0;
      let learningsUpdated = false;

      try {
        // Get published content needing metrics update
        const content = await prisma.contentItem.findMany({
          where: {
            brandId: brand.id,
            status: 'PUBLISHED',
            publishedAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            publishResults: {
              where: { status: 'SUCCESS' },
            },
          },
        });

        // Collect metrics for each published post
        for (const item of content) {
          for (const result of item.publishResults) {
            if (!result.platformPostId) continue;

            const account = brand.socialAccounts.find(
              (a) => a.platform === result.platform
            );

            if (!account) continue;

            const metrics = await collector.fetchMetrics(
              result.platformPostId,
              result.platform,
              account
            );

            if (metrics) {
              // Upsert analytics
              await prisma.contentAnalytics.upsert({
                where: {
                  id: `${item.id}-${result.platform}`,
                },
                create: {
                  id: `${item.id}-${result.platform}`,
                  brandId: brand.id,
                  contentId: item.id,
                  platform: result.platform,
                  impressions: metrics.impressions,
                  reach: metrics.reach || 0,
                  likes: metrics.likes,
                  comments: metrics.comments,
                  shares: metrics.shares,
                  saves: metrics.saves || 0,
                  clicks: metrics.clicks || 0,
                  engagementRate: metrics.engagementRate,
                  videoViews: metrics.videoViews,
                },
                update: {
                  impressions: metrics.impressions,
                  reach: metrics.reach || 0,
                  likes: metrics.likes,
                  comments: metrics.comments,
                  shares: metrics.shares,
                  saves: metrics.saves || 0,
                  clicks: metrics.clicks || 0,
                  engagementRate: metrics.engagementRate,
                  videoViews: metrics.videoViews,
                  recordedAt: new Date(),
                },
              });

              metricsUpdated++;
            }
          }
        }

        // Update learnings if we have enough data
        if (metricsUpdated >= 10) {
          try {
            const feedbackLoop = new FeedbackLoop(brand.id);
            await feedbackLoop.updateBrandBrainWithLearnings();
            learningsUpdated = true;
            console.log(`[Cron] Updated learnings for "${brand.name}"`);
          } catch (error) {
            console.error(`[Cron] Failed to update learnings for "${brand.name}":`, error);
          }
        }

        results.push({
          brandId: brand.id,
          brandName: brand.name,
          metricsUpdated,
          learningsUpdated,
        });

        console.log(
          `[Cron] Synced ${metricsUpdated} metrics for "${brand.name}"`
        );
      } catch (error) {
        console.error(`[Cron] Failed to sync analytics for "${brand.name}":`, error);
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          metricsUpdated: 0,
          learningsUpdated: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalMetrics = results.reduce((sum, r) => sum + r.metricsUpdated, 0);
    const totalLearnings = results.filter((r) => r.learningsUpdated).length;

    console.log(
      `[Cron] Analytics sync completed in ${duration}ms: ` +
        `${totalMetrics} metrics, ${totalLearnings} learnings updated`
    );

    return NextResponse.json({
      success: true,
      duration,
      brandsProcessed: brands.length,
      totalMetricsUpdated: totalMetrics,
      totalLearningsUpdated: totalLearnings,
      results,
    });
  } catch (error) {
    console.error('[Cron] Analytics sync failed:', error);
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

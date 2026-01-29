/**
 * Cron Job: Scrape Context
 * Runs daily to refresh all active context sources
 *
 * Schedule: 0 2 * * * (2 AM UTC daily)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { ContextManager } from '@/lib/services/context-engine/manager';

// Verify cron secret to prevent unauthorized access
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
  // Verify this is a legitimate cron request
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: {
    brandId: string;
    brandName: string;
    sourcesTotal: number;
    sourcesSuccessful: number;
    sourcesFailed: number;
  }[] = [];

  try {
    // Get all brands with active autopilot
    const brands = await prisma.brand.findMany({
      where: {
        autopilotConfig: {
          enabled: true,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`[Cron] Starting context sync for ${brands.length} brands`);

    for (const brand of brands) {
      try {
        const manager = new ContextManager(brand.id);
        const syncResult = await manager.syncAllSources();

        results.push({
          brandId: brand.id,
          brandName: brand.name,
          sourcesTotal: syncResult.total,
          sourcesSuccessful: syncResult.successful,
          sourcesFailed: syncResult.failed,
        });

        console.log(
          `[Cron] Brand "${brand.name}": ${syncResult.successful}/${syncResult.total} sources synced`
        );
      } catch (error) {
        console.error(`[Cron] Failed to sync brand "${brand.name}":`, error);
        results.push({
          brandId: brand.id,
          brandName: brand.name,
          sourcesTotal: 0,
          sourcesSuccessful: 0,
          sourcesFailed: 1,
        });
      }
    }

    const duration = Date.now() - startTime;
    const totalSources = results.reduce((sum, r) => sum + r.sourcesTotal, 0);
    const successfulSources = results.reduce((sum, r) => sum + r.sourcesSuccessful, 0);

    console.log(
      `[Cron] Context sync completed in ${duration}ms: ${successfulSources}/${totalSources} sources`
    );

    return NextResponse.json({
      success: true,
      duration,
      brandsProcessed: brands.length,
      totalSources,
      successfulSources,
      results,
    });
  } catch (error) {
    console.error('[Cron] Context sync failed:', error);
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

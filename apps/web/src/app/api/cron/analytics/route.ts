/**
 * Analytics Cron Job - PKG-025
 *
 * Runs hourly to:
 * 1. Collect metrics from platform APIs
 * 2. Generate analytics snapshots
 * 3. Generate AI learnings (once daily at midnight UTC)
 *
 * Schedule: 0 * * * * (every hour)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { collectAllMetrics } from '@/lib/services/analytics/metrics-collector';
import { generateSnapshots } from '@/lib/services/analytics/aggregator';
import { processAllLearnings } from '@/lib/services/analytics/learning-generator';

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
  // Allow in development without auth
  if (process.env.NODE_ENV !== 'development' && !verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const now = new Date();

  try {
    // Step 1: Collect metrics from platform APIs
    console.log('[Analytics Cron] Collecting metrics...');
    const metricsResult = await collectAllMetrics();

    // Step 2: Generate snapshots for all orgs
    console.log('[Analytics Cron] Generating snapshots...');
    const orgs = await prisma.organization.findMany({
      select: { id: true },
    });

    let snapshotsGenerated = 0;
    for (const org of orgs) {
      try {
        await generateSnapshots(org.id);
        snapshotsGenerated++;
      } catch (error) {
        console.error(`[Analytics Cron] Snapshot error for org ${org.id}:`, error);
      }
    }

    // Step 3: Generate AI learnings (only once per day at midnight UTC)
    let learningsResult = { orgsProcessed: 0, totalLearnings: 0 };

    // Run learning generation at midnight UTC (hour 0)
    if (now.getUTCHours() === 0) {
      console.log('[Analytics Cron] Generating AI learnings...');
      learningsResult = await processAllLearnings();
    }

    const duration = Date.now() - startTime;

    console.log(
      `[Analytics Cron] Completed in ${duration}ms: ` +
        `metrics=${metricsResult.totalUpdated}, snapshots=${snapshotsGenerated}, ` +
        `learnings=${learningsResult.totalLearnings}`
    );

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      duration,
      metrics: metricsResult,
      snapshots: { orgsProcessed: snapshotsGenerated },
      learnings: learningsResult,
    });
  } catch (error) {
    console.error('[Analytics Cron] Failed:', error);
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

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}

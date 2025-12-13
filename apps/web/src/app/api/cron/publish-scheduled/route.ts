/**
 * Cron Job: Publish Scheduled Content - PKG-024
 * Runs every minute to publish scheduled content
 *
 * Features:
 * - Rate limiting per platform
 * - Retry logic for failed posts
 * - Publishing logs
 *
 * Schedule: * * * * * (every minute)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processScheduledContent } from '@/lib/services/publishing-engine';

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

  try {
    const publishedCount = await processScheduledContent();
    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Publishing completed in ${duration}ms: published=${publishedCount}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration,
      stats: { published: publishedCount },
    });
  } catch (error) {
    console.error('[Cron] Publishing cron failed:', error);
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

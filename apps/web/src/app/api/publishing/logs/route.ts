/**
 * Publishing Logs API - PKG-024
 * Get publishing logs and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { getPublishingStats } from '@/lib/services/publishing-engine';

/**
 * GET /api/publishing/logs
 * Get publishing logs with optional filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const platform = searchParams.get('platform');
    const status = searchParams.get('status');
    const contentId = searchParams.get('contentId');
    const days = parseInt(searchParams.get('days') || '7', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const statsOnly = searchParams.get('statsOnly') === 'true';

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Verify user has access to org
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If only stats requested
    if (statsOnly) {
      const stats = await getPublishingStats(orgId, days);
      return NextResponse.json({ stats });
    }

    // Build query filters
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereClause: any = {
      orgId,
      attemptedAt: { gte: startDate },
    };

    if (platform) {
      whereClause.platform = platform;
    }

    if (status) {
      whereClause.status = status;
    }

    if (contentId) {
      whereClause.contentId = contentId;
    }

    // Fetch logs
    const [logs, total] = await Promise.all([
      prisma.publishingLog.findMany({
        where: whereClause,
        orderBy: { attemptedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.publishingLog.count({ where: whereClause }),
    ]);

    // Get stats for the period
    const stats = await getPublishingStats(orgId, days);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      stats,
    });
  } catch (error) {
    console.error('Error fetching publishing logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

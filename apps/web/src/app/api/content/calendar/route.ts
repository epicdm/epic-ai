/**
 * Content Calendar API - PKG-024
 * Get calendar view of scheduled content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';

/**
 * GET /api/content/calendar
 * Get scheduled content for calendar view
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const brandId = searchParams.get('brandId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const view = searchParams.get('view') || 'week'; // week or month

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

    // Calculate date range
    const now = new Date();
    let start: Date;
    let end: Date;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
    } else if (view === 'month') {
      // Start of current month to end of month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else {
      // Current week (Monday to Sunday)
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      start = new Date(now);
      start.setDate(now.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    // Build query filters
    const whereClause: any = {
      brand: { organizationId: orgId },
      scheduledFor: {
        gte: start,
        lte: end,
      },
    };

    if (brandId) {
      whereClause.brandId = brandId;
    }

    // Fetch scheduled content
    const contentItems = await prisma.contentItem.findMany({
      where: whereClause,
      include: {
        brand: {
          select: { id: true, name: true },
        },
        contentVariations: {
          select: {
            id: true,
            platform: true,
            status: true,
            postId: true,
            postUrl: true,
            publishedAt: true,
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Group by date for calendar view
    const calendarData: Record<
      string,
      Array<{
        id: string;
        title: string;
        status: string;
        scheduledFor: string;
        brand: { id: string; name: string };
        platforms: string[];
        variations: Array<{
          id: string;
          platform: string;
          status: string;
          postUrl: string | null;
        }>;
      }>
    > = {};

    for (const item of contentItems) {
      const dateKey = item.scheduledFor
        ? item.scheduledFor.toISOString().split('T')[0]
        : 'unscheduled';

      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }

      calendarData[dateKey].push({
        id: item.id,
        title: item.content?.substring(0, 50) || 'Untitled',
        status: item.status,
        scheduledFor: item.scheduledFor?.toISOString() || '',
        brand: item.brand,
        platforms: [...new Set(item.contentVariations.map((v) => v.platform))],
        variations: item.contentVariations.map((v) => ({
          id: v.id,
          platform: v.platform,
          status: v.status,
          postUrl: v.postUrl,
        })),
      });
    }

    // Get stats for the period
    const stats = {
      total: contentItems.length,
      scheduled: contentItems.filter((c) => c.status === 'SCHEDULED').length,
      published: contentItems.filter((c) => c.status === 'PUBLISHED').length,
      failed: contentItems.filter((c) => c.status === 'FAILED').length,
      draft: contentItems.filter((c) => c.status === 'DRAFT').length,
    };

    return NextResponse.json({
      calendar: calendarData,
      stats,
      dateRange: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}

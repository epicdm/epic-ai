/**
 * Analytics API - PKG-025
 * Get performance metrics and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { getAnalyticsOverview } from '@/lib/services/analytics/aggregator';
import { getBrandLearnings } from '@/lib/services/analytics/learning-generator';
import type { SocialPlatform } from '@prisma/client';

/**
 * GET - Get analytics overview
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const platform = searchParams.get('platform') as SocialPlatform | null;
    const brandId = searchParams.get('brandId');

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgId = membership.organizationId;
    const days = parseInt(period);

    // Get analytics overview
    const { stats, recentPosts, trends } = await getAnalyticsOverview(
      orgId,
      days,
      platform || undefined
    );

    // Get connected accounts stats
    const accounts = await prisma.socialAccount.findMany({
      where: {
        brand: { organizationId: orgId },
        status: 'CONNECTED',
      },
      select: {
        id: true,
        platform: true,
        username: true,
        avatar: true,
        followerCount: true,
      },
    });

    // Get learnings
    let learnings: any[] = [];
    if (brandId) {
      learnings = await getBrandLearnings(brandId);
    } else {
      // Get learnings from first brand
      const brand = await prisma.brand.findFirst({
        where: { organizationId: orgId },
      });
      if (brand) {
        learnings = await getBrandLearnings(brand.id);
      }
    }

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    return NextResponse.json({
      stats,
      recentPosts,
      trends,
      accounts,
      learnings,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

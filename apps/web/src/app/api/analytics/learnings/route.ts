/**
 * Learning Data API - PKG-025
 * Get AI-learned insights for content optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { getBrandLearnings, generateLearnings } from '@/lib/services/analytics/learning-generator';

/**
 * GET - Get current learnings for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    // Verify access
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
      include: {
        brandBrain: {
          include: {
            brandLearnings: {
              where: { isActive: true },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get learnings
    const learnings = await getBrandLearnings(brandId);

    // Get best times from analytics snapshots
    const bestTimesSnapshot = await prisma.analyticsSnapshot.findFirst({
      where: {
        orgId: brand.organizationId,
        periodType: 'MONTHLY',
        bestDayOfWeek: { not: null },
        bestHourOfDay: { not: null },
      },
      orderBy: { periodStart: 'desc' },
    });

    const bestPostingTimes = bestTimesSnapshot
      ? {
          dayOfWeek: bestTimesSnapshot.bestDayOfWeek,
          hourOfDay: bestTimesSnapshot.bestHourOfDay,
          topHashtags: bestTimesSnapshot.topHashtags,
        }
      : null;

    // Get learning count by type
    const learningsByType = learnings.reduce(
      (acc, l) => {
        acc[l.type] = (acc[l.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      learnings,
      learningsByType,
      bestPostingTimes,
      totalLearnings: learnings.length,
      lastAnalyzed: brand.brandBrain?.lastAnalyzedAt,
    });
  } catch (error) {
    console.error('Error getting learnings:', error);
    return NextResponse.json(
      { error: 'Failed to get learnings' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate new learnings from analytics data
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId } = body;

    if (!brandId) {
      return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
    }

    // Verify access
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Generate new learnings
    const result = await generateLearnings(brand.organizationId);

    return NextResponse.json({
      success: true,
      generated: result.generated,
      learnings: result.learnings,
    });
  } catch (error) {
    console.error('Error generating learnings:', error);
    return NextResponse.json(
      { error: 'Failed to generate learnings' },
      { status: 500 }
    );
  }
}

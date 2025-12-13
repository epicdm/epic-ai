/**
 * Post Analytics API - PKG-025
 * Get and refresh single post analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { collectVariationMetrics } from '@/lib/services/analytics/metrics-collector';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get single post analytics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    // Get analytics for this variation
    const analytics = await prisma.postAnalytics.findFirst({
      where: {
        variationId: id,
        orgId: membership.organizationId,
      },
      include: {
        variation: {
          select: {
            id: true,
            text: true,
            platform: true,
            postUrl: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!analytics) {
      return NextResponse.json({ error: 'Analytics not found' }, { status: 404 });
    }

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Error getting post analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

/**
 * POST - Refresh post analytics
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    // Verify ownership of the variation
    const variation = await prisma.contentVariation.findFirst({
      where: {
        id,
        content: {
          brand: { organizationId: membership.organizationId },
        },
      },
    });

    if (!variation) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Collect fresh metrics
    const success = await collectVariationMetrics(id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to collect metrics' },
        { status: 500 }
      );
    }

    // Get updated analytics
    const analytics = await prisma.postAnalytics.findFirst({
      where: { variationId: id },
      include: {
        variation: {
          select: {
            id: true,
            text: true,
            platform: true,
            postUrl: true,
            publishedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ analytics, refreshed: true });
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    return NextResponse.json(
      { error: 'Failed to refresh' },
      { status: 500 }
    );
  }
}

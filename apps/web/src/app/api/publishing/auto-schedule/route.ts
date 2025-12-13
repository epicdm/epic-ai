/**
 * Auto-Schedule API - PKG-024
 * Automatically schedule content based on optimal times
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { z } from 'zod';
import { autoScheduleContent, getOptimalTimes } from '@/lib/services/publishing-engine';

const autoScheduleSchema = z.object({
  orgId: z.string(),
  brandId: z.string(),
  contentIds: z.array(z.string()).min(1),
  startDate: z.string().optional(),
  spreadAcrossDays: z.boolean().optional(),
});

/**
 * POST /api/publishing/auto-schedule
 * Auto-schedule multiple content items
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = autoScheduleSchema.parse(body);

    // Verify user has access to org
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id, organizationId: validated.orgId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify brand belongs to org
    const brand = await prisma.brand.findFirst({
      where: { id: validated.brandId, organizationId: validated.orgId },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Verify all content items exist and belong to brand
    const contentItems = await prisma.contentItem.findMany({
      where: {
        id: { in: validated.contentIds },
        brandId: validated.brandId,
      },
    });

    if (contentItems.length !== validated.contentIds.length) {
      return NextResponse.json(
        { error: 'Some content items not found' },
        { status: 404 }
      );
    }

    // Auto-schedule the content
    const result = await autoScheduleContent(
      validated.orgId,
      validated.brandId,
      validated.contentIds,
      {
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        spreadAcrossDays: validated.spreadAcrossDays,
      }
    );

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
      dates: result.dates.map((d) => d.toISOString()),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error auto-scheduling content:', error);
    return NextResponse.json(
      { error: 'Failed to auto-schedule content' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/publishing/auto-schedule
 * Get optimal posting times for a platform
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json(
        { error: 'Platform required' },
        { status: 400 }
      );
    }

    const optimalTimes = getOptimalTimes(platform);

    return NextResponse.json({ optimalTimes });
  } catch (error) {
    console.error('Error getting optimal times:', error);
    return NextResponse.json(
      { error: 'Failed to get optimal times' },
      { status: 500 }
    );
  }
}

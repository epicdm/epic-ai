/**
 * Publishing Schedule API - PKG-024
 * Manages publishing schedules per platform
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { z } from 'zod';

const scheduleSchema = z.object({
  platform: z.enum([
    'TWITTER',
    'LINKEDIN',
    'FACEBOOK',
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'THREADS',
    'BLUESKY',
  ]),
  activeDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
  postingTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).default(['09:00', '12:00', '17:00']),
  timezone: z.string().default('UTC'),
  maxPostsPerDay: z.number().min(1).max(20).default(3),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/publishing/schedule
 * Get all publishing schedules for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

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

    const schedules = await prisma.publishingSchedule.findMany({
      where: { orgId },
      orderBy: { platform: 'asc' },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error('Error fetching publishing schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/publishing/schedule
 * Create or update a publishing schedule
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, ...scheduleData } = body;

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

    const validated = scheduleSchema.parse(scheduleData);

    // Upsert the schedule (one per platform per org)
    const schedule = await prisma.publishingSchedule.upsert({
      where: {
        orgId_platform: {
          orgId,
          platform: validated.platform,
        },
      },
      update: {
        activeDays: validated.activeDays,
        postingTimes: validated.postingTimes,
        timezone: validated.timezone,
        maxPostsPerDay: validated.maxPostsPerDay,
        isActive: validated.isActive,
      },
      create: {
        orgId,
        platform: validated.platform,
        activeDays: validated.activeDays,
        postingTimes: validated.postingTimes,
        timezone: validated.timezone,
        maxPostsPerDay: validated.maxPostsPerDay,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json({ schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error saving publishing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/publishing/schedule
 * Delete a publishing schedule
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');
    const platform = searchParams.get('platform');

    if (!orgId || !platform) {
      return NextResponse.json(
        { error: 'Organization ID and platform required' },
        { status: 400 }
      );
    }

    // Verify user has access to org
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await prisma.publishingSchedule.delete({
      where: {
        orgId_platform: {
          orgId,
          platform: platform as any,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting publishing schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}

/**
 * Individual Content Item API - PKG-023
 * GET - Get a specific content item with variations
 * PUT - Update content item
 * DELETE - Delete content item
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { ContentQueueManager } from '@/lib/services/content-factory/queue-manager';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ contentId: string }>;
}

const updateContentSchema = z.object({
  content: z.string().optional(),
  category: z.string().optional(),
  scheduledFor: z.string().datetime().optional().nullable(),
});

/**
 * GET - Get a specific content item with all variations
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;

    const item = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        contentVariations: {
          include: {
            account: {
              select: {
                id: true,
                platform: true,
                username: true,
                displayName: true,
                avatar: true,
                status: true,
              },
            },
          },
        },
        publishResults: true,
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Failed to fetch content item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT - Update content item
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;
    const body = await request.json();
    const validated = updateContentSchema.parse(body);

    // Verify access
    const existing = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const item = await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        ...(validated.content && { content: validated.content }),
        ...(validated.category && { category: validated.category }),
        ...(validated.scheduledFor !== undefined && {
          scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : null,
        }),
      },
      include: {
        contentVariations: true,
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update content item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Delete content item
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;

    // Verify access
    const existing = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const queueManager = new ContentQueueManager(existing.brandId);
    await queueManager.delete(contentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete content item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

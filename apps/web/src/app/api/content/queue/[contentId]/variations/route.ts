/**
 * Content Variations API - PKG-023
 * GET - Get all variations for a content item
 * POST - Add a new variation
 * PATCH - Update a variation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { ContentQueueManager } from '@/lib/services/content-factory/queue-manager';
import { PLATFORM_LIMITS, PLATFORM_BEST_PRACTICES } from '@/lib/services/content-factory/types';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ contentId: string }>;
}

const addVariationSchema = z.object({
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY']),
  text: z.string(),
  hashtags: z.array(z.string()).optional(),
  accountId: z.string().optional(),
});

const updateVariationSchema = z.object({
  variationId: z.string(),
  text: z.string().optional(),
  accountId: z.string().optional(),
  action: z.enum(['approve', 'skip', 'update', 'assign']).optional(),
});

/**
 * GET - Get all variations for a content item
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;

    // Verify access
    const content = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const variations = await prisma.contentVariation.findMany({
      where: { contentId },
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
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ variations });
  } catch (error) {
    console.error('Failed to fetch variations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Add a new variation to content
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;
    const body = await request.json();
    const validated = addVariationSchema.parse(body);

    // Verify access
    const content = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    // Calculate if optimal for platform
    const limit = PLATFORM_LIMITS[validated.platform];
    const practices = PLATFORM_BEST_PRACTICES[validated.platform];
    const hashtags = validated.hashtags || validated.text.match(/#\w+/g) || [];
    const characterCount = validated.text.length;

    const isOptimal =
      characterCount <= (practices?.optimalLength || limit) &&
      hashtags.length <= (practices?.hashtagLimit || 10);

    const variation = await prisma.contentVariation.create({
      data: {
        contentId,
        platform: validated.platform,
        text: validated.text,
        hashtags,
        characterCount,
        isOptimal,
        status: 'PENDING',
        accountId: validated.accountId || null,
      },
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ variation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to add variation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH - Update a variation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;
    const body = await request.json();
    const validated = updateVariationSchema.parse(body);

    // Verify access
    const content = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const queueManager = new ContentQueueManager(content.brandId);

    switch (validated.action) {
      case 'approve':
        await queueManager.approveVariation(validated.variationId);
        break;

      case 'skip':
        await queueManager.skipVariation(validated.variationId);
        break;

      case 'update':
        if (!validated.text) {
          return NextResponse.json({ error: 'text required for update' }, { status: 400 });
        }
        await queueManager.updateVariation(validated.variationId, validated.text);
        break;

      case 'assign':
        if (!validated.accountId) {
          return NextResponse.json({ error: 'accountId required for assign' }, { status: 400 });
        }
        await queueManager.assignAccount(validated.variationId, validated.accountId);
        break;

      default:
        // Direct update without action
        if (validated.text) {
          await queueManager.updateVariation(validated.variationId, validated.text);
        }
        if (validated.accountId) {
          await queueManager.assignAccount(validated.variationId, validated.accountId);
        }
    }

    const variation = await prisma.contentVariation.findUnique({
      where: { id: validated.variationId },
      include: {
        account: {
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({ variation });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update variation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Remove a variation
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { contentId } = await params;
    const { searchParams } = new URL(request.url);
    const variationId = searchParams.get('variationId');

    if (!variationId) {
      return NextResponse.json({ error: 'variationId required' }, { status: 400 });
    }

    // Verify access
    const content = await prisma.contentItem.findFirst({
      where: {
        id: contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    await prisma.contentVariation.delete({
      where: { id: variationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete variation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

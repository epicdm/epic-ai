/**
 * Content Queue API - PKG-023
 * GET - Get content queue with variations
 * POST - Save generated content to queue with variations
 * PATCH - Update content status (approve/reject)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { ContentScheduler } from '@/lib/services/content-factory/scheduler';
import { ContentQueueManager } from '@/lib/services/content-factory/queue-manager';
import { z } from 'zod';

const platformVariationSchema = z.object({
  platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY']),
  content: z.string(),
  hashtags: z.array(z.string()).default([]),
  characterCount: z.number().optional(),
  isWithinLimit: z.boolean().optional(),
  mediaPrompt: z.string().optional(),
});

const saveContentSchema = z.object({
  brandId: z.string(),
  content: z.string(),
  variations: z.array(platformVariationSchema).optional(),
  mediaUrls: z.array(z.string()).optional(),
  mediaType: z.string().optional(),
  contentType: z.enum(['POST', 'STORY', 'REEL', 'THREAD', 'AD', 'BLOG_EXCERPT']).default('POST'),
  category: z.string().optional(),
  targetPlatforms: z.array(
    z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY'])
  ),
  scheduledFor: z.string().datetime().optional(),
  autoApprove: z.boolean().default(false),
  targetAccountIds: z.record(z.string()).optional(),
});

const updateStatusSchema = z.object({
  contentId: z.string(),
  action: z.enum(['approve', 'reject', 'reschedule', 'publish']),
  reason: z.string().optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    // Verify user has access
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: { some: { userId } },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const whereClause: Record<string, unknown> = { brandId };

    if (status === 'pending') {
      whereClause.approvalStatus = 'PENDING';
      whereClause.status = { in: ['DRAFT', 'PENDING'] };
    } else if (status === 'scheduled') {
      whereClause.status = 'SCHEDULED';
    } else if (status === 'published') {
      whereClause.status = 'PUBLISHED';
    }

    const items = await prisma.contentItem.findMany({
      where: whereClause,
      orderBy: [
        { scheduledFor: 'asc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      include: {
        publishResults: true,
        contentVariations: {
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
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch content queue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = saveContentSchema.parse(body);

    // Verify user has access
    const brand = await prisma.brand.findFirst({
      where: {
        id: validated.brandId,
        organization: {
          memberships: { some: { userId } },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // If variations provided, use ContentQueueManager for proper variation handling
    if (validated.variations && validated.variations.length > 0) {
      const queueManager = new ContentQueueManager(validated.brandId);

      const item = await queueManager.queueContent(
        {
          content: validated.content,
          variations: validated.variations.map((v) => ({
            platform: v.platform,
            content: v.content,
            hashtags: v.hashtags,
            characterCount: v.characterCount || v.content.length,
            isWithinLimit: v.isWithinLimit ?? true,
            mediaPrompt: v.mediaPrompt,
          })),
          suggestedHashtags: [],
          suggestedEmojis: [],
          category: validated.category || 'general',
          contentType: validated.contentType,
        },
        {
          scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : undefined,
          autoApprove: validated.autoApprove,
          targetAccountIds: validated.targetAccountIds as Record<string, string> | undefined,
        }
      );

      return NextResponse.json({ item }, { status: 201 });
    }

    // Legacy path: create without variations model
    const autopilot = await prisma.autopilotConfig.findUnique({
      where: { brandId: validated.brandId },
    });

    const approvalStatus =
      autopilot?.approvalMode === 'AUTO_POST'
        ? 'AUTO_APPROVED'
        : autopilot?.approvalMode === 'AUTO_QUEUE'
        ? 'PENDING'
        : 'PENDING';

    const status =
      autopilot?.approvalMode === 'AUTO_POST' && validated.scheduledFor
        ? 'SCHEDULED'
        : 'DRAFT';

    const item = await prisma.contentItem.create({
      data: {
        brandId: validated.brandId,
        content: validated.content,
        mediaUrls: validated.mediaUrls || [],
        mediaType: validated.mediaType,
        contentType: validated.contentType,
        category: validated.category,
        targetPlatforms: validated.targetPlatforms,
        scheduledFor: validated.scheduledFor ? new Date(validated.scheduledFor) : null,
        status,
        approvalStatus,
      },
      include: {
        contentVariations: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to save content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateStatusSchema.parse(body);

    // Get content item and verify access
    const item = await prisma.contentItem.findFirst({
      where: {
        id: validated.contentId,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const queueManager = new ContentQueueManager(item.brandId);
    const scheduler = new ContentScheduler(item.brandId);

    switch (validated.action) {
      case 'approve':
        await queueManager.approve(validated.contentId, userId);
        break;

      case 'reject':
        await queueManager.reject(validated.contentId, validated.reason);
        break;

      case 'reschedule':
        if (!validated.scheduledFor) {
          return NextResponse.json({ error: 'scheduledFor required for reschedule' }, { status: 400 });
        }
        await queueManager.schedule(validated.contentId, new Date(validated.scheduledFor));
        break;

      case 'publish': {
        const results = await queueManager.publishNow(validated.contentId);
        const updated = await prisma.contentItem.findUnique({
          where: { id: validated.contentId },
          include: {
            contentVariations: true,
            publishResults: true,
          },
        });
        return NextResponse.json({ item: updated, publishResults: results });
      }
    }

    const updated = await prisma.contentItem.findUnique({
      where: { id: validated.contentId },
      include: {
        contentVariations: true,
        publishResults: true,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

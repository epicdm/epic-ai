/**
 * Publish Content API
 * Manually publish content to social platforms
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { SocialPublisher } from '@/lib/services/social-publishing';
import { z } from 'zod';
import type { SocialPlatform } from '@prisma/client';

const publishSchema = z.object({
  contentId: z.string(),
  platforms: z.array(z.enum([
    'TWITTER',
    'LINKEDIN',
    'FACEBOOK',
    'INSTAGRAM',
    'TIKTOK',
    'YOUTUBE',
    'THREADS',
    'BLUESKY',
  ])),
});

/**
 * POST - Publish content to platforms
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { contentId, platforms } = publishSchema.parse(body);

    // Get content and verify access
    const content = await prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        brand: {
          include: {
            organization: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    });

    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const hasAccess = content.brand.organization.members.some(
      (m) => m.userId === userId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check content is approved
    if (content.approvalStatus !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Content must be approved before publishing' },
        { status: 400 }
      );
    }

    // Publish to platforms
    const publisher = new SocialPublisher(content.brandId);
    const results = await publisher.publish(contentId, platforms as SocialPlatform[]);

    const successful = results.filter((r) => r.result.success);
    const failed = results.filter((r) => !r.result.success);

    return NextResponse.json({
      success: successful.length > 0,
      published: successful.map((r) => ({
        platform: r.platform,
        postId: r.result.postId,
        postUrl: r.result.postUrl,
      })),
      failed: failed.map((r) => ({
        platform: r.platform,
        error: r.result.error,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish content' },
      { status: 500 }
    );
  }
}

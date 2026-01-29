/**
 * Content Generation API
 * POST - Generate content
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { ContentGenerator } from '@/lib/services/content-factory/generator';
import { z } from 'zod';

const videoOptionsSchema = z.object({
  aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:5', '5:4', '3:2', '2:3']).optional(),
  resolution: z.enum(['720p', '1080p']).optional(),
  duration: z.union([z.literal(5), z.literal(10)]).optional(),
  animateImage: z.boolean().optional(),
}).optional();

const generateSchema = z.object({
  brandId: z.string(),
  contentType: z.enum(['POST', 'STORY', 'REEL', 'THREAD', 'AD', 'BLOG_EXCERPT']).default('POST'),
  targetPlatforms: z.array(
    z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY'])
  ),
  topic: z.string().optional(),
  category: z.string().optional(),
  contextItemIds: z.array(z.string()).optional(),
  includeImage: z.boolean().default(false),
  includeVideo: z.boolean().default(false),
  videoOptions: videoOptionsSchema,
  customInstructions: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = generateSchema.parse(body);

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

    // Check if brand brain is initialized
    const brain = await prisma.brandBrain.findUnique({
      where: { brandId: validated.brandId },
    });

    if (!brain) {
      return NextResponse.json(
        { error: 'Brand profile not initialized. Please set up your brand first.' },
        { status: 400 }
      );
    }

    const generator = new ContentGenerator(validated.brandId);
    console.log('[Content Generate API] Request:', {
      brandId: validated.brandId,
      targetPlatforms: validated.targetPlatforms,
      includeImage: validated.includeImage,
      includeVideo: validated.includeVideo,
      videoOptions: validated.videoOptions,
    });

    const content = await generator.generate(validated);

    console.log('[Content Generate API] Response:', {
      hasGeneratedImageUrl: !!content.generatedImageUrl,
      generatedImageUrl: content.generatedImageUrl?.substring(0, 50) + '...',
      hasGeneratedVideoUrl: !!content.generatedVideoUrl,
      videoCost: content.videoCost,
    });

    // Track usage
    const videoCostCents = content.videoCost ? Math.round(content.videoCost * 100) : 0;
    await prisma.usage.upsert({
      where: {
        organizationId_periodStart: {
          organizationId: brand.organizationId,
          periodStart: getMonthStart(),
        },
      },
      create: {
        organizationId: brand.organizationId,
        periodStart: getMonthStart(),
        periodEnd: getMonthEnd(),
        postsGenerated: 1,
        imagesGenerated: validated.includeImage ? 1 : 0,
        videosGenerated: content.generatedVideoUrl ? 1 : 0,
        videoCostCents,
      },
      update: {
        postsGenerated: { increment: 1 },
        imagesGenerated: validated.includeImage ? { increment: 1 } : undefined,
        videosGenerated: content.generatedVideoUrl ? { increment: 1 } : undefined,
        videoCostCents: videoCostCents ? { increment: videoCostCents } : undefined,
      },
    });

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to generate content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function getMonthEnd(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

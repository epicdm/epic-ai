/**
 * Batch Content Generation API - PKG-023
 * POST - Generate multiple content pieces with variations
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { ContentGenerator } from '@/lib/services/content-factory/generator';
import { ContentQueueManager } from '@/lib/services/content-factory/queue-manager';
import { z } from 'zod';

const batchGenerateSchema = z.object({
  brandId: z.string(),
  count: z.number().min(1).max(20).default(5),
  targetPlatforms: z.array(
    z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY'])
  ),
  categories: z.array(z.string()).optional(),
  contentType: z.enum(['POST', 'STORY', 'REEL', 'THREAD', 'AD', 'BLOG_EXCERPT']).default('POST'),
  includeImages: z.boolean().default(false),
  scheduleFrom: z.string().datetime().optional(),
  scheduleIntervalHours: z.number().min(1).max(168).default(24),
  autoApprove: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = batchGenerateSchema.parse(body);

    // Verify user has access
    const brand = await prisma.brand.findFirst({
      where: {
        id: validated.brandId,
        organization: {
          memberships: { some: { userId } },
        },
      },
      include: {
        brandBrain: true,
        socialAccounts: {
          where: {
            status: 'CONNECTED',
            platform: { in: validated.targetPlatforms },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.brandBrain) {
      return NextResponse.json(
        { error: 'Brand profile not initialized. Please set up your brand first.' },
        { status: 400 }
      );
    }

    // Get content pillars for category rotation (use legacy field or fetch from pillars relation)
    const contentPillars = brand.brandBrain.contentPillarsLegacy as string[] | undefined;
    const categories = validated.categories || contentPillars || ['general'];

    const generator = new ContentGenerator(validated.brandId);
    const queueManager = new ContentQueueManager(validated.brandId);

    // Build account mapping for variations
    const accountMapping: Record<string, string> = {};
    for (const account of brand.socialAccounts) {
      accountMapping[account.platform] = account.id;
    }

    const results: Array<{ id: string; category: string; platforms: string[] }> = [];
    const errors: Array<{ index: number; error: string }> = [];

    // Calculate schedule times
    let scheduleTime = validated.scheduleFrom ? new Date(validated.scheduleFrom) : undefined;

    for (let i = 0; i < validated.count; i++) {
      try {
        // Rotate through categories
        const category = categories[i % categories.length];

        // Generate content
        const generated = await generator.generate({
          brandId: validated.brandId,
          contentType: validated.contentType,
          targetPlatforms: validated.targetPlatforms,
          category,
          includeImage: validated.includeImages,
        });

        // Queue with variations
        const queued = await queueManager.queueContent(generated, {
          scheduledFor: scheduleTime,
          autoApprove: validated.autoApprove,
          targetAccountIds: accountMapping as Record<string, string>,
        });

        results.push({
          id: queued.id,
          category: queued.category,
          platforms: queued.variations.map((v) => v.platform),
        });

        // Increment schedule time for next item
        if (scheduleTime) {
          scheduleTime = new Date(
            scheduleTime.getTime() + validated.scheduleIntervalHours * 60 * 60 * 1000
          );
        }

        // Rate limit delay
        if (i < validated.count - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error(`Failed to generate content ${i + 1}:`, error);
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Track usage
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
        postsGenerated: results.length,
        imagesGenerated: validated.includeImages ? results.length : 0,
      },
      update: {
        postsGenerated: { increment: results.length },
        imagesGenerated: validated.includeImages ? { increment: results.length } : undefined,
      },
    });

    return NextResponse.json({
      generated: results.length,
      failed: errors.length,
      items: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to batch generate content:', error);
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

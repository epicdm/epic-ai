/**
 * Content Schedule API
 * POST - Schedule content from AI Content Wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { ContentQueueManager } from '@/lib/services/content-factory/queue-manager';
import { z } from 'zod';

const scheduleContentSchema = z.object({
  brandId: z.string(),
  topic: z.string(),
  category: z.string().optional(),
  variations: z.array(
    z.object({
      platform: z.enum(['TWITTER', 'LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'THREADS', 'BLUESKY']),
      content: z.string(),
      hashtags: z.array(z.string()).default([]),
    })
  ),
  publishOption: z.enum(['now', 'optimal', 'custom']),
  imagePrompt: z.string().optional(),
  generatedImageUrl: z.string().optional(), // AI-generated image URL from content generator
});

// Calculate optimal posting time based on platform and day
function getOptimalTime(platform: string): Date {
  const now = new Date();
  const optimalHours: Record<string, number[]> = {
    TWITTER: [9, 12, 17], // 9am, 12pm, 5pm
    LINKEDIN: [8, 10, 12], // 8am, 10am, 12pm
    INSTAGRAM: [11, 13, 19], // 11am, 1pm, 7pm
    FACEBOOK: [9, 13, 16], // 9am, 1pm, 4pm
  };

  const hours = optimalHours[platform] || [10, 14, 18];
  const currentHour = now.getHours();

  // Find the next optimal time slot
  const nextOptimalHour = hours.find((h) => h > currentHour) || hours[0];

  const scheduledTime = new Date(now);
  if (nextOptimalHour <= currentHour) {
    // Schedule for tomorrow
    scheduledTime.setDate(scheduledTime.getDate() + 1);
  }
  scheduledTime.setHours(nextOptimalHour, 0, 0, 0);

  // Add some randomness (0-15 minutes) to avoid posting at exact hours
  scheduledTime.setMinutes(Math.floor(Math.random() * 15));

  return scheduledTime;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = scheduleContentSchema.parse(body);

    // Verify user has access
    const brand = await prisma.brand.findFirst({
      where: {
        id: validated.brandId,
        organization: {
          memberships: { some: { userId } },
        },
      },
      include: {
        socialAccounts: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const queueManager = new ContentQueueManager(validated.brandId);

    // Create the main content text from the first variation
    const mainContent = validated.variations[0]?.content || validated.topic;

    // Build target account IDs for each platform
    const targetAccountIds: Record<string, string> = {};
    validated.variations.forEach((v) => {
      const account = brand.socialAccounts.find((a) => a.platform === v.platform);
      if (account) {
        targetAccountIds[v.platform] = account.id;
      }
    });

    // Determine scheduling based on publish option
    let scheduledFor: Date | undefined;
    let autoApprove = false;

    switch (validated.publishOption) {
      case 'now':
        // Publish immediately - set autoApprove and schedule for now
        scheduledFor = new Date();
        autoApprove = true;
        break;

      case 'optimal':
        // Use AI-recommended optimal time (first platform's optimal time)
        scheduledFor = getOptimalTime(validated.variations[0]?.platform || 'FACEBOOK');
        autoApprove = true;
        break;

      case 'custom':
        // Add to queue for manual scheduling
        scheduledFor = undefined;
        autoApprove = false;
        break;
    }

    // Queue the content
    const item = await queueManager.queueContent(
      {
        content: mainContent,
        variations: validated.variations.map((v) => ({
          platform: v.platform as 'TWITTER' | 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'THREADS' | 'BLUESKY',
          content: v.content,
          hashtags: v.hashtags,
          characterCount: v.content.length,
          isWithinLimit: true,
          mediaPrompt: validated.imagePrompt,
        })),
        suggestedHashtags: validated.variations[0]?.hashtags || [],
        suggestedEmojis: [],
        category: validated.category || validated.topic,
        contentType: 'POST',
        generatedImageUrl: validated.generatedImageUrl, // Pass AI-generated image for Instagram/media posts
      },
      {
        scheduledFor,
        autoApprove,
        targetAccountIds,
      }
    );

    // If publish option is 'now', publish immediately
    if (validated.publishOption === 'now') {
      const results = await queueManager.publishNow(item.id);
      return NextResponse.json({
        success: true,
        item,
        publishResults: results,
        message: 'Content published successfully',
      });
    }

    return NextResponse.json({
      success: true,
      item,
      message:
        validated.publishOption === 'optimal'
          ? `Content scheduled for optimal time: ${scheduledFor?.toLocaleString()}`
          : 'Content added to queue for manual scheduling',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to schedule content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

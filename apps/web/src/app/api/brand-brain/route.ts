/**
 * Brand Brain API - PKG-020
 * GET - Get brand brain with all related data
 * PUT - Update brand brain settings
 * POST - Initialize or complete setup wizard
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma, VoiceTone, EmojiFrequency, HashtagStyle } from '@epic-ai/database';
import { z } from 'zod';

// Schema for updating brand brain
const updateSchema = z.object({
  // Brand Identity
  companyName: z.string().optional(),
  description: z.string().optional(),
  mission: z.string().nullable().optional(),
  values: z.array(z.string()).optional(),
  uniqueSellingPoints: z.array(z.string()).optional(),
  industry: z.string().optional(),
  targetMarket: z.string().optional(),

  // Voice & Tone
  voiceTone: z.nativeEnum(VoiceTone).optional(),
  voiceToneCustom: z.string().nullable().optional(),
  formalityLevel: z.number().min(1).max(5).optional(),
  writingStyle: z.string().nullable().optional(),
  doNotMention: z.array(z.string()).optional(),
  mustMention: z.array(z.string()).optional(),

  // Emoji & Hashtag Settings
  useEmojis: z.boolean().optional(),
  emojiFrequency: z.nativeEnum(EmojiFrequency).optional(),
  useHashtags: z.boolean().optional(),
  hashtagStyle: z.nativeEnum(HashtagStyle).optional(),
  preferredHashtags: z.array(z.string()).optional(),
  bannedHashtags: z.array(z.string()).optional(),

  // CTA Style
  ctaStyle: z.enum(['none', 'soft', 'direct', 'urgent']).optional(),

  // Setup wizard
  setupStep: z.number().optional(),
  setupComplete: z.boolean().optional(),
});

const initializeSchema = z.object({
  brandId: z.string(),
  companyName: z.string().optional(),
  websiteUrl: z.string().url().optional(),
});

// Helper to verify brand access
async function verifyBrandAccess(brandId: string, userId: string) {
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      organization: {
        memberships: { some: { userId } },
      },
    },
  });
  return brand;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get brand brain with all related data
    const brain = await prisma.brandBrain.findUnique({
      where: { brandId },
      include: {
        audiences: {
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        pillars: {
          orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        },
        brandCompetitors: {
          orderBy: { createdAt: 'asc' },
        },
        brandLearnings: {
          where: { isActive: true, isExpired: false },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return NextResponse.json({
      brain,
      initialized: !!brain,
      brand: {
        id: brand.id,
        name: brand.name,
        website: brand.website,
        industry: brand.industry,
      },
    });
  } catch (error) {
    console.error('Failed to get brand brain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Update or create brand brain
    const brain = await prisma.brandBrain.upsert({
      where: { brandId },
      create: {
        brandId,
        ...validated,
      },
      update: validated,
      include: {
        audiences: true,
        pillars: true,
        brandCompetitors: true,
      },
    });

    return NextResponse.json({ brain });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update brand brain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action as string;

    if (action === 'initialize') {
      const validated = initializeSchema.parse(body);

      const brand = await verifyBrandAccess(validated.brandId, userId);
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }

      // Create brand brain with initial data
      const brain = await prisma.brandBrain.upsert({
        where: { brandId: validated.brandId },
        create: {
          brandId: validated.brandId,
          companyName: validated.companyName || brand.name,
          industry: brand.industry,
          setupStep: 1,
        },
        update: {
          companyName: validated.companyName || brand.name,
          industry: brand.industry,
        },
        include: {
          audiences: true,
          pillars: true,
        },
      });

      return NextResponse.json({ brain, initialized: true });
    }

    if (action === 'complete-setup') {
      const brandId = body.brandId as string;
      if (!brandId) {
        return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
      }

      const brand = await verifyBrandAccess(brandId, userId);
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }

      const brain = await prisma.brandBrain.update({
        where: { brandId },
        data: {
          setupComplete: true,
        },
        include: {
          audiences: true,
          pillars: true,
          brandCompetitors: true,
        },
      });

      return NextResponse.json({ brain, setupComplete: true });
    }

    if (action === 'advance-step') {
      const brandId = body.brandId as string;
      const step = body.step as number;

      if (!brandId) {
        return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
      }

      const brand = await verifyBrandAccess(brandId, userId);
      if (!brand) {
        return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
      }

      const brain = await prisma.brandBrain.update({
        where: { brandId },
        data: {
          setupStep: step,
        },
      });

      return NextResponse.json({ brain, step });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to process brand brain action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

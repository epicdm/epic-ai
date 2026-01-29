/**
 * Brand Audience API - PKG-020
 * GET - List all audiences for a brand brain
 * POST - Create a new audience
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma, SocialPlatform } from '@epic-ai/database';
import { z } from 'zod';

const createSchema = z.object({
  brainId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  isPrimary: z.boolean().optional(),
  // Demographics
  ageRange: z.string().optional(),
  gender: z.string().optional(),
  location: z.array(z.string()).optional(),
  income: z.string().optional(),
  education: z.string().optional(),
  // Psychographics
  interests: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional(),
  // Behavior
  platforms: z.array(z.nativeEnum(SocialPlatform)).optional(),
  buyingBehavior: z.string().optional(),
});

// Helper to verify brain access
async function verifyBrainAccess(brainId: string, userId: string) {
  const brain = await prisma.brandBrain.findFirst({
    where: {
      id: brainId,
      brand: {
        organization: {
          memberships: { some: { userId } },
        },
      },
    },
  });
  return brain;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brainId = searchParams.get('brainId');

    if (!brainId) {
      return NextResponse.json({ error: 'brainId is required' }, { status: 400 });
    }

    const brain = await verifyBrainAccess(brainId, userId);
    if (!brain) {
      return NextResponse.json({ error: 'Brand brain not found' }, { status: 404 });
    }

    const audiences = await prisma.brandAudience.findMany({
      where: { brainId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ audiences });
  } catch (error) {
    console.error('Failed to get audiences:', error);
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
    const validated = createSchema.parse(body);

    const brain = await verifyBrainAccess(validated.brainId, userId);
    if (!brain) {
      return NextResponse.json({ error: 'Brand brain not found' }, { status: 404 });
    }

    // If this is set as primary, unset other primary audiences
    if (validated.isPrimary) {
      await prisma.brandAudience.updateMany({
        where: { brainId: validated.brainId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const audience = await prisma.brandAudience.create({
      data: validated,
    });

    return NextResponse.json({ audience }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create audience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

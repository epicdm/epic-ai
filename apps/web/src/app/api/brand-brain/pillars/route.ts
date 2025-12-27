/**
 * Content Pillars API - PKG-020
 * GET - List all pillars for a brand brain
 * POST - Create a new pillar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma, VoiceTone } from '@epic-ai/database';
import { z } from 'zod';

const createSchema = z.object({
  brainId: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  // Content Guidelines
  topics: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  tone: z.nativeEnum(VoiceTone).optional(),
  // Usage
  priority: z.number().min(1).optional(),
  frequency: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
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

    const pillars = await prisma.contentPillar.findMany({
      where: { brainId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ pillars });
  } catch (error) {
    console.error('Failed to get pillars:', error);
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

    // Get current max priority
    const maxPriority = await prisma.contentPillar.aggregate({
      where: { brainId: validated.brainId },
      _max: { priority: true },
    });

    const pillar = await prisma.contentPillar.create({
      data: {
        ...validated,
        priority: validated.priority ?? (maxPriority._max.priority ?? 0) + 1,
      },
    });

    return NextResponse.json({ pillar }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create pillar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

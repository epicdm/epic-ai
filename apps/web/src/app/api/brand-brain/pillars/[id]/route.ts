/**
 * Single Content Pillar API - PKG-020
 * GET - Get a specific pillar
 * PUT - Update a pillar
 * DELETE - Delete a pillar
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma, VoiceTone } from '@epic-ai/database';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  // Content Guidelines
  topics: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  tone: z.nativeEnum(VoiceTone).nullable().optional(),
  // Usage
  priority: z.number().min(1).optional(),
  frequency: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

// Helper to verify pillar access
async function verifyPillarAccess(pillarId: string, userId: string) {
  const pillar = await prisma.contentPillar.findFirst({
    where: {
      id: pillarId,
      brain: {
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    },
    include: {
      brain: true,
    },
  });
  return pillar;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pillar = await verifyPillarAccess(id, userId);

    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 });
    }

    return NextResponse.json({ pillar });
  } catch (error) {
    console.error('Failed to get pillar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingPillar = await verifyPillarAccess(id, userId);

    if (!existingPillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const pillar = await prisma.contentPillar.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ pillar });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update pillar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const pillar = await verifyPillarAccess(id, userId);

    if (!pillar) {
      return NextResponse.json({ error: 'Pillar not found' }, { status: 404 });
    }

    await prisma.contentPillar.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete pillar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

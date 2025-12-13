/**
 * Single Brand Audience API - PKG-020
 * GET - Get a specific audience
 * PUT - Update an audience
 * DELETE - Delete an audience
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma, SocialPlatform } from '@epic-ai/database';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  // Demographics
  ageRange: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  location: z.array(z.string()).optional(),
  income: z.string().nullable().optional(),
  education: z.string().nullable().optional(),
  // Psychographics
  interests: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  values: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional(),
  // Behavior
  platforms: z.array(z.nativeEnum(SocialPlatform)).optional(),
  buyingBehavior: z.string().nullable().optional(),
});

// Helper to verify audience access
async function verifyAudienceAccess(audienceId: string, userId: string) {
  const audience = await prisma.brandAudience.findFirst({
    where: {
      id: audienceId,
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
  return audience;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const audience = await verifyAudienceAccess(id, userId);

    if (!audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    return NextResponse.json({ audience });
  } catch (error) {
    console.error('Failed to get audience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existingAudience = await verifyAudienceAccess(id, userId);

    if (!existingAudience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // If this is being set as primary, unset other primary audiences
    if (validated.isPrimary) {
      await prisma.brandAudience.updateMany({
        where: {
          brainId: existingAudience.brainId,
          isPrimary: true,
          id: { not: id },
        },
        data: { isPrimary: false },
      });
    }

    const audience = await prisma.brandAudience.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({ audience });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update audience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const audience = await verifyAudienceAccess(id, userId);

    if (!audience) {
      return NextResponse.json({ error: 'Audience not found' }, { status: 404 });
    }

    await prisma.brandAudience.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete audience:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

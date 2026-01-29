/**
 * Brand Competitors API - PKG-020
 * GET - List all competitors for a brand brain
 * POST - Create a new competitor
 * PUT - Update a competitor (by id in body)
 * DELETE - Delete a competitor (by id in query)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { z } from 'zod';

const createSchema = z.object({
  brainId: z.string(),
  name: z.string().min(1),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  // Social Presence
  twitterHandle: z.string().optional(),
  linkedinUrl: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookUrl: z.string().optional(),
  // Competitive Analysis
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  differentiators: z.array(z.string()).optional(),
  contentStrategy: z.string().optional(),
  // Monitoring
  isMonitored: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  description: z.string().nullable().optional(),
  // Social Presence
  twitterHandle: z.string().nullable().optional(),
  linkedinUrl: z.string().nullable().optional(),
  instagramHandle: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  // Competitive Analysis
  strengths: z.array(z.string()).optional(),
  weaknesses: z.array(z.string()).optional(),
  differentiators: z.array(z.string()).optional(),
  contentStrategy: z.string().nullable().optional(),
  // Monitoring
  isMonitored: z.boolean().optional(),
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

// Helper to verify competitor access
async function verifyCompetitorAccess(competitorId: string, userId: string) {
  const competitor = await prisma.brandCompetitor.findFirst({
    where: {
      id: competitorId,
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
  return competitor;
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

    const competitors = await prisma.brandCompetitor.findMany({
      where: { brainId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Failed to get competitors:', error);
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

    const competitor = await prisma.brandCompetitor.create({
      data: {
        ...validated,
        website: validated.website || null,
      },
    });

    return NextResponse.json({ competitor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create competitor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const existingCompetitor = await verifyCompetitorAccess(validated.id, userId);
    if (!existingCompetitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    const { id, ...updateData } = validated;
    const competitor = await prisma.brandCompetitor.update({
      where: { id },
      data: {
        ...updateData,
        website: updateData.website || null,
      },
    });

    return NextResponse.json({ competitor });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to update competitor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const competitor = await verifyCompetitorAccess(id, userId);
    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    await prisma.brandCompetitor.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Context Sources API
 * GET - List all context sources for a brand
 * POST - Add a new context source
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { ContextManager } from '@/lib/services/context-engine/manager';
import { z } from 'zod';

const createSourceSchema = z.object({
  brandId: z.string(),
  type: z.enum([
    'WEBSITE',
    'RSS_FEED',
    'PDF_UPLOAD',
    'GOOGLE_DOCS',
    'NOTION',
    'EMAIL_FORWARD',
    'MANUAL_NOTE',
    'CRM_HUBSPOT',
    'CRM_SALESFORCE',
    'SOCIAL_MENTION',
    'NEWS_SEARCH',
    'COMPETITOR',
  ]),
  name: z.string().min(1),
  config: z.record(z.unknown()),
});

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

    // Verify user has access to this brand
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: { some: { userId } },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const sources = await prisma.contextSource.findMany({
      where: { brandId },
      include: {
        _count: { select: { contextItems: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        status: s.status,
        lastSync: s.lastSync,
        syncError: s.syncError,
        itemCount: s._count.contextItems,
        createdAt: s.createdAt,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch context sources:', error);
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
    const validated = createSourceSchema.parse(body);

    // Verify user has access to this brand
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

    const manager = new ContextManager(validated.brandId);
    const sourceId = await manager.addSource(
      validated.type,
      validated.name,
      validated.config as never
    );

    const source = await prisma.contextSource.findUnique({
      where: { id: sourceId },
      include: {
        _count: { select: { contextItems: true } },
      },
    });

    return NextResponse.json({
      source: {
        id: source!.id,
        type: source!.type,
        name: source!.name,
        status: source!.status,
        itemCount: source!._count.contextItems,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to create context source:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

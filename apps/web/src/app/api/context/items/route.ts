/**
 * Context Items API
 * GET - List/search context items
 * POST - Add a manual note
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { ContextManager } from '@/lib/services/context-engine/manager';
import { z } from 'zod';

const manualNoteSchema = z.object({
  brandId: z.string(),
  title: z.string().min(1),
  content: z.string().min(10),
  contentType: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const search = searchParams.get('search');
    const contentType = searchParams.get('contentType');
    const minImportance = searchParams.get('minImportance');
    const evergreenOnly = searchParams.get('evergreenOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

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

    const manager = new ContextManager(brandId);

    if (search) {
      const items = await manager.searchContext(search, limit);
      return NextResponse.json({ items });
    }

    const items = await manager.getContextItems({
      contentType: contentType || undefined,
      minImportance: minImportance ? parseInt(minImportance, 10) : undefined,
      evergreenOnly,
      limit,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to fetch context items:', error);
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
    const validated = manualNoteSchema.parse(body);

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
    const itemId = await manager.addManualNote(
      validated.title,
      validated.content,
      validated.contentType
    );

    const item = await prisma.contextItem.findUnique({
      where: { id: itemId },
    });

    return NextResponse.json({
      item: {
        id: item!.id,
        title: item!.title,
        summary: item!.summary,
        contentType: item!.contentType,
        importance: item!.importance,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to add manual note:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

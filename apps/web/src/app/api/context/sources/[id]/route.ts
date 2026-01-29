/**
 * Single Context Source API
 * GET - Get source details
 * DELETE - Remove a source
 * POST - Trigger sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { ContextManager } from '@/lib/services/context-engine/manager';

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

    const source = await prisma.contextSource.findFirst({
      where: {
        id,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
      include: {
        _count: { select: { contextItems: true } },
        contextItems: {
          take: 10,
          orderBy: { importance: 'desc' },
          select: {
            id: true,
            title: true,
            summary: true,
            contentType: true,
            importance: true,
            createdAt: true,
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({
      source: {
        id: source.id,
        type: source.type,
        name: source.name,
        config: source.config,
        status: source.status,
        lastSync: source.lastSync,
        syncError: source.syncError,
        itemCount: source._count.contextItems,
        recentItems: source.contextItems,
        createdAt: source.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to fetch context source:', error);
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

    const source = await prisma.contextSource.findFirst({
      where: {
        id,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const manager = new ContextManager(source.brandId);
    await manager.removeSource(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete context source:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    const source = await prisma.contextSource.findFirst({
      where: {
        id,
        brand: {
          organization: {
            memberships: { some: { userId } },
          },
        },
      },
    });

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const manager = new ContextManager(source.brandId);

    switch (action) {
      case 'sync': {
        const result = await manager.syncSource(id);
        return NextResponse.json(result);
      }

      case 'pause': {
        await manager.setSourceStatus(id, 'PAUSED');
        return NextResponse.json({ success: true, status: 'PAUSED' });
      }

      case 'resume': {
        await manager.setSourceStatus(id, 'ACTIVE');
        return NextResponse.json({ success: true, status: 'ACTIVE' });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to perform action on context source:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

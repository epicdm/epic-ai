/**
 * Social Account Individual API - PKG-022
 * Manage a specific social account
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { SocialPublisher } from '@/lib/services/social-publishing';

interface RouteParams {
  params: Promise<{ accountId: string }>;
}

/**
 * GET - Get a specific social account
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      include: {
        brand: {
          include: {
            organization: {
              include: {
                memberships: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Verify user has access
    const hasAccess = account.brand.organization.memberships.some(
      (m) => m.userId === userId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Return sanitized account (without tokens)
    return NextResponse.json({
      account: {
        id: account.id,
        platform: account.platform,
        platformId: account.platformId,
        username: account.username,
        displayName: account.displayName,
        avatar: account.avatar,
        profileUrl: account.profileUrl,
        status: account.status,
        lastUsed: account.lastUsed,
        lastError: account.lastError,
        followerCount: account.followerCount,
        followingCount: account.followingCount,
        postCount: account.postCount,
        connectedAt: account.connectedAt,
        updatedAt: account.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to fetch social account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Disconnect a social account
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    // Verify user has access to account's brand
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId },
      include: {
        brand: {
          include: {
            organization: {
              include: {
                memberships: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const hasAccess = account.brand.organization.memberships.some(
      (m) => m.userId === userId
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await SocialPublisher.disconnectAccount(accountId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to disconnect social account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

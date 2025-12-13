/**
 * Social Accounts API - PKG-022
 * Manage connected social accounts for a brand
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import { SocialPublisher } from '@/lib/services/social-publishing';
import { getUserOrganization } from '@/lib/sync-user';

/**
 * GET - List connected social accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let brandId = searchParams.get('brandId');

    // If no brandId provided, get user's default brand
    if (!brandId) {
      const organization = await getUserOrganization();
      if (!organization) {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }

      const brand = await prisma.brand.findFirst({
        where: { organizationId: organization.id },
      });

      if (!brand) {
        return NextResponse.json({
          accounts: [],
          brandId: null,
        });
      }

      brandId = brand.id;
    }

    // Verify user has access to brand
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get all accounts (including disconnected for history)
    const accounts = await prisma.socialAccount.findMany({
      where: { brandId },
      orderBy: { connectedAt: 'desc' },
    });

    // Return sanitized accounts (without tokens)
    const sanitizedAccounts = accounts.map((account) => ({
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
    }));

    return NextResponse.json({
      accounts: sanitizedAccounts,
      brandId,
    });
  } catch (error) {
    console.error('Failed to fetch social accounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Manually add/update an account (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, platform, tokens, profile } = body;

    if (!brandId || !platform || !tokens || !profile) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user has access to brand
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organization: {
          memberships: {
            some: { userId },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const account = await SocialPublisher.connectAccount(brandId, platform, tokens, profile);

    return NextResponse.json({
      account: {
        id: account.id,
        platform: account.platform,
        platformId: account.platformId,
        username: account.username,
        displayName: account.displayName,
        status: account.status,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create social account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

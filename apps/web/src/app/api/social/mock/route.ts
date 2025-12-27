/**
 * Social Mock API
 * For testing social connections without real OAuth
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import { getUserOrganization } from '@/lib/sync-user';

/**
 * GET - Check if mock mode is enabled
 */
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if mock mode is enabled via environment variable
    const mockMode = process.env.SOCIAL_MOCK_MODE === 'true' || process.env.NODE_ENV === 'development';

    return NextResponse.json({ mockMode });
  } catch (error) {
    console.error('Error checking mock mode:', error);
    return NextResponse.json({ mockMode: false });
  }
}

/**
 * POST - Create mock social accounts for testing
 */
export async function POST() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if mock mode is enabled
    const mockMode = process.env.SOCIAL_MOCK_MODE === 'true' || process.env.NODE_ENV === 'development';
    if (!mockMode) {
      return NextResponse.json({ error: 'Mock mode is not enabled' }, { status: 403 });
    }

    const organization = await getUserOrganization();
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get or create brand
    let brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
    });

    if (!brand) {
      const baseName = organization.name || 'My Brand';
      const slug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'my-brand';

      brand = await prisma.brand.create({
        data: {
          organizationId: organization.id,
          name: baseName,
          slug,
        },
      });
    }

    const mockAccounts = [
      {
        platform: 'TWITTER' as const,
        platformId: 'mock_twitter_123',
        username: 'mock_user',
        displayName: 'Mock Twitter User',
        avatar: 'https://pbs.twimg.com/profile_images/default.jpg',
        profileUrl: 'https://twitter.com/mock_user',
        followerCount: 1000,
      },
      {
        platform: 'LINKEDIN' as const,
        platformId: 'mock_linkedin_456',
        username: 'mock-linkedin-user',
        displayName: 'Mock LinkedIn User',
        avatar: null,
        profileUrl: 'https://linkedin.com/in/mock-user',
        followerCount: 500,
      },
      {
        platform: 'FACEBOOK' as const,
        platformId: 'mock_facebook_789',
        username: 'MockFBPage',
        displayName: 'Mock Facebook Page',
        avatar: null,
        profileUrl: 'https://facebook.com/MockFBPage',
        followerCount: 2500,
      },
      {
        platform: 'INSTAGRAM' as const,
        platformId: 'mock_instagram_012',
        username: 'mock_instagram',
        displayName: 'Mock Instagram',
        avatar: null,
        profileUrl: 'https://instagram.com/mock_instagram',
        followerCount: 3000,
      },
    ];

    const createdAccounts = [];

    for (const accountData of mockAccounts) {
      // Check if account already exists
      const existing = await prisma.socialAccount.findFirst({
        where: {
          brandId: brand.id,
          platform: accountData.platform,
        },
      });

      if (existing) {
        // Update existing account to connected status
        const updated = await prisma.socialAccount.update({
          where: { id: existing.id },
          data: {
            status: 'CONNECTED',
            platformId: accountData.platformId,
            username: accountData.username,
            displayName: accountData.displayName,
            avatar: accountData.avatar,
            profileUrl: accountData.profileUrl,
            followerCount: accountData.followerCount,
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token',
            tokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });
        createdAccounts.push(updated);
      } else {
        // Create new mock account
        const created = await prisma.socialAccount.create({
          data: {
            brandId: brand.id,
            platform: accountData.platform,
            platformId: accountData.platformId,
            username: accountData.username,
            displayName: accountData.displayName,
            avatar: accountData.avatar,
            profileUrl: accountData.profileUrl,
            followerCount: accountData.followerCount,
            status: 'CONNECTED',
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token',
            tokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
        });
        createdAccounts.push(created);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdAccounts.length} mock social accounts`,
      accounts: createdAccounts.map((a) => ({
        id: a.id,
        platform: a.platform,
        username: a.username,
        displayName: a.displayName,
      })),
    });
  } catch (error) {
    console.error('Error creating mock accounts:', error);
    return NextResponse.json(
      { error: 'Failed to create mock accounts' },
      { status: 500 }
    );
  }
}

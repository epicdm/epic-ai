/**
 * Social Publisher - Main orchestrator for publishing to multiple platforms
 * TODO: Implement fully when PublishResult model and ContentItem relations are complete
 *
 * Handles:
 * - Multi-platform publishing
 * - Token refresh
 * - Error handling and retries
 * - Rate limiting
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, SocialAccount } from '@prisma/client';
import { TwitterClient } from './clients/twitter';
import { LinkedInClient } from './clients/linkedin';
import { MetaClient } from './clients/meta';
import type { PublishOptions, PublishResult, OAuthTokens, SocialClient } from './types';

export class SocialPublisher {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Publish content to specified platforms
   */
  async publish(
    contentId: string,
    platforms: SocialPlatform[]
  ): Promise<{ platform: SocialPlatform; result: PublishResult }[]> {
    const results: { platform: SocialPlatform; result: PublishResult }[] = [];

    // Get content item
    const contentItem = await prisma.contentItem.findUnique({
      where: { id: contentId },
    });

    if (!contentItem) {
      return platforms.map((platform) => ({
        platform,
        result: { success: false, platform, error: 'Content not found' },
      }));
    }

    // Mock mode for local testing
    if (process.env.MOCK_SOCIAL_API === 'true') {
      console.log('🧪 MOCK MODE: Simulating social publishing');
      for (const platform of platforms) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate delay
        const mockPostId = `mock-${platform.toLowerCase()}-${Date.now()}`;
        results.push({
          platform,
          result: {
            success: true,
            platform,
            postId: mockPostId,
            postUrl: `https://mock.social/${platform.toLowerCase()}/post/${mockPostId}`,
          },
        });
      }

      // Update content status
      await prisma.contentItem.update({
        where: { id: contentId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });

      return results;
    }

    // Real publishing
    for (const platform of platforms) {
      try {
        const account = await prisma.socialAccount.findFirst({
          where: { brandId: this.brandId, platform, status: 'CONNECTED' },
        });

        if (!account) {
          results.push({
            platform,
            result: { success: false, platform, error: 'No connected account' },
          });
          continue;
        }

        const client = await this.createClient(account);
        if (!client) {
          results.push({
            platform,
            result: { success: false, platform, error: 'Failed to create client' },
          });
          continue;
        }

        const options = this.getPlatformContent(
          contentItem.content,
          contentItem.mediaUrls,
          contentItem.mediaType || undefined
        );

        const result = await client.publish(options);
        results.push({ platform, result });

        // Refresh tokens if needed
        if (client.refreshTokenIfNeeded) {
          const newTokens = await client.refreshTokenIfNeeded();
          if (newTokens) {
            await this.updateTokens(account.id, newTokens);
          }
        }
      } catch (error) {
        results.push({
          platform,
          result: {
            success: false,
            platform,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    }

    // Update content status based on results
    const anySuccess = results.some((r) => r.result.success);
    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: anySuccess ? 'PUBLISHED' : 'FAILED',
        publishedAt: anySuccess ? new Date() : null,
      },
    });

    return results;
  }

  /**
   * Publish scheduled content
   */
  async publishScheduled(): Promise<number> {
    const now = new Date();
    const scheduledContent = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: 'SCHEDULED',
        scheduledFor: { lte: now },
      },
      take: 10,
    });

    let publishedCount = 0;
    for (const item of scheduledContent) {
      const platforms = item.targetPlatforms as SocialPlatform[];
      if (platforms.length > 0) {
        const results = await this.publish(item.id, platforms);
        if (results.some((r) => r.result.success)) {
          publishedCount++;
        }
      }
    }

    return publishedCount;
  }

  /**
   * Create mock social accounts for testing
   */
  static async createMockAccounts(brandId: string): Promise<SocialAccount[]> {
    if (process.env.MOCK_SOCIAL_API !== 'true') {
      throw new Error('Mock accounts can only be created in mock mode');
    }

    const mockPlatforms: { platform: SocialPlatform; username: string }[] = [
      { platform: 'TWITTER', username: 'mock_twitter_user' },
      { platform: 'LINKEDIN', username: 'mock_linkedin_user' },
      { platform: 'FACEBOOK', username: 'mock_facebook_page' },
      { platform: 'INSTAGRAM', username: 'mock_instagram_account' },
    ];

    const accounts: SocialAccount[] = [];
    for (const mock of mockPlatforms) {
      const existing = await prisma.socialAccount.findFirst({
        where: { brandId, platform: mock.platform },
      });

      if (existing) {
        accounts.push(existing);
        continue;
      }

      const account = await prisma.socialAccount.create({
        data: {
          brandId,
          platform: mock.platform,
          platformId: `mock-${mock.platform.toLowerCase()}-${Date.now()}`,
          username: mock.username,
          displayName: `Mock ${mock.platform} Account`,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          tokenExpires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          status: 'CONNECTED',
        },
      });
      accounts.push(account);
    }

    return accounts;
  }

  /**
   * Create appropriate client for platform
   */
  private async createClient(account: SocialAccount): Promise<SocialClient | null> {
    if (!account.accessToken) {
      return null;
    }

    const tokens: OAuthTokens = {
      accessToken: account.accessToken,
      refreshToken: account.refreshToken || undefined,
      expiresAt: account.tokenExpires || undefined,
    };

    switch (account.platform) {
      case 'TWITTER':
        return new TwitterClient(tokens);

      case 'LINKEDIN':
        return new LinkedInClient(tokens, account.platformId || undefined);

      case 'FACEBOOK':
        return new MetaClient(
          tokens,
          'FACEBOOK',
          account.platformId || undefined
        );

      case 'INSTAGRAM':
        return new MetaClient(
          tokens,
          'INSTAGRAM',
          undefined,
          account.platformId || undefined
        );

      default:
        console.warn(`Unsupported platform: ${account.platform}`);
        return null;
    }
  }

  /**
   * Get platform-specific content
   */
  private getPlatformContent(
    content: string,
    mediaUrls?: string[],
    mediaType?: string
  ): PublishOptions {
    return {
      content,
      mediaUrls: mediaUrls || undefined,
      mediaType: mediaType as 'image' | 'video' | 'carousel' | undefined,
    };
  }

  /**
   * Update tokens in database
   */
  private async updateTokens(accountId: string, tokens: OAuthTokens): Promise<void> {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpires: tokens.expiresAt,
        status: 'CONNECTED',
      },
    });
  }

  /**
   * Connect a new social account
   */
  static async connectAccount(
    brandId: string,
    platform: SocialPlatform,
    tokens: OAuthTokens & { scope?: string },
    profile: {
      platformUserId: string;
      platformUsername: string;
      displayName?: string;
      avatar?: string;
      profileUrl?: string;
    }
  ): Promise<SocialAccount> {
    // Check if account already exists
    const existing = await prisma.socialAccount.findFirst({
      where: {
        brandId,
        platform,
        platformId: profile.platformUserId,
      },
    });

    if (existing) {
      // Update existing account
      return prisma.socialAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpires: tokens.expiresAt,
          tokenScope: tokens.scope,
          username: profile.platformUsername,
          displayName: profile.displayName,
          avatar: profile.avatar,
          profileUrl: profile.profileUrl,
          status: 'CONNECTED',
          lastError: null,
        },
      });
    }

    // Create new account
    return prisma.socialAccount.create({
      data: {
        brandId,
        platform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpires: tokens.expiresAt,
        tokenScope: tokens.scope,
        platformId: profile.platformUserId,
        username: profile.platformUsername,
        displayName: profile.displayName,
        avatar: profile.avatar,
        profileUrl: profile.profileUrl,
        status: 'CONNECTED',
      },
    });
  }

  /**
   * Disconnect a social account
   */
  static async disconnectAccount(accountId: string): Promise<void> {
    await prisma.socialAccount.update({
      where: { id: accountId },
      data: { status: 'DISCONNECTED' },
    });
  }

  /**
   * Get all connected accounts for a brand
   */
  static async getAccounts(brandId: string): Promise<SocialAccount[]> {
    return prisma.socialAccount.findMany({
      where: {
        brandId,
        status: 'CONNECTED',
      },
    });
  }

  /**
   * Get all accounts for a brand (including disconnected)
   */
  static async getAllAccounts(brandId: string): Promise<SocialAccount[]> {
    return prisma.socialAccount.findMany({
      where: { brandId },
      orderBy: { connectedAt: 'desc' },
    });
  }
}

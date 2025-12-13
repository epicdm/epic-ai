/**
 * Social Publisher - Main orchestrator for publishing to multiple platforms
 *
 * Handles:
 * - Multi-platform publishing
 * - Token refresh
 * - Error handling and retries
 * - Rate limiting
 */

import { prisma } from '@epic-ai/database';
import type { SocialPlatform, SocialAccount, ContentItem } from '@prisma/client';
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
    const content = await prisma.contentItem.findUnique({
      where: { id: contentId },
      include: {
        brand: true,
      },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    // Get social accounts for specified platforms
    const accounts = await prisma.socialAccount.findMany({
      where: {
        brandId: this.brandId,
        platform: { in: platforms },
        status: 'CONNECTED',
      },
    });

    const results: { platform: SocialPlatform; result: PublishResult }[] = [];

    for (const platform of platforms) {
      const account = accounts.find((a) => a.platform === platform);

      if (!account) {
        results.push({
          platform,
          result: {
            success: false,
            platform,
            error: `No active ${platform} account connected`,
          },
        });
        continue;
      }

      try {
        // Get platform-specific content
        const platformContent = this.getPlatformContent(content, platform);

        // Create client and publish
        const client = await this.createClient(account);

        if (!client) {
          results.push({
            platform,
            result: {
              success: false,
              platform,
              error: `Failed to create client for ${platform}`,
            },
          });
          continue;
        }

        // Refresh token if needed
        const newTokens = await client.refreshTokenIfNeeded();
        if (newTokens) {
          await this.updateTokens(account.id, newTokens);
        }

        // Publish
        const result = await client.publish(platformContent);

        // Store result
        await prisma.publishResult.create({
          data: {
            contentId,
            platform,
            success: result.success,
            postId: result.postId,
            postUrl: result.postUrl,
            error: result.error,
          },
        });

        results.push({ platform, result });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await prisma.publishResult.create({
          data: {
            contentId,
            platform,
            success: false,
            error: errorMessage,
          },
        });

        results.push({
          platform,
          result: {
            success: false,
            platform,
            error: errorMessage,
          },
        });
      }
    }

    // Update content status
    const allSucceeded = results.every((r) => r.result.success);
    const someSucceeded = results.some((r) => r.result.success);

    await prisma.contentItem.update({
      where: { id: contentId },
      data: {
        status: allSucceeded ? 'PUBLISHED' : someSucceeded ? 'PARTIALLY_PUBLISHED' : 'FAILED',
        publishedAt: someSucceeded ? new Date() : undefined,
      },
    });

    return results;
  }

  /**
   * Publish scheduled content
   */
  async publishScheduled(): Promise<number> {
    const now = new Date();

    // Find content ready to publish
    const scheduledContent = await prisma.contentItem.findMany({
      where: {
        brandId: this.brandId,
        status: 'SCHEDULED',
        approvalStatus: 'APPROVED',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        brand: {
          include: {
            socialAccounts: {
              where: { status: 'CONNECTED' },
            },
          },
        },
      },
    });

    let publishedCount = 0;

    for (const content of scheduledContent) {
      try {
        const platforms = content.platforms as SocialPlatform[];
        const results = await this.publish(content.id, platforms);

        if (results.some((r) => r.result.success)) {
          publishedCount++;
        }
      } catch (error) {
        console.error(`Failed to publish content ${content.id}:`, error);
      }
    }

    return publishedCount;
  }

  /**
   * Create appropriate client for platform
   */
  private async createClient(account: SocialAccount): Promise<SocialClient | null> {
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
    content: ContentItem,
    platform: SocialPlatform
  ): PublishOptions {
    // Get platform-specific variation if available
    const variations = (content.platformVariations as Record<string, string>) || {};
    const platformContent = variations[platform] || content.content;

    return {
      content: platformContent,
      mediaUrls: (content.mediaUrls as string[]) || undefined,
      mediaType: content.mediaType as 'image' | 'video' | 'carousel' | undefined,
      hashtags: (content.hashtags as string[]) || undefined,
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

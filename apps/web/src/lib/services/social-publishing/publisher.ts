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
   * TODO: Implement when PublishResult model is complete
   */
  async publish(
    _contentId: string,
    platforms: SocialPlatform[]
  ): Promise<{ platform: SocialPlatform; result: PublishResult }[]> {
    // Stub implementation - return failures for all platforms
    return platforms.map((platform) => ({
      platform,
      result: {
        success: false,
        platform,
        error: 'Publishing not yet implemented - PublishResult model required',
      },
    }));
  }

  /**
   * Publish scheduled content
   */
  async publishScheduled(): Promise<number> {
    // Stub implementation
    return 0;
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

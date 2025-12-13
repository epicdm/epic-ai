/**
 * Social Publishing Types
 */

import type { SocialPlatform } from '@prisma/client';

export interface PublishOptions {
  content: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel';
  linkUrl?: string;
  hashtags?: string[];
  scheduledFor?: Date;
}

export interface PublishResult {
  success: boolean;
  platform: SocialPlatform;
  postId?: string;
  postUrl?: string;
  error?: string;
  rateLimit?: {
    remaining: number;
    resetAt: Date;
  };
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface SocialClient {
  platform: SocialPlatform;
  publish(options: PublishOptions): Promise<PublishResult>;
  refreshTokenIfNeeded(): Promise<OAuthTokens | null>;
  getProfile(): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    profileUrl?: string;
  }>;
}

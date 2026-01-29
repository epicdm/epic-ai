/**
 * Twitter/X Client - Native API integration
 *
 * Uses Twitter API v2
 * Docs: https://developer.twitter.com/en/docs/twitter-api
 */

import type { PublishOptions, PublishResult, OAuthTokens, SocialClient } from '../types';

export class TwitterClient implements SocialClient {
  platform = 'TWITTER' as const;
  private accessToken: string;
  private refreshToken?: string;

  constructor(tokens: OAuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }

  async publish(options: PublishOptions): Promise<PublishResult> {
    try {
      // Upload media first if provided
      let mediaIds: string[] = [];
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        mediaIds = await this.uploadMedia(options.mediaUrls);
      }

      // Create tweet
      const tweetData: Record<string, unknown> = {
        text: options.content,
      };

      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetData),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: this.platform,
          error: error.detail || error.title || 'Failed to post tweet',
        };
      }

      const result = await response.json();
      const tweetId = result.data.id;

      return {
        success: true,
        platform: this.platform,
        postId: tweetId,
        postUrl: `https://twitter.com/i/status/${tweetId}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async refreshTokenIfNeeded(): Promise<OAuthTokens | null> {
    if (!this.refreshToken) return null;

    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(
            `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
          ).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();

      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };
    } catch {
      return null;
    }
  }

  async getProfile(): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    profileUrl?: string;
  }> {
    const response = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Twitter profile');
    }

    const data = await response.json();

    return {
      id: data.data.id,
      username: data.data.username,
      displayName: data.data.name,
      avatar: data.data.profile_image_url,
      profileUrl: `https://twitter.com/${data.data.username}`,
    };
  }

  private async uploadMedia(urls: string[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const url of urls.slice(0, 4)) {
      // Twitter allows max 4 images
      try {
        // Download the image
        const imageResponse = await fetch(url);
        const imageBuffer = await imageResponse.arrayBuffer();
        const base64 = Buffer.from(imageBuffer).toString('base64');

        // Upload to Twitter
        const uploadResponse = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            media_data: base64,
          }),
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaIds.push(uploadData.media_id_string);
        }
      } catch (error) {
        console.error('Failed to upload media to Twitter:', error);
      }
    }

    return mediaIds;
  }
}

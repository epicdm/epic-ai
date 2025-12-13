/**
 * Meta Client - Native API integration for Facebook & Instagram
 *
 * Uses Meta Graph API
 * Docs: https://developers.facebook.com/docs/graph-api/
 */

import type { PublishOptions, PublishResult, OAuthTokens, SocialClient } from '../types';
import type { SocialPlatform } from '@prisma/client';

export class MetaClient implements SocialClient {
  platform: SocialPlatform;
  private accessToken: string;
  private pageId?: string;
  private instagramAccountId?: string;

  constructor(
    tokens: OAuthTokens,
    platform: 'FACEBOOK' | 'INSTAGRAM',
    pageId?: string,
    instagramAccountId?: string
  ) {
    this.platform = platform;
    this.accessToken = tokens.accessToken;
    this.pageId = pageId;
    this.instagramAccountId = instagramAccountId;
  }

  async publish(options: PublishOptions): Promise<PublishResult> {
    if (this.platform === 'INSTAGRAM') {
      return this.publishToInstagram(options);
    }
    return this.publishToFacebook(options);
  }

  private async publishToFacebook(options: PublishOptions): Promise<PublishResult> {
    try {
      if (!this.pageId) {
        return {
          success: false,
          platform: 'FACEBOOK',
          error: 'Page ID not configured',
        };
      }

      // Upload photo if media provided
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        return this.publishFacebookPhoto(options);
      }

      // Text-only post
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: options.content,
            link: options.linkUrl,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'FACEBOOK',
          error: error.error?.message || 'Failed to post to Facebook',
        };
      }

      const result = await response.json();

      return {
        success: true,
        platform: 'FACEBOOK',
        postId: result.id,
        postUrl: `https://www.facebook.com/${result.id.replace('_', '/posts/')}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'FACEBOOK',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishFacebookPhoto(options: PublishOptions): Promise<PublishResult> {
    try {
      if (!this.pageId || !options.mediaUrls?.length) {
        return {
          success: false,
          platform: 'FACEBOOK',
          error: 'Page ID or media not configured',
        };
      }

      // For multiple images, create unpublished photos first
      if (options.mediaUrls.length > 1) {
        const photoIds: string[] = [];

        for (const url of options.mediaUrls.slice(0, 10)) {
          const uploadResponse = await fetch(
            `https://graph.facebook.com/v18.0/${this.pageId}/photos`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url,
                published: false,
                access_token: this.accessToken,
              }),
            }
          );

          if (uploadResponse.ok) {
            const data = await uploadResponse.json();
            photoIds.push(data.id);
          }
        }

        // Create post with attached photos
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${this.pageId}/feed`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: options.content,
              attached_media: photoIds.map((id) => ({ media_fbid: id })),
              access_token: this.accessToken,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            platform: 'FACEBOOK',
            error: error.error?.message || 'Failed to post to Facebook',
          };
        }

        const result = await response.json();
        return {
          success: true,
          platform: 'FACEBOOK',
          postId: result.id,
          postUrl: `https://www.facebook.com/${result.id.replace('_', '/posts/')}`,
        };
      }

      // Single image post
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.pageId}/photos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: options.mediaUrls[0],
            caption: options.content,
            access_token: this.accessToken,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: 'FACEBOOK',
          error: error.error?.message || 'Failed to post photo to Facebook',
        };
      }

      const result = await response.json();
      return {
        success: true,
        platform: 'FACEBOOK',
        postId: result.post_id || result.id,
        postUrl: `https://www.facebook.com/${this.pageId}/photos/${result.id}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'FACEBOOK',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishToInstagram(options: PublishOptions): Promise<PublishResult> {
    try {
      if (!this.instagramAccountId) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: 'Instagram account ID not configured',
        };
      }

      // Instagram requires media for all posts
      if (!options.mediaUrls || options.mediaUrls.length === 0) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: 'Instagram requires media for posts',
        };
      }

      // Carousel post (multiple images)
      if (options.mediaUrls.length > 1) {
        return this.publishInstagramCarousel(options);
      }

      // Single image/video post
      const mediaType = options.mediaType === 'video' ? 'VIDEO' : 'IMAGE';

      // Create media container
      const containerResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: mediaType === 'IMAGE' ? options.mediaUrls[0] : undefined,
            video_url: mediaType === 'VIDEO' ? options.mediaUrls[0] : undefined,
            caption: options.content,
            access_token: this.accessToken,
          }),
        }
      );

      if (!containerResponse.ok) {
        const error = await containerResponse.json();
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: error.error?.message || 'Failed to create Instagram media container',
        };
      }

      const container = await containerResponse.json();

      // Wait for media to be ready (for videos)
      if (mediaType === 'VIDEO') {
        await this.waitForMediaReady(container.id);
      }

      // Publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: this.accessToken,
          }),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: error.error?.message || 'Failed to publish to Instagram',
        };
      }

      const result = await publishResponse.json();

      return {
        success: true,
        platform: 'INSTAGRAM',
        postId: result.id,
        postUrl: `https://www.instagram.com/p/${await this.getMediaShortcode(result.id)}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'INSTAGRAM',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishInstagramCarousel(options: PublishOptions): Promise<PublishResult> {
    try {
      if (!this.instagramAccountId || !options.mediaUrls) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: 'Instagram account ID or media not configured',
        };
      }

      // Create child containers for each media item
      const childIds: string[] = [];

      for (const url of options.mediaUrls.slice(0, 10)) {
        const childResponse = await fetch(
          `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: this.accessToken,
            }),
          }
        );

        if (childResponse.ok) {
          const child = await childResponse.json();
          childIds.push(child.id);
        }
      }

      if (childIds.length === 0) {
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: 'Failed to create carousel items',
        };
      }

      // Create carousel container
      const carouselResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: childIds,
            caption: options.content,
            access_token: this.accessToken,
          }),
        }
      );

      if (!carouselResponse.ok) {
        const error = await carouselResponse.json();
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: error.error?.message || 'Failed to create Instagram carousel',
        };
      }

      const carousel = await carouselResponse.json();

      // Publish carousel
      const publishResponse = await fetch(
        `https://graph.facebook.com/v18.0/${this.instagramAccountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: carousel.id,
            access_token: this.accessToken,
          }),
        }
      );

      if (!publishResponse.ok) {
        const error = await publishResponse.json();
        return {
          success: false,
          platform: 'INSTAGRAM',
          error: error.error?.message || 'Failed to publish Instagram carousel',
        };
      }

      const result = await publishResponse.json();

      return {
        success: true,
        platform: 'INSTAGRAM',
        postId: result.id,
        postUrl: `https://www.instagram.com/p/${await this.getMediaShortcode(result.id)}`,
      };
    } catch (error) {
      return {
        success: false,
        platform: 'INSTAGRAM',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async waitForMediaReady(containerId: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${containerId}?fields=status_code&access_token=${this.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status_code === 'FINISHED') {
          return;
        }
        if (data.status_code === 'ERROR') {
          throw new Error('Media processing failed');
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error('Media processing timeout');
  }

  private async getMediaShortcode(mediaId: string): Promise<string> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}?fields=shortcode&access_token=${this.accessToken}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.shortcode || mediaId;
      }
    } catch {
      // Fall back to media ID
    }
    return mediaId;
  }

  async refreshTokenIfNeeded(): Promise<OAuthTokens | null> {
    // Meta tokens are long-lived (60 days) for pages
    // Exchange short-lived token for long-lived
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: process.env.META_APP_ID || '',
            client_secret: process.env.META_APP_SECRET || '',
            fb_exchange_token: this.accessToken,
          })
      );

      if (!response.ok) return null;

      const data = await response.json();
      this.accessToken = data.access_token;

      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
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
    if (this.platform === 'INSTAGRAM') {
      return this.getInstagramProfile();
    }
    return this.getFacebookProfile();
  }

  private async getFacebookProfile(): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    profileUrl?: string;
  }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.pageId}?fields=id,name,username,picture&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook page profile');
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username || data.id,
      displayName: data.name,
      avatar: data.picture?.data?.url,
      profileUrl: `https://www.facebook.com/${data.username || data.id}`,
    };
  }

  private async getInstagramProfile(): Promise<{
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    profileUrl?: string;
  }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${this.instagramAccountId}?fields=id,username,name,profile_picture_url&access_token=${this.accessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Instagram profile');
    }

    const data = await response.json();

    return {
      id: data.id,
      username: data.username,
      displayName: data.name || data.username,
      avatar: data.profile_picture_url,
      profileUrl: `https://www.instagram.com/${data.username}`,
    };
  }

  /**
   * Get pages the user has access to
   */
  static async getPages(
    userAccessToken: string
  ): Promise<{ id: string; name: string; accessToken: string }[]> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const data = await response.json();

    return (data.data || []).map((page: { id: string; name: string; access_token: string }) => ({
      id: page.id,
      name: page.name,
      accessToken: page.access_token,
    }));
  }

  /**
   * Get Instagram account connected to a Facebook page
   */
  static async getInstagramAccount(
    pageId: string,
    pageAccessToken: string
  ): Promise<{ id: string; username: string } | null> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=instagram_business_account{id,username}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const igAccount = data.instagram_business_account;

    if (!igAccount) {
      return null;
    }

    return {
      id: igAccount.id,
      username: igAccount.username,
    };
  }
}

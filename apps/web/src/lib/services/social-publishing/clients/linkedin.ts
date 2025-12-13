/**
 * LinkedIn Client - Native API integration
 *
 * Uses LinkedIn Marketing API
 * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/
 */

import type { PublishOptions, PublishResult, OAuthTokens, SocialClient } from '../types';

export class LinkedInClient implements SocialClient {
  platform = 'LINKEDIN' as const;
  private accessToken: string;
  private refreshToken?: string;
  private personId?: string;

  constructor(tokens: OAuthTokens, personId?: string) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.personId = personId;
  }

  async publish(options: PublishOptions): Promise<PublishResult> {
    try {
      // Get person ID if not cached
      if (!this.personId) {
        const profile = await this.getProfile();
        this.personId = profile.id;
      }

      // Upload media first if provided
      let asset: string | undefined;
      if (options.mediaUrls && options.mediaUrls.length > 0) {
        asset = await this.uploadMedia(options.mediaUrls[0]);
      }

      // Create post
      const postData: Record<string, unknown> = {
        author: `urn:li:person:${this.personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: options.content,
            },
            shareMediaCategory: asset ? 'IMAGE' : 'NONE',
            ...(asset && {
              media: [
                {
                  status: 'READY',
                  media: asset,
                },
              ],
            }),
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          platform: this.platform,
          error: error.message || 'Failed to post to LinkedIn',
        };
      }

      const result = await response.json();
      const postId = result.id;

      // Extract activity ID for URL
      const activityId = postId.replace('urn:li:share:', '');

      return {
        success: true,
        platform: this.platform,
        postId,
        postUrl: `https://www.linkedin.com/feed/update/${postId}`,
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
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
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
    const response = await fetch('https://api.linkedin.com/v2/me?projection=(id,firstName,lastName,profilePicture(displayImage~:playableStreams))', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    const data = await response.json();

    const firstName = data.firstName?.localized?.en_US || '';
    const lastName = data.lastName?.localized?.en_US || '';

    // Get profile picture
    let avatar: string | undefined;
    const elements = data.profilePicture?.['displayImage~']?.elements;
    if (elements && elements.length > 0) {
      avatar = elements[elements.length - 1]?.identifiers?.[0]?.identifier;
    }

    return {
      id: data.id,
      username: data.id,
      displayName: `${firstName} ${lastName}`.trim(),
      avatar,
      profileUrl: `https://www.linkedin.com/in/${data.id}`,
    };
  }

  private async uploadMedia(url: string): Promise<string> {
    // Register upload
    const registerResponse = await fetch(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: `urn:li:person:${this.personId}`,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      }
    );

    if (!registerResponse.ok) {
      throw new Error('Failed to register upload');
    }

    const registerData = await registerResponse.json();
    const uploadUrl =
      registerData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
        .uploadUrl;
    const asset = registerData.value.asset;

    // Download the image
    const imageResponse = await fetch(url);
    const imageBuffer = await imageResponse.arrayBuffer();

    // Upload to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload media to LinkedIn');
    }

    return asset;
  }
}

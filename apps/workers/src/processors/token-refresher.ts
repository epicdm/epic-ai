/**
 * Token Refresher Processor
 *
 * Handles REFRESH_TOKEN jobs by refreshing OAuth tokens before expiry.
 *
 * Implements:
 * - T042: Token refresh for Twitter, LinkedIn, Meta
 * - Update SocialAccount with new tokens and expiry
 * - Mark as EXPIRED if refresh fails
 *
 * @module processors/token-refresher
 */

import type { Job } from 'bullmq';
import { prisma } from '@epic-ai/database';
import { createProcessor, reportProgress, type JobData } from './base';
import {
  JobType,
  type TokenRefreshPayload,
  type TokenRefreshResult,
} from '../types/payloads';
import { logger } from '../lib/logger';

const COMPONENT = 'TokenRefresher';

/**
 * Buffer time before expiry to trigger refresh (1 hour)
 */
const REFRESH_BUFFER_MS = 60 * 60 * 1000;

/**
 * OAuth endpoints for each platform
 */
const OAUTH_ENDPOINTS = {
  TWITTER: 'https://api.twitter.com/2/oauth2/token',
  LINKEDIN: 'https://www.linkedin.com/oauth/v2/accessToken',
  FACEBOOK: 'https://graph.facebook.com/v18.0/oauth/access_token',
  INSTAGRAM: 'https://graph.facebook.com/v18.0/oauth/access_token',
} as const;

/**
 * Refreshes an OAuth token for a social account
 */
async function refreshToken(
  job: Job<JobData<TokenRefreshPayload>>
): Promise<TokenRefreshResult> {
  const startTime = Date.now();
  const { socialAccountId, platform } = job.data.payload;

  logger.info(COMPONENT, `Starting token refresh for account ${socialAccountId}`, {
    platform,
  });

  try {
    await reportProgress(job, 10, 'Fetching account details...');

    // Get current account details
    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
      select: {
        id: true,
        platform: true,
        accessToken: true,
        refreshToken: true,
        tokenExpires: true,
        status: true,
        brandId: true,
      },
    });

    if (!account) {
      logger.warn(COMPONENT, `Account not found: ${socialAccountId}`);
      return {
        success: false,
        requiresReauth: true,
      };
    }

    // Check if token actually needs refresh
    if (account.tokenExpires) {
      const expiresIn = account.tokenExpires.getTime() - Date.now();
      if (expiresIn > REFRESH_BUFFER_MS) {
        logger.info(COMPONENT, `Token still valid for ${Math.floor(expiresIn / 1000 / 60)} minutes`, {
          socialAccountId,
        });
        return {
          success: true,
          expiresAt: account.tokenExpires,
          requiresReauth: false,
        };
      }
    }

    // Check if we have a refresh token
    if (!account.refreshToken) {
      logger.warn(COMPONENT, `No refresh token available for ${socialAccountId}`);
      await markAccountAsExpired(socialAccountId, 'No refresh token available');
      return {
        success: false,
        requiresReauth: true,
      };
    }

    await reportProgress(job, 30, `Refreshing ${platform} token...`);

    // Refresh the token based on platform
    // Note: refreshToken is validated above, accessToken may be null for some refresh flows
    const result = await refreshPlatformToken(
      platform as keyof typeof OAUTH_ENDPOINTS,
      account.refreshToken!, // Already validated above
      account.accessToken || ''
    );

    if (!result.success) {
      logger.warn(COMPONENT, `Token refresh failed for ${socialAccountId}`, {
        error: result.error,
      });

      if (result.requiresReauth) {
        await markAccountAsExpired(socialAccountId, result.error || 'Token refresh failed');
      }

      return {
        success: false,
        requiresReauth: result.requiresReauth,
      };
    }

    await reportProgress(job, 70, 'Updating account tokens...');

    // Update the account with new tokens
    const newExpiry = new Date(Date.now() + (result.expiresIn || 3600) * 1000);

    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken || account.refreshToken,
        tokenExpires: newExpiry,
        status: 'CONNECTED',
      },
    });

    await reportProgress(job, 100, 'Token refresh complete');

    const durationMs = Date.now() - startTime;
    logger.info(COMPONENT, `Token refresh completed for ${socialAccountId}`, {
      platform,
      expiresAt: newExpiry.toISOString(),
      durationMs,
    });

    return {
      success: true,
      expiresAt: newExpiry,
      requiresReauth: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(COMPONENT, `Token refresh error for ${socialAccountId}`, {
      platform,
      error: errorMessage,
    });

    await markAccountAsExpired(socialAccountId, errorMessage);

    return {
      success: false,
      requiresReauth: true,
    };
  }
}

/**
 * Platform-specific token refresh
 */
async function refreshPlatformToken(
  platform: keyof typeof OAUTH_ENDPOINTS,
  refreshToken: string,
  currentAccessToken: string
): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  requiresReauth: boolean;
}> {
  try {
    switch (platform) {
      case 'TWITTER':
        return await refreshTwitterToken(refreshToken);
      case 'LINKEDIN':
        return await refreshLinkedInToken(refreshToken);
      case 'FACEBOOK':
      case 'INSTAGRAM':
        return await refreshMetaToken(currentAccessToken);
      default:
        return {
          success: false,
          error: `Unsupported platform: ${platform}`,
          requiresReauth: true,
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requiresReauth: true,
    };
  }
}

/**
 * Refresh Twitter OAuth 2.0 token
 */
async function refreshTwitterToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  requiresReauth: boolean;
}> {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'Twitter OAuth credentials not configured',
      requiresReauth: true,
    };
  }

  const response = await fetch(OAUTH_ENDPOINTS.TWITTER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(COMPONENT, `Twitter token refresh failed: ${response.status}`, { errorText });
    return {
      success: false,
      error: `Twitter API error: ${response.status}`,
      requiresReauth: response.status === 401 || response.status === 400,
    };
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    success: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 7200,
    requiresReauth: false,
  };
}

/**
 * Refresh LinkedIn OAuth 2.0 token
 */
async function refreshLinkedInToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  requiresReauth: boolean;
}> {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: 'LinkedIn OAuth credentials not configured',
      requiresReauth: true,
    };
  }

  const response = await fetch(OAUTH_ENDPOINTS.LINKEDIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.warn(COMPONENT, `LinkedIn token refresh failed: ${response.status}`, { errorText });
    return {
      success: false,
      error: `LinkedIn API error: ${response.status}`,
      requiresReauth: response.status === 401 || response.status === 400,
    };
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  return {
    success: true,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in || 5184000, // LinkedIn tokens last 60 days
    requiresReauth: false,
  };
}

/**
 * Refresh Meta (Facebook/Instagram) token
 * Meta uses long-lived token exchange instead of refresh tokens
 */
async function refreshMetaToken(accessToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  requiresReauth: boolean;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return {
      success: false,
      error: 'Meta OAuth credentials not configured',
      requiresReauth: true,
    };
  }

  // Meta uses token exchange for long-lived tokens
  const url = new URL(OAUTH_ENDPOINTS.FACEBOOK);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId);
  url.searchParams.set('client_secret', appSecret);
  url.searchParams.set('fb_exchange_token', accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as {
      error?: { code?: number; message?: string };
    };

    logger.warn(COMPONENT, `Meta token refresh failed: ${response.status}`, { errorData });

    // Check for specific OAuth errors
    const requiresReauth =
      response.status === 401 ||
      errorData.error?.code === 190 ||
      errorData.error?.code === 102;

    return {
      success: false,
      error: errorData.error?.message || `Meta API error: ${response.status}`,
      requiresReauth,
    };
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  return {
    success: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // Meta long-lived tokens last ~60 days
    requiresReauth: false,
  };
}

/**
 * Marks a social account as expired/needing reauth
 */
async function markAccountAsExpired(
  socialAccountId: string,
  reason: string
): Promise<void> {
  try {
    await prisma.socialAccount.update({
      where: { id: socialAccountId },
      data: {
        status: 'EXPIRED',
      },
    });

    logger.info(COMPONENT, `Marked account ${socialAccountId} as EXPIRED`, { reason });
  } catch (err) {
    logger.error(COMPONENT, `Failed to mark account as expired: ${socialAccountId}`, {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

// =============================================================================
// Export Processor
// =============================================================================

/**
 * Token refresher processor for REFRESH_TOKEN jobs
 * Uses createProcessor wrapper for automatic job status management
 */
export const tokenRefresherProcessor = createProcessor<
  TokenRefreshPayload,
  TokenRefreshResult
>(JobType.REFRESH_TOKEN, refreshToken);

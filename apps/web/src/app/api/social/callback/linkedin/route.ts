/**
 * LinkedIn OAuth 2.0 Callback
 * Handles OAuth callback and saves tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { SocialPublisher, LinkedInClient } from '@/lib/services/social-publishing';
import { safeEncryptToken } from '@/lib/encryption';

const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';

function getBaseUrl(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getRedirectUri(request: NextRequest): string {
  return `${getBaseUrl(request)}/api/social/callback/linkedin`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = getBaseUrl(request);

  // Check for OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description');
    console.error('LinkedIn OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=missing_params`
    );
  }

  // Validate state from database
  const oauthState = await prisma.oAuthState.findUnique({
    where: { state },
  });

  if (!oauthState || oauthState.expiresAt < new Date()) {
    if (oauthState) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
    }
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=invalid_state`
    );
  }

  const { brandId } = oauthState;

  // Delete the used state
  await prisma.oAuthState.delete({ where: { id: oauthState.id } });

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: getRedirectUri(request),
        client_id: process.env.LINKEDIN_CLIENT_ID || '',
        client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('LinkedIn token exchange failed:', errorData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social/accounts?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();

    // Create client and get profile
    const client = new LinkedInClient({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });

    const profile = await client.getProfile();

    // Save to database with encrypted tokens
    await SocialPublisher.connectAccount(brandId, 'LINKEDIN', {
      accessToken: safeEncryptToken(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? safeEncryptToken(tokenData.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    }, {
      platformUserId: profile.id,
      platformUsername: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
    });

    // Clear state cookie and redirect to success
    const response = NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?success=linkedin`
    );
    response.cookies.delete('linkedin_oauth_state');

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('LinkedIn OAuth callback error:', errorMessage);
    console.error('LinkedIn OAuth error details:', error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=callback_failed&details=${encodeURIComponent(errorMessage)}`
    );
  }
}

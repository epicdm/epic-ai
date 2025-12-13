/**
 * Twitter OAuth 2.0 Callback
 * Handles OAuth callback and saves tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { SocialPublisher, TwitterClient } from '@/lib/services/social-publishing';
import { safeEncryptToken } from '@/lib/encryption';

const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
const REDIRECT_URI = `${BASE_URL}/api/social/callback/twitter`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description');
    console.error('Twitter OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=missing_params`
    );
  }

  // Validate state from database
  const oauthState = await prisma.oAuthState.findUnique({
    where: { state },
  });

  if (!oauthState || oauthState.expiresAt < new Date()) {
    // Cleanup expired state
    if (oauthState) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
    }
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=invalid_state`
    );
  }

  const { brandId, codeVerifier, userId } = oauthState;

  // Delete the used state
  await prisma.oAuthState.delete({ where: { id: oauthState.id } });

  if (!codeVerifier) {
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=missing_verifier`
    );
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Twitter token exchange failed:', errorData);
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/social/accounts?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();

    // Create client and get profile
    const client = new TwitterClient({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
    });

    const profile = await client.getProfile();

    // Save to database with encrypted tokens
    await SocialPublisher.connectAccount(brandId, 'TWITTER', {
      accessToken: safeEncryptToken(tokenData.access_token),
      refreshToken: tokenData.refresh_token ? safeEncryptToken(tokenData.refresh_token) : undefined,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      scope: tokenData.scope,
    }, {
      platformUserId: profile.id,
      platformUsername: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
    });

    // Clear state cookie and redirect to success
    const response = NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?success=twitter`
    );
    response.cookies.delete('twitter_oauth_state');

    return response;
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=callback_failed`
    );
  }
}

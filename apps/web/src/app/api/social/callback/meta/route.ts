/**
 * Meta (Facebook/Instagram) OAuth Callback
 * Handles OAuth callback and saves tokens for pages/Instagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { SocialPublisher, MetaClient } from '@/lib/services/social-publishing';
import { safeEncryptToken } from '@/lib/encryption';

const TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
const REDIRECT_URI = `${BASE_URL}/api/social/callback/meta`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Check for OAuth errors
  if (error) {
    const errorDescription = searchParams.get('error_description');
    console.error('Meta OAuth error:', error, errorDescription);
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
    if (oauthState) {
      await prisma.oAuthState.delete({ where: { id: oauthState.id } });
    }
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=invalid_state`
    );
  }

  const { brandId, redirectUrl: platformPref } = oauthState;
  const platform = (platformPref as 'facebook' | 'instagram') || 'facebook';

  // Delete the used state
  await prisma.oAuthState.delete({ where: { id: oauthState.id } });

  try {
    // Exchange code for user access token
    const tokenResponse = await fetch(
      `${TOKEN_URL}?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID || '',
          client_secret: process.env.META_APP_SECRET || '',
          redirect_uri: REDIRECT_URI,
          code,
        })
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Meta token exchange failed:', errorData);
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/social/accounts?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;

    // Get pages the user manages
    const pages = await MetaClient.getPages(userAccessToken);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${BASE_URL}/dashboard/social/accounts?error=no_pages_found`
      );
    }

    // For now, connect the first page
    // TODO: Show page selector UI if multiple pages
    const page = pages[0];

    // Exchange for long-lived page token
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID || '',
          client_secret: process.env.META_APP_SECRET || '',
          fb_exchange_token: page.accessToken,
        })
    );

    let pageAccessToken = page.accessToken;
    let expiresAt: Date | undefined;

    if (longLivedResponse.ok) {
      const longLivedData = await longLivedResponse.json();
      pageAccessToken = longLivedData.access_token;
      expiresAt = new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000);
    }

    // Get page profile
    const client = new MetaClient(
      { accessToken: pageAccessToken },
      'FACEBOOK',
      page.id
    );
    const profile = await client.getProfile();

    // Save Facebook page with encrypted token
    await SocialPublisher.connectAccount(brandId, 'FACEBOOK', {
      accessToken: safeEncryptToken(pageAccessToken),
      expiresAt,
    }, {
      platformUserId: page.id,
      platformUsername: profile.username,
      displayName: profile.displayName,
      avatar: profile.avatar,
      profileUrl: profile.profileUrl,
    });

    // Check if there's an Instagram account connected
    if (platform === 'instagram' || platform === 'facebook') {
      const igAccount = await MetaClient.getInstagramAccount(page.id, pageAccessToken);

      if (igAccount) {
        const igClient = new MetaClient(
          { accessToken: pageAccessToken },
          'INSTAGRAM',
          page.id,
          igAccount.id
        );
        const igProfile = await igClient.getProfile();

        await SocialPublisher.connectAccount(brandId, 'INSTAGRAM', {
          accessToken: safeEncryptToken(pageAccessToken),
          expiresAt,
        }, {
          platformUserId: igAccount.id,
          platformUsername: igProfile.username,
          displayName: igProfile.displayName,
          avatar: igProfile.avatar,
          profileUrl: igProfile.profileUrl,
        });
      }
    }

    // Clear state cookie and redirect to success
    const response = NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?success=meta`
    );
    response.cookies.delete('meta_oauth_state');

    return response;
  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    return NextResponse.redirect(
      `${BASE_URL}/dashboard/social/accounts?error=callback_failed`
    );
  }
}

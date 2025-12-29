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

  const { brandId, redirectUrl: storedData } = oauthState;

  // Parse stored data (JSON with platform and returnUrl)
  let platform: 'facebook' | 'instagram' = 'facebook';
  let returnUrl = '/dashboard/social/accounts';

  try {
    const parsed = JSON.parse(storedData || '{}');
    platform = parsed.platform || 'facebook';
    returnUrl = parsed.returnUrl || '/dashboard/social/accounts';
  } catch {
    // Legacy format - just platform string
    platform = (storedData as 'facebook' | 'instagram') || 'facebook';
  }

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

    // Fetch extended business data from Facebook page for Brand Brain enrichment
    const businessDataResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?` +
        new URLSearchParams({
          fields: 'name,about,description,category,website,picture.type(large),cover,phone,emails,location,single_line_address',
          access_token: pageAccessToken,
        })
    );

    let businessData: {
      name?: string;
      about?: string;
      description?: string;
      category?: string;
      website?: string;
      logo?: string;
      coverPhoto?: string;
      phone?: string;
      email?: string;
      address?: string;
    } = {};

    if (businessDataResponse.ok) {
      const fbData = await businessDataResponse.json();
      businessData = {
        name: fbData.name,
        about: fbData.about || fbData.description,
        description: fbData.description || fbData.about,
        category: fbData.category,
        website: fbData.website,
        logo: fbData.picture?.data?.url,
        coverPhoto: fbData.cover?.source,
        phone: fbData.phone,
        email: fbData.emails?.[0],
        address: fbData.single_line_address || (fbData.location ?
          `${fbData.location.street || ''}, ${fbData.location.city || ''}, ${fbData.location.state || ''} ${fbData.location.zip || ''}`.trim() : undefined),
      };

      // Enrich Brand Brain with Facebook business data
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: { brandBrain: true },
      });

      if (brand) {
        // Update brand with Facebook data (only if fields are empty)
        await prisma.brand.update({
          where: { id: brandId },
          data: {
            name: brand.name || businessData.name || brand.name,
            description: brand.description || businessData.about || businessData.description,
            logoUrl: brand.logoUrl || businessData.logo,
            website: brand.website || businessData.website,
          },
        });

        // Update or create Brand Brain with extracted data
        if (brand.brandBrain) {
          await prisma.brandBrain.update({
            where: { id: brand.brandBrain.id },
            data: {
              industry: brand.brandBrain.industry || businessData.category,
              // Store Facebook data as context
              contextData: {
                ...(brand.brandBrain.contextData as object || {}),
                facebookPageData: businessData,
              },
            },
          });
        } else {
          await prisma.brandBrain.create({
            data: {
              brandId: brandId,
              industry: businessData.category,
              contextData: {
                facebookPageData: businessData,
              },
            },
          });
        }
      }
    }

    // Save Facebook page with encrypted token
    await SocialPublisher.connectAccount(brandId, 'FACEBOOK', {
      accessToken: safeEncryptToken(pageAccessToken),
      expiresAt,
    }, {
      platformUserId: page.id,
      platformUsername: profile.username,
      displayName: profile.displayName,
      avatar: businessData.logo || profile.avatar,
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

    // Clear state cookie and redirect with success
    // If opened in popup (returnUrl is set), show close page
    const isPopup = returnUrl && returnUrl !== '/dashboard/social/accounts';

    if (isPopup) {
      // Return HTML that closes the popup and notifies the parent
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Connected Successfully</title>
            <style>
              body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8f9fa; }
              .success { text-align: center; padding: 40px; }
              .icon { font-size: 48px; margin-bottom: 16px; }
              h1 { color: #22c55e; margin: 0 0 8px; font-size: 24px; }
              p { color: #6b7280; margin: 0; }
            </style>
          </head>
          <body>
            <div class="success">
              <div class="icon">✓</div>
              <h1>Connected!</h1>
              <p>You can close this window now.</p>
            </div>
            <script>
              // Notify parent window and close
              if (window.opener) {
                window.opener.postMessage({ type: 'SOCIAL_CONNECT_SUCCESS', platform: 'meta' }, '*');
              }
              setTimeout(() => window.close(), 1500);
            </script>
          </body>
        </html>
      `;
      const response = new NextResponse(html, {
        headers: { 'Content-Type': 'text/html' },
      });
      response.cookies.delete('meta_oauth_state');
      return response;
    }

    // Standard redirect
    const response = NextResponse.redirect(
      `${BASE_URL}${returnUrl}?success=meta`
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

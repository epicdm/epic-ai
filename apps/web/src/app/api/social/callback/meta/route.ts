/**
 * Meta (Facebook/Instagram) OAuth Callback
 * Handles OAuth callback and saves tokens for pages/Instagram
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@epic-ai/database';
import { SocialPublisher, MetaClient } from '@/lib/services/social-publishing';
import { safeEncryptToken } from '@/lib/encryption';

const TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';

function getBaseUrl(request: NextRequest): string {
  // Use forwarded headers when behind a proxy (nginx)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');

  if (forwardedHost && forwardedProto) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getRedirectUri(request: NextRequest): string {
  return `${getBaseUrl(request)}/api/social/callback/meta`;
}

// Helper function to create error HTML for popup mode
function createErrorHtml(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Connection Failed</title>
        <style>
          body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fef2f2; }
          .error { text-align: center; padding: 40px; max-width: 400px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          h1 { color: #dc2626; margin: 0 0 8px; font-size: 24px; }
          p { color: #6b7280; margin: 0 0 16px; }
          .details { background: #fee2e2; padding: 12px; border-radius: 8px; text-align: left; font-size: 12px; color: #991b1b; word-break: break-word; }
        </style>
      </head>
      <body>
        <div class="error">
          <div class="icon">✕</div>
          <h1>Connection Failed</h1>
          <p>Unable to connect your Facebook account.</p>
          <div class="details"><strong>Error:</strong> ${errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'SOCIAL_CONNECT_ERROR', platform: 'meta', error: ${JSON.stringify(errorMessage)} }, '*');
          }
        </script>
      </body>
    </html>
  `;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = getBaseUrl(request);

  // Check for OAuth errors from Facebook
  if (error) {
    const errorDescription = searchParams.get('error_description') || error;
    console.error('Meta OAuth error:', error, errorDescription);
    // Can't check popup mode here since we haven't validated state yet
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=${encodeURIComponent(error)}&details=${encodeURIComponent(errorDescription)}`
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=missing_params&details=${encodeURIComponent('Missing code or state parameter from Facebook')}`
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
      `${baseUrl}/dashboard/social/accounts?error=invalid_state&details=${encodeURIComponent('OAuth state expired or invalid. Please try connecting again.')}`
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
    console.log('[Meta OAuth] Step 1: Starting token exchange...');

    // Exchange code for user access token
    const tokenResponse = await fetch(
      `${TOKEN_URL}?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID || '',
          client_secret: process.env.META_APP_SECRET || '',
          redirect_uri: getRedirectUri(request),
          code,
        })
    );

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[Meta OAuth] Token exchange failed:', errorData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social/accounts?error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const userAccessToken = tokenData.access_token;
    console.log('[Meta OAuth] Step 2: Token exchange successful');

    // Get pages the user manages
    console.log('[Meta OAuth] Step 3: Fetching user pages...');
    const pages = await MetaClient.getPages(userAccessToken);
    console.log('[Meta OAuth] Step 3: Found', pages.length, 'pages');

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/social/accounts?error=no_pages_found`
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
    console.log('[Meta OAuth] Step 5: Fetching page profile...');
    const client = new MetaClient(
      { accessToken: pageAccessToken },
      'FACEBOOK',
      page.id
    );
    const profile = await client.getProfile();
    console.log('[Meta OAuth] Step 5: Got profile for', profile.displayName);

    // Fetch extended business data from Facebook page for Brand Brain enrichment
    console.log('[Meta OAuth] Step 6: Fetching business data...');
    const businessDataResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?` +
        new URLSearchParams({
          fields: [
            // Basic info
            'name', 'about', 'description', 'bio', 'category', 'category_list',
            'website', 'link', 'username',
            // Contact
            'phone', 'emails', 'whatsapp_number', 'location', 'single_line_address',
            // Visual
            'picture.type(large)', 'cover',
            // Business details
            'hours', 'price_range', 'founded', 'company_overview', 'mission',
            'products', 'general_info', 'impressum',
            // Engagement metrics
            'fan_count', 'followers_count', 'talking_about_count',
            'were_here_count', 'rating_count', 'overall_star_rating',
          ].join(','),
          access_token: pageAccessToken,
        })
    );

    let businessData: {
      // Basic
      name?: string;
      about?: string;
      description?: string;
      bio?: string;
      category?: string;
      categories?: string[];
      website?: string;
      pageUrl?: string;
      username?: string;
      // Contact
      phone?: string;
      email?: string;
      whatsapp?: string;
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      zip?: string;
      latitude?: number;
      longitude?: number;
      // Visual
      logo?: string;
      coverPhoto?: string;
      // Business
      hours?: Record<string, string>;
      priceRange?: string;
      founded?: string;
      companyOverview?: string;
      mission?: string;
      products?: string;
      generalInfo?: string;
      // Engagement
      fanCount?: number;
      followersCount?: number;
      talkingAboutCount?: number;
      checkInCount?: number;
      ratingCount?: number;
      averageRating?: number;
    } = {};

    if (businessDataResponse.ok) {
      const fbData = await businessDataResponse.json();
      console.log('[Meta OAuth] Raw Facebook data:', JSON.stringify(fbData, null, 2));

      businessData = {
        // Basic info
        name: fbData.name,
        about: fbData.about,
        description: fbData.description,
        bio: fbData.bio,
        category: fbData.category,
        categories: fbData.category_list?.map((c: { name: string }) => c.name) || [],
        website: fbData.website,
        pageUrl: fbData.link,
        username: fbData.username,
        // Contact
        phone: fbData.phone,
        email: fbData.emails?.[0],
        whatsapp: fbData.whatsapp_number,
        address: fbData.single_line_address || (fbData.location ?
          `${fbData.location.street || ''}, ${fbData.location.city || ''}, ${fbData.location.state || ''} ${fbData.location.zip || ''}`.replace(/^,\s*/, '').replace(/,\s*,/g, ',').trim() : undefined),
        city: fbData.location?.city,
        state: fbData.location?.state,
        country: fbData.location?.country,
        zip: fbData.location?.zip,
        latitude: fbData.location?.latitude,
        longitude: fbData.location?.longitude,
        // Visual
        logo: fbData.picture?.data?.url,
        coverPhoto: fbData.cover?.source,
        // Business details
        hours: fbData.hours,
        priceRange: fbData.price_range,
        founded: fbData.founded,
        companyOverview: fbData.company_overview,
        mission: fbData.mission,
        products: fbData.products,
        generalInfo: fbData.general_info,
        // Engagement
        fanCount: fbData.fan_count,
        followersCount: fbData.followers_count,
        talkingAboutCount: fbData.talking_about_count,
        checkInCount: fbData.were_here_count,
        ratingCount: fbData.rating_count,
        averageRating: fbData.overall_star_rating,
      };

      console.log('[Meta OAuth] Parsed business data:', JSON.stringify(businessData, null, 2));

      // Enrich Brand and Brand Brain with Facebook business data
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
            logo: brand.logo || businessData.logo,
            website: brand.website || businessData.website,
          },
        });

        // Build comprehensive Brand Brain data from Facebook
        const brainUpdateData: Record<string, unknown> = {};

        // Industry from categories
        if (!brand.brandBrain?.industry && businessData.category) {
          brainUpdateData.industry = businessData.category;
        }

        // Mission statement
        if (!brand.brandBrain?.mission && businessData.mission) {
          brainUpdateData.mission = businessData.mission;
        }

        // Company description (use company_overview, about, or description)
        if (!brand.brandBrain?.description) {
          const description = businessData.companyOverview || businessData.about || businessData.description;
          if (description) {
            brainUpdateData.description = description;
          }
        }

        // Brand summary (use bio or general_info if available)
        if (!brand.brandBrain?.brandSummary && (businessData.bio || businessData.generalInfo)) {
          brainUpdateData.brandSummary = businessData.bio || businessData.generalInfo;
        }

        // Unique selling points / differentiators from products
        if (!brand.brandBrain?.uniqueSellingPoints?.length && businessData.products) {
          const usps = businessData.products.split(',').map(p => p.trim()).filter(Boolean);
          if (usps.length > 0) {
            brainUpdateData.uniqueSellingPoints = usps.slice(0, 10);
          }
        }

        // Differentiators from categories (secondary categories as differentiators)
        if (!brand.brandBrain?.differentiators?.length && businessData.categories?.length) {
          brainUpdateData.differentiators = businessData.categories.slice(0, 5);
        }

        // Target market from engagement data (follower context)
        if (!brand.brandBrain?.targetMarket && (businessData.fanCount || businessData.followersCount)) {
          const followers = businessData.followersCount || businessData.fanCount || 0;
          const engagement = businessData.talkingAboutCount || 0;
          const rating = businessData.averageRating;

          let marketContext = `Facebook audience: ${followers.toLocaleString()} followers`;
          if (engagement > 0) marketContext += `, ${engagement.toLocaleString()} actively engaged`;
          if (rating) marketContext += `, ${rating.toFixed(1)}/5 star rating`;
          if (businessData.checkInCount) marketContext += `, ${businessData.checkInCount.toLocaleString()} check-ins`;

          brainUpdateData.targetMarket = marketContext;
        }

        // Update or create Brand Brain with enriched data
        if (brand.brandBrain) {
          if (Object.keys(brainUpdateData).length > 0) {
            await prisma.brandBrain.update({
              where: { id: brand.brandBrain.id },
              data: brainUpdateData,
            });
            console.log('[Meta OAuth] Updated BrandBrain with:', Object.keys(brainUpdateData));
          }
        } else {
          await prisma.brandBrain.create({
            data: {
              brandId: brandId,
              companyName: businessData.name,
              ...brainUpdateData,
            },
          });
          console.log('[Meta OAuth] Created BrandBrain with:', Object.keys(brainUpdateData));
        }
      }
    }

    // Save Facebook page with encrypted token
    console.log('[Meta OAuth] Step 7: Saving Facebook account for brandId:', brandId);
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

    console.log('[Meta OAuth] Step 7: Facebook account saved');

    // Check if there's an Instagram account connected
    console.log('[Meta OAuth] Step 8: Checking for Instagram account...');
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

    console.log('[Meta OAuth] Step 9: Complete - redirecting to success');

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
              console.log("[Meta OAuth Callback] Preparing to send postMessage...");
              console.log("[Meta OAuth Callback] Business data:", ${JSON.stringify(businessData)});

              // Notify parent window and close with business data
              if (window.opener) {
                console.log("[Meta OAuth Callback] Sending postMessage to parent window");
                const message = {
                  type: 'SOCIAL_CONNECT_SUCCESS',
                  platform: 'meta',
                  businessData: ${JSON.stringify(businessData)}
                };
                console.log("[Meta OAuth Callback] Message payload:", message);
                window.opener.postMessage(message, '*');
                console.log("[Meta OAuth Callback] postMessage sent!");
              } else {
                console.error("[Meta OAuth Callback] No window.opener found!");
              }

              setTimeout(() => {
                console.log("[Meta OAuth Callback] Closing popup...");
                window.close();
              }, 1500);
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
      `${baseUrl}${returnUrl}?success=meta`
    );
    response.cookies.delete('meta_oauth_state');

    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('[Meta OAuth] CALLBACK ERROR:', errorMessage);
    console.error('[Meta OAuth] Stack trace:', errorStack);
    console.error('[Meta OAuth] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

    // Check if this was opened in popup mode
    const isPopup = returnUrl && returnUrl !== '/dashboard/social/accounts';

    if (isPopup) {
      // Return HTML that shows error in the popup
      return new NextResponse(createErrorHtml(errorMessage), {
        headers: { 'Content-Type': 'text/html' },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/social/accounts?error=callback_failed&details=${encodeURIComponent(errorMessage)}`
    );
  }
}

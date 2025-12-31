/**
 * Meta (Facebook/Instagram) OAuth Connect
 * Initiates OAuth flow for connecting Facebook Pages and Instagram accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import crypto from 'crypto';

const META_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';

function getRedirectUri(request: NextRequest): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}/api/social/callback/meta`;
}

// Required scopes for posting to pages and Instagram
// Also request business info for Brand Brain enrichment
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'business_management',
].join(',');

export async function GET(request: NextRequest) {
  const { userId } = await getAuthWithBypass();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const platform = searchParams.get('platform') || 'facebook'; // 'facebook' or 'instagram'
  const returnUrl = searchParams.get('returnUrl') || '/dashboard/social/accounts';

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
  }

  // Generate state
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in database for CSRF protection
  // Store platform preference and return URL
  await prisma.oAuthState.create({
    data: {
      state,
      platform: platform === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK',
      brandId,
      userId,
      redirectUrl: JSON.stringify({ platform, returnUrl }), // Store both
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // Also store in cookie as backup
  const stateData = JSON.stringify({
    state,
    brandId,
    platform,
    userId,
  });

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID || '',
    redirect_uri: getRedirectUri(request),
    scope: SCOPES,
    state,
    response_type: 'code',
  });

  const authUrl = `${META_AUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);

  // Set state cookie (expires in 10 minutes)
  response.cookies.set('meta_oauth_state', stateData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}

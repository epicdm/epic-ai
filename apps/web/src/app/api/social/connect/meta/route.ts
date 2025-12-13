/**
 * Meta (Facebook/Instagram) OAuth Connect
 * Initiates OAuth flow for connecting Facebook Pages and Instagram accounts
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import crypto from 'crypto';

const META_AUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/social/callback/meta`;

// Required scopes for posting to pages and Instagram
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',');

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');
  const platform = searchParams.get('platform') || 'facebook'; // 'facebook' or 'instagram'

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
  }

  // Generate state
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in database for CSRF protection
  // Store platform preference in redirectUrl field
  await prisma.oAuthState.create({
    data: {
      state,
      platform: platform === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK',
      brandId,
      userId,
      redirectUrl: platform, // Store platform preference
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
    redirect_uri: REDIRECT_URI,
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

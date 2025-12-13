/**
 * LinkedIn OAuth 2.0 Connect
 * Initiates OAuth flow for connecting a LinkedIn account
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import crypto from 'crypto';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/social/callback/linkedin`;

// Required scopes for posting
const SCOPES = [
  'openid',
  'profile',
  'w_member_social',
].join(' ');

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const brandId = searchParams.get('brandId');

  if (!brandId) {
    return NextResponse.json({ error: 'Brand ID required' }, { status: 400 });
  }

  // Generate state
  const state = crypto.randomBytes(16).toString('hex');

  // Store state in database for CSRF protection
  await prisma.oAuthState.create({
    data: {
      state,
      platform: 'LINKEDIN',
      brandId,
      userId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // Also store in cookie as backup
  const stateData = JSON.stringify({
    state,
    brandId,
    userId,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
  });

  const authUrl = `${LINKEDIN_AUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);

  // Set state cookie (expires in 10 minutes)
  response.cookies.set('linkedin_oauth_state', stateData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}

/**
 * Twitter OAuth 2.0 Connect
 * Initiates OAuth flow for connecting a Twitter account
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@epic-ai/database';
import crypto from 'crypto';

const TWITTER_AUTH_URL = 'https://twitter.com/i/oauth2/authorize';
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/api/social/callback/twitter`;

// Required scopes for posting
const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
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

  // Generate state and code verifier for PKCE
  const state = crypto.randomBytes(16).toString('hex');
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Store state in database for CSRF protection
  await prisma.oAuthState.create({
    data: {
      state,
      platform: 'TWITTER',
      brandId,
      userId,
      codeVerifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  // Also store in cookie as backup
  const stateData = JSON.stringify({
    state,
    codeVerifier,
    brandId,
    userId,
  });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID || '',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `${TWITTER_AUTH_URL}?${params.toString()}`;

  const response = NextResponse.redirect(authUrl);

  // Set state cookie (expires in 10 minutes)
  response.cookies.set('twitter_oauth_state', stateData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  return response;
}

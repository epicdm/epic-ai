/**
 * Social Media Post Fetcher - Fetches recent posts from connected social accounts
 * Used for AI-powered brand analysis and auto-setup
 */

import { prisma, type SocialAccount } from '@epic-ai/database';
import { decryptToken } from '@/lib/encryption';

export interface FetchedPost {
  platform: string;
  content: string;
  createdAt: string;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
}

export interface AccountInfo {
  displayName?: string;
  bio?: string;
  followerCount?: number;
  category?: string;
  websiteUrl?: string;
}

/**
 * Fetch recent posts from all connected social accounts for a brand
 */
export async function fetchPostsFromAccounts(brandId: string): Promise<{
  posts: FetchedPost[];
  accountInfo: AccountInfo;
  accountsAnalyzed: string[];
}> {
  // Get all connected social accounts
  const accounts = await prisma.socialAccount.findMany({
    where: {
      brandId,
      status: 'CONNECTED',
    },
  });

  if (accounts.length === 0) {
    return { posts: [], accountInfo: {}, accountsAnalyzed: [] };
  }

  const allPosts: FetchedPost[] = [];
  const accountsAnalyzed: string[] = [];
  let accountInfo: AccountInfo = {};

  for (const account of accounts) {
    try {
      const result = await fetchPostsFromAccount(account);
      allPosts.push(...result.posts);
      accountsAnalyzed.push(`${account.platform}: ${account.displayName || account.username}`);

      // Use the first account's info as primary
      if (!accountInfo.displayName && result.accountInfo) {
        accountInfo = result.accountInfo;
      }
    } catch (error) {
      console.error(`Failed to fetch posts from ${account.platform}:`, error);
    }
  }

  return { posts: allPosts, accountInfo, accountsAnalyzed };
}

/**
 * Fetch posts from a single social account
 */
async function fetchPostsFromAccount(account: SocialAccount): Promise<{
  posts: FetchedPost[];
  accountInfo: AccountInfo;
}> {
  const accessToken = account.accessToken ? decryptToken(account.accessToken) : null;

  if (!accessToken) {
    return { posts: [], accountInfo: {} };
  }

  switch (account.platform) {
    case 'FACEBOOK':
      return fetchFacebookPosts(account, accessToken);
    case 'INSTAGRAM':
      return fetchInstagramPosts(account, accessToken);
    // Add more platforms as needed
    default:
      return { posts: [], accountInfo: {} };
  }
}

/**
 * Fetch posts from Facebook Page
 */
async function fetchFacebookPosts(
  account: SocialAccount,
  accessToken: string
): Promise<{ posts: FetchedPost[]; accountInfo: AccountInfo }> {
  const pageId = account.platformId;
  if (!pageId) {
    return { posts: [], accountInfo: {} };
  }

  try {
    // Fetch page info
    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?fields=name,about,category,fan_count,website&access_token=${accessToken}`
    );

    let accountInfo: AccountInfo = {
      displayName: account.displayName || undefined,
    };

    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      accountInfo = {
        displayName: pageData.name,
        bio: pageData.about,
        followerCount: pageData.fan_count,
        category: pageData.category,
        websiteUrl: pageData.website,
      };
    }

    // Fetch recent posts
    const postsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?fields=message,created_time,reactions.summary(total_count),comments.summary(total_count),shares&limit=50&access_token=${accessToken}`
    );

    if (!postsResponse.ok) {
      console.error('Failed to fetch Facebook posts:', await postsResponse.text());
      return { posts: [], accountInfo };
    }

    const postsData = await postsResponse.json();
    const posts: FetchedPost[] = (postsData.data || [])
      .filter((post: { message?: string }) => post.message) // Only posts with content
      .map((post: {
        message: string;
        created_time: string;
        reactions?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
        shares?: { count?: number };
      }) => ({
        platform: 'Facebook',
        content: post.message,
        createdAt: post.created_time,
        likes: post.reactions?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
        shares: post.shares?.count || 0,
      }));

    return { posts, accountInfo };
  } catch (error) {
    console.error('Error fetching Facebook posts:', error);
    return { posts: [], accountInfo: {} };
  }
}

/**
 * Fetch posts from Instagram Business Account
 */
async function fetchInstagramPosts(
  account: SocialAccount,
  accessToken: string
): Promise<{ posts: FetchedPost[]; accountInfo: AccountInfo }> {
  // Get Instagram account ID from platform data
  const platformData = account.platformData as { instagramAccountId?: string } | null;
  const igAccountId = platformData?.instagramAccountId || account.platformId;

  if (!igAccountId) {
    return { posts: [], accountInfo: {} };
  }

  try {
    // Fetch account info
    const accountResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}?fields=username,name,biography,followers_count,website&access_token=${accessToken}`
    );

    let accountInfo: AccountInfo = {
      displayName: account.displayName || undefined,
    };

    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      accountInfo = {
        displayName: accountData.name || accountData.username,
        bio: accountData.biography,
        followerCount: accountData.followers_count,
        websiteUrl: accountData.website,
      };
    }

    // Fetch recent posts
    const postsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${igAccountId}/media?fields=caption,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`
    );

    if (!postsResponse.ok) {
      console.error('Failed to fetch Instagram posts:', await postsResponse.text());
      return { posts: [], accountInfo };
    }

    const postsData = await postsResponse.json();
    const posts: FetchedPost[] = (postsData.data || [])
      .filter((post: { caption?: string }) => post.caption) // Only posts with captions
      .map((post: {
        caption: string;
        timestamp: string;
        like_count?: number;
        comments_count?: number;
      }) => ({
        platform: 'Instagram',
        content: post.caption,
        createdAt: post.timestamp,
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
      }));

    return { posts, accountInfo };
  } catch (error) {
    console.error('Error fetching Instagram posts:', error);
    return { posts: [], accountInfo: {} };
  }
}

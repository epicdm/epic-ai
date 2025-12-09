/**
 * Postiz API Service
 *
 * This service provides integration with our self-hosted Postiz instance.
 * Postiz handles all social media OAuth, scheduling, and publishing.
 *
 * API Documentation: https://docs.postiz.com/public-api
 */

import { prisma } from "@epic-ai/database";

// Trim to handle any trailing whitespace or newlines from environment variables
const POSTIZ_URL = (process.env.POSTIZ_URL || "http://localhost:5000").trim();
const POSTIZ_API_BASE = `${POSTIZ_URL}/api/public/v1`;

// Simple in-memory cache (for serverless, each instance has its own cache)
const cache = new Map<string, { data: unknown; expiresAt: number }>();

// Cache TTLs in seconds
const CACHE_TTL = {
  integrations: 300, // 5 minutes
  posts: 60, // 1 minute
};

export interface PostizIntegration {
  id: string;
  name: string;
  identifier: string; // platform type: x, linkedin, facebook, etc.
  picture?: string;
  profile?: string;
  disabled: boolean;
}

export interface PostizPost {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT";
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture?: string;
  };
}

export interface CreatePostOptions {
  type: "draft" | "schedule" | "now";
  date: Date;
  content: string;
  integrationIds: string[];
  images?: { id: string; path: string }[];
}

/**
 * Get the Postiz dashboard URL for a user to manage their accounts
 */
export function getPostizDashboardUrl(): string {
  return POSTIZ_URL;
}

/**
 * Get the URL to connect a new social account in Postiz
 */
export function getPostizConnectUrl(platform?: string): string {
  const base = (process.env.NEXT_PUBLIC_POSTIZ_URL || POSTIZ_URL).trim();
  if (platform) {
    return `${base}/settings/channels/${platform}`;
  }
  return `${base}/settings/channels`;
}

/**
 * Get the URL to create a new post in Postiz
 */
export function getPostizCreatePostUrl(): string {
  return `${POSTIZ_URL}/launches`;
}

/**
 * Platform display info
 */
export const PLATFORMS = {
  x: { name: "X (Twitter)", icon: "twitter", color: "bg-black" },
  twitter: { name: "X (Twitter)", icon: "twitter", color: "bg-black" },
  linkedin: { name: "LinkedIn", icon: "linkedin", color: "bg-blue-600" },
  facebook: { name: "Facebook", icon: "facebook", color: "bg-blue-500" },
  instagram: {
    name: "Instagram",
    icon: "instagram",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
  },
  threads: { name: "Threads", icon: "at-sign", color: "bg-black" },
  bluesky: { name: "Bluesky", icon: "cloud", color: "bg-blue-400" },
  tiktok: { name: "TikTok", icon: "music", color: "bg-black" },
  youtube: { name: "YouTube", icon: "youtube", color: "bg-red-600" },
  pinterest: { name: "Pinterest", icon: "pin", color: "bg-red-500" },
  reddit: { name: "Reddit", icon: "message-circle", color: "bg-orange-500" },
  mastodon: { name: "Mastodon", icon: "hash", color: "bg-purple-600" },
  telegram: { name: "Telegram", icon: "send", color: "bg-blue-400" },
} as const;

/**
 * Postiz API client for server-side calls
 * Requires a Postiz API key (obtained from Postiz settings)
 */
export class PostizClient {
  private apiKey: string;
  private orgId: string;

  constructor(apiKey: string, orgId: string) {
    this.apiKey = apiKey;
    this.orgId = orgId;
  }

  private getCached<T>(key: string): T | null {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      cache.delete(key);
      return null;
    }
    return item.data as T;
  }

  private setCache(key: string, data: unknown, ttlSeconds: number): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private invalidateCache(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key);
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${POSTIZ_API_BASE}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Postiz API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Get all connected social accounts (integrations)
   */
  async getIntegrations(useCache = true): Promise<PostizIntegration[]> {
    const cacheKey = `postiz:integrations:${this.orgId}`;

    if (useCache) {
      const cached = this.getCached<PostizIntegration[]>(cacheKey);
      if (cached) return cached;
    }

    const data = await this.request<PostizIntegration[]>("/integrations");
    this.setCache(cacheKey, data, CACHE_TTL.integrations);
    return data;
  }

  /**
   * Get posts within a date range
   */
  async getPosts(
    startDate?: Date,
    endDate?: Date,
    useCache = true
  ): Promise<PostizPost[]> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate.toISOString());
    if (endDate) params.set("endDate", endDate.toISOString());

    const cacheKey = `postiz:posts:${this.orgId}:${params.toString()}`;

    if (useCache) {
      const cached = this.getCached<{ posts: PostizPost[] }>(cacheKey);
      if (cached) return cached.posts || [];
    }

    const data = await this.request<{ posts: PostizPost[] }>(
      `/posts?${params.toString()}`
    );
    this.setCache(cacheKey, data, CACHE_TTL.posts);
    return data.posts || [];
  }

  /**
   * Create/schedule a post
   */
  async createPost(
    options: CreatePostOptions
  ): Promise<{ postId: string; integration: string }[]> {
    const posts = options.integrationIds.map((integrationId) => ({
      integration: { id: integrationId },
      value: [
        {
          content: options.content,
          image: options.images || [],
        },
      ],
    }));

    const payload = {
      type: options.type,
      date: options.date.toISOString(),
      shortLink: false,
      tags: [],
      posts,
    };

    const result = await this.request<
      { postId: string; integration: string }[]
    >("/posts", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Invalidate posts cache
    this.invalidateCache(`postiz:posts:${this.orgId}`);

    return result;
  }

  /**
   * Upload media from URL (useful for AI-generated images)
   */
  async uploadFromUrl(url: string): Promise<{ id: string; path: string }> {
    return this.request<{ id: string; path: string; name: string }>(
      "/upload-from-url",
      {
        method: "POST",
        body: JSON.stringify({ url }),
      }
    );
  }

  /**
   * Find the next available slot for a platform
   */
  async findSlot(integrationId: string): Promise<Date> {
    const data = await this.request<{ date: string }>(
      `/find-slot/${integrationId}`
    );
    return new Date(data.date);
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    await this.request(`/posts?id=${postId}`, { method: "DELETE" });
    this.invalidateCache(`postiz:posts:${this.orgId}`);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getIntegrations(false);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Get Postiz client for an organization
 */
export async function getPostizClient(
  organizationId: string
): Promise<PostizClient | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { postizApiKey: true },
  });

  if (!org?.postizApiKey) return null;

  return new PostizClient(org.postizApiKey, organizationId);
}

/**
 * Save Postiz API key for organization
 */
export async function savePostizApiKey(
  organizationId: string,
  apiKey: string
): Promise<boolean> {
  const client = new PostizClient(apiKey, organizationId);

  const isValid = await client.testConnection();
  if (!isValid) return false;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      postizApiKey: apiKey,
      postizConnectedAt: new Date(),
    },
  });

  return true;
}

/**
 * Check if Postiz is running and accessible
 */
export async function checkPostizHealth(): Promise<boolean> {
  try {
    const response = await fetch(POSTIZ_URL, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    // Consider 2xx and 3xx (redirects) as healthy
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

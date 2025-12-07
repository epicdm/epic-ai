/**
 * Postiz API Service
 *
 * This service provides integration with our self-hosted Postiz instance.
 * Postiz handles all social media OAuth, scheduling, and publishing.
 *
 * API Documentation: https://docs.postiz.com/public-api
 */

const POSTIZ_URL = process.env.POSTIZ_URL || "http://localhost:5000";

interface PostizIntegration {
  id: string;
  name: string;
  identifier: string;
  picture: string;
  disabled: boolean;
  profile: string;
}

interface PostizPost {
  id: string;
  content: string;
  publishDate: string;
  releaseURL?: string;
  state: "QUEUE" | "PUBLISHED" | "ERROR" | "DRAFT";
  integration: {
    id: string;
    providerIdentifier: string;
    name: string;
    picture: string;
  };
}

interface CreatePostInput {
  type: "draft" | "schedule" | "now";
  date?: string;
  posts: {
    integration: string;
    content: string;
    media?: string[];
  }[];
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
export function getPostizConnectUrl(): string {
  return `${POSTIZ_URL}/launches`;
}

/**
 * Get the URL to create a new post in Postiz
 */
export function getPostizCreatePostUrl(): string {
  return `${POSTIZ_URL}/launches`;
}

/**
 * Postiz API client for server-side calls
 * Requires a Postiz API key (obtained from Postiz settings)
 */
export class PostizClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = `${POSTIZ_URL}/public/v1`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: this.apiKey,
        "Content-Type": "application/json",
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
  async getIntegrations(): Promise<PostizIntegration[]> {
    return this.request<PostizIntegration[]>("/integrations");
  }

  /**
   * Get posts within a date range
   */
  async getPosts(
    startDate: string,
    endDate: string
  ): Promise<{ posts: PostizPost[] }> {
    const params = new URLSearchParams({ startDate, endDate });
    return this.request<{ posts: PostizPost[] }>(`/posts?${params}`);
  }

  /**
   * Create a new post
   */
  async createPost(input: CreatePostInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("/posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  /**
   * Upload media from URL
   */
  async uploadFromUrl(url: string): Promise<{ id: string; path: string }> {
    return this.request<{ id: string; path: string }>("/upload-from-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    });
  }

  /**
   * Find the next available slot for a platform
   */
  async findSlot(integrationId: string): Promise<{ time: string }> {
    return this.request<{ time: string }>(`/find-slot/${integrationId}`);
  }
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

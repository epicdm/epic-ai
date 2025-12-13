/**
 * Social Metrics Collector
 * TODO: Implement when social analytics are complete
 */

import type { SocialPlatform } from '@prisma/client';

export interface SocialMetrics {
  impressions: number;
  engagements: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  videoViews?: number;
  avgWatchTime?: number;
}

export interface PostMetrics extends SocialMetrics {
  postId: string;
  platform: SocialPlatform;
  contentId?: string;
  recordedAt: Date;
}

export class SocialMetricsCollector {
  private brandId: string;

  constructor(brandId: string) {
    this.brandId = brandId;
  }

  /**
   * Collect metrics for all connected accounts
   * TODO: Implement when social platforms are connected
   */
  async collectAll(): Promise<PostMetrics[]> {
    console.log(`Collecting metrics for brand ${this.brandId} - not yet implemented`);
    return [];
  }

  /**
   * Collect metrics from a specific platform
   */
  async collectFromPlatform(_platform: SocialPlatform): Promise<PostMetrics[]> {
    return [];
  }

  /**
   * Store collected metrics
   */
  async storeMetrics(_metrics: PostMetrics[]): Promise<void> {
    // Stub implementation
  }

  /**
   * Get stored metrics for a time range
   */
  async getStoredMetrics(
    _startDate: Date,
    _endDate: Date,
    _platform?: SocialPlatform
  ): Promise<PostMetrics[]> {
    return [];
  }
}

/**
 * Export default collector function
 */
export async function collectSocialMetrics(brandId: string): Promise<PostMetrics[]> {
  const collector = new SocialMetricsCollector(brandId);
  return collector.collectAll();
}

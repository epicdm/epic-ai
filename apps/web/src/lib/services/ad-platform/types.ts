/**
 * Ad Platform Types
 * Unified types for Meta Ads and Google Ads integration
 */

import type { AdPlatform, AccountStatus } from '@prisma/client';

export type AdAccountStatus = AccountStatus;

export interface AdAccountTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface AdAccountInfo {
  platformAccountId: string;
  accountName: string;
  currency?: string;
  timezone?: string;
  status?: AdAccountStatus;
}

export interface AdCampaignConfig {
  name: string;
  objective: CampaignObjective;
  budget: {
    type: 'daily' | 'lifetime';
    amount: number; // In cents
    currency: string;
  };
  schedule?: {
    startDate: Date;
    endDate?: Date;
  };
  targeting: AdTargeting;
}

export type CampaignObjective =
  | 'AWARENESS'
  | 'TRAFFIC'
  | 'ENGAGEMENT'
  | 'LEADS'
  | 'APP_PROMOTION'
  | 'SALES';

export interface AdTargeting {
  locations?: LocationTarget[];
  ageRange?: { min: number; max: number };
  genders?: ('male' | 'female' | 'all')[];
  interests?: string[];
  behaviors?: string[];
  customAudiences?: string[];
  lookalikes?: string[];
  keywords?: string[];
  placements?: AdPlacement[];
  devices?: ('mobile' | 'desktop' | 'tablet')[];
}

export interface LocationTarget {
  type: 'country' | 'region' | 'city' | 'postal' | 'radius';
  value: string;
  radius?: { value: number; unit: 'km' | 'mi' };
}

export type AdPlacement =
  | 'FACEBOOK_FEED'
  | 'FACEBOOK_STORIES'
  | 'FACEBOOK_REELS'
  | 'INSTAGRAM_FEED'
  | 'INSTAGRAM_STORIES'
  | 'INSTAGRAM_REELS'
  | 'INSTAGRAM_EXPLORE'
  | 'AUDIENCE_NETWORK'
  | 'MESSENGER'
  | 'GOOGLE_SEARCH'
  | 'GOOGLE_DISPLAY'
  | 'YOUTUBE';

export interface AdCreativeConfig {
  format: AdFormat;
  primaryText: string;
  headline?: string;
  description?: string;
  callToAction: CallToAction;
  linkUrl: string;
  mediaUrls: string[];
  displayUrl?: string;
}

export type AdFormat =
  | 'SINGLE_IMAGE'
  | 'SINGLE_VIDEO'
  | 'CAROUSEL'
  | 'COLLECTION'
  | 'RESPONSIVE_DISPLAY'
  | 'RESPONSIVE_SEARCH';

export type CallToAction =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'BOOK_NOW'
  | 'CONTACT_US'
  | 'GET_QUOTE'
  | 'DOWNLOAD'
  | 'APPLY_NOW'
  | 'SUBSCRIBE';

export interface CampaignResult {
  success: boolean;
  platform: AdPlatform;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  error?: string;
}

export interface AdMetrics {
  impressions: number;
  reach?: number;
  clicks: number;
  ctr: number; // Click-through rate
  spend: number; // In cents
  cpc: number; // Cost per click in cents
  cpm: number; // Cost per 1000 impressions in cents
  conversions?: number;
  costPerConversion?: number;
  roas?: number; // Return on ad spend
}

export interface AdPlatformClient {
  platform: AdPlatform;
  createCampaign(config: AdCampaignConfig): Promise<CampaignResult>;
  pauseCampaign(campaignId: string): Promise<boolean>;
  resumeCampaign(campaignId: string): Promise<boolean>;
  deleteCampaign(campaignId: string): Promise<boolean>;
  createAd(campaignId: string, creative: AdCreativeConfig): Promise<CampaignResult>;
  getMetrics(campaignId: string, startDate: Date, endDate: Date): Promise<AdMetrics>;
  getAccountInfo(): Promise<AdAccountInfo>;
  refreshTokenIfNeeded(): Promise<AdAccountTokens | null>;
}

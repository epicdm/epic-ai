/**
 * Content Factory Types
 */

import type { SocialPlatform, ContentType, ContentStatus, ApprovalStatus, VariationStatus } from '@prisma/client';

export interface ContentRequest {
  brandId: string;
  contentType: ContentType;
  targetPlatforms: SocialPlatform[];
  topic?: string;
  contextItemIds?: string[];
  category?: string;
  includeImage?: boolean;
  customInstructions?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
}

export interface GeneratedContent {
  content: string;
  variations: PlatformVariation[];
  suggestedHashtags: string[];
  suggestedEmojis: string[];
  imagePrompt?: string;
  category: string;
  contentType: ContentType;
}

export interface PlatformVariation {
  platform: SocialPlatform;
  content: string;
  characterCount: number;
  hashtags: string[];
  isWithinLimit: boolean;
  mediaPrompt?: string;
}

export interface ContentCalendarSlot {
  date: Date;
  time: string;
  platform: SocialPlatform;
  category: string;
}

export interface QueuedContent {
  id: string;
  content: string;
  contentType: ContentType;
  category: string;
  status: ContentStatus;
  approvalStatus: ApprovalStatus;
  scheduledFor?: Date;
  variations: SavedVariation[];
  createdAt: Date;
}

export interface SavedVariation {
  id: string;
  platform: SocialPlatform;
  text: string;
  hashtags: string[];
  characterCount: number;
  isOptimal: boolean;
  status: VariationStatus;
  accountId?: string;
  postId?: string;
  postUrl?: string;
  publishedAt?: Date;
  error?: string;
}

export interface BatchRequest {
  brandId: string;
  count: number;
  platforms: SocialPlatform[];
  categories?: string[];
  scheduleFrom?: Date;
  autoApprove?: boolean;
}

export const PLATFORM_LIMITS: Record<SocialPlatform, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
  TIKTOK: 2200,
  YOUTUBE: 5000,
  THREADS: 500,
  BLUESKY: 300,
};

export const PLATFORM_BEST_PRACTICES: Record<SocialPlatform, { optimalLength: number; hashtagLimit: number }> = {
  TWITTER: { optimalLength: 240, hashtagLimit: 3 },
  LINKEDIN: { optimalLength: 1300, hashtagLimit: 5 },
  FACEBOOK: { optimalLength: 500, hashtagLimit: 3 },
  INSTAGRAM: { optimalLength: 2000, hashtagLimit: 30 },
  TIKTOK: { optimalLength: 300, hashtagLimit: 5 },
  YOUTUBE: { optimalLength: 500, hashtagLimit: 10 },
  THREADS: { optimalLength: 400, hashtagLimit: 3 },
  BLUESKY: { optimalLength: 250, hashtagLimit: 3 },
};

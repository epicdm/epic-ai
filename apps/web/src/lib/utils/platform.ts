/**
 * Platform Utilities
 * Helper functions for social media platforms
 */

import {
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  type LucideIcon,
} from "lucide-react";

export type SocialPlatform =
  | "TWITTER"
  | "LINKEDIN"
  | "FACEBOOK"
  | "INSTAGRAM"
  | "TIKTOK"
  | "YOUTUBE"
  | "THREADS"
  | "BLUESKY";

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
  YOUTUBE: Youtube,
};

const PLATFORM_COLORS: Record<string, string> = {
  TWITTER: "bg-black",
  LINKEDIN: "bg-[#0077B5]",
  FACEBOOK: "bg-[#1877F2]",
  INSTAGRAM: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
  TIKTOK: "bg-black",
  YOUTUBE: "bg-[#FF0000]",
  THREADS: "bg-black",
  BLUESKY: "bg-[#0085FF]",
};

const PLATFORM_NAMES: Record<string, string> = {
  TWITTER: "Twitter/X",
  LINKEDIN: "LinkedIn",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  THREADS: "Threads",
  BLUESKY: "Bluesky",
};

export function getPlatformIcon(platform: string): LucideIcon | undefined {
  return PLATFORM_ICONS[platform];
}

export function getPlatformColor(platform: string): string {
  return PLATFORM_COLORS[platform] || "bg-gray-500";
}

export function getPlatformName(platform: string): string {
  return PLATFORM_NAMES[platform] || platform;
}

export function getPlatformCharLimit(platform: string): number {
  const limits: Record<string, number> = {
    TWITTER: 280,
    LINKEDIN: 3000,
    FACEBOOK: 63206,
    INSTAGRAM: 2200,
    TIKTOK: 2200,
    YOUTUBE: 5000,
    THREADS: 500,
    BLUESKY: 300,
  };
  return limits[platform] || 500;
}

export function getPlatformOptimalLength(platform: string): number {
  const optimal: Record<string, number> = {
    TWITTER: 240,
    LINKEDIN: 1300,
    FACEBOOK: 500,
    INSTAGRAM: 2000,
    TIKTOK: 300,
    YOUTUBE: 500,
    THREADS: 400,
    BLUESKY: 250,
  };
  return optimal[platform] || 300;
}

export function isContentOptimal(content: string, platform: string): boolean {
  const optimal = getPlatformOptimalLength(platform);
  const limit = getPlatformCharLimit(platform);
  return content.length <= optimal && content.length <= limit;
}

export function formatPlatformList(platforms: string[]): string {
  return platforms.map(getPlatformName).join(", ");
}

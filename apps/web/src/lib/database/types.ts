import type { BrandBrain, BrandAudience } from "@prisma/client";
import { VoiceTone, EmojiFrequency } from "@prisma/client";

type BrandVoiceTone = 'professional' | 'friendly' | 'witty' | 'authoritative';
type BrandEmojiUsage = 'none' | 'minimal' | 'moderate' | 'heavy';

export type BrandVoice = {
  tone: BrandVoiceTone;
  formality: number;
  emojiUsage: BrandEmojiUsage;
  hashtagUsage: boolean;
  prohibitedWords: string[];
  targetAudience: {
    demographics: string;
    painPoints: string[];
    goals: string[];
  };
};

export type BrandBrainWithRelations = BrandBrain & {
  audiences?: BrandAudience[];
};

export type FlywheelStatus = {
  phases: Record<string, {
    percent: number;
    status: 'healthy' | 'degraded' | 'blocked';
    lastUpdated: Date;
  }>;
  overallHealth: number;
};

// Helper type conversions
const toneMap: Record<VoiceTone, BrandVoiceTone> = {
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  WITTY: 'witty',
  AUTHORITATIVE: 'authoritative'
};

const emojiMap: Record<EmojiFrequency, BrandEmojiUsage> = {
  NONE: 'none',
  MINIMAL: 'minimal',
  MODERATE: 'moderate',
  HEAVY: 'heavy'
};

export function convertVoiceTone(tone: VoiceTone): BrandVoiceTone {
  return toneMap[tone];
}

export function convertEmojiUsage(freq: EmojiFrequency): BrandEmojiUsage {
  return emojiMap[freq];
}

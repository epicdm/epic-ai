import { prisma } from "@/lib/database";
import type { BrandVoice } from "@/lib/database/types";
import { convertVoiceTone, convertEmojiUsage } from "@/lib/database/types";

const toneMap = {
  // Add tone mappings here
};

const emojiMap = {
  // Add emoji frequency mappings here
};

export async function getBrandVoice(brandId: string): Promise<BrandVoice> {
  const brain = await prisma.brandBrain.findUnique({
    where: { brandId },
    include: { 
      audiences: {
        where: { isPrimary: true },
        take: 1
      }
    }
  });

  if (!brain || !brain.audiences?.length) {
    throw new Error("Brand voice or primary audience not configured");
  }

  const primaryAudience = brain.audiences[0];
  
  return {
    tone: convertVoiceTone(brain.voiceTone),
    formality: brain.formalityLevel || 3,
    emojiUsage: convertEmojiUsage(brain.emojiFrequency),
    hashtagUsage: brain.useHashtags || true,
    prohibitedWords: brain.doNotMention || [],
    targetAudience: {
      demographics: primaryAudience.demographics || '',
      painPoints: primaryAudience.painPoints || [],
      goals: primaryAudience.goals || []
    }
  };
}

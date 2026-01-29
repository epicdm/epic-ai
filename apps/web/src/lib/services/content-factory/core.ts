import { OpenAI } from "openai";
import type { BrandVoice } from "@/lib/brand-brain/types";

type ContentPlatform = 'twitter' | 'linkedin' | 'facebook' | 'instagram';

type ContentRequest = {
  topic: string;
  brandVoice: BrandVoice;
  platforms: ContentPlatform[];
  context?: string;
};

type GeneratedContent = {
  platform: ContentPlatform;
  content: string;
  variations: string[];
};

export async function generateContent(request: ContentRequest): Promise<GeneratedContent[]> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Generate base content with GPT-4o
  const baseContent = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a content generator for ${request.brandVoice.tone} brands.\n` +
          `Formality level: ${request.brandVoice.formality}/5\n` +
          `Audience: ${request.brandVoice.targetAudience.demographics}\n` +
          `Avoid: ${request.brandVoice.prohibitedWords.join(', ')}`
      },
      {
        role: "user",
        content: request.topic
      }
    ]
  });

  // Platform-specific formatting
  return request.platforms.map(platform => {
    return {
      platform,
      content: formatForPlatform(baseContent.choices[0].message.content || "", platform),
      variations: [] // TODO: Generate variations
    };
  });
}

function formatForPlatform(content: string, platform: ContentPlatform): string {
  switch(platform) {
    case 'twitter':
      return content.slice(0, 280); // Truncate to 280 chars
    case 'linkedin':
      return content; // No formatting needed
    case 'facebook':
      return content; // No formatting needed
    case 'instagram':
      return `${content}\n\n${'💡'.repeat(3)}`; // Add emojis
  }
}

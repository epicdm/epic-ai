/**
 * AI Content Generation API
 * Generates content based on topic and brand voice
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, topic, templates, platform = "twitter" } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    // Get brand brain for voice/tone
    let brandContext = "";
    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          brandBrain: true,
        },
      });

      if (brand?.brandBrain) {
        const brain = brand.brandBrain;
        brandContext = `
Brand Name: ${brand.name}
Industry: ${brand.industry || "Not specified"}
Voice: Formality ${brain.formality}/5
Personality: ${brain.personality || "Professional"}
Writing Style: ${brain.writingStyle || "Conversational"}
${brain.avoidWords ? `Avoid these topics/words: ${brain.avoidWords}` : ""}
`;
      }
    }

    // Build template context
    let templateContext = "";
    if (templates?.length > 0) {
      templateContext = `\nUse this content structure: ${templates[0].structure}`;
    }

    // Platform-specific settings
    const platformSettings: Record<string, { maxLength: number; style: string }> = {
      twitter: {
        maxLength: 280,
        style: "Punchy, engaging, use line breaks for readability",
      },
      linkedin: {
        maxLength: 1500,
        style: "Professional, thought-leadership, story-driven",
      },
      facebook: {
        maxLength: 500,
        style: "Conversational, community-focused",
      },
      instagram: {
        maxLength: 800,
        style: "Visual storytelling, engaging, emoji-friendly",
      },
    };

    const settings = platformSettings[platform] || platformSettings.twitter;

    const prompt = `Generate a ${platform} post about: "${topic}"

${brandContext}
${templateContext}

Platform: ${platform}
Max length: ${settings.maxLength} characters
Style: ${settings.style}

Write a single post that would perform well on ${platform}. Be authentic and engaging.
Do not include hashtags - they will be added separately.
Return ONLY the post content, no labels or explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert social media content creator. Write engaging, platform-specific content that matches the brand voice provided.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "";

    return NextResponse.json({
      content,
      platform,
      topic,
    });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

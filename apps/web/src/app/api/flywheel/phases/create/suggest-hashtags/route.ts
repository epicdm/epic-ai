/**
 * AI Hashtag Suggestions API
 * Generates relevant hashtags based on brand and content
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
    const { brandId, existingHashtags = [] } = body;

    // Get brand context
    let brandContext = "";
    let industry = "business";

    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          brandBrain: true,
          contentPillars: true,
        },
      });

      if (brand) {
        industry = brand.industry || "business";
        const pillars = brand.contentPillars
          ?.map((p) => p.name)
          .join(", ") || "";

        brandContext = `
Brand Name: ${brand.name}
Industry: ${industry}
Content Pillars: ${pillars}
`;
      }
    }

    const existingStr = existingHashtags.length > 0
      ? `\n\nAlready have these hashtags (don't repeat): ${existingHashtags.join(", ")}`
      : "";

    const prompt = `Suggest 8-10 relevant hashtags for a ${industry} brand.

${brandContext}
${existingStr}

Generate hashtags that:
- Are relevant to the industry and brand
- Have good discoverability (not too broad, not too niche)
- Mix of branded and generic hashtags
- Work well on Twitter and LinkedIn

Respond with JSON only:
{
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}

Include the # symbol with each hashtag. Make them lowercase.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a social media marketing expert. Generate relevant, discoverable hashtags. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || '{"hashtags": []}');
    } catch {
      console.error("Error parsing AI response:", responseText);
      result = { hashtags: [] };
    }

    // Clean up hashtags
    const hashtags = (result.hashtags || [])
      .map((tag: string) => {
        let clean = tag.trim().toLowerCase();
        if (!clean.startsWith("#")) {
          clean = "#" + clean;
        }
        return clean.replace(/[^a-zA-Z0-9#_]/g, "");
      })
      .filter((tag: string) => tag.length > 1 && !existingHashtags.includes(tag));

    return NextResponse.json({ hashtags });
  } catch (error) {
    console.error("Hashtag suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate hashtags" },
      { status: 500 }
    );
  }
}

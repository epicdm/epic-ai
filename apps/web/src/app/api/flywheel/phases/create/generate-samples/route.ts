/**
 * AI Sample Content Generation API
 * Generates sample content pieces based on brand
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
    const { brandId, templates, count = 3 } = body;

    // Get brand brain for context
    let brandContext = "";
    let industry = "business";

    if (brandId) {
      const brand = await prisma.brand.findUnique({
        where: { id: brandId },
        include: {
          brandBrain: true,
        },
      });

      if (brand?.brandBrain) {
        const brain = brand.brandBrain;
        industry = brand.industry || "business";
        brandContext = `
Brand Name: ${brand.name}
Industry: ${industry}
Description: ${brand.description || ""}
Voice: Formality ${brain.formality}/5
Personality: ${brain.personality || "Professional"}
Writing Style: ${brain.writingStyle || "Conversational"}
`;
      }
    }

    // Get template context
    let templateContext = "";
    if (templates?.length > 0) {
      templateContext = templates
        .map((t: { name: string; structure: string }) => `- ${t.name}: ${t.structure}`)
        .join("\n");
    }

    const prompt = `Generate ${count} sample social media posts for a ${industry} brand.

${brandContext}

${templateContext ? `Use these content structures:\n${templateContext}` : ""}

Create diverse, engaging posts across different topics relevant to this brand.
Make each post unique in topic and style.

Respond with JSON only:
{
  "samples": [
    {
      "topic": "Brief topic description",
      "content": "The actual post content (max 280 chars)",
      "platform": "twitter"
    }
  ]
}

Mix platforms (twitter, linkedin). Make content authentic and engaging.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an expert social media content creator. Generate diverse, platform-specific content. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.9,
      max_tokens: 1500,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || '{"samples": []}');
    } catch {
      console.error("Error parsing AI response:", responseText);
      result = { samples: [] };
    }

    return NextResponse.json({
      samples: result.samples || [],
    });
  } catch (error) {
    console.error("Sample generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate samples" },
      { status: 500 }
    );
  }
}

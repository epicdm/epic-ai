import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";

// Lazy initialization to avoid build-time errors
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * POST - Generate ad copy with AI
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const {
      platform,
      objective,
      targetAudience,
      productDescription,
      tone,
      includeImage,
      variations = 3,
    } = body;

    // Get brand settings if available
    const autopilotSettings = await prisma.autopilotSettings.findUnique({
      where: { organizationId: org.id },
    });

    const brandVoice = autopilotSettings?.brandDescription || "";
    const defaultTone = autopilotSettings?.defaultTone || tone || "professional";

    const openai = getOpenAI();

    // Generate ad copy
    const prompt = `Generate ${variations} ad variations for a ${platform || "Facebook"} advertising campaign.

Campaign Details:
- Objective: ${objective || "Lead Generation"}
- Target Audience: ${targetAudience || "Small business owners"}
- Product/Service: ${productDescription || "AI-powered business automation platform"}
- Tone: ${defaultTone}
${brandVoice ? `- Brand Voice: ${brandVoice}` : ""}

For each variation, provide:
1. Headline (max 40 characters)
2. Primary Text (main ad copy, max 125 characters for best performance)
3. Description (optional, max 30 characters)
4. Call to Action suggestion

Format your response as JSON array:
[
  {
    "headline": "...",
    "primaryText": "...",
    "description": "...",
    "callToAction": "..."
  }
]

Make each variation distinct in approach:
- Variation 1: Focus on problem/pain point
- Variation 2: Focus on benefits/transformation
- Variation 3: Focus on social proof/credibility

Output ONLY the JSON array, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert performance marketer who creates high-converting ad copy. You understand platform-specific best practices and character limits.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    let adVariations = [];
    try {
      const content = completion.choices[0]?.message?.content || "[]";
      // Extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        adVariations = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse ad variations:", e);
    }

    // Generate image if requested
    let imageUrl = null;
    if (includeImage) {
      try {
        const imagePrompt = `Professional advertisement image for: ${productDescription || "AI business automation software"}.
Style: Clean, modern, corporate.
Include: Abstract technology elements, professional colors (blue, white).
Do NOT include any text or words in the image.`;

        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
        });

        imageUrl = imageResponse.data[0]?.url;
      } catch (e) {
        console.error("Failed to generate image:", e);
      }
    }

    return NextResponse.json({
      variations: adVariations,
      imageUrl,
    });
  } catch (error) {
    console.error("Error generating ads:", error);
    return NextResponse.json({ error: "Failed to generate ads" }, { status: 500 });
  }
}

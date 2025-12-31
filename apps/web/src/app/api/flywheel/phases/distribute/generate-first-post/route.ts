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
    const { brandId, platforms } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID required" },
        { status: 400 }
      );
    }

    // Get brand information
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        brandBrain: true,
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );
    }

    const brandBrain = brand.brandBrain;
    const voiceTone = brandBrain?.voiceTone || "professional";
    const brandName = brand.name;
    const industry = brand.industry || "business";
    const description = brand.description || "";

    const prompt = `Create a compelling first social media post for a brand with the following details:

Brand Name: ${brandName}
Industry: ${industry}
Description: ${description}
Voice/Tone: ${voiceTone}
Target Platforms: ${platforms?.join(", ") || "Twitter, LinkedIn"}

Requirements:
- This is the brand's first post on social media
- It should introduce the brand or share a valuable insight
- Keep it engaging and on-brand
- Include a call to action if appropriate
- Use the specified voice and tone

Generate a post that would work well across the specified platforms. The post should be concise (under 280 characters for Twitter compatibility) but impactful.

Return JSON with this structure:
{
  "title": "Post title/topic",
  "content": "The actual post content",
  "platforms": ["twitter", "linkedin"]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a social media content expert. Create engaging, brand-appropriate content. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const result = JSON.parse(content);

    // Save to database
    const contentItem = await prisma.contentItem.create({
      data: {
        brandId,
        title: result.title,
        content: result.content,
        contentType: "POST",
        status: "DRAFT",
        aiGenerated: true,
      },
    });

    return NextResponse.json({
      content: {
        id: contentItem.id,
        title: contentItem.title,
        content: contentItem.content,
        platforms: result.platforms || platforms || ["twitter"],
        createdAt: contentItem.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error generating first post:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

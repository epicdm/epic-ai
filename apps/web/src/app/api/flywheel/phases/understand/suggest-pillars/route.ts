/**
 * AI Content Pillar Suggestions API
 * Generates content pillars based on brand and audience information
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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
    const { industry, brandName, brandDescription, audiences } = body;

    if (!industry && !brandDescription) {
      return NextResponse.json(
        { error: "Industry or brand description is required" },
        { status: 400 }
      );
    }

    const audienceInfo = audiences?.length
      ? `Target Audiences: ${audiences.map((a: { name: string }) => a.name).join(", ")}`
      : "";

    const prompt = `Generate 4-5 content pillars for this brand's content marketing strategy.

Brand Name: ${brandName || "Not specified"}
Industry: ${industry || "Not specified"}
Description: ${brandDescription || "Not specified"}
${audienceInfo}

Create strategic content pillars that would resonate with the target audience. Respond with JSON only:
{
  "pillars": [
    {
      "id": "pillar-1",
      "name": "Pillar Name (e.g., 'Industry Insights', 'Product Tips')",
      "description": "What topics this pillar covers and why it's valuable",
      "topics": ["Sub-topic 1", "Sub-topic 2", "Sub-topic 3"]
    }
  ]
}

Make pillars specific, actionable, and aligned with the brand's positioning.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a content strategist expert. Generate strategic content pillars for brand marketing. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch?.[0] || '{"pillars": []}');
    } catch {
      console.error("Error parsing AI response:", responseText);
      result = { pillars: [] };
    }

    // Add unique IDs if not present
    const pillars = (result.pillars || []).map(
      (p: Record<string, unknown>, i: number) => ({
        ...p,
        id: p.id || `pillar-${Date.now()}-${i}`,
      })
    );

    return NextResponse.json({ pillars });
  } catch (error) {
    console.error("Pillar suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate pillars" },
      { status: 500 }
    );
  }
}

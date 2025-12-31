/**
 * AI Competitor Suggestions API
 * Generates competitor suggestions based on brand and industry
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
    const { industry, brandName, brandDescription } = body;

    if (!industry && !brandDescription) {
      return NextResponse.json(
        { error: "Industry or brand description is required" },
        { status: 400 }
      );
    }

    const prompt = `Suggest 3 potential competitors for this brand to track.

Brand Name: ${brandName || "Not specified"}
Industry: ${industry || "Not specified"}
Description: ${brandDescription || "Not specified"}

Identify realistic competitors (can be hypothetical names if specific companies aren't known).
Respond with JSON only:
{
  "competitors": [
    {
      "id": "competitor-1",
      "name": "Competitor Name",
      "website": "https://example.com (if known, otherwise empty string)",
      "notes": "Brief description of what they do and their positioning",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    }
  ]
}

Focus on competitors that would be relevant for content marketing comparison.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a competitive analysis expert. Identify relevant competitors for brands. Respond with valid JSON only.",
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
      result = JSON.parse(jsonMatch?.[0] || '{"competitors": []}');
    } catch {
      console.error("Error parsing AI response:", responseText);
      result = { competitors: [] };
    }

    // Add unique IDs if not present
    const competitors = (result.competitors || []).map(
      (c: Record<string, unknown>, i: number) => ({
        ...c,
        id: c.id || `competitor-${Date.now()}-${i}`,
      })
    );

    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Competitor suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate competitors" },
      { status: 500 }
    );
  }
}

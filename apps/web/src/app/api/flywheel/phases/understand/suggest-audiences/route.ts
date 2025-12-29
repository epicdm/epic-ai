/**
 * AI Audience Suggestions API
 * Generates target audience personas based on brand information
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

    const prompt = `Generate 2-3 target audience personas for this brand.

Brand Name: ${brandName || "Not specified"}
Industry: ${industry || "Not specified"}
Description: ${brandDescription || "Not specified"}

Create realistic marketing personas with the following structure. Respond with JSON only:
{
  "audiences": [
    {
      "id": "audience-1",
      "name": "Persona Name (e.g., 'Tech-Savvy Startup Founder')",
      "description": "A brief description of who this person is",
      "demographics": "Age range, profession, location type",
      "painPoints": ["Pain point 1", "Pain point 2", "Pain point 3"],
      "goals": ["Goal 1", "Goal 2"]
    }
  ]
}

Make the personas specific and actionable for content marketing.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a marketing strategist expert. Generate detailed, actionable buyer personas. Respond with valid JSON only.",
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
      result = JSON.parse(jsonMatch?.[0] || '{"audiences": []}');
    } catch {
      console.error("Error parsing AI response:", responseText);
      result = { audiences: [] };
    }

    // Add unique IDs if not present
    const audiences = (result.audiences || []).map(
      (a: Record<string, unknown>, i: number) => ({
        ...a,
        id: a.id || `audience-${Date.now()}-${i}`,
      })
    );

    return NextResponse.json({ audiences });
  } catch (error) {
    console.error("Audience suggestion error:", error);
    return NextResponse.json(
      { error: "Failed to generate audiences" },
      { status: 500 }
    );
  }
}

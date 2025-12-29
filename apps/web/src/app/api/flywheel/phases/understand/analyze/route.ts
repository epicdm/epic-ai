/**
 * Website Analysis API Route
 * Analyzes a website URL to extract brand information using AI
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
    const { websiteUrl } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    let url: URL;
    try {
      url = new URL(websiteUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch website content
    let htmlContent = "";
    try {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)",
        },
      });

      if (response.ok) {
        htmlContent = await response.text();
        // Limit content size for AI processing
        htmlContent = htmlContent.slice(0, 50000);
      }
    } catch (error) {
      console.error("Error fetching website:", error);
      // Continue without HTML content
    }

    // Use AI to analyze the website
    const prompt = `Analyze this website and extract brand information.

Website URL: ${websiteUrl}

${htmlContent ? `HTML Content (partial):
${htmlContent}` : "Note: Could not fetch website content. Make reasonable assumptions based on the URL."}

Please extract and respond with a JSON object containing:
{
  "brandName": "The company/brand name",
  "brandDescription": "A 1-2 sentence description of what the brand does",
  "mission": "The brand's mission or purpose (if detectable)",
  "industry": "One of: saas, ecommerce, agency, consulting, healthcare, education, nonprofit, realestate, restaurant, fitness, other",
  "suggestedVoice": {
    "formality": 3,  // 1-5 scale (1=very casual, 5=very formal)
    "personality": ["professional", "friendly"]  // 2-4 traits
  },
  "suggestedPillars": [
    {
      "name": "Pillar Name",
      "description": "What this pillar covers"
    }
  ],
  "confidence": 0.8  // 0-1 confidence in the analysis
}

Only respond with valid JSON, no explanations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a brand strategist expert. Analyze websites and extract brand information accurately. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";

    // Parse AI response
    let analysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      analysisResult = JSON.parse(jsonMatch?.[0] || "{}");
    } catch {
      console.error("Error parsing AI response:", responseText);
      analysisResult = {};
    }

    // Build suggested data for wizard
    const suggestedData = {
      brandName: analysisResult.brandName,
      brandDescription: analysisResult.brandDescription,
      mission: analysisResult.mission,
      industry: analysisResult.industry,
      formality: analysisResult.suggestedVoice?.formality || 3,
      personality: analysisResult.suggestedVoice?.personality || [],
      contentPillars: analysisResult.suggestedPillars?.map(
        (p: { name: string; description: string }, i: number) => ({
          id: `pillar-${Date.now()}-${i}`,
          name: p.name,
          description: p.description,
          topics: [],
        })
      ),
    };

    return NextResponse.json({
      success: true,
      analysis: {
        url: websiteUrl,
        ...analysisResult,
        analyzedAt: new Date(),
      },
      suggestedData,
    });
  } catch (error) {
    console.error("Website analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze website" },
      { status: 500 }
    );
  }
}

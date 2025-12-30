/**
 * AI Configuration API Route
 * Generates complete wizard configurations based on minimal user inputs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";
import type {
  FlywheelPhase,
  UnderstandWizardData,
  DistributeWizardData,
  LearnWizardData,
  AutomateWizardData,
  CreateWizardData,
} from "@/lib/flywheel/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIConfigureRequest {
  phase: FlywheelPhase;
  inputs: Record<string, string>;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AIConfigureRequest = await request.json();
    const { phase, inputs } = body;

    if (!phase || !inputs) {
      return NextResponse.json(
        { error: "Phase and inputs are required" },
        { status: 400 }
      );
    }

    // Get user's organization and brand for context
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                brands: {
                  include: {
                    brandBrain: true,
                    socialAccounts: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const brand = user?.memberships[0]?.organization?.brands[0];
    const brandBrain = brand?.brandBrain;
    const socialAccounts = brand?.socialAccounts || [];

    let configuration: Record<string, unknown>;

    switch (phase) {
      case "UNDERSTAND":
        configuration = await generateUnderstandConfig(inputs, brand);
        break;
      case "CREATE":
        configuration = await generateCreateConfig(inputs, brandBrain);
        break;
      case "DISTRIBUTE":
        configuration = await generateDistributeConfig(inputs, socialAccounts);
        break;
      case "LEARN":
        configuration = await generateLearnConfig(inputs);
        break;
      case "AUTOMATE":
        configuration = await generateAutomateConfig(inputs);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid phase" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      phase,
      configuration,
    });
  } catch (error) {
    console.error("AI configuration error:", error);
    return NextResponse.json(
      { error: "Failed to generate configuration" },
      { status: 500 }
    );
  }
}

async function generateUnderstandConfig(
  inputs: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingBrand?: any
): Promise<Partial<UnderstandWizardData>> {
  const { websiteUrl, industry } = inputs;

  // Fetch website content for analysis
  let htmlContent = "";
  if (websiteUrl) {
    try {
      const url = new URL(websiteUrl);
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)",
        },
      });
      if (response.ok) {
        htmlContent = await response.text();
        htmlContent = htmlContent.slice(0, 50000);
      }
    } catch (error) {
      console.error("Error fetching website:", error);
    }
  }

  const prompt = `Generate a complete brand configuration for an AI marketing platform.

Website URL: ${websiteUrl || "Not provided"}
Industry Hint: ${industry || "Auto-detect"}
${existingBrand?.name ? `Existing Brand Name: ${existingBrand.name}` : ""}

${htmlContent ? `Website Content (partial):\n${htmlContent.slice(0, 20000)}` : ""}

Generate a complete JSON configuration with:
{
  "brandName": "Company name",
  "brandDescription": "1-2 sentence description",
  "mission": "Brand mission statement",
  "industry": "${industry || 'auto-detected industry'}",
  "formality": 3,
  "personality": ["trait1", "trait2", "trait3"],
  "writingStyle": "Brief description of writing style",
  "audiences": [
    {
      "name": "Audience segment name",
      "description": "Who they are",
      "demographics": "Age, location, job roles",
      "painPoints": ["pain1", "pain2"],
      "goals": ["goal1", "goal2"],
      "platforms": ["twitter", "linkedin"]
    }
  ],
  "contentPillars": [
    {
      "name": "Pillar name",
      "description": "What topics this covers",
      "topics": ["topic1", "topic2"],
      "frequency": 25
    }
  ],
  "competitors": [
    {
      "name": "Competitor name",
      "website": "https://...",
      "notes": "Brief notes",
      "strengths": ["strength1"],
      "weaknesses": ["weakness1"]
    }
  ]
}

Generate 2-3 audiences, 4 content pillars (frequencies must sum to 100), and 3 competitors.
Only respond with valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a brand strategist. Generate realistic, actionable brand configurations. Always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 2000,
  });

  const responseText = completion.choices[0]?.message?.content || "{}";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const result = JSON.parse(jsonMatch?.[0] || "{}");

  return {
    websiteUrl,
    websiteAnalyzed: true,
    industry: result.industry || industry,
    brandName: result.brandName,
    brandDescription: result.brandDescription,
    mission: result.mission,
    formality: result.formality || 3,
    personality: result.personality || [],
    writingStyle: result.writingStyle,
    audiences: result.audiences?.map((a: Record<string, unknown>, i: number) => ({
      id: `audience-${Date.now()}-${i}`,
      ...a,
    })),
    contentPillars: result.contentPillars?.map((p: Record<string, unknown>, i: number) => ({
      id: `pillar-${Date.now()}-${i}`,
      ...p,
    })),
    competitors: result.competitors?.map((c: Record<string, unknown>, i: number) => ({
      id: `competitor-${Date.now()}-${i}`,
      ...c,
    })),
    confirmed: false,
  };
}

async function generateCreateConfig(
  inputs: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  brandBrain?: any
): Promise<Partial<CreateWizardData>> {
  const { contentFocus } = inputs;

  const focusMapping: Record<string, { imageGen: boolean; hashtags: string; types: string[] }> = {
    thought_leadership: {
      imageGen: true,
      hashtags: "moderate",
      types: ["text", "carousel"],
    },
    product_updates: {
      imageGen: true,
      hashtags: "minimal",
      types: ["text", "image"],
    },
    educational: {
      imageGen: true,
      hashtags: "moderate",
      types: ["text", "carousel", "video"],
    },
    engagement: {
      imageGen: false,
      hashtags: "heavy",
      types: ["text", "poll", "story"],
    },
    mixed: {
      imageGen: true,
      hashtags: "moderate",
      types: ["text", "image", "carousel"],
    },
  };

  const settings = focusMapping[contentFocus] || focusMapping.mixed;

  return {
    enabledTypes: settings.types as CreateWizardData["enabledTypes"],
    imageGeneration: settings.imageGen,
    imageStyle: brandBrain?.imageStyle || "modern",
    hashtagStrategy: settings.hashtags as CreateWizardData["hashtagStrategy"],
    savedHashtags: [],
    templates: [],
    confirmed: false,
  };
}

async function generateDistributeConfig(
  inputs: Record<string, string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialAccounts: any[]
): Promise<Partial<DistributeWizardData>> {
  const { timezone, postingGoal } = inputs;

  const goalMapping: Record<string, { postsPerWeek: number; timesPerDay: number }> = {
    minimal: { postsPerWeek: 2, timesPerDay: 1 },
    consistent: { postsPerWeek: 5, timesPerDay: 1 },
    active: { postsPerWeek: 10, timesPerDay: 2 },
    aggressive: { postsPerWeek: 14, timesPerDay: 3 },
  };

  const goalSettings = goalMapping[postingGoal] || goalMapping.consistent;

  // Generate optimal schedule based on timezone
  const optimalTimes = ["09:00", "12:00", "17:00", "19:00"];
  const selectedTimes = optimalTimes.slice(0, goalSettings.timesPerDay);

  // Build platform settings for connected accounts
  const platformSettings: Record<string, { enabled: boolean; autoPost: boolean; postingFrequency: number; bestTimes: string[] }> = {};
  const connectedPlatforms = socialAccounts
    .filter((acc) => acc.isConnected)
    .map((acc) => acc.platform.toLowerCase());

  for (const platform of connectedPlatforms) {
    platformSettings[platform] = {
      enabled: true,
      autoPost: true,
      postingFrequency: Math.ceil(goalSettings.postsPerWeek / connectedPlatforms.length),
      bestTimes: selectedTimes,
    };
  }

  // Build weekly schedule
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const schedule: Record<string, { time: string; platforms: string[] }[]> = {};

  // Distribute posts across days
  const postsToDistribute = goalSettings.postsPerWeek;
  const activeDays = Math.min(postsToDistribute, 7);

  for (let i = 0; i < activeDays; i++) {
    const day = daysOfWeek[i];
    schedule[day] = selectedTimes.map((time) => ({
      time,
      platforms: connectedPlatforms,
    }));
  }

  return {
    timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoDetected: !inputs.timezone,
    platformSettings,
    schedule,
    connectedAccounts: socialAccounts.map((acc) => ({
      id: acc.id,
      platform: acc.platform.toLowerCase(),
      handle: acc.username || acc.accountName || "",
      connected: acc.isConnected,
    })),
    firstPostOption: "skip",
    confirmed: false,
  };
}

async function generateLearnConfig(
  inputs: Record<string, string>
): Promise<Partial<LearnWizardData>> {
  const { primaryGoal } = inputs;

  const goalToMetrics: Record<string, { metrics: string[]; priority: string }> = {
    engagement: {
      metrics: ["engagement", "impressions", "reach"],
      priority: "engagement",
    },
    reach: {
      metrics: ["reach", "impressions", "engagement"],
      priority: "reach",
    },
    followers: {
      metrics: ["followers", "reach", "engagement"],
      priority: "followers",
    },
    traffic: {
      metrics: ["clicks", "reach", "engagement"],
      priority: "clicks",
    },
    leads: {
      metrics: ["leads", "clicks", "conversions"],
      priority: "leads",
    },
    brand: {
      metrics: ["impressions", "reach", "engagement"],
      priority: "impressions",
    },
  };

  const settings = goalToMetrics[primaryGoal] || goalToMetrics.engagement;

  return {
    seenIntro: true,
    priorityMetrics: settings.metrics as LearnWizardData["priorityMetrics"],
    reportFrequency: "weekly",
    reportDay: 1, // Monday
    reportEmail: true,
    optimizationGoals: [
      {
        metric: settings.priority as LearnWizardData["priorityMetrics"][0],
        priority: "high",
      },
      {
        metric: settings.metrics[1] as LearnWizardData["priorityMetrics"][0],
        priority: "medium",
      },
    ],
    confirmed: false,
  };
}

async function generateAutomateConfig(
  inputs: Record<string, string>
): Promise<Partial<AutomateWizardData>> {
  const { automationLevel } = inputs;

  const levelSettings: Record<string, {
    approvalMode: "review" | "auto_queue" | "auto_post";
    contentMix: { educational: number; promotional: number; entertaining: number; engaging: number };
    postsPerWeek: number;
    notifications: Record<string, boolean>;
  }> = {
    assisted: {
      approvalMode: "review",
      contentMix: { educational: 40, promotional: 20, entertaining: 20, engaging: 20 },
      postsPerWeek: 5,
      notifications: {
        email: true,
        inApp: true,
        contentGenerated: true,
        postPublished: true,
        weeklyReport: true,
        performanceAlerts: true,
      },
    },
    supervised: {
      approvalMode: "auto_queue",
      contentMix: { educational: 35, promotional: 25, entertaining: 20, engaging: 20 },
      postsPerWeek: 7,
      notifications: {
        email: true,
        inApp: true,
        contentGenerated: false,
        postPublished: true,
        weeklyReport: true,
        performanceAlerts: true,
      },
    },
    autonomous: {
      approvalMode: "auto_post",
      contentMix: { educational: 30, promotional: 30, entertaining: 20, engaging: 20 },
      postsPerWeek: 10,
      notifications: {
        email: false,
        inApp: true,
        contentGenerated: false,
        postPublished: false,
        weeklyReport: true,
        performanceAlerts: true,
      },
    },
  };

  const settings = levelSettings[automationLevel] || levelSettings.assisted;

  return {
    seenIntro: true,
    approvalMode: settings.approvalMode,
    contentMix: settings.contentMix,
    postsPerWeek: settings.postsPerWeek,
    platformFrequency: {},
    notifications: settings.notifications,
    confirmed: false,
    activated: false,
  };
}

/**
 * AI Full Setup API Route
 * Generates complete wizard configurations for ALL 5 flywheel phases at once
 * from minimal user input (website URL)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";
import type {
  UnderstandWizardData,
  CreateWizardData,
  DistributeWizardData,
  LearnWizardData,
  AutomateWizardData,
} from "@/lib/flywheel/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AIFullSetupRequest {
  websiteUrl: string;
  industry?: string;
}

interface FullSetupResponse {
  understand: Partial<UnderstandWizardData>;
  create: Partial<CreateWizardData>;
  distribute: Partial<DistributeWizardData>;
  learn: Partial<LearnWizardData>;
  automate: Partial<AutomateWizardData>;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AIFullSetupRequest = await request.json();
    const { websiteUrl, industry } = body;

    if (!websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    // Get user's organization and brand for context
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                brands: {
                  include: {
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
    const socialAccounts = brand?.socialAccounts || [];

    // Fetch website content for analysis
    let htmlContent = "";
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

    // Generate all 5 phase configurations in a single AI call
    const configuration = await generateFullConfiguration(
      websiteUrl,
      htmlContent,
      industry,
      socialAccounts
    );

    return NextResponse.json({
      success: true,
      configuration,
    });
  } catch (error) {
    console.error("AI full setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate configuration" },
      { status: 500 }
    );
  }
}

async function generateFullConfiguration(
  websiteUrl: string,
  htmlContent: string,
  industry?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialAccounts?: any[]
): Promise<FullSetupResponse> {
  const connectedPlatforms = socialAccounts
    ?.filter((acc) => acc.isConnected)
    .map((acc) => acc.platform.toLowerCase()) || [];

  const prompt = `You are an expert AI marketing strategist. Analyze this website and generate a COMPLETE marketing flywheel configuration for all 5 phases.

Website URL: ${websiteUrl}
Industry Hint: ${industry || "Auto-detect from website content"}
Connected Social Platforms: ${connectedPlatforms.length > 0 ? connectedPlatforms.join(", ") : "None yet - suggest optimal platforms"}

${htmlContent ? `Website Content (partial):\n${htmlContent.slice(0, 25000)}` : ""}

Generate a comprehensive JSON configuration for ALL 5 PHASES of the marketing flywheel:

{
  "understand": {
    "brandName": "Company name from website",
    "brandDescription": "1-2 sentence description",
    "mission": "Brand mission statement",
    "industry": "Detected or provided industry",
    "formality": 3,
    "personality": ["trait1", "trait2", "trait3"],
    "writingStyle": "Description of brand writing style",
    "audiences": [
      {
        "name": "Primary audience segment",
        "description": "Who they are",
        "demographics": "Age, location, roles",
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
        "notes": "Brief competitive notes"
      }
    ]
  },
  "create": {
    "enabledTypes": ["text", "image", "carousel"],
    "imageGeneration": true,
    "imageStyle": "modern",
    "hashtagStrategy": "moderate",
    "savedHashtags": ["#relevant", "#hashtags"],
    "contentFocus": "thought_leadership or educational or engagement"
  },
  "distribute": {
    "timezone": "America/New_York",
    "postingGoal": "consistent",
    "postsPerWeek": 7,
    "optimalTimes": ["09:00", "12:00", "17:00"],
    "platformPriorities": ["twitter", "linkedin"]
  },
  "learn": {
    "primaryGoal": "engagement or reach or followers or traffic",
    "priorityMetrics": ["engagement", "impressions", "reach"],
    "reportFrequency": "weekly",
    "reportDay": 1,
    "optimizationFocus": "What to optimize for"
  },
  "automate": {
    "automationLevel": "assisted or supervised or autonomous",
    "approvalMode": "review or auto_queue or auto_post",
    "contentMix": {
      "educational": 40,
      "promotional": 20,
      "entertaining": 20,
      "engaging": 20
    },
    "postsPerWeek": 7,
    "notificationPreferences": "email and in-app recommended settings"
  }
}

IMPORTANT RULES:
1. Generate 2-3 realistic audience segments
2. Generate 4 content pillars with frequencies summing to 100%
3. Generate 3 real competitors if detectable, otherwise realistic industry competitors
4. Match content strategy to detected brand voice
5. Suggest platforms based on industry and audience
6. Be specific and actionable, not generic

Respond ONLY with valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are an expert AI marketing strategist specializing in brand analysis and content strategy. Generate realistic, actionable configurations based on website analysis. Always respond with valid JSON only.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.4,
    max_tokens: 4000,
  });

  const responseText = completion.choices[0]?.message?.content || "{}";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  const result = JSON.parse(jsonMatch?.[0] || "{}");

  // Transform and validate the response
  const timestamp = Date.now();

  const understand: Partial<UnderstandWizardData> = {
    websiteUrl,
    websiteAnalyzed: true,
    industry: result.understand?.industry || industry,
    brandName: result.understand?.brandName,
    brandDescription: result.understand?.brandDescription,
    mission: result.understand?.mission,
    formality: result.understand?.formality || 3,
    personality: result.understand?.personality || [],
    writingStyle: result.understand?.writingStyle,
    audiences: result.understand?.audiences?.map((a: Record<string, unknown>, i: number) => ({
      id: `audience-${timestamp}-${i}`,
      ...a,
    })),
    contentPillars: result.understand?.contentPillars?.map((p: Record<string, unknown>, i: number) => ({
      id: `pillar-${timestamp}-${i}`,
      ...p,
    })),
    competitors: result.understand?.competitors?.map((c: Record<string, unknown>, i: number) => ({
      id: `competitor-${timestamp}-${i}`,
      ...c,
    })),
    confirmed: false,
  };

  const create: Partial<CreateWizardData> = {
    enabledTypes: result.create?.enabledTypes || ["text", "image"],
    imageGeneration: result.create?.imageGeneration ?? true,
    imageStyle: result.create?.imageStyle || "modern",
    hashtagStrategy: result.create?.hashtagStrategy || "moderate",
    savedHashtags: result.create?.savedHashtags || [],
    templates: [],
    confirmed: false,
  };

  // Build platform settings for distribute phase
  const platformSettings: Record<string, { enabled: boolean; autoPost: boolean; postingFrequency: number; bestTimes: string[] }> = {};
  const platformPriorities = result.distribute?.platformPriorities || connectedPlatforms || ["twitter", "linkedin"];
  const optimalTimes = result.distribute?.optimalTimes || ["09:00", "12:00", "17:00"];
  const postsPerWeek = result.distribute?.postsPerWeek || 7;

  for (const platform of platformPriorities) {
    platformSettings[platform] = {
      enabled: true,
      autoPost: true,
      postingFrequency: Math.ceil(postsPerWeek / platformPriorities.length),
      bestTimes: optimalTimes,
    };
  }

  // Build weekly schedule
  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const schedule: Record<string, { time: string; platforms: string[] }[]> = {};
  const activeDays = Math.min(postsPerWeek, 7);

  for (let i = 0; i < activeDays; i++) {
    const day = daysOfWeek[i];
    schedule[day] = optimalTimes.slice(0, 2).map((time: string) => ({
      time,
      platforms: platformPriorities,
    }));
  }

  const distribute: Partial<DistributeWizardData> = {
    timezone: result.distribute?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoDetected: true,
    platformSettings,
    schedule,
    connectedAccounts: socialAccounts?.map((acc) => ({
      id: acc.id,
      platform: acc.platform.toLowerCase(),
      handle: acc.username || acc.accountName || "",
      connected: acc.isConnected,
    })) || [],
    firstPostOption: "skip",
    confirmed: false,
  };

  const learn: Partial<LearnWizardData> = {
    seenIntro: true,
    priorityMetrics: result.learn?.priorityMetrics || ["engagement", "impressions", "reach"],
    reportFrequency: result.learn?.reportFrequency || "weekly",
    reportDay: result.learn?.reportDay || 1,
    reportEmail: true,
    optimizationGoals: [
      {
        metric: result.learn?.priorityMetrics?.[0] || "engagement",
        priority: "high",
      },
      {
        metric: result.learn?.priorityMetrics?.[1] || "impressions",
        priority: "medium",
      },
    ],
    confirmed: false,
  };

  // Map automation level to settings
  const automationLevel = result.automate?.automationLevel || "assisted";
  const automationSettings: Record<string, {
    approvalMode: "review" | "auto_queue" | "auto_post";
    notifications: Record<string, boolean>;
  }> = {
    assisted: {
      approvalMode: "review",
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

  const settings = automationSettings[automationLevel] || automationSettings.assisted;

  const automate: Partial<AutomateWizardData> = {
    seenIntro: true,
    approvalMode: result.automate?.approvalMode || settings.approvalMode,
    contentMix: result.automate?.contentMix || {
      educational: 40,
      promotional: 20,
      entertaining: 20,
      engaging: 20,
    },
    postsPerWeek: result.automate?.postsPerWeek || postsPerWeek,
    platformFrequency: {},
    notifications: settings.notifications,
    confirmed: false,
    activated: false,
  };

  return {
    understand,
    create,
    distribute,
    learn,
    automate,
  };
}

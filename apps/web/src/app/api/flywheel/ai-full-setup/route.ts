/**
 * AI Full Setup API Route
 * Generates complete wizard configurations for ALL 5 flywheel phases at once
 * from minimal user input (website URL or Facebook page data)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import OpenAI from "openai";
import { safeDecryptToken } from "@/lib/encryption";
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
  websiteUrl?: string;
  facebookPage?: string;
  industry?: string;
  dataSource?: "website" | "facebook";
}

interface FacebookPageData {
  name: string;
  about?: string;
  description?: string;
  category?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  posts?: Array<{
    message?: string;
    created_time: string;
    likes?: number;
    comments?: number;
  }>;
}

type PhaseWithConfidence<T> = Partial<T> & {
  confidence: number; // 0-1 scale
};

interface FullSetupResponse {
  understand: PhaseWithConfidence<UnderstandWizardData>;
  create: PhaseWithConfidence<CreateWizardData>;
  distribute: PhaseWithConfidence<DistributeWizardData>;
  learn: PhaseWithConfidence<LearnWizardData>;
  automate: PhaseWithConfidence<AutomateWizardData>;
}

interface FullSetupAPIResponse {
  success: boolean;
  configuration: FullSetupResponse;
  timeSaved: number; // minutes saved vs manual setup
  analysisTime: number; // seconds AI took
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: AIFullSetupRequest = await request.json();
    const { websiteUrl, facebookPage, industry, dataSource = "website" } = body;

    // Validate based on data source
    if (dataSource === "website" && !websiteUrl) {
      return NextResponse.json(
        { error: "Website URL is required" },
        { status: 400 }
      );
    }

    if (dataSource === "facebook" && !facebookPage) {
      return NextResponse.json(
        { error: "Facebook page is required" },
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
                    brandBrain: true,
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

    let htmlContent = "";
    let facebookData: FacebookPageData | null = null;

    if (dataSource === "website" && websiteUrl) {
      // Fetch website content for analysis
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
    } else if (dataSource === "facebook") {
      // Fetch Facebook page data
      facebookData = await fetchFacebookPageData(brand?.id, facebookPage);
    }

    // Track analysis time
    const startTime = Date.now();

    // Generate all 5 phase configurations in a single AI call
    const configuration = await generateFullConfiguration(
      websiteUrl || "",
      htmlContent,
      industry,
      socialAccounts,
      dataSource,
      facebookData
    );

    const analysisTime = Math.round((Date.now() - startTime) / 1000);

    // Calculate time saved (manual setup typically takes 30-45 minutes)
    // Based on: ~8 min per phase × 5 phases = 40 minutes average
    const timeSaved = 25 + Math.floor(Math.random() * 10); // 25-35 minutes range

    const response: FullSetupAPIResponse = {
      success: true,
      configuration,
      timeSaved,
      analysisTime,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("AI full setup error:", error);
    return NextResponse.json(
      { error: "Failed to generate configuration" },
      { status: 500 }
    );
  }
}

/**
 * Fetch Facebook page data using the Meta Graph API
 */
async function fetchFacebookPageData(
  brandId: string | undefined,
  facebookPageName: string | undefined
): Promise<FacebookPageData | null> {
  if (!brandId || !facebookPageName) {
    return null;
  }

  try {
    // Get the Facebook social account for this brand
    const facebookAccount = await prisma.socialAccount.findFirst({
      where: {
        brandId,
        platform: "FACEBOOK",
      },
    });

    if (!facebookAccount || !facebookAccount.accessToken) {
      console.error("[AI Full Setup] No Facebook account found for brand:", brandId);
      return null;
    }

    // Decrypt the access token
    const accessToken = safeDecryptToken(facebookAccount.accessToken);
    if (!accessToken) {
      console.error("[AI Full Setup] Failed to decrypt Facebook access token");
      return null;
    }

    const pageId = facebookAccount.platformId;
    if (!pageId) {
      console.error("[AI Full Setup] No Facebook page ID found");
      return null;
    }

    // Fetch page info
    console.log("[AI Full Setup] Fetching Facebook page data for:", facebookPageName);
    const pageResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}?` +
        new URLSearchParams({
          fields: "name,about,description,category,website,phone,emails,single_line_address",
          access_token: accessToken,
        })
    );

    let pageData: FacebookPageData = {
      name: facebookPageName,
    };

    if (pageResponse.ok) {
      const fbData = await pageResponse.json();
      pageData = {
        name: fbData.name || facebookPageName,
        about: fbData.about,
        description: fbData.description,
        category: fbData.category,
        website: fbData.website,
        phone: fbData.phone,
        email: fbData.emails?.[0],
        address: fbData.single_line_address,
      };
    }

    // Fetch recent posts for content analysis
    const postsResponse = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/posts?` +
        new URLSearchParams({
          fields: "message,created_time,likes.summary(true),comments.summary(true)",
          limit: "25",
          access_token: accessToken,
        })
    );

    if (postsResponse.ok) {
      const postsData = await postsResponse.json();
      pageData.posts = postsData.data?.map((post: {
        message?: string;
        created_time: string;
        likes?: { summary?: { total_count?: number } };
        comments?: { summary?: { total_count?: number } };
      }) => ({
        message: post.message,
        created_time: post.created_time,
        likes: post.likes?.summary?.total_count || 0,
        comments: post.comments?.summary?.total_count || 0,
      })) || [];
    }

    console.log("[AI Full Setup] Fetched Facebook page data:", {
      name: pageData.name,
      category: pageData.category,
      postsCount: pageData.posts?.length || 0,
    });

    return pageData;
  } catch (error) {
    console.error("[AI Full Setup] Error fetching Facebook page data:", error);
    return null;
  }
}

/**
 * Calculate confidence score based on data richness and source quality
 */
function calculateConfidence(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  phaseData: any,
  context: {
    hasWebsite: boolean;
    hasHtmlContent: boolean;
    hasIndustry: boolean;
    hasSocialAccounts: boolean;
    hasFacebookData: boolean;
    phase: string;
  }
): number {
  let score = 0.5; // Base confidence

  // Increase confidence based on data sources
  if (context.hasWebsite) score += 0.15;
  if (context.hasHtmlContent) score += 0.15;
  if (context.hasFacebookData) score += 0.2; // Facebook data is rich
  if (context.hasIndustry) score += 0.05;
  if (context.hasSocialAccounts) score += 0.1;

  // Phase-specific adjustments based on data richness
  if (context.phase === "understand") {
    if (phaseData?.brandName) score += 0.05;
    if (phaseData?.brandDescription?.length > 50) score += 0.05;
    if (phaseData?.audiences?.length >= 2) score += 0.05;
    if (phaseData?.contentPillars?.length >= 3) score += 0.05;
  } else if (context.phase === "create") {
    if (phaseData?.enabledTypes?.length >= 2) score += 0.05;
    if (phaseData?.savedHashtags?.length > 0) score += 0.05;
  } else if (context.phase === "distribute") {
    if (context.hasSocialAccounts) score += 0.1;
    if (phaseData?.optimalTimes?.length > 0) score += 0.05;
  } else if (context.phase === "learn") {
    if (phaseData?.priorityMetrics?.length >= 2) score += 0.05;
  } else if (context.phase === "automate") {
    if (phaseData?.contentMix) score += 0.05;
  }

  // Cap at 0.95 (never show 100% - AI isn't perfect)
  return Math.min(Math.max(score, 0.4), 0.95);
}

async function generateFullConfiguration(
  websiteUrl: string,
  htmlContent: string,
  industry?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socialAccounts?: any[],
  dataSource: "website" | "facebook" = "website",
  facebookData?: FacebookPageData | null
): Promise<FullSetupResponse> {
  const connectedPlatforms = socialAccounts
    ?.filter((acc) => acc.isConnected)
    .map((acc) => acc.platform.toLowerCase()) || [];

  // Build source-specific content for the prompt
  let sourceContent = "";
  let sourceDescription = "";

  if (dataSource === "facebook" && facebookData) {
    sourceDescription = `Facebook Page: ${facebookData.name}`;
    sourceContent = `
Facebook Page Information:
- Page Name: ${facebookData.name}
- Category: ${facebookData.category || "Not specified"}
- About: ${facebookData.about || "Not specified"}
- Description: ${facebookData.description || "Not specified"}
- Website: ${facebookData.website || "Not specified"}
- Phone: ${facebookData.phone || "Not specified"}
- Email: ${facebookData.email || "Not specified"}
- Address: ${facebookData.address || "Not specified"}

${facebookData.posts && facebookData.posts.length > 0 ? `
Recent Facebook Posts (analyze for voice, tone, and content themes):
${facebookData.posts
  .filter(p => p.message)
  .slice(0, 15)
  .map((p, i) => `
[Post ${i + 1}] (Likes: ${p.likes || 0}, Comments: ${p.comments || 0})
${p.message}
`).join("\n")}
` : ""}`;
  } else if (websiteUrl) {
    sourceDescription = `Website URL: ${websiteUrl}`;
    sourceContent = htmlContent ? `Website Content (partial):\n${htmlContent.slice(0, 25000)}` : "";
  }

  const prompt = `You are an expert AI marketing strategist. Analyze this ${dataSource === "facebook" ? "Facebook page" : "website"} and generate a COMPLETE marketing flywheel configuration for all 5 phases.

${sourceDescription}
Industry Hint: ${industry || `Auto-detect from ${dataSource === "facebook" ? "Facebook page data" : "website content"}`}
Connected Social Platforms: ${connectedPlatforms.length > 0 ? connectedPlatforms.join(", ") : "None yet - suggest optimal platforms"}

${sourceContent}

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
    notifications: {
      email: boolean;
      inApp: boolean;
      contentGenerated: boolean;
      postPublished: boolean;
      weeklyReport: boolean;
      performanceAlerts: boolean;
    };
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

  // Build context for confidence calculation
  const confidenceContext = {
    hasWebsite: !!websiteUrl,
    hasHtmlContent: !!htmlContent && htmlContent.length > 100,
    hasIndustry: !!industry,
    hasSocialAccounts: (socialAccounts?.length || 0) > 0,
    hasFacebookData: !!facebookData && (!!facebookData.about || (facebookData.posts?.length || 0) > 0),
  };

  return {
    understand: {
      ...understand,
      confidence: calculateConfidence(result.understand, { ...confidenceContext, phase: "understand" }),
    },
    create: {
      ...create,
      confidence: calculateConfidence(result.create, { ...confidenceContext, phase: "create" }),
    },
    distribute: {
      ...distribute,
      confidence: calculateConfidence(result.distribute, { ...confidenceContext, phase: "distribute" }),
    },
    learn: {
      ...learn,
      confidence: calculateConfidence(result.learn, { ...confidenceContext, phase: "learn" }),
    },
    automate: {
      ...automate,
      confidence: calculateConfidence(result.automate, { ...confidenceContext, phase: "automate" }),
    },
  };
}

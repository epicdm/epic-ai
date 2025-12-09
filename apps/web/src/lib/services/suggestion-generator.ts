/**
 * AI Suggestion Generator Service
 *
 * Generates social media post suggestions based on business events
 * like lead conversions, 5-star calls, and weekly content planning.
 */

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

export type TriggerType = "LEAD_CONVERTED" | "FIVE_STAR_CALL" | "WEEKLY_CONTENT" | "MANUAL";

interface AutopilotSettings {
  defaultTone: string;
  includeEmojis: boolean;
  includeHashtags: boolean;
  includeCTA: boolean;
  brandDescription: string | null;
  defaultPlatforms: string[];
}

interface LeadConvertedData {
  leadName: string;
  service?: string;
  source?: string;
}

interface FiveStarCallData {
  callerName: string;
  outcome?: string;
  duration?: number;
}

interface WeeklyContentData {
  weekNumber: number;
  theme?: string;
}

type TriggerData = LeadConvertedData | FiveStarCallData | WeeklyContentData | Record<string, unknown>;

/**
 * Generate a social media post suggestion based on trigger type
 */
export async function generateSuggestion(
  organizationId: string,
  triggerType: TriggerType,
  triggerData: TriggerData
): Promise<{ content: string; suggestedPlatforms: string[] }> {
  // Get autopilot settings for tone/style
  const settings = await prisma.autopilotSettings.findUnique({
    where: { organizationId },
    select: {
      defaultTone: true,
      includeEmojis: true,
      includeHashtags: true,
      includeCTA: true,
      brandDescription: true,
      defaultPlatforms: true,
    },
  });

  const defaultSettings: AutopilotSettings = {
    defaultTone: "professional",
    includeEmojis: true,
    includeHashtags: true,
    includeCTA: false,
    brandDescription: null,
    defaultPlatforms: [],
  };

  const effectiveSettings = settings || defaultSettings;

  const prompt = buildPrompt(triggerType, triggerData, effectiveSettings);

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are a social media content expert. Generate engaging, authentic posts that feel human and relatable. Never be overly promotional or salesy. Focus on storytelling and value.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 500,
    temperature: 0.8,
  });

  const content = response.choices[0]?.message?.content?.trim() || "";

  // Determine suggested platforms based on content length and type
  const suggestedPlatforms = determinePlatforms(content, effectiveSettings.defaultPlatforms);

  return { content, suggestedPlatforms };
}

/**
 * Build prompt based on trigger type
 */
function buildPrompt(
  triggerType: TriggerType,
  triggerData: TriggerData,
  settings: AutopilotSettings
): string {
  const styleGuide = buildStyleGuide(settings);

  let basePrompt = "";

  switch (triggerType) {
    case "LEAD_CONVERTED": {
      const data = triggerData as LeadConvertedData;
      basePrompt = `Write a celebratory social media post about helping a new client.

Context:
- Client name: ${data.leadName || "a new client"}
- Service: ${data.service || "our services"}
- Source: ${data.source || "referral"}

The post should:
- Celebrate the win without being boastful
- Thank the client (use first name only or anonymize)
- Subtly mention the value provided
- Feel authentic and humble`;
      break;
    }

    case "FIVE_STAR_CALL": {
      const data = triggerData as FiveStarCallData;
      basePrompt = `Write a social media post about a great client conversation.

Context:
- Call outcome: ${data.outcome || "positive"}
- Duration: ${data.duration ? `${Math.round(data.duration / 60)} minutes` : "productive session"}

The post should:
- Share insights or lessons from the conversation (without identifying the client)
- Provide value to followers
- Feel genuine and not promotional
- Focus on helping others, not bragging`;
      break;
    }

    case "WEEKLY_CONTENT": {
      const data = triggerData as WeeklyContentData;
      basePrompt = `Write an engaging weekly social media post.

Context:
- Week number: ${data.weekNumber || new Date().getWeek()}
- Theme: ${data.theme || "industry insights"}

The post should:
- Share valuable tips or insights
- Be educational and helpful
- Encourage engagement (questions, comments)
- Feel timely and relevant`;
      break;
    }

    case "MANUAL":
    default:
      basePrompt = `Write a general business social media post.

Context: ${JSON.stringify(triggerData)}

The post should:
- Be valuable to the audience
- Feel authentic and engaging
- Not be overly promotional`;
  }

  return `${basePrompt}

${styleGuide}

IMPORTANT: Output ONLY the post content, nothing else. No explanations, no alternatives.`;
}

/**
 * Build style guide from settings
 */
function buildStyleGuide(settings: AutopilotSettings): string {
  const guidelines: string[] = [];

  // Tone
  switch (settings.defaultTone) {
    case "casual":
      guidelines.push("Use a casual, friendly tone like talking to a colleague");
      break;
    case "humorous":
      guidelines.push("Add appropriate humor while staying professional");
      break;
    case "inspirational":
      guidelines.push("Use an uplifting, motivational tone");
      break;
    case "professional":
    default:
      guidelines.push("Use a professional yet approachable tone");
  }

  // Emojis
  if (settings.includeEmojis) {
    guidelines.push("Include 1-3 relevant emojis naturally");
  } else {
    guidelines.push("Do NOT use any emojis");
  }

  // Hashtags
  if (settings.includeHashtags) {
    guidelines.push("Include 2-4 relevant hashtags at the end");
  } else {
    guidelines.push("Do NOT use hashtags");
  }

  // CTA
  if (settings.includeCTA) {
    guidelines.push("Include a subtle call-to-action (not salesy)");
  }

  // Brand description
  if (settings.brandDescription) {
    guidelines.push(`Brand context: ${settings.brandDescription}`);
  }

  // Length
  guidelines.push("Keep it concise: ideally under 280 characters for Twitter compatibility, but can go up to 500 for LinkedIn");

  return `Style guidelines:\n${guidelines.map((g) => `- ${g}`).join("\n")}`;
}

/**
 * Determine which platforms the content is best suited for
 */
function determinePlatforms(content: string, defaults: string[]): string[] {
  if (defaults.length > 0) {
    return defaults;
  }

  const platforms: string[] = [];
  const length = content.length;

  // Twitter/X - short content
  if (length <= 280) {
    platforms.push("x");
  }

  // LinkedIn - professional content
  if (length <= 3000) {
    platforms.push("linkedin");
  }

  // Facebook - medium to long content
  if (length <= 2000) {
    platforms.push("facebook");
  }

  return platforms.length > 0 ? platforms : ["linkedin"];
}

/**
 * Create a suggestion in the database
 */
export async function createSuggestion(
  organizationId: string,
  triggerType: TriggerType,
  triggerData: TriggerData,
  autoPost: boolean = false
): Promise<{ id: string; content: string }> {
  const { content, suggestedPlatforms } = await generateSuggestion(
    organizationId,
    triggerType,
    triggerData
  );

  // Check if auto-posting is enabled
  const settings = await prisma.autopilotSettings.findUnique({
    where: { organizationId },
    select: { approvalMode: true, maxPostsPerDay: true, minHoursBetween: true },
  });

  const status = autoPost && settings?.approvalMode === "AUTO_POST"
    ? "APPROVED"
    : "PENDING";

  const suggestion = await prisma.socialSuggestion.create({
    data: {
      organizationId,
      content,
      triggerType,
      triggerData,
      suggestedPlatforms,
      status,
    },
  });

  return { id: suggestion.id, content };
}

/**
 * Check rate limits for auto-posting
 */
export async function canAutoPost(organizationId: string): Promise<boolean> {
  const settings = await prisma.autopilotSettings.findUnique({
    where: { organizationId },
    select: { maxPostsPerDay: true, minHoursBetween: true },
  });

  if (!settings) return true;

  const now = new Date();
  const dayStart = new Date(now.setHours(0, 0, 0, 0));
  const minTimeAgo = new Date(Date.now() - settings.minHoursBetween * 60 * 60 * 1000);

  // Check posts today
  const postsToday = await prisma.socialSuggestion.count({
    where: {
      organizationId,
      status: "POSTED",
      postedAt: { gte: dayStart },
    },
  });

  if (postsToday >= settings.maxPostsPerDay) {
    return false;
  }

  // Check recent posts
  const recentPost = await prisma.socialSuggestion.findFirst({
    where: {
      organizationId,
      status: "POSTED",
      postedAt: { gte: minTimeAgo },
    },
  });

  return !recentPost;
}

// Helper to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function (): number {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

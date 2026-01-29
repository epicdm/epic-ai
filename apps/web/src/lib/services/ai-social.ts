/**
 * AI Social Content Generation Service
 *
 * Generates social media content using OpenAI based on various triggers:
 * - Lead conversion celebrations
 * - Five-star call highlights
 * - Weekly content ideas
 * - Custom prompts
 */

import OpenAI from "openai";

// Lazy initialization to avoid build-time errors when OPENAI_API_KEY is not set
let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export type ContentTone =
  | "professional"
  | "casual"
  | "enthusiastic"
  | "educational";

export type ContentType =
  | "lead_converted"
  | "five_star_call"
  | "weekly_content"
  | "custom";

export interface GenerateContentRequest {
  type: ContentType;
  tone?: ContentTone;
  businessName: string;
  businessDescription?: string;
  customPrompt?: string;
  // For lead_converted
  leadName?: string;
  leadService?: string;
  // For five_star_call
  callHighlight?: string;
  customerFeedback?: string;
  // For weekly_content
  contentTheme?: string;
  targetAudience?: string;
  // Platform-specific
  platforms?: string[];
  maxLength?: number;
}

export interface GeneratedContent {
  content: string;
  hashtags: string[];
  suggestedImagePrompt?: string;
  platformVariants?: Record<string, string>;
}

const SYSTEM_PROMPT = `You are an expert social media content creator for businesses.
Your job is to create engaging, authentic social media posts that drive engagement.

Guidelines:
- Keep posts concise and impactful
- Use emojis sparingly but effectively
- Include relevant hashtags (3-5 max)
- Make content shareable and relatable
- Avoid overly salesy language
- Focus on value and storytelling
- Match the requested tone exactly

IMPORTANT: Never include placeholder text like [Customer Name] or [Service].
If specific details aren't provided, write generically without brackets.`;

function buildPrompt(request: GenerateContentRequest): string {
  const { type, tone = "professional", businessName, businessDescription } =
    request;

  let prompt = `Create a social media post for ${businessName}`;
  if (businessDescription) {
    prompt += ` (${businessDescription})`;
  }
  prompt += `.\n\nTone: ${tone}\n`;

  if (request.maxLength) {
    prompt += `Maximum length: ${request.maxLength} characters\n`;
  }

  switch (type) {
    case "lead_converted":
      prompt += `\nType: Celebrating a new customer/lead conversion\n`;
      if (request.leadName) {
        prompt += `Customer: ${request.leadName}\n`;
      }
      if (request.leadService) {
        prompt += `Service/Product: ${request.leadService}\n`;
      }
      prompt += `\nCreate a post celebrating this new customer relationship. Be genuine and appreciative without being overly promotional. Do not use the customer's actual name - keep it general like "our newest client" or similar.`;
      break;

    case "five_star_call":
      prompt += `\nType: Highlighting excellent customer service\n`;
      if (request.callHighlight) {
        prompt += `Call highlight: ${request.callHighlight}\n`;
      }
      if (request.customerFeedback) {
        prompt += `Customer feedback: ${request.customerFeedback}\n`;
      }
      prompt += `\nCreate a post that subtly highlights the quality of customer service without being boastful. Focus on customer satisfaction and team dedication.`;
      break;

    case "weekly_content":
      prompt += `\nType: Weekly educational/engagement content\n`;
      if (request.contentTheme) {
        prompt += `Theme: ${request.contentTheme}\n`;
      }
      if (request.targetAudience) {
        prompt += `Target audience: ${request.targetAudience}\n`;
      }
      prompt += `\nCreate valuable content that educates or entertains the target audience. Include a subtle call-to-action.`;
      break;

    case "custom":
      if (request.customPrompt) {
        prompt += `\nCustom request: ${request.customPrompt}`;
      }
      break;
  }

  if (request.platforms && request.platforms.length > 0) {
    prompt += `\n\nTarget platforms: ${request.platforms.join(", ")}`;
    prompt += `\nAdjust style appropriately for these platforms.`;
  }

  prompt += `\n\nRespond in JSON format:
{
  "content": "the main post content",
  "hashtags": ["hashtag1", "hashtag2"],
  "suggestedImagePrompt": "a brief prompt for generating an accompanying image"
}`;

  return prompt;
}

export async function generateSocialContent(
  request: GenerateContentRequest
): Promise<GeneratedContent> {
  const prompt = buildPrompt(request);

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No content generated");
  }

  try {
    const parsed = JSON.parse(content) as GeneratedContent;
    return {
      content: parsed.content || "",
      hashtags: parsed.hashtags || [],
      suggestedImagePrompt: parsed.suggestedImagePrompt,
    };
  } catch {
    // If JSON parsing fails, return raw content
    return {
      content: content,
      hashtags: [],
    };
  }
}

export async function generateImage(
  prompt: string
): Promise<{ url: string } | null> {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const response = await getOpenAI().images.generate({
      model: "dall-e-3",
      prompt: `Professional social media image: ${prompt}. Style: clean, modern, business-appropriate.`,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const url = response.data?.[0]?.url;
    return url ? { url } : null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
}

export async function generateContentWithImage(
  request: GenerateContentRequest
): Promise<GeneratedContent & { imageUrl?: string }> {
  const content = await generateSocialContent(request);

  // Only generate image if we have a suggested prompt
  if (content.suggestedImagePrompt) {
    const image = await generateImage(content.suggestedImagePrompt);
    if (image) {
      return { ...content, imageUrl: image.url };
    }
  }

  return content;
}

/**
 * Generate multiple content variations for A/B testing
 */
export async function generateContentVariations(
  request: GenerateContentRequest,
  count: number = 3
): Promise<GeneratedContent[]> {
  const variations: GeneratedContent[] = [];
  const tones: ContentTone[] = [
    "professional",
    "casual",
    "enthusiastic",
    "educational",
  ];

  for (let i = 0; i < count; i++) {
    const tone = tones[i % tones.length];
    const content = await generateSocialContent({ ...request, tone });
    variations.push(content);
  }

  return variations;
}

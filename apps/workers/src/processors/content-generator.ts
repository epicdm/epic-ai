/**
 * Content Generation Processor
 *
 * Processes GENERATE_CONTENT jobs by:
 * 1. Loading brand context (voice, tone, style) from Brand Brain
 * 2. Gathering relevant context items
 * 3. Generating content with GPT-4o
 * 4. Creating platform-specific variations
 * 5. Saving ContentItem + ContentVariations to database
 *
 * Integrates with existing ContentFactory patterns from apps/web
 *
 * @module processors/content-generator
 */

import type { Job } from 'bullmq';
import OpenAI from 'openai';
import { prisma, type SocialPlatform, type ContentType } from '@epic-ai/database';
import {
  createProcessor,
  createProcessingError,
  reportProgress,
  type JobData,
} from './base';
import {
  JobType,
  type ContentGenerationPayload,
  type ContentGenerationResult,
} from '../types/payloads';
import { logger } from '../lib/logger';

// =============================================================================
// Constants
// =============================================================================

const COMPONENT = 'content-generator';

/**
 * Platform character limits (mirrors web app)
 */
const PLATFORM_LIMITS: Record<string, number> = {
  TWITTER: 280,
  LINKEDIN: 3000,
  FACEBOOK: 63206,
  INSTAGRAM: 2200,
};

// =============================================================================
// OpenAI Client
// =============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// =============================================================================
// Content Generation Service
// =============================================================================

/**
 * Generates content using brand context and AI
 */
async function generateContent(
  job: Job<JobData<ContentGenerationPayload>>,
  payload: ContentGenerationPayload
): Promise<ContentGenerationResult> {
  const startTime = Date.now();
  const { brandId, topic, platforms, tone, contentType, contextItemIds } = payload;

  logger.info(COMPONENT, `Generating content for brand ${brandId}`, {
    topic,
    platforms,
    contentType,
  });

  // Report initial progress
  await reportProgress(job, 10, 'Loading brand context...');

  // 1. Load brand context (Brand Brain)
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      brandBrain: true,
    },
  });

  if (!brand) {
    throw createProcessingError('Brand not found', job, {
      isRetryable: false,
      context: { brandId },
    });
  }

  const brandBrain = brand.brandBrain;
  if (!brandBrain) {
    throw createProcessingError('Brand Brain not configured', job, {
      isRetryable: false,
      context: { brandId },
    });
  }

  await reportProgress(job, 20, 'Gathering context...');

  // 2. Gather context items
  let contextText = '';
  if (contextItemIds && contextItemIds.length > 0) {
    const contextItems = await prisma.contextItem.findMany({
      where: { id: { in: contextItemIds } },
      select: { title: true, summary: true, content: true, contentType: true },
    });
    contextText = contextItems
      .map((item) => `[${item.contentType}] ${item.title || ''}\n${item.summary || item.content.slice(0, 500)}`)
      .join('\n\n');
  } else if (topic) {
    // Search for relevant context through source relation
    const contextItems = await prisma.contextItem.findMany({
      where: {
        source: { brandId },
        OR: [
          { title: { contains: topic, mode: 'insensitive' } },
          { summary: { contains: topic, mode: 'insensitive' } },
        ],
      },
      take: 5,
      orderBy: { importance: 'desc' },
      select: { title: true, summary: true, contentType: true },
    });
    contextText = contextItems
      .map((item) => `[${item.contentType}] ${item.title || ''}\n${item.summary}`)
      .join('\n\n');
  }

  await reportProgress(job, 40, 'Generating content with AI...');

  // 3. Build system prompt from Brand Brain
  const systemPrompt = buildSystemPrompt(brandBrain, tone);

  // 4. Build content prompt
  const contentPrompt = buildContentPrompt({
    topic,
    platforms,
    contentType: contentType || 'POST',
    contextText,
  });

  // 5. Generate with GPT-4o
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: contentPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const generatedText = response.choices[0]?.message?.content || '';
  const tokensUsed = response.usage?.total_tokens || 0;

  // Parse the generated content
  const parsed = parseGeneratedContent(generatedText);

  await reportProgress(job, 60, 'Generating platform variations...');

  // 6. Generate platform-specific variations
  const variations = await generatePlatformVariations(
    parsed.content,
    platforms,
    systemPrompt
  );

  await reportProgress(job, 80, 'Saving to database...');

  // 7. Save ContentItem + Variations to database
  const contentItem = await prisma.contentItem.create({
    data: {
      brandId,
      content: parsed.content,
      contentType: (contentType || 'POST') as ContentType,
      category: parsed.category || topic || 'general',
      status: 'DRAFT',
      approvalStatus: 'PENDING',
      targetPlatforms: platforms as SocialPlatform[],
      contentVariations: {
        create: variations.map((v) => ({
          platform: v.platform as SocialPlatform,
          text: v.content,
          hashtags: extractHashtags(v.content),
          characterCount: v.characterCount,
          isOptimal: v.characterCount <= PLATFORM_LIMITS[v.platform],
          status: 'PENDING',
        })),
      },
    },
    include: {
      contentVariations: true,
    },
  });

  await reportProgress(job, 100, 'Content generation complete');

  const generationTimeMs = Date.now() - startTime;

  logger.info(COMPONENT, `Content generated successfully`, {
    contentItemId: contentItem.id,
    variationCount: contentItem.contentVariations.length,
    tokensUsed,
    generationTimeMs,
  });

  // 8. Return result matching ContentGenerationResult
  return {
    contentItemId: contentItem.id,
    variations: contentItem.contentVariations.map((v) => ({
      platform: v.platform as (typeof payload.platforms)[number],
      variationId: v.id,
      content: v.text,
      characterCount: v.characterCount,
    })),
    tokensUsed,
    generationTimeMs,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Builds system prompt from Brand Brain settings
 */
function buildSystemPrompt(
  brandBrain: {
    voiceTone: string;
    writingStyle: string | null;
    formalityLevel: number;
    emojiFrequency: string;
    doNotMention: string[];
  },
  toneOverride?: string
): string {
  const tone = toneOverride || brandBrain.voiceTone || 'PROFESSIONAL';
  const style = brandBrain.writingStyle || 'clear and concise';
  const formality = brandBrain.formalityLevel ?? 3;

  const formalityDesc =
    formality >= 4
      ? 'formal and professional'
      : formality >= 3
        ? 'balanced between professional and conversational'
        : 'casual and friendly';

  const emojiGuidance =
    brandBrain.emojiFrequency === 'HEAVY'
      ? 'Use emojis liberally to add personality.'
      : brandBrain.emojiFrequency === 'MODERATE'
        ? 'Use emojis sparingly for emphasis.'
        : brandBrain.emojiFrequency === 'MINIMAL'
          ? 'Use emojis rarely, only when truly appropriate.'
          : 'Avoid using emojis.';

  const avoidText =
    brandBrain.doNotMention && brandBrain.doNotMention.length > 0
      ? `\nNever mention or reference: ${brandBrain.doNotMention.join(', ')}`
      : '';

  return `You are a social media content creator for a brand.

Voice and Tone: ${tone}
Writing Style: ${style}
Formality: ${formalityDesc}

${emojiGuidance}
${avoidText}

Create engaging, authentic content that feels natural and resonates with the audience.
Never be overly promotional or salesy.
Focus on providing value and building connection.`;
}

/**
 * Builds the content generation prompt
 */
function buildContentPrompt(options: {
  topic?: string;
  platforms: string[];
  contentType: string;
  contextText: string;
}): string {
  const { topic, platforms, contentType, contextText } = options;

  const platformList = platforms.join(', ');
  const contextSection = contextText
    ? `\n\nRelevant brand context:\n${contextText}`
    : '';

  return `Create a ${contentType.toLowerCase()} for ${platformList}.
${topic ? `Topic: ${topic}` : 'Create an engaging post that provides value.'}
${contextSection}

Requirements:
1. Write engaging, shareable content
2. Match the brand voice and tone exactly
3. Include a subtle call-to-action if appropriate
4. Make it feel authentic, not salesy

Respond with JSON:
{
  "content": "The main post content",
  "category": "detected or provided category"
}`;
}

/**
 * Parses the AI-generated content
 */
function parseGeneratedContent(text: string): { content: string; category: string } {
  try {
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonText);
    return {
      content: parsed.content || text,
      category: parsed.category || 'general',
    };
  } catch {
    return {
      content: text,
      category: 'general',
    };
  }
}

/**
 * Generates platform-specific variations
 */
async function generatePlatformVariations(
  content: string,
  platforms: string[],
  systemPrompt: string
): Promise<Array<{ platform: string; content: string; characterCount: number }>> {
  const variations: Array<{ platform: string; content: string; characterCount: number }> = [];

  for (const platform of platforms) {
    const limit = PLATFORM_LIMITS[platform] || 2200;
    let variation = content;

    // If content exceeds platform limit, shorten it
    if (content.length > limit) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Shorten this post for ${platform} (max ${limit} characters) while keeping the key message and brand voice:

"${content}"

Return only the shortened post, no explanation.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 400,
      });
      variation = response.choices[0]?.message?.content || content.slice(0, limit - 20);
    }

    variations.push({
      platform,
      content: variation,
      characterCount: variation.length,
    });
  }

  return variations;
}

/**
 * Extracts hashtags from content
 */
function extractHashtags(content: string): string[] {
  const matches = content.match(/#\w+/g) || [];
  return matches;
}

// =============================================================================
// Processor Export
// =============================================================================

/**
 * Content generation processor
 *
 * Wrapped with createProcessor for automatic:
 * - Prisma status updates (RUNNING → COMPLETED/FAILED)
 * - Logging
 * - Error handling with retry classification
 */
export const contentGenerationProcessor = createProcessor<
  ContentGenerationPayload,
  ContentGenerationResult
>(JobType.GENERATE_CONTENT, generateContent);

/**
 * Content Generator - AI-powered content creation
 */

import OpenAI from 'openai';
import { prisma } from '@epic-ai/database';
import type { SocialPlatform, ContentType } from '@prisma/client';
import { BrandBrainService } from '../brand-brain/service';
import { ContextManager } from '../context-engine/manager';
import type { ContentRequest, GeneratedContent, PlatformVariation } from './types';
import { PLATFORM_LIMITS } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class ContentGenerator {
  private brandId: string;
  private brandBrain: BrandBrainService;
  private contextManager: ContextManager;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.brandBrain = new BrandBrainService(brandId);
    this.contextManager = new ContextManager(brandId);
  }

  /**
   * Generate content based on request
   */
  async generate(request: ContentRequest): Promise<GeneratedContent> {
    // Get brand prompt
    const brandPrompt = await this.brandBrain.getContentPrompt();

    // Get relevant context
    const contextItems = request.contextItemIds
      ? await this.getContextByIds(request.contextItemIds)
      : await this.getRelevantContext(request.topic, request.category);

    // Build the generation prompt
    const contentPrompt = this.buildContentPrompt(request, brandPrompt, contextItems);

    // Generate with AI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: brandPrompt.systemPrompt },
        { role: 'user', content: contentPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const generatedText = response.choices[0]?.message?.content || '';

    // Parse the response
    const parsed = this.parseGeneratedContent(generatedText, request);

    // Generate platform variations
    const variations = await this.generatePlatformVariations(
      parsed.content,
      request.targetPlatforms,
      brandPrompt
    );

    // Get suggested hashtags
    const hashtags = await this.brandBrain.suggestHashtags(request.topic || parsed.category);

    return {
      ...parsed,
      variations,
      suggestedHashtags: hashtags,
    };
  }

  /**
   * Generate multiple pieces of content for a calendar
   */
  async generateBatch(
    count: number,
    platforms: SocialPlatform[],
    categories?: string[]
  ): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];

    // Get brand profile for content pillars
    const profile = await this.brandBrain.getProfile();
    const contentPillars = profile?.contentPillars || ['general'];

    for (let i = 0; i < count; i++) {
      // Rotate through pillars/categories
      const category = categories
        ? categories[i % categories.length]
        : contentPillars[i % contentPillars.length];

      const content = await this.generate({
        brandId: this.brandId,
        contentType: 'POST',
        targetPlatforms: platforms,
        category,
      });

      results.push(content);

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Generate an image prompt for DALL-E
   */
  async generateImagePrompt(content: string, style: string = 'modern'): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating DALL-E image prompts for social media graphics.
Style preference: ${style}
Create prompts that are professional, brand-safe, and visually appealing.
Never include text in the image. Focus on visual metaphors and imagery.`,
        },
        {
          role: 'user',
          content: `Create a DALL-E prompt for an image to accompany this social media post:

"${content}"

Return only the prompt, no explanation.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Generate an image using DALL-E
   */
  async generateImage(prompt: string): Promise<string> {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional social media graphic: ${prompt}. Modern, clean design. No text in image.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return response.data[0]?.url || '';
  }

  // Private methods

  private async getContextByIds(ids: string[]): Promise<string[]> {
    const items = await prisma.contextItem.findMany({
      where: { id: { in: ids } },
    });
    return items.map((item) => `[${item.contentType}] ${item.title || ''}\n${item.summary || item.content.slice(0, 500)}`);
  }

  private async getRelevantContext(topic?: string, category?: string): Promise<string[]> {
    if (topic) {
      const items = await this.contextManager.searchContext(topic, 5);
      return items.map((item) => `[${item.contentType}] ${item.title || ''}\n${item.summary}`);
    }

    // Get high-importance evergreen content
    const items = await this.contextManager.getContextItems({
      minImportance: 6,
      evergreenOnly: true,
      limit: 5,
    });

    return items.map((item) => `[${item.contentType}] ${item.title || ''}\n${item.summary}`);
  }

  private buildContentPrompt(
    request: ContentRequest,
    brandPrompt: { brandContext: string; styleGuidelines: string },
    contextItems: string[]
  ): string {
    const platformList = request.targetPlatforms.join(', ');
    const contextText = contextItems.length > 0
      ? `\n\nRelevant brand context:\n${contextItems.join('\n\n')}`
      : '';

    return `${brandPrompt.brandContext}

${brandPrompt.styleGuidelines}
${contextText}

Create a ${request.contentType.toLowerCase()} for ${platformList}.
${request.category ? `Category/Topic: ${request.category}` : ''}
${request.topic ? `Specific topic: ${request.topic}` : ''}
${request.customInstructions ? `Additional instructions: ${request.customInstructions}` : ''}

Requirements:
1. Write engaging, shareable content
2. Match the brand voice and tone exactly
3. Include a subtle call-to-action if appropriate
4. Make it feel authentic, not salesy
5. ${request.includeImage ? 'This will include an image, so reference visuals' : 'This is text-only'}

Respond with JSON:
{
  "content": "The main post content",
  "category": "detected or provided category",
  "suggestedEmojis": ["emoji1", "emoji2"]
}`;
  }

  private parseGeneratedContent(
    text: string,
    request: ContentRequest
  ): { content: string; category: string; suggestedEmojis: string[] } {
    try {
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      return {
        content: parsed.content || text,
        category: parsed.category || request.category || 'general',
        suggestedEmojis: parsed.suggestedEmojis || [],
      };
    } catch {
      // If parsing fails, use the raw text
      return {
        content: text,
        category: request.category || 'general',
        suggestedEmojis: [],
      };
    }
  }

  private async generatePlatformVariations(
    content: string,
    platforms: SocialPlatform[],
    brandPrompt: { systemPrompt: string }
  ): Promise<PlatformVariation[]> {
    const variations: PlatformVariation[] = [];

    for (const platform of platforms) {
      const limit = PLATFORM_LIMITS[platform];
      let variation = content;

      // If content is too long for platform, adapt it
      if (content.length > limit) {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: brandPrompt.systemPrompt },
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

      // Extract hashtags from variation
      const hashtagMatches = variation.match(/#\w+/g) || [];

      variations.push({
        platform,
        content: variation,
        characterCount: variation.length,
        hashtags: hashtagMatches,
        isWithinLimit: variation.length <= limit,
      });
    }

    return variations;
  }
}

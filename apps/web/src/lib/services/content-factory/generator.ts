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
import { persistImageFromUrl, generateImagePath, isStorageConfigured } from '@/lib/storage';

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

    // Auto-enable image generation for Instagram (Instagram requires media)
    const needsImage = request.includeImage || request.targetPlatforms.includes('INSTAGRAM');

    // Build the generation prompt
    const contentPrompt = this.buildContentPrompt(
      { ...request, includeImage: needsImage },
      brandPrompt,
      contextItems
    );

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

    // Auto-generate image for Instagram if needed
    let generatedImageUrl: string | undefined;
    if (needsImage) {
      try {
        console.log('[ContentGenerator] Auto-generating image for content...');
        const imagePrompt = await this.generateImagePrompt(parsed.content);
        generatedImageUrl = await this.generateImage(imagePrompt);
        console.log('[ContentGenerator] Image generated successfully');
      } catch (error) {
        console.error('[ContentGenerator] Failed to generate image:', error);
        // Continue without image - will fail for Instagram but work for other platforms
      }
    }

    return {
      ...parsed,
      contentType: request.contentType,
      variations,
      suggestedHashtags: hashtags,
      generatedImageUrl,
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
   * Generate an image using DALL-E and persist to permanent storage
   *
   * DALL-E returns temporary URLs that expire after ~1 hour.
   * This method downloads the image and uploads it to DigitalOcean Spaces
   * for permanent storage before returning the URL.
   */
  async generateImage(prompt: string): Promise<string> {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `Professional social media graphic: ${prompt}. Modern, clean design. No text in image.`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    const tempUrl = response.data?.[0]?.url;
    if (!tempUrl) {
      throw new Error('No image URL returned from DALL-E');
    }

    // Persist to permanent storage (DigitalOcean Spaces)
    // This prevents Instagram publish failures from expired DALL-E URLs
    if (isStorageConfigured()) {
      const targetPath = generateImagePath(this.brandId, 'ai-generated');
      console.log('[ContentGenerator] Persisting DALL-E image to storage:', targetPath);
      const permanentUrl = await persistImageFromUrl(tempUrl, targetPath);
      console.log('[ContentGenerator] Image persisted successfully');
      return permanentUrl;
    }

    // Fallback to temporary URL if storage not configured
    console.warn('[ContentGenerator] Storage not configured, using temporary DALL-E URL');
    return tempUrl;
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

    // Platform-specific guidance
    const platformGuidance = this.getPlatformGuidance(request.targetPlatforms);

    return `${brandPrompt.brandContext}

${brandPrompt.styleGuidelines}
${contextText}

Create a ${request.contentType.toLowerCase()} for ${platformList}.
${request.category ? `Category/Topic: ${request.category}` : ''}
${request.topic ? `Specific topic: ${request.topic}` : ''}
${request.customInstructions ? `Additional instructions: ${request.customInstructions}` : ''}

${platformGuidance}

IMPORTANT REQUIREMENTS FOR HIGH-QUALITY CONTENT:
1. START WITH A HOOK - Open with something attention-grabbing (a bold statement, question, surprising fact, or relatable situation)
2. PROVIDE VALUE - Share actionable insights, tips, or information your audience can use
3. BE SPECIFIC - Use concrete examples, numbers, or stories instead of generic statements
4. CREATE EMOTION - Make readers feel something (inspired, curious, understood, excited)
5. CONVERSATIONAL TONE - Write like you're talking to a friend, not giving a lecture
6. INCLUDE A CTA - End with a clear next step (comment, share, click, try something)
7. ${request.includeImage ? 'This will include an image - reference visuals naturally' : 'This is text-only - paint a picture with words'}

AVOID:
- Generic corporate speak ("We are committed to excellence")
- Vague statements ("Great things are coming")
- Pushy sales language ("Buy now!", "Don't miss out!")
- Clichés and overused phrases
- Starting with "We" - focus on the audience instead

Respond with JSON:
{
  "content": "The main post content (engaging, specific, valuable)",
  "category": "detected or provided category",
  "suggestedEmojis": ["emoji1", "emoji2"],
  "hook": "The opening hook used"
}`;
  }

  /**
   * Get platform-specific writing guidance
   */
  private getPlatformGuidance(platforms: SocialPlatform[]): string {
    const guides: string[] = [];

    if (platforms.includes('TWITTER')) {
      guides.push('Twitter/X: Punchy and provocative. Use threads for longer content. Encourage replies.');
    }
    if (platforms.includes('LINKEDIN')) {
      guides.push('LinkedIn: Professional but personal. Share insights and lessons. Use line breaks for readability.');
    }
    if (platforms.includes('FACEBOOK')) {
      guides.push('Facebook: Conversational and community-focused. Ask questions. Encourage sharing.');
    }
    if (platforms.includes('INSTAGRAM')) {
      guides.push('Instagram: Visual storytelling with captions. Use emojis strategically. Strong first line (shows in preview).');
    }

    return guides.length > 0 ? `PLATFORM-SPECIFIC GUIDANCE:\n${guides.join('\n')}` : '';
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

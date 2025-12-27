/**
 * AI Ad Generator
 * Generates ad creatives and campaign configs using AI
 */

import OpenAI from 'openai';
import type {
  AdCreativeConfig,
  AdCampaignConfig,
  CampaignObjective,
  CallToAction,
  AdFormat,
} from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedAd {
  campaign: AdCampaignConfig;
  creative: AdCreativeConfig;
}

export class AdGenerator {
  /**
   * Generate ad creative and campaign config from content using AI
   */
  async generateAd(options: {
    content: { id: string; content: string; mediaUrls?: string[]; mediaType?: string };
    brandBrain: { id: string; voiceTone?: string; targetAudience?: unknown; keyMessages?: string[] };
    objective: CampaignObjective;
    targetUrl: string;
    budget?: { type: 'daily' | 'lifetime'; amount: number; currency: string };
  }): Promise<GeneratedAd> {
    const { content, brandBrain, objective, targetUrl, budget } = options;

    // Use AI to generate ad copy
    const prompt = `Create advertising copy for this content.

Original content:
${content.content.slice(0, 1000)}

Brand voice: ${brandBrain.voiceTone || 'professional'}
Key messages: ${brandBrain.keyMessages?.join(', ') || 'quality, trust, results'}
Campaign objective: ${objective}
Target URL: ${targetUrl}

Generate JSON:
{
  "headline": "Short, punchy headline (max 40 chars)",
  "primaryText": "Main ad text that drives action (max 125 chars)",
  "description": "Supporting description (max 30 chars)",
  "callToAction": "LEARN_MORE|SIGN_UP|SHOP_NOW|BOOK_NOW|CONTACT_US|GET_OFFER|SUBSCRIBE"
}`;

    let adCopy = {
      headline: 'Discover More Today',
      primaryText: content.content.slice(0, 120),
      description: 'Click to learn more',
      callToAction: 'LEARN_MORE' as CallToAction,
    };

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an advertising copywriter. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const text = response.choices[0]?.message?.content || '{}';
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(jsonText);
      adCopy = {
        headline: parsed.headline || adCopy.headline,
        primaryText: parsed.primaryText || adCopy.primaryText,
        description: parsed.description || adCopy.description,
        callToAction: parsed.callToAction || adCopy.callToAction,
      };
    } catch (error) {
      console.error('AI ad generation failed, using defaults:', error);
    }

    const campaign: AdCampaignConfig = {
      name: `Ad Campaign - ${objective} - ${new Date().toISOString().split('T')[0]}`,
      objective,
      budget: budget || {
        type: 'daily',
        amount: 1000,
        currency: 'USD',
      },
      targeting: {},
    };

    const creative: AdCreativeConfig = {
      format: (content.mediaUrls && content.mediaUrls.length > 1 ? 'CAROUSEL' : 'SINGLE_IMAGE') as AdFormat,
      primaryText: adCopy.primaryText,
      headline: adCopy.headline,
      description: adCopy.description,
      callToAction: adCopy.callToAction,
      linkUrl: targetUrl,
      mediaUrls: content.mediaUrls || [],
      displayUrl: new URL(targetUrl).hostname,
    };

    return { campaign, creative };
  }

  /**
   * Generate multiple ad variations for A/B testing
   */
  async generateAdVariations(
    options: Parameters<AdGenerator['generateAd']>[0],
    count: number = 3
  ): Promise<GeneratedAd[]> {
    const variations: GeneratedAd[] = [];

    for (let i = 0; i < count; i++) {
      const variation = await this.generateAd(options);
      variation.campaign.name = `${variation.campaign.name} - Variation ${i + 1}`;
      variations.push(variation);
    }

    return variations;
  }

  /**
   * Optimize ad based on performance metrics using AI
   */
  async optimizeAd(
    originalCreative: AdCreativeConfig,
    metrics: { ctr: number; cpc: number; conversions: number },
    brandBrain: { voiceTone?: string }
  ): Promise<AdCreativeConfig> {
    const prompt = `Optimize this ad based on performance metrics.

Current ad:
- Headline: ${originalCreative.headline}
- Primary Text: ${originalCreative.primaryText}
- Description: ${originalCreative.description}
- CTA: ${originalCreative.callToAction}

Performance metrics:
- Click-through rate (CTR): ${(metrics.ctr * 100).toFixed(2)}%
- Cost per click (CPC): $${metrics.cpc.toFixed(2)}
- Conversions: ${metrics.conversions}

Brand voice: ${brandBrain.voiceTone || 'professional'}

${metrics.ctr < 0.01 ? 'CTR is low - make headline more attention-grabbing.' : ''}
${metrics.conversions < 5 ? 'Conversions are low - strengthen the call-to-action.' : ''}

Return JSON with optimized copy:
{
  "headline": "Improved headline (max 40 chars)",
  "primaryText": "Improved main text (max 125 chars)",
  "description": "Improved description (max 30 chars)"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an ad optimization expert. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const text = response.choices[0]?.message?.content || '{}';
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(jsonText);

      return {
        ...originalCreative,
        headline: parsed.headline || originalCreative.headline,
        primaryText: parsed.primaryText || originalCreative.primaryText,
        description: parsed.description || originalCreative.description,
      };
    } catch (error) {
      console.error('AI ad optimization failed:', error);
      return originalCreative;
    }
  }
}

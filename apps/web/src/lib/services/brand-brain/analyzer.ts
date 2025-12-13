/**
 * Brand Analyzer - Uses AI to analyze brand context and build understanding
 */

import OpenAI from 'openai';
import type { WebsiteAnalysis, BrandProfile } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class BrandAnalyzer {
  /**
   * Analyze a website to extract brand information
   */
  async analyzeWebsite(content: string, url: string): Promise<WebsiteAnalysis> {
    const prompt = `Analyze this website content and extract brand information.

Website URL: ${url}
Content:
${content.slice(0, 8000)}

Extract and return JSON:
{
  "companyName": "Company name",
  "industry": "Primary industry/sector",
  "description": "2-3 sentence company description",
  "products": ["product1", "product2"], // Main products or empty array
  "services": ["service1", "service2"], // Main services or empty array
  "targetAudience": ["audience1", "audience2"], // Who they serve
  "uniqueSellingPoints": ["usp1", "usp2"], // What makes them different
  "tone": "professional/casual/friendly/authoritative/playful",
  "keyMessages": ["message1", "message2"] // Core marketing messages
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a brand analyst. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as WebsiteAnalysis;
  }

  /**
   * Generate a complete brand profile from context
   */
  async generateBrandProfile(
    websiteAnalysis: WebsiteAnalysis,
    additionalContext: string[]
  ): Promise<BrandProfile> {
    const contextText = additionalContext.join('\n\n---\n\n');

    const prompt = `Based on this brand analysis and additional context, generate a comprehensive brand profile for social media content creation.

Brand Analysis:
${JSON.stringify(websiteAnalysis, null, 2)}

Additional Context:
${contextText.slice(0, 5000)}

Generate a complete brand profile as JSON:
{
  "description": "Comprehensive brand description (2-3 paragraphs)",
  "mission": "Brand mission statement or null if unclear",
  "values": ["value1", "value2", "value3"], // Core values
  "uniqueSellingPoints": ["usp1", "usp2", "usp3"],
  "voiceTone": "professional/casual/friendly/authoritative/playful",
  "writingStyle": "Detailed description of how the brand should write (tone, sentence structure, vocabulary level, etc.)",
  "targetAudience": {
    "demographics": ["demographic1", "demographic2"],
    "interests": ["interest1", "interest2"],
    "painPoints": ["pain1", "pain2"]
  },
  "contentPillars": ["pillar1", "pillar2", "pillar3", "pillar4"], // Main topics to post about
  "preferredHashtags": ["#hashtag1", "#hashtag2"], // 5-10 relevant hashtags
  "emojiStyle": "none/minimal/moderate/heavy",
  "ctaStyle": "none/soft/direct/urgent",
  "doNotMention": ["topic1", "topic2"], // Topics to avoid
  "mustMention": ["key message 1", "key message 2"], // Messages to always include
  "competitors": [], // Leave empty unless specifically mentioned
  "differentiators": ["diff1", "diff2"] // What sets this brand apart
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert brand strategist. Generate comprehensive, actionable brand profiles. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as BrandProfile;
  }

  /**
   * Refine brand profile based on user feedback
   */
  async refineBrandProfile(
    currentProfile: BrandProfile,
    feedback: string
  ): Promise<BrandProfile> {
    const prompt = `Update this brand profile based on user feedback.

Current Profile:
${JSON.stringify(currentProfile, null, 2)}

User Feedback:
${feedback}

Return the updated profile as JSON with the same structure, incorporating the feedback.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a brand strategist. Update brand profiles based on feedback. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as BrandProfile;
  }

  /**
   * Generate suggested hashtags based on brand and content
   */
  async suggestHashtags(
    brandProfile: BrandProfile,
    contentTopic: string
  ): Promise<string[]> {
    const prompt = `Suggest 10-15 relevant hashtags for a ${brandProfile.voiceTone} brand in this context.

Brand: ${brandProfile.description.slice(0, 500)}
Industry hashtags: ${brandProfile.preferredHashtags.join(', ')}
Content topic: ${contentTopic}

Return JSON array of hashtags (include #):
["#hashtag1", "#hashtag2", ...]

Mix of:
- Industry-specific hashtags
- Topic-specific hashtags
- Engagement hashtags
- Trending relevant hashtags`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a social media expert. Return only a JSON array of hashtags.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content || '[]';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as string[];
  }
}

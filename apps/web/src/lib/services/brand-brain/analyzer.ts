/**
 * Brand Analyzer - Uses AI to analyze brand context and build understanding
 *
 * Supports:
 * - Website analysis
 * - Social media posts analysis (auto-setup from connected accounts)
 * - Brand profile generation
 */

import OpenAI from 'openai';
import type { WebsiteAnalysis, BrandProfile, SocialPostAnalysis, AISetupResult } from './types';

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

  /**
   * Analyze social media posts to extract brand voice and patterns
   * This powers the AI auto-setup feature
   */
  async analyzeSocialPosts(
    posts: Array<{
      platform: string;
      content: string;
      createdAt: string;
      likes?: number;
      comments?: number;
      shares?: number;
    }>,
    accountInfo?: {
      displayName?: string;
      bio?: string;
      followerCount?: number;
      category?: string;
    }
  ): Promise<SocialPostAnalysis> {
    // Prepare posts for analysis (limit to most recent 50)
    const postsToAnalyze = posts.slice(0, 50);
    const postsText = postsToAnalyze
      .map(
        (p, i) =>
          `[Post ${i + 1} - ${p.platform}] (${p.likes || 0} likes, ${p.comments || 0} comments)\n${p.content}`
      )
      .join('\n\n---\n\n');

    const prompt = `Analyze these social media posts to understand the brand's voice, style, and content patterns.

${accountInfo?.displayName ? `Account Name: ${accountInfo.displayName}` : ''}
${accountInfo?.bio ? `Bio: ${accountInfo.bio}` : ''}
${accountInfo?.category ? `Category: ${accountInfo.category}` : ''}
${accountInfo?.followerCount ? `Followers: ${accountInfo.followerCount}` : ''}

POSTS:
${postsText.slice(0, 12000)}

Analyze and return JSON:
{
  "totalPostsAnalyzed": ${postsToAnalyze.length},
  "platforms": ["list of platforms"],
  "voicePatterns": {
    "tone": "professional/casual/friendly/authoritative/playful/inspirational/educational",
    "formality": "casual/balanced/formal",
    "personality": ["trait1", "trait2", "trait3"], // e.g., ["witty", "empathetic", "confident"]
    "writingStyle": "Describe their writing style in 2-3 sentences"
  },
  "contentPatterns": {
    "topTopics": ["topic1", "topic2", "topic3"], // Main themes they post about
    "commonThemes": ["theme1", "theme2"], // Recurring messages/values
    "hashtagsUsed": ["#hashtag1", "#hashtag2"], // Extract actual hashtags used
    "emojiUsage": "none/minimal/moderate/heavy",
    "avgPostLength": 150, // Approximate average character count
    "postTypes": ["educational", "promotional", "engagement", "behind-scenes", etc]
  },
  "engagementInsights": {
    "bestPerformingTopics": ["topic1", "topic2"], // Topics with highest engagement
    "bestPostingTimes": ["weekday mornings", "weekends"], // If patterns visible
    "highEngagementPatterns": ["Posts with questions perform well", etc]
  },
  "brandIndicators": {
    "industry": "Best guess at industry/sector",
    "targetAudience": ["audience1", "audience2"], // Who they're talking to
    "uniqueValueProps": ["usp1", "usp2"], // What they emphasize
    "brandPersonality": "2-3 sentence description of brand personality"
  }
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert social media analyst and brand strategist. Analyze social media posts to understand brand voice, patterns, and strategy. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();

    return JSON.parse(jsonText) as SocialPostAnalysis;
  }

  /**
   * Generate complete AI setup result from social post analysis
   * This creates everything needed to configure Brand Brain automatically
   */
  async generateAISetup(
    analysis: SocialPostAnalysis,
    accountInfo?: {
      displayName?: string;
      bio?: string;
      websiteUrl?: string;
    }
  ): Promise<AISetupResult> {
    const prompt = `Based on this social media analysis, generate a complete brand configuration.

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

${accountInfo?.displayName ? `Account Name: ${accountInfo.displayName}` : ''}
${accountInfo?.bio ? `Bio: ${accountInfo.bio}` : ''}
${accountInfo?.websiteUrl ? `Website: ${accountInfo.websiteUrl}` : ''}

Generate a complete brand setup as JSON:
{
  "suggestedProfile": {
    "description": "Comprehensive brand description based on their content (2-3 paragraphs)",
    "mission": "Inferred mission statement or null",
    "values": ["value1", "value2", "value3"],
    "uniqueSellingPoints": ["usp1", "usp2"],
    "voiceTone": "${analysis.voicePatterns.tone}",
    "writingStyle": "${analysis.voicePatterns.writingStyle}",
    "targetAudience": {
      "demographics": ["demographic1", "demographic2"],
      "interests": ["interest1", "interest2"],
      "painPoints": ["pain1", "pain2"]
    },
    "contentPillars": ${JSON.stringify(analysis.contentPatterns.topTopics)},
    "preferredHashtags": ${JSON.stringify(analysis.contentPatterns.hashtagsUsed.slice(0, 10))},
    "emojiStyle": "${analysis.contentPatterns.emojiUsage}",
    "ctaStyle": "soft/direct based on their style",
    "doNotMention": [], // Leave empty unless clear patterns
    "mustMention": [], // Key messages they always include
    "competitors": [],
    "differentiators": ["diff1", "diff2"]
  },
  "suggestedSettings": {
    "brandName": "${accountInfo?.displayName || 'Brand Name'}",
    "industry": "${analysis.brandIndicators.industry}",
    "voiceTone": "${analysis.voicePatterns.tone}",
    "formalityLevel": 3, // 1-5 based on formality
    "emojiPreference": "${analysis.contentPatterns.emojiUsage}",
    "hashtagPreference": "moderate",
    "contentPillars": ${JSON.stringify(analysis.contentPatterns.topTopics)},
    "targetAudiences": [
      {
        "name": "Primary Audience",
        "demographics": "Based on content analysis",
        "interests": ["interest1", "interest2"],
        "painPoints": ["pain1", "pain2"]
      }
    ],
    "postingSchedule": {
      "timezone": "America/New_York",
      "optimalTimes": [
        { "dayOfWeek": 1, "hour": 9 },
        { "dayOfWeek": 3, "hour": 12 },
        { "dayOfWeek": 5, "hour": 10 }
      ]
    }
  },
  "confidence": 0.85, // How confident in these recommendations (0-1)
  "dataSourcesSummary": "Analyzed X posts from Y platforms"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert brand strategist. Generate comprehensive, actionable brand configurations from social media analysis. Always respond with valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const text = response.choices[0]?.message?.content || '{}';
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonText);

    return {
      success: true,
      analysis,
      suggestedProfile: result.suggestedProfile,
      suggestedSettings: result.suggestedSettings,
      confidence: result.confidence || 0.8,
      dataSourcesSummary:
        result.dataSourcesSummary ||
        `Analyzed ${analysis.totalPostsAnalyzed} posts from ${analysis.platforms.join(', ')}`,
    };
  }
}

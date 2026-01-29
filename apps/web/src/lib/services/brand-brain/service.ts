/**
 * Brand Brain Service - Manages brand understanding in the database
 */

import { prisma } from '@epic-ai/database';
import type { VoiceTone } from '@prisma/client';
import { BrandAnalyzer } from './analyzer';
import { ContextManager } from '../context-engine/manager';
import type { BrandProfile, ContentPrompt } from './types';

export class BrandBrainService {
  private brandId: string;
  private analyzer: BrandAnalyzer;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.analyzer = new BrandAnalyzer();
  }

  /**
   * Initialize brand brain by analyzing website and context
   */
  async initialize(websiteUrl?: string): Promise<BrandProfile> {
    const brand = await prisma.brand.findUnique({
      where: { id: this.brandId },
      include: { brandBrain: true },
    });

    if (!brand) {
      throw new Error('Brand not found');
    }

    // Get context items for additional analysis
    const contextManager = new ContextManager(this.brandId);
    const contextItems = await contextManager.getContextItems({ limit: 20 });

    let websiteAnalysis = null;

    // Analyze website if provided
    if (websiteUrl || brand.website) {
      const url = websiteUrl || brand.website!;

      // Scrape the website first
      const { WebsiteScraper } = await import('../context-engine/scrapers/website');
      const scraper = new WebsiteScraper({ url, maxPages: 5 });
      const result = await scraper.scrape();

      if (result.success && result.items.length > 0) {
        const content = result.items.map((i) => `${i.title}\n${i.content}`).join('\n\n');
        websiteAnalysis = await this.analyzer.analyzeWebsite(content, url);
      }
    }

    // Generate brand profile
    const additionalContext = contextItems.map(
      (item) => `[${item.contentType}] ${item.title || ''}\n${item.summary || item.content.slice(0, 500)}`
    );

    const profile = await this.analyzer.generateBrandProfile(
      websiteAnalysis || {
        companyName: brand.name,
        industry: brand.industry || 'Unknown',
        description: '',
        products: [],
        services: [],
        targetAudience: [],
        uniqueSellingPoints: [],
        tone: 'professional',
        keyMessages: [],
      },
      additionalContext
    );

    // Save to database
    await this.saveProfile(profile);

    return profile;
  }

  /**
   * Get the current brand profile
   */
  async getProfile(): Promise<BrandProfile | null> {
    const brain = await prisma.brandBrain.findUnique({
      where: { brandId: this.brandId },
    });

    if (!brain) return null;

    return {
      description: brain.description || '',
      mission: brain.mission,
      values: brain.values,
      uniqueSellingPoints: brain.uniqueSellingPoints,
      voiceTone: brain.voiceTone as string,
      writingStyle: brain.writingStyle || '',
      targetAudience: (brain.targetAudience as BrandProfile['targetAudience']) || {
        demographics: [],
        interests: [],
        painPoints: [],
      },
      contentPillars: brain.contentPillarsLegacy || [],
      preferredHashtags: brain.preferredHashtags,
      emojiStyle: brain.emojiStyle as BrandProfile['emojiStyle'],
      ctaStyle: brain.ctaStyle as BrandProfile['ctaStyle'],
      doNotMention: brain.doNotMention,
      mustMention: brain.mustMention,
      competitors: (brain.competitors as BrandProfile['competitors']) || [],
      differentiators: brain.differentiators,
    };
  }

  /**
   * Update brand profile with user feedback
   */
  async updateWithFeedback(feedback: string): Promise<BrandProfile> {
    const currentProfile = await this.getProfile();
    if (!currentProfile) {
      throw new Error('Brand profile not initialized');
    }

    const updatedProfile = await this.analyzer.refineBrandProfile(currentProfile, feedback);
    await this.saveProfile(updatedProfile);

    return updatedProfile;
  }

  /**
   * Update specific fields of the brand profile
   */
  async updateProfile(updates: Partial<BrandProfile>): Promise<void> {
    const voiceToneValue = (updates.voiceTone?.toUpperCase() || 'PROFESSIONAL') as VoiceTone;
    await prisma.brandBrain.upsert({
      where: { brandId: this.brandId },
      create: {
        brandId: this.brandId,
        description: updates.description,
        mission: updates.mission,
        values: updates.values || [],
        uniqueSellingPoints: updates.uniqueSellingPoints || [],
        voiceTone: voiceToneValue,
        writingStyle: updates.writingStyle,
        targetAudience: updates.targetAudience as object,
        contentPillarsLegacy: updates.contentPillars || [],
        preferredHashtags: updates.preferredHashtags || [],
        emojiStyle: updates.emojiStyle || 'moderate',
        ctaStyle: updates.ctaStyle || 'soft',
        doNotMention: updates.doNotMention || [],
        mustMention: updates.mustMention || [],
        competitors: updates.competitors as object,
        differentiators: updates.differentiators || [],
      },
      update: {
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.mission !== undefined && { mission: updates.mission }),
        ...(updates.values !== undefined && { values: updates.values }),
        ...(updates.uniqueSellingPoints !== undefined && { uniqueSellingPoints: updates.uniqueSellingPoints }),
        ...(updates.voiceTone !== undefined && { voiceTone: updates.voiceTone.toUpperCase() as VoiceTone }),
        ...(updates.writingStyle !== undefined && { writingStyle: updates.writingStyle }),
        ...(updates.targetAudience !== undefined && { targetAudience: updates.targetAudience as object }),
        ...(updates.contentPillars !== undefined && { contentPillarsLegacy: updates.contentPillars }),
        ...(updates.preferredHashtags !== undefined && { preferredHashtags: updates.preferredHashtags }),
        ...(updates.emojiStyle !== undefined && { emojiStyle: updates.emojiStyle }),
        ...(updates.ctaStyle !== undefined && { ctaStyle: updates.ctaStyle }),
        ...(updates.doNotMention !== undefined && { doNotMention: updates.doNotMention }),
        ...(updates.mustMention !== undefined && { mustMention: updates.mustMention }),
        ...(updates.competitors !== undefined && { competitors: updates.competitors as object }),
        ...(updates.differentiators !== undefined && { differentiators: updates.differentiators }),
        lastAnalyzedAt: new Date(),
      },
    });
  }

  /**
   * Generate a content prompt for the AI content generator
   */
  async getContentPrompt(): Promise<ContentPrompt> {
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('Brand profile not initialized');
    }

    const systemPrompt = `You are a social media content creator for ${profile.description.split('.')[0]}.

Your writing style:
${profile.writingStyle}

Voice and tone: ${profile.voiceTone}
Emoji usage: ${profile.emojiStyle}
Call-to-action style: ${profile.ctaStyle}

You must always:
${profile.mustMention.map((m) => `- Include: ${m}`).join('\n')}

You must never:
${profile.doNotMention.map((m) => `- Mention: ${m}`).join('\n')}`;

    const brandContext = `Brand Overview:
${profile.description}

${profile.mission ? `Mission: ${profile.mission}` : ''}

Core Values: ${profile.values.join(', ')}

What Makes Us Different:
${profile.uniqueSellingPoints.map((usp) => `- ${usp}`).join('\n')}

Target Audience:
- Demographics: ${profile.targetAudience.demographics.join(', ')}
- Interests: ${profile.targetAudience.interests.join(', ')}
- Pain Points: ${profile.targetAudience.painPoints.join(', ')}

Content Pillars (main topics):
${profile.contentPillars.map((p) => `- ${p}`).join('\n')}`;

    const styleGuidelines = `Style Guidelines:
- Tone: ${profile.voiceTone}
- Emoji style: ${profile.emojiStyle}
- CTA style: ${profile.ctaStyle}
- Preferred hashtags: ${profile.preferredHashtags.slice(0, 5).join(' ')}

Differentiators to highlight:
${profile.differentiators.map((d) => `- ${d}`).join('\n')}`;

    return { systemPrompt, brandContext, styleGuidelines };
  }

  /**
   * Get suggested hashtags for a topic
   */
  async suggestHashtags(topic: string): Promise<string[]> {
    const profile = await this.getProfile();
    if (!profile) {
      return [];
    }

    return this.analyzer.suggestHashtags(profile, topic);
  }

  // Private methods

  private async saveProfile(profile: BrandProfile): Promise<void> {
    const voiceToneValue = (profile.voiceTone?.toUpperCase() || 'PROFESSIONAL') as VoiceTone;
    await prisma.brandBrain.upsert({
      where: { brandId: this.brandId },
      create: {
        brandId: this.brandId,
        description: profile.description,
        mission: profile.mission,
        values: profile.values,
        uniqueSellingPoints: profile.uniqueSellingPoints,
        voiceTone: voiceToneValue,
        writingStyle: profile.writingStyle,
        targetAudience: profile.targetAudience as object,
        contentPillarsLegacy: profile.contentPillars,
        preferredHashtags: profile.preferredHashtags,
        emojiStyle: profile.emojiStyle,
        ctaStyle: profile.ctaStyle,
        doNotMention: profile.doNotMention,
        mustMention: profile.mustMention,
        competitors: profile.competitors as object,
        differentiators: profile.differentiators,
        lastAnalyzedAt: new Date(),
      },
      update: {
        description: profile.description,
        mission: profile.mission,
        values: profile.values,
        uniqueSellingPoints: profile.uniqueSellingPoints,
        voiceTone: voiceToneValue,
        writingStyle: profile.writingStyle,
        targetAudience: profile.targetAudience as object,
        contentPillarsLegacy: profile.contentPillars,
        preferredHashtags: profile.preferredHashtags,
        emojiStyle: profile.emojiStyle,
        ctaStyle: profile.ctaStyle,
        doNotMention: profile.doNotMention,
        mustMention: profile.mustMention,
        competitors: profile.competitors as object,
        differentiators: profile.differentiators,
        lastAnalyzedAt: new Date(),
      },
    });
  }
}

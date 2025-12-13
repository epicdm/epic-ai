/**
 * Feedback Loop
 * Uses analytics to improve content generation
 */

import { prisma } from '@epic-ai/database';
import { AnalyticsAnalyzer } from './analyzer';
import type { LearningData } from './types';

export class FeedbackLoop {
  private brandId: string;
  private analyzer: AnalyticsAnalyzer;

  constructor(brandId: string) {
    this.brandId = brandId;
    this.analyzer = new AnalyticsAnalyzer(brandId);
  }

  /**
   * Update brand brain with learned insights
   */
  async updateBrandBrainWithLearnings(): Promise<void> {
    // Get learning data for the past month
    const learnings = await this.analyzer.generateLearningData('month');

    // Get current brand brain
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId: this.brandId },
    });

    if (!brandBrain) {
      console.warn('No brand brain found for feedback loop');
      return;
    }

    // Merge learnings into brand brain
    const currentLearnings = (brandBrain.learnings as Record<string, unknown>) || {};
    const updatedLearnings = {
      ...currentLearnings,
      lastUpdated: new Date().toISOString(),
      topHashtags: learnings.topPerformingAttributes.hashtags,
      avoidHashtags: learnings.underperformingAttributes.hashtags,
      bestPostingTimes: learnings.topPerformingAttributes.postingTimes,
      topFormats: learnings.topPerformingAttributes.formats,
      insights: learnings.insights,
      recommendedChanges: learnings.recommendedChanges,
    };

    await prisma.brandBrain.update({
      where: { brandId: this.brandId },
      data: {
        learnings: updatedLearnings,
        updatedAt: new Date(),
      },
    });

    // Store learning history
    await prisma.learningHistory.create({
      data: {
        brandId: this.brandId,
        period: 'month',
        learnings: learnings as unknown as Record<string, unknown>,
        appliedAt: new Date(),
      },
    });
  }

  /**
   * Get content generation prompts enhanced with learnings
   */
  async getEnhancedPrompt(basePrompt: string): Promise<string> {
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId: this.brandId },
    });

    if (!brandBrain?.learnings) {
      return basePrompt;
    }

    const learnings = brandBrain.learnings as {
      topHashtags?: string[];
      avoidHashtags?: string[];
      insights?: Array<{ type: string; recommendation: string }>;
    };

    let enhancedPrompt = basePrompt;

    // Add hashtag guidance
    if (learnings.topHashtags?.length) {
      enhancedPrompt += `\n\nPreferred hashtags (high engagement): ${learnings.topHashtags.slice(0, 5).join(', ')}`;
    }

    if (learnings.avoidHashtags?.length) {
      enhancedPrompt += `\nAvoid these hashtags (low engagement): ${learnings.avoidHashtags.join(', ')}`;
    }

    // Add insights
    if (learnings.insights?.length) {
      const relevantInsights = learnings.insights
        .filter((i) => ['topic', 'format', 'length'].includes(i.type))
        .slice(0, 3);

      if (relevantInsights.length > 0) {
        enhancedPrompt += '\n\nContent optimization insights:';
        for (const insight of relevantInsights) {
          enhancedPrompt += `\n- ${insight.recommendation}`;
        }
      }
    }

    return enhancedPrompt;
  }

  /**
   * Score potential content before publishing
   */
  async scoreContent(
    content: string,
    hashtags: string[],
    contentType: string
  ): Promise<{
    score: number;
    factors: { name: string; impact: number; recommendation?: string }[];
  }> {
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId: this.brandId },
    });

    const factors: { name: string; impact: number; recommendation?: string }[] = [];
    let score = 50; // Base score

    if (!brandBrain?.learnings) {
      return { score, factors };
    }

    const learnings = brandBrain.learnings as {
      topHashtags?: string[];
      avoidHashtags?: string[];
      topFormats?: string[];
    };

    // Check hashtags
    if (learnings.topHashtags?.length) {
      const goodHashtags = hashtags.filter((h) =>
        learnings.topHashtags!.includes(h)
      );
      if (goodHashtags.length > 0) {
        const boost = Math.min(goodHashtags.length * 5, 15);
        score += boost;
        factors.push({
          name: 'High-performing hashtags',
          impact: boost,
        });
      }
    }

    if (learnings.avoidHashtags?.length) {
      const badHashtags = hashtags.filter((h) =>
        learnings.avoidHashtags!.includes(h)
      );
      if (badHashtags.length > 0) {
        const penalty = badHashtags.length * 5;
        score -= penalty;
        factors.push({
          name: 'Low-performing hashtags',
          impact: -penalty,
          recommendation: `Consider removing: ${badHashtags.join(', ')}`,
        });
      }
    }

    // Check content type
    if (learnings.topFormats?.length) {
      if (learnings.topFormats.includes(contentType)) {
        score += 10;
        factors.push({
          name: 'Preferred content format',
          impact: 10,
        });
      }
    }

    // Check content length (ideal range: 100-250 characters for most platforms)
    if (content.length < 50) {
      score -= 10;
      factors.push({
        name: 'Content too short',
        impact: -10,
        recommendation: 'Consider adding more context or value',
      });
    } else if (content.length > 500) {
      score -= 5;
      factors.push({
        name: 'Content may be too long',
        impact: -5,
        recommendation: 'Consider condensing for better engagement',
      });
    } else if (content.length >= 100 && content.length <= 250) {
      score += 5;
      factors.push({
        name: 'Optimal content length',
        impact: 5,
      });
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    return { score, factors };
  }

  /**
   * Get best times to post based on historical data
   */
  async getBestPostingTimes(): Promise<
    { dayOfWeek: number; hour: number; score: number }[]
  > {
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId: this.brandId },
    });

    if (!brandBrain?.learnings) {
      // Return default times if no data
      return [
        { dayOfWeek: 2, hour: 10, score: 80 }, // Tuesday 10am
        { dayOfWeek: 3, hour: 14, score: 75 }, // Wednesday 2pm
        { dayOfWeek: 4, hour: 11, score: 70 }, // Thursday 11am
      ];
    }

    const learnings = brandBrain.learnings as {
      bestPostingTimes?: { dayOfWeek: number; hour: number; avgEngagement: number }[];
    };

    if (!learnings.bestPostingTimes?.length) {
      return [
        { dayOfWeek: 2, hour: 10, score: 80 },
        { dayOfWeek: 3, hour: 14, score: 75 },
        { dayOfWeek: 4, hour: 11, score: 70 },
      ];
    }

    // Normalize engagement to 0-100 score
    const maxEngagement = Math.max(
      ...learnings.bestPostingTimes.map((t) => t.avgEngagement)
    );

    return learnings.bestPostingTimes.map((t) => ({
      dayOfWeek: t.dayOfWeek,
      hour: t.hour,
      score: Math.round((t.avgEngagement / maxEngagement) * 100),
    }));
  }
}

/**
 * Learning Generator - AI-powered insights from analytics
 *
 * PKG-025: Analytics & Learning Loop
 *
 * Analyzes post performance patterns and generates learnings
 * that feed back into Brand Brain for improved content generation.
 */

import { prisma } from '@epic-ai/database';
import OpenAI from 'openai';
import type { LearningType, SocialPlatform } from '@prisma/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AnalysisData {
  totalPosts: number;
  avgEngagementRate: number;
  topPosts: {
    content: string;
    platform: string;
    engagementRate: number;
    dayOfWeek: number;
    hourOfDay: number;
    hasMedia: boolean;
    hasHashtags: boolean;
    hasQuestion: boolean;
    hasCTA: boolean;
  }[];
  worstPosts: {
    content: string;
    platform: string;
    engagementRate: number;
  }[];
  contentCharacteristics: {
    postsWithMedia: number;
    postsWithHashtags: number;
    postsWithQuestions: number;
    postsWithCTAs: number;
    postsWithEmojis: number;
    postsWithLinks: number;
  };
  timingDistribution: {
    byDay: Record<number, { count: number; avgEngagement: number }>;
    byHour: Record<number, { count: number; avgEngagement: number }>;
  };
  platformBreakdown: Record<string, { count: number; avgEngagement: number }>;
}

/**
 * Group by helper function
 */
function groupByWithStats<T>(
  items: T[],
  keyFn: (item: T) => number,
  engagementFn: (item: T) => number
): Record<number, { count: number; avgEngagement: number }> {
  const groups: Record<number, { count: number; totalEngagement: number }> = {};

  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = { count: 0, totalEngagement: 0 };
    }
    groups[key].count++;
    groups[key].totalEngagement += engagementFn(item);
  }

  const result: Record<number, { count: number; avgEngagement: number }> = {};
  for (const [key, data] of Object.entries(groups)) {
    result[parseInt(key)] = {
      count: data.count,
      avgEngagement: data.totalEngagement / data.count,
    };
  }

  return result;
}

/**
 * Generate AI-powered learnings from analytics data
 */
export async function generateLearnings(orgId: string): Promise<{
  generated: number;
  learnings: string[];
}> {
  // Get all brand brains for this org
  const brands = await prisma.brand.findMany({
    where: { organizationId: orgId },
    include: { brandBrain: true },
  });

  if (brands.length === 0 || !brands[0].brandBrain) {
    return { generated: 0, learnings: [] };
  }

  const brandBrain = brands[0].brandBrain;

  // Get analytics data from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const analytics = await prisma.postAnalytics.findMany({
    where: {
      orgId,
      publishedAt: { gte: thirtyDaysAgo },
    },
    include: {
      variation: {
        select: { text: true },
      },
    },
    orderBy: { engagementRate: 'desc' },
  });

  if (analytics.length < 5) {
    // Not enough data for meaningful analysis
    return { generated: 0, learnings: [] };
  }

  // Get top and worst performing posts
  const topPosts = analytics.slice(0, 5).map((a) => ({
    content: a.variation?.text?.substring(0, 200) || '',
    platform: a.platform,
    engagementRate: a.engagementRate,
    dayOfWeek: a.dayOfWeek,
    hourOfDay: a.hourOfDay,
    hasMedia: a.hasMedia,
    hasHashtags: a.hasHashtags,
    hasQuestion: a.hasQuestion,
    hasCTA: a.hasCTA,
  }));

  const worstPosts = analytics
    .slice(-5)
    .reverse()
    .map((a) => ({
      content: a.variation?.text?.substring(0, 200) || '',
      platform: a.platform,
      engagementRate: a.engagementRate,
    }));

  // Calculate content characteristics
  const contentCharacteristics = {
    postsWithMedia: analytics.filter((a) => a.hasMedia).length,
    postsWithHashtags: analytics.filter((a) => a.hasHashtags).length,
    postsWithQuestions: analytics.filter((a) => a.hasQuestion).length,
    postsWithCTAs: analytics.filter((a) => a.hasCTA).length,
    postsWithEmojis: analytics.filter((a) => a.hasEmojis).length,
    postsWithLinks: analytics.filter((a) => a.hasLinks).length,
  };

  // Calculate timing distribution
  const timingDistribution = {
    byDay: groupByWithStats(
      analytics,
      (a) => a.dayOfWeek,
      (a) => a.engagementRate
    ),
    byHour: groupByWithStats(
      analytics,
      (a) => a.hourOfDay,
      (a) => a.engagementRate
    ),
  };

  // Calculate platform breakdown
  const platformGroups: Record<string, { count: number; totalEngagement: number }> = {};
  for (const a of analytics) {
    if (!platformGroups[a.platform]) {
      platformGroups[a.platform] = { count: 0, totalEngagement: 0 };
    }
    platformGroups[a.platform].count++;
    platformGroups[a.platform].totalEngagement += a.engagementRate;
  }

  const platformBreakdown: Record<string, { count: number; avgEngagement: number }> = {};
  for (const [platform, data] of Object.entries(platformGroups)) {
    platformBreakdown[platform] = {
      count: data.count,
      avgEngagement: data.totalEngagement / data.count,
    };
  }

  // Prepare analysis data
  const analysisData: AnalysisData = {
    totalPosts: analytics.length,
    avgEngagementRate:
      analytics.reduce((sum, a) => sum + a.engagementRate, 0) / analytics.length,
    topPosts,
    worstPosts,
    contentCharacteristics,
    timingDistribution,
    platformBreakdown,
  };

  // Get existing learnings to avoid duplicates
  const currentLearnings = await prisma.brandLearning.findMany({
    where: { brainId: brandBrain.id, isActive: true },
    select: { type: true, insight: true },
  });

  // Day names for better context
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Generate insights with AI
  const prompt = `Analyze this social media performance data and generate actionable insights.

DATA SUMMARY:
- Total posts analyzed: ${analysisData.totalPosts}
- Date range: Last 30 days
- Average engagement rate: ${analysisData.avgEngagementRate.toFixed(2)}%

TOP PERFORMING POSTS:
${JSON.stringify(analysisData.topPosts, null, 2)}

WORST PERFORMING POSTS:
${JSON.stringify(analysisData.worstPosts, null, 2)}

CONTENT CHARACTERISTICS:
- Posts with media: ${analysisData.contentCharacteristics.postsWithMedia} (${((analysisData.contentCharacteristics.postsWithMedia / analysisData.totalPosts) * 100).toFixed(1)}%)
- Posts with hashtags: ${analysisData.contentCharacteristics.postsWithHashtags} (${((analysisData.contentCharacteristics.postsWithHashtags / analysisData.totalPosts) * 100).toFixed(1)}%)
- Posts with questions: ${analysisData.contentCharacteristics.postsWithQuestions} (${((analysisData.contentCharacteristics.postsWithQuestions / analysisData.totalPosts) * 100).toFixed(1)}%)
- Posts with CTAs: ${analysisData.contentCharacteristics.postsWithCTAs} (${((analysisData.contentCharacteristics.postsWithCTAs / analysisData.totalPosts) * 100).toFixed(1)}%)

TIMING PERFORMANCE:
- By day: ${Object.entries(analysisData.timingDistribution.byDay)
    .map(([day, data]) => `${dayNames[parseInt(day)]}: ${data.avgEngagement.toFixed(2)}% (${data.count} posts)`)
    .join(', ')}
- By hour: ${Object.entries(analysisData.timingDistribution.byHour)
    .sort((a, b) => b[1].avgEngagement - a[1].avgEngagement)
    .slice(0, 5)
    .map(([hour, data]) => `${hour}:00: ${data.avgEngagement.toFixed(2)}%`)
    .join(', ')}

PLATFORM BREAKDOWN:
${Object.entries(analysisData.platformBreakdown)
  .map(([platform, data]) => `- ${platform}: ${data.count} posts, ${data.avgEngagement.toFixed(2)}% avg engagement`)
  .join('\n')}

EXISTING LEARNINGS (avoid duplicating these):
${currentLearnings.map((l) => `- ${l.type}: ${l.insight}`).join('\n') || 'None yet'}

Generate 3-5 NEW, SPECIFIC, ACTIONABLE learnings based on the data patterns. Each learning should:
1. Be based on clear data patterns (not generic advice)
2. Include specific numbers or percentages
3. Be actionable for content strategy
4. Different from existing learnings

Respond in JSON format:
{
  "learnings": [
    {
      "type": "BEST_TIME|BEST_FORMAT|BEST_TOPIC|TONE_ADJUSTMENT|PLATFORM_SPECIFIC|AVOID|BEST_HASHTAG|AUDIENCE_INSIGHT",
      "insight": "Specific, actionable insight based on the data",
      "evidence": "Data supporting this insight",
      "confidence": 0.8
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a social media analytics expert. Analyze performance data and generate specific, actionable insights based on the patterns you observe.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return { generated: 0, learnings: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const newLearnings: string[] = [];

    // Save new learnings
    for (const learning of parsed.learnings || []) {
      // Check if similar learning already exists
      const exists = currentLearnings.some(
        (l) =>
          l.type === learning.type &&
          l.insight.toLowerCase().includes(learning.insight.toLowerCase().slice(0, 30))
      );

      if (!exists && learning.insight && learning.type) {
        // Validate learning type
        const validTypes: LearningType[] = [
          'BEST_TIME',
          'BEST_HASHTAG',
          'BEST_TOPIC',
          'BEST_FORMAT',
          'AUDIENCE_INSIGHT',
          'TONE_ADJUSTMENT',
          'AVOID',
          'PLATFORM_SPECIFIC',
        ];

        const learningType = validTypes.includes(learning.type as LearningType)
          ? (learning.type as LearningType)
          : 'AUDIENCE_INSIGHT';

        await prisma.brandLearning.create({
          data: {
            brainId: brandBrain.id,
            type: learningType,
            insight: learning.insight,
            sourceData: { evidence: learning.evidence },
            confidence: learning.confidence || 0.7,
            isActive: true,
          },
        });

        newLearnings.push(learning.insight);
      }
    }

    // Update brand brain last analyzed timestamp
    await prisma.brandBrain.update({
      where: { id: brandBrain.id },
      data: { lastAnalyzedAt: new Date() },
    });

    return { generated: newLearnings.length, learnings: newLearnings };
  } catch (error) {
    console.error('Error generating learnings:', error);
    return { generated: 0, learnings: [] };
  }
}

/**
 * Process learnings for all orgs
 */
export async function processAllLearnings(): Promise<{
  orgsProcessed: number;
  totalLearnings: number;
}> {
  const orgs = await prisma.organization.findMany({
    select: { id: true },
  });

  let totalLearnings = 0;

  for (const org of orgs) {
    try {
      const result = await generateLearnings(org.id);
      totalLearnings += result.generated;
    } catch (error) {
      console.error(`Error generating learnings for org ${org.id}:`, error);
    }
  }

  return {
    orgsProcessed: orgs.length,
    totalLearnings,
  };
}

/**
 * Get learnings for a brand
 */
export async function getBrandLearnings(brandId: string): Promise<
  Array<{
    id: string;
    type: string;
    insight: string;
    confidence: number;
    createdAt: Date;
  }>
> {
  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      brandBrain: {
        include: {
          brandLearnings: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 20,
          },
        },
      },
    },
  });

  if (!brand?.brandBrain) {
    return [];
  }

  return brand.brandBrain.brandLearnings.map((l) => ({
    id: l.id,
    type: l.type,
    insight: l.insight,
    confidence: parseFloat(l.confidence.toString()),
    createdAt: l.createdAt,
  }));
}

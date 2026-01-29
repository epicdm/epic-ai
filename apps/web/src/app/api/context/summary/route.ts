/**
 * Context Summary API - PKG-021
 * GET - Get aggregated context summary for Content Factory
 *
 * This endpoint provides a condensed version of all brand context
 * that can be included in AI prompts for content generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import OpenAI from 'openai';
import { z } from 'zod';

// Helper to verify brand access
async function verifyBrandAccess(brandId: string, userId: string) {
  const brand = await prisma.brand.findFirst({
    where: {
      id: brandId,
      organization: {
        memberships: { some: { userId } },
      },
    },
  });
  return brand;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get('brandId');
    const maxItems = parseInt(searchParams.get('maxItems') || '20', 10);
    const contentTypes = searchParams.get('contentTypes')?.split(',') || null;
    const regenerate = searchParams.get('regenerate') === 'true';

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get brand brain for additional context
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId },
      include: {
        audiences: { where: { isPrimary: true }, take: 1 },
        pillars: { where: { isActive: true }, take: 5 },
      },
    });

    // Get context items sorted by importance
    const contextItems = await prisma.contextItem.findMany({
      where: {
        source: { brandId },
        ...(contentTypes && { contentType: { in: contentTypes } }),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: [
        { importance: 'desc' },
        { isEvergreen: 'desc' },
        { createdAt: 'desc' },
      ],
      take: maxItems,
      include: {
        source: { select: { type: true, name: true } },
      },
    });

    // Get context source stats
    const sources = await prisma.contextSource.findMany({
      where: { brandId },
      include: {
        _count: { select: { contextItems: true } },
      },
    });

    // Build context summary
    const contextSummary = buildContextSummary(contextItems, brandBrain);

    // Generate AI-enhanced summary if requested or not cached
    let aiSummary: string | null = null;
    if (regenerate || !brandBrain?.brandSummary) {
      aiSummary = await generateAISummary(contextSummary, brandBrain);
    }

    return NextResponse.json({
      summary: {
        brandId,
        brandName: brand.name,

        // Brand Brain Context
        brandBrain: brandBrain ? {
          companyName: brandBrain.companyName,
          description: brandBrain.description,
          mission: brandBrain.mission,
          values: brandBrain.values,
          voiceTone: brandBrain.voiceTone,
          formalityLevel: brandBrain.formalityLevel,
          primaryAudience: brandBrain.audiences[0] || null,
          activePillars: brandBrain.pillars.map(p => ({
            name: p.name,
            topics: p.topics,
          })),
        } : null,

        // Context Stats
        stats: {
          totalSources: sources.length,
          totalItems: contextItems.length,
          sourceBreakdown: sources.map(s => ({
            type: s.type,
            name: s.name,
            itemCount: s._count.contextItems,
            status: s.status,
          })),
        },

        // Content for AI prompts
        contextForPrompt: contextSummary,

        // AI-generated summary (if available)
        aiSummary: aiSummary || brandBrain?.brandSummary || null,

        // Top keywords and topics across all context
        topKeywords: extractTopKeywords(contextItems),
        topTopics: extractTopTopics(contextItems),

        // Individual context items (for detailed access)
        items: contextItems.map(item => ({
          id: item.id,
          title: item.title,
          summary: item.summary,
          contentType: item.contentType,
          importance: item.importance,
          isEvergreen: item.isEvergreen,
          keywords: item.keywords,
          source: {
            type: item.source.type,
            name: item.source.name,
          },
        })),
      },
    });
  } catch (error) {
    console.error('Failed to get context summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildContextSummary(
  items: Array<{
    title: string | null;
    summary: string | null;
    content: string;
    contentType: string;
    importance: number;
    isEvergreen: boolean;
    source: { type: string; name: string };
  }>,
  brandBrain: {
    companyName: string | null;
    description: string | null;
    mission: string | null;
    values: string[];
    uniqueSellingPoints: string[];
  } | null
): string {
  const sections: string[] = [];

  // Brand overview
  if (brandBrain) {
    if (brandBrain.companyName) {
      sections.push(`Company: ${brandBrain.companyName}`);
    }
    if (brandBrain.description) {
      sections.push(`About: ${brandBrain.description}`);
    }
    if (brandBrain.mission) {
      sections.push(`Mission: ${brandBrain.mission}`);
    }
    if (brandBrain.values.length > 0) {
      sections.push(`Core Values: ${brandBrain.values.join(', ')}`);
    }
    if (brandBrain.uniqueSellingPoints.length > 0) {
      sections.push(`USPs: ${brandBrain.uniqueSellingPoints.join('; ')}`);
    }
  }

  // Group items by content type
  const groupedItems: Record<string, typeof items> = {};
  for (const item of items) {
    const type = item.contentType;
    if (!groupedItems[type]) {
      groupedItems[type] = [];
    }
    groupedItems[type].push(item);
  }

  // Add each content type section
  for (const [type, typeItems] of Object.entries(groupedItems)) {
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    sections.push(`\n## ${typeName} Content:`);

    for (const item of typeItems.slice(0, 5)) { // Limit to top 5 per type
      const title = item.title || 'Untitled';
      const content = item.summary || item.content.slice(0, 200);
      sections.push(`- ${title}: ${content}`);
    }
  }

  return sections.join('\n');
}

function extractTopKeywords(
  items: Array<{ keywords: string[] }>
): Array<{ keyword: string; count: number }> {
  const keywordCounts: Record<string, number> = {};

  for (const item of items) {
    for (const keyword of item.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      keywordCounts[lowerKeyword] = (keywordCounts[lowerKeyword] || 0) + 1;
    }
  }

  return Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, count]) => ({ keyword, count }));
}

function extractTopTopics(
  items: Array<{ topics: string[] }>
): Array<{ topic: string; count: number }> {
  const topicCounts: Record<string, number> = {};

  for (const item of items) {
    for (const topic of item.topics) {
      const lowerTopic = topic.toLowerCase();
      topicCounts[lowerTopic] = (topicCounts[lowerTopic] || 0) + 1;
    }
  }

  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic, count]) => ({ topic, count }));
}

async function generateAISummary(
  contextSummary: string,
  brandBrain: {
    voiceTone: string;
    formalityLevel: number;
  } | null
): Promise<string | null> {
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a marketing content strategist. Create a concise context summary that a content generation AI can use to create on-brand social media content. Focus on:
1. Key brand identity points
2. Main products/services
3. Target audience insights
4. Content themes to emphasize
5. Unique differentiators

Keep it actionable and under 400 words.`,
        },
        {
          role: 'user',
          content: `Create a context summary from this brand information:\n\n${contextSummary}\n\nVoice tone: ${brandBrain?.voiceTone || 'Professional'}\nFormality: ${brandBrain?.formalityLevel || 3}/5`,
        },
      ],
      temperature: 0.5,
      max_tokens: 600,
    });

    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('Failed to generate AI summary:', error);
    return null;
  }
}

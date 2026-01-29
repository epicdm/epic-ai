/**
 * Generate Brand Summary API - PKG-020
 * POST - Generate AI brand summary from brand brain data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma } from '@epic-ai/database';
import OpenAI from 'openai';
import { z } from 'zod';

const requestSchema = z.object({
  brandId: z.string(),
});

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

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { brandId } = requestSchema.parse(body);

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Get brand brain with all related data
    const brain = await prisma.brandBrain.findUnique({
      where: { brandId },
      include: {
        audiences: true,
        pillars: { where: { isActive: true } },
        brandCompetitors: true,
      },
    });

    if (!brain) {
      return NextResponse.json({ error: 'Brand brain not found. Initialize first.' }, { status: 404 });
    }

    // Build context for AI
    const context = buildBrandContext(brand, brain);

    // Generate summary using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert brand strategist. Generate a comprehensive brand summary that can be used to guide AI content generation. The summary should be written in second person ("you" referring to the brand) and should be actionable for a content creation AI.

Your summary should include:
1. Brand essence (2-3 sentences capturing the core identity)
2. Voice guidelines (how to write content)
3. Key messages to convey
4. Topics to focus on
5. Things to avoid
6. Target audience insights

Keep the summary concise but comprehensive (300-500 words). Use clear, direct language.`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const summary = completion.choices[0]?.message?.content || '';

    // Update brand brain with the generated summary
    const updatedBrain = await prisma.brandBrain.update({
      where: { brandId },
      data: {
        brandSummary: summary,
        summaryGeneratedAt: new Date(),
      },
      include: {
        audiences: true,
        pillars: true,
        brandCompetitors: true,
      },
    });

    return NextResponse.json({
      brain: updatedBrain,
      summary,
      generatedAt: updatedBrain.summaryGeneratedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    console.error('Failed to generate brand summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function buildBrandContext(
  brand: { name: string; website: string | null; industry: string | null },
  brain: {
    companyName: string | null;
    description: string | null;
    mission: string | null;
    values: string[];
    uniqueSellingPoints: string[];
    industry: string | null;
    targetMarket: string | null;
    voiceTone: string;
    voiceToneCustom: string | null;
    formalityLevel: number;
    writingStyle: string | null;
    doNotMention: string[];
    mustMention: string[];
    useEmojis: boolean;
    emojiFrequency: string;
    useHashtags: boolean;
    hashtagStyle: string;
    preferredHashtags: string[];
    bannedHashtags: string[];
    ctaStyle: string;
    audiences: Array<{
      name: string;
      description: string | null;
      isPrimary: boolean;
      interests: string[];
      painPoints: string[];
      goals: string[];
    }>;
    pillars: Array<{
      name: string;
      description: string | null;
      topics: string[];
    }>;
    brandCompetitors: Array<{
      name: string;
      differentiators: string[];
    }>;
  }
): string {
  const sections: string[] = [];

  // Brand basics
  sections.push(`# Brand: ${brain.companyName || brand.name}`);
  if (brand.website) sections.push(`Website: ${brand.website}`);
  if (brain.industry || brand.industry) sections.push(`Industry: ${brain.industry || brand.industry}`);

  // Description & Mission
  if (brain.description) sections.push(`\n## About\n${brain.description}`);
  if (brain.mission) sections.push(`\n## Mission\n${brain.mission}`);

  // Values & USPs
  if (brain.values.length > 0) {
    sections.push(`\n## Core Values\n${brain.values.map(v => `- ${v}`).join('\n')}`);
  }
  if (brain.uniqueSellingPoints.length > 0) {
    sections.push(`\n## Unique Selling Points\n${brain.uniqueSellingPoints.map(u => `- ${u}`).join('\n')}`);
  }

  // Voice & Tone
  sections.push(`\n## Voice & Tone`);
  sections.push(`- Tone: ${brain.voiceTone}${brain.voiceToneCustom ? ` (${brain.voiceToneCustom})` : ''}`);
  sections.push(`- Formality Level: ${brain.formalityLevel}/5`);
  if (brain.writingStyle) sections.push(`- Writing Style: ${brain.writingStyle}`);
  sections.push(`- Use Emojis: ${brain.useEmojis ? `Yes (${brain.emojiFrequency})` : 'No'}`);
  sections.push(`- Use Hashtags: ${brain.useHashtags ? `Yes (${brain.hashtagStyle})` : 'No'}`);
  sections.push(`- CTA Style: ${brain.ctaStyle}`);

  // Must/Don't mention
  if (brain.mustMention.length > 0) {
    sections.push(`\n## Key Messages to Include\n${brain.mustMention.map(m => `- ${m}`).join('\n')}`);
  }
  if (brain.doNotMention.length > 0) {
    sections.push(`\n## Topics to Avoid\n${brain.doNotMention.map(d => `- ${d}`).join('\n')}`);
  }

  // Hashtags
  if (brain.preferredHashtags.length > 0) {
    sections.push(`\n## Preferred Hashtags\n${brain.preferredHashtags.map(h => `#${h}`).join(' ')}`);
  }
  if (brain.bannedHashtags.length > 0) {
    sections.push(`\n## Banned Hashtags\n${brain.bannedHashtags.map(h => `#${h}`).join(' ')}`);
  }

  // Target audiences
  if (brain.audiences.length > 0) {
    sections.push(`\n## Target Audiences`);
    brain.audiences.forEach(aud => {
      sections.push(`\n### ${aud.name}${aud.isPrimary ? ' (Primary)' : ''}`);
      if (aud.description) sections.push(aud.description);
      if (aud.interests.length > 0) sections.push(`Interests: ${aud.interests.join(', ')}`);
      if (aud.painPoints.length > 0) sections.push(`Pain Points: ${aud.painPoints.join(', ')}`);
      if (aud.goals.length > 0) sections.push(`Goals: ${aud.goals.join(', ')}`);
    });
  }

  // Content pillars
  if (brain.pillars.length > 0) {
    sections.push(`\n## Content Pillars`);
    brain.pillars.forEach(pillar => {
      sections.push(`\n### ${pillar.name}`);
      if (pillar.description) sections.push(pillar.description);
      if (pillar.topics.length > 0) sections.push(`Topics: ${pillar.topics.join(', ')}`);
    });
  }

  // Competitors
  if (brain.brandCompetitors.length > 0) {
    sections.push(`\n## Competitive Landscape`);
    brain.brandCompetitors.forEach(comp => {
      sections.push(`- ${comp.name}`);
      if (comp.differentiators.length > 0) {
        sections.push(`  How we differ: ${comp.differentiators.join('; ')}`);
      }
    });
  }

  return sections.join('\n');
}

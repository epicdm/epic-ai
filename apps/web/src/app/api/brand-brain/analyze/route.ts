/**
 * Brand Brain AI Analyze API
 * POST - Analyze connected social accounts and generate AI-powered brand setup
 *
 * This endpoint powers the "AI Auto-Setup" feature:
 * 1. Fetches recent posts from connected social accounts
 * 2. Uses AI to analyze voice patterns, content themes, and engagement
 * 3. Generates complete brand configuration recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthWithBypass } from '@/lib/auth';
import { prisma, VoiceTone, EmojiFrequency, HashtagStyle } from '@epic-ai/database';
import { BrandAnalyzer } from '@/lib/services/brand-brain/analyzer';
import { fetchPostsFromAccounts } from '@/lib/services/brand-brain/social-fetcher';
import type { AISetupResult } from '@/lib/services/brand-brain/types';

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

// Map AI tone suggestions to database enum
// Available tones: PROFESSIONAL, CASUAL, ENTHUSIASTIC, EDUCATIONAL, WITTY, INSPIRATIONAL, EMPATHETIC, BOLD
function mapVoiceTone(tone: string): VoiceTone {
  const toneMap: Record<string, VoiceTone> = {
    professional: VoiceTone.PROFESSIONAL,
    casual: VoiceTone.CASUAL,
    friendly: VoiceTone.EMPATHETIC, // Map friendly to empathetic
    authoritative: VoiceTone.BOLD, // Map authoritative to bold
    playful: VoiceTone.ENTHUSIASTIC, // Map playful to enthusiastic
    inspirational: VoiceTone.INSPIRATIONAL,
    educational: VoiceTone.EDUCATIONAL,
    witty: VoiceTone.WITTY,
    enthusiastic: VoiceTone.ENTHUSIASTIC,
    empathetic: VoiceTone.EMPATHETIC,
    bold: VoiceTone.BOLD,
  };
  return toneMap[tone.toLowerCase()] || VoiceTone.PROFESSIONAL;
}

// Map emoji usage to database enum
// Available frequencies: NONE, MINIMAL, MODERATE, FREQUENT
function mapEmojiFrequency(usage: string): EmojiFrequency {
  const emojiMap: Record<string, EmojiFrequency> = {
    none: EmojiFrequency.NONE,
    minimal: EmojiFrequency.MINIMAL,
    moderate: EmojiFrequency.MODERATE,
    heavy: EmojiFrequency.FREQUENT, // Map heavy to frequent
    frequent: EmojiFrequency.FREQUENT,
  };
  return emojiMap[usage.toLowerCase()] || EmojiFrequency.MODERATE;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const brandId = body.brandId as string;

    if (!brandId) {
      return NextResponse.json({ error: 'brandId is required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Step 1: Check for connected social accounts
    const connectedAccounts = await prisma.socialAccount.findMany({
      where: {
        brandId,
        status: 'CONNECTED',
      },
      select: {
        id: true,
        platform: true,
        displayName: true,
        username: true,
      },
    });

    if (connectedAccounts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No connected social accounts found',
        message: 'Please connect at least one social account to use AI Auto-Setup',
      }, { status: 400 });
    }

    // Step 2: Fetch posts from connected accounts
    console.log(`[AI Setup] Fetching posts for brand ${brandId}...`);
    const { posts, accountInfo, accountsAnalyzed } = await fetchPostsFromAccounts(brandId);

    if (posts.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No posts found to analyze',
        message: 'Your connected accounts don\'t have recent posts to analyze. Please add some content first.',
        accountsChecked: accountsAnalyzed,
      }, { status: 400 });
    }

    console.log(`[AI Setup] Found ${posts.length} posts from ${accountsAnalyzed.length} accounts`);

    // Step 3: Run AI analysis on posts
    const analyzer = new BrandAnalyzer();
    console.log(`[AI Setup] Running AI analysis...`);

    const analysis = await analyzer.analyzeSocialPosts(posts, {
      displayName: accountInfo.displayName,
      bio: accountInfo.bio,
      followerCount: accountInfo.followerCount,
      category: accountInfo.category,
    });

    // Step 4: Generate complete AI setup recommendations
    console.log(`[AI Setup] Generating setup recommendations...`);
    const aiSetup = await analyzer.generateAISetup(analysis, {
      displayName: accountInfo.displayName || brand.name,
      bio: accountInfo.bio,
      websiteUrl: accountInfo.websiteUrl || brand.website || undefined,
    });

    // Step 5: Return the results
    return NextResponse.json({
      success: true,
      analysis: aiSetup.analysis,
      suggestedProfile: aiSetup.suggestedProfile,
      suggestedSettings: aiSetup.suggestedSettings,
      confidence: aiSetup.confidence,
      dataSourcesSummary: aiSetup.dataSourcesSummary,
      accountsAnalyzed,
      postsAnalyzed: posts.length,
    });
  } catch (error) {
    console.error('Failed to run AI analysis:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze social accounts',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, { status: 500 });
  }
}

/**
 * Apply AI-generated setup to brand brain
 * PUT - Save the AI recommendations to the database
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const brandId = body.brandId as string;
    const aiSetup = body.aiSetup as AISetupResult;

    if (!brandId || !aiSetup) {
      return NextResponse.json({ error: 'brandId and aiSetup are required' }, { status: 400 });
    }

    const brand = await verifyBrandAccess(brandId, userId);
    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const { suggestedProfile, suggestedSettings } = aiSetup;

    // Update brand brain with AI recommendations
    const brain = await prisma.brandBrain.upsert({
      where: { brandId },
      create: {
        brandId,
        companyName: suggestedSettings.brandName,
        description: suggestedProfile.description,
        mission: suggestedProfile.mission,
        values: suggestedProfile.values,
        uniqueSellingPoints: suggestedProfile.uniqueSellingPoints,
        industry: suggestedSettings.industry,
        voiceTone: mapVoiceTone(suggestedSettings.voiceTone),
        formalityLevel: suggestedSettings.formalityLevel,
        writingStyle: suggestedProfile.writingStyle,
        useEmojis: suggestedSettings.emojiPreference !== 'none',
        emojiFrequency: mapEmojiFrequency(suggestedSettings.emojiPreference),
        useHashtags: suggestedSettings.hashtagPreference !== 'none',
        hashtagStyle: HashtagStyle.MIXED,
        preferredHashtags: suggestedProfile.preferredHashtags,
        doNotMention: suggestedProfile.doNotMention,
        mustMention: suggestedProfile.mustMention,
        ctaStyle: suggestedProfile.ctaStyle,
        setupComplete: true,
        setupStep: 99, // Mark as AI-completed
      },
      update: {
        companyName: suggestedSettings.brandName,
        description: suggestedProfile.description,
        mission: suggestedProfile.mission,
        values: suggestedProfile.values,
        uniqueSellingPoints: suggestedProfile.uniqueSellingPoints,
        industry: suggestedSettings.industry,
        voiceTone: mapVoiceTone(suggestedSettings.voiceTone),
        formalityLevel: suggestedSettings.formalityLevel,
        writingStyle: suggestedProfile.writingStyle,
        useEmojis: suggestedSettings.emojiPreference !== 'none',
        emojiFrequency: mapEmojiFrequency(suggestedSettings.emojiPreference),
        useHashtags: suggestedSettings.hashtagPreference !== 'none',
        preferredHashtags: suggestedProfile.preferredHashtags,
        doNotMention: suggestedProfile.doNotMention,
        mustMention: suggestedProfile.mustMention,
        ctaStyle: suggestedProfile.ctaStyle,
        setupComplete: true,
        setupStep: 99,
      },
    });

    // Create content pillars
    if (suggestedSettings.contentPillars.length > 0) {
      // Delete existing pillars
      await prisma.contentPillar.deleteMany({ where: { brainId: brain.id } });

      // Create new pillars
      await prisma.contentPillar.createMany({
        data: suggestedSettings.contentPillars.map((pillar, index) => ({
          brainId: brain.id,
          name: pillar,
          description: `AI-generated content pillar: ${pillar}`,
          priority: index + 1,
          isActive: true,
        })),
      });
    }

    // Create target audiences
    if (suggestedSettings.targetAudiences.length > 0) {
      // Delete existing audiences
      await prisma.brandAudience.deleteMany({ where: { brainId: brain.id } });

      // Create new audiences
      await prisma.brandAudience.createMany({
        data: suggestedSettings.targetAudiences.map((audience, index) => ({
          brainId: brain.id,
          name: audience.name,
          demographics: audience.demographics,
          interests: audience.interests,
          painPoints: audience.painPoints,
          isPrimary: index === 0,
        })),
      });
    }

    // Create a brand learning to record this AI setup
    await prisma.brandLearning.create({
      data: {
        brainId: brain.id,
        type: 'TONE_ADJUSTMENT',
        insight: `AI Auto-Setup completed with ${Math.round(aiSetup.confidence * 100)}% confidence. Brand profile generated from ${aiSetup.dataSourcesSummary}`,
        confidence: aiSetup.confidence,
        isActive: true,
        sourceData: {
          setupType: 'AI_AUTO_SETUP',
          dataSourcesSummary: aiSetup.dataSourcesSummary,
        },
      },
    });

    // Fetch the updated brain with all relations
    const updatedBrain = await prisma.brandBrain.findUnique({
      where: { id: brain.id },
      include: {
        audiences: true,
        pillars: true,
        brandCompetitors: true,
        brandLearnings: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    return NextResponse.json({
      success: true,
      brain: updatedBrain,
      message: 'AI setup applied successfully',
    });
  } catch (error) {
    console.error('Failed to apply AI setup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to apply AI setup',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    }, { status: 500 });
  }
}

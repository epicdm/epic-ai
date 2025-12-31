import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, VoiceTone, EmojiFrequency } from "@epic-ai/database";
import { createBrand } from "@/lib/services/organization";
import { brandSchema } from "@/lib/validations/onboarding";

// Map template voice tones to VoiceTone enum
function mapVoiceTone(tone: string): VoiceTone {
  const mapping: Record<string, VoiceTone> = {
    professional: VoiceTone.PROFESSIONAL,
    friendly: VoiceTone.CASUAL,
    innovative: VoiceTone.BOLD,
    caring: VoiceTone.EMPATHETIC,
    trustworthy: VoiceTone.PROFESSIONAL,
    warm: VoiceTone.CASUAL,
    creative: VoiceTone.WITTY,
    energetic: VoiceTone.ENTHUSIASTIC,
    encouraging: VoiceTone.INSPIRATIONAL,
  };
  return mapping[tone.toLowerCase()] || VoiceTone.PROFESSIONAL;
}

// Map template emoji style to EmojiFrequency enum
function mapEmojiFrequency(style: string): EmojiFrequency {
  const mapping: Record<string, EmojiFrequency> = {
    none: EmojiFrequency.NONE,
    minimal: EmojiFrequency.MINIMAL,
    moderate: EmojiFrequency.MODERATE,
    heavy: EmojiFrequency.FREQUENT,
  };
  return mapping[style.toLowerCase()] || EmojiFrequency.MODERATE;
}

// Generate color for content pillars
const pillarColors = ["#7C3AED", "#2563EB", "#059669", "#DC2626", "#D97706", "#EC4899"];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { organizationId, templateId, templateData, logo, ...brandData } = body;

    // Verify user has access to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You don't have access to this organization" },
        { status: 403 }
      );
    }

    // Validate input
    const validationResult = brandSchema.safeParse(brandData);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, website, industry } = validationResult.data;

    // Create brand
    const brand = await createBrand({
      organizationId,
      name,
      website: website || undefined,
      logo: logo || undefined,
    });

    // Create BrandBrain with template data if provided
    if (templateData && templateId !== "custom") {
      const brandBrain = await prisma.brandBrain.create({
        data: {
          brandId: brand.id,
          companyName: name,
          industry: industry || templateData.name || undefined,
          voiceTone: mapVoiceTone(templateData.voiceTone || "professional"),
          writingStyle: templateData.writingStyle || undefined,
          emojiFrequency: mapEmojiFrequency(templateData.emojiStyle || "moderate"),
          useEmojis: templateData.emojiStyle !== "none",
          values: templateData.sampleValues || [],
          setupComplete: false,
          setupStep: 1, // They've completed step 1 (template selection)
        },
      });

      // Create content pillars from template
      if (templateData.contentPillars && templateData.contentPillars.length > 0) {
        await prisma.contentPillar.createMany({
          data: templateData.contentPillars.map((pillarName: string, index: number) => ({
            brainId: brandBrain.id,
            name: pillarName,
            color: pillarColors[index % pillarColors.length],
            hashtags: templateData.suggestedHashtags?.slice(0, 2) || [],
          })),
        });
      }

      // Create audience profile from template
      if (templateData.targetAudience) {
        await prisma.brandAudience.create({
          data: {
            brainId: brandBrain.id,
            name: "Primary Audience",
            isPrimary: true,
            description: templateData.targetAudience.demographics?.join(", ") || null,
            interests: templateData.targetAudience.interests || [],
            painPoints: templateData.targetAudience.painPoints || [],
          },
        });
      }
    } else {
      // Create empty BrandBrain for custom template
      await prisma.brandBrain.create({
        data: {
          brandId: brand.id,
          companyName: name,
          industry: industry || undefined,
          setupComplete: false,
          setupStep: 0,
        },
      });
    }

    return NextResponse.json(brand);
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}

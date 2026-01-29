import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, VoiceTone, EmojiFrequency } from "@epic-ai/database";

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

const pillarColors = ["#7C3AED", "#2563EB", "#059669", "#DC2626", "#D97706", "#EC4899"];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, templateId, templateData, replaceExisting = false } = body;

    if (!brandId || !templateData) {
      return NextResponse.json(
        { error: "Brand ID and template data are required" },
        { status: 400 }
      );
    }

    // Get brand and verify ownership
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        organization: {
          include: { memberships: true },
        },
        brandBrain: true,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const isMember = brand.organization.memberships.some((m) => m.userId === userId);
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Apply template to BrandBrain
    if (brand.brandBrain) {
      // Update existing BrandBrain
      await prisma.brandBrain.update({
        where: { id: brand.brandBrain.id },
        data: {
          voiceTone: mapVoiceTone(templateData.voiceTone || "professional"),
          writingStyle: templateData.writingStyle || undefined,
          emojiFrequency: mapEmojiFrequency(templateData.emojiStyle || "moderate"),
          useEmojis: templateData.emojiStyle !== "none",
          values: replaceExisting ? (templateData.sampleValues || []) : [
            ...brand.brandBrain.values,
            ...(templateData.sampleValues || []).filter(
              (v: string) => !brand.brandBrain!.values.includes(v)
            ),
          ],
        },
      });

      // Handle content pillars
      if (templateData.contentPillars && templateData.contentPillars.length > 0) {
        if (replaceExisting) {
          // Delete existing pillars and create new ones
          await prisma.contentPillar.deleteMany({
            where: { brainId: brand.brandBrain.id },
          });
        }

        // Get existing pillar names to avoid duplicates
        const existingPillars = await prisma.contentPillar.findMany({
          where: { brainId: brand.brandBrain.id },
          select: { name: true },
        });
        const existingNames = new Set(existingPillars.map((p) => p.name.toLowerCase()));

        const newPillars = templateData.contentPillars.filter(
          (name: string) => !existingNames.has(name.toLowerCase())
        );

        if (newPillars.length > 0) {
          await prisma.contentPillar.createMany({
            data: newPillars.map((pillarName: string, index: number) => ({
              brainId: brand.brandBrain!.id,
              name: pillarName,
              color: pillarColors[index % pillarColors.length],
              hashtags: templateData.suggestedHashtags?.slice(0, 2) || [],
            })),
          });
        }
      }

      // Handle audience
      if (templateData.targetAudience) {
        const existingAudience = await prisma.brandAudience.findFirst({
          where: { brainId: brand.brandBrain.id, isPrimary: true },
        });

        if (existingAudience && replaceExisting) {
          await prisma.brandAudience.update({
            where: { id: existingAudience.id },
            data: {
              description: templateData.targetAudience.demographics?.join(", ") || null,
              interests: templateData.targetAudience.interests || [],
              painPoints: templateData.targetAudience.painPoints || [],
            },
          });
        } else if (!existingAudience) {
          await prisma.brandAudience.create({
            data: {
              brainId: brand.brandBrain.id,
              name: "Primary Audience",
              isPrimary: true,
              description: templateData.targetAudience.demographics?.join(", ") || null,
              interests: templateData.targetAudience.interests || [],
              painPoints: templateData.targetAudience.painPoints || [],
            },
          });
        }
      }
    } else {
      // Create new BrandBrain with template
      const brandBrain = await prisma.brandBrain.create({
        data: {
          brandId: brand.id,
          companyName: brand.name,
          voiceTone: mapVoiceTone(templateData.voiceTone || "professional"),
          writingStyle: templateData.writingStyle || undefined,
          emojiFrequency: mapEmojiFrequency(templateData.emojiStyle || "moderate"),
          useEmojis: templateData.emojiStyle !== "none",
          values: templateData.sampleValues || [],
          setupComplete: false,
          setupStep: 1,
        },
      });

      // Create content pillars
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

      // Create audience
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
    }

    return NextResponse.json({ success: true, templateId });
  } catch (error) {
    console.error("Error applying template:", error);
    return NextResponse.json(
      { error: "Failed to apply template" },
      { status: 500 }
    );
  }
}

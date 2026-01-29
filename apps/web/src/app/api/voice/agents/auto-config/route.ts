/**
 * Voice Agent Auto-Config API
 *
 * Generates voice agent configuration from Brand Brain data.
 * This powers the "One Brain, Many Voices" feature - using Brand Brain
 * to automatically configure voice agents with consistent brand voice.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import {
  generateVoiceAgentConfig,
  BrandBrainData,
} from "@/lib/services/voice/brand-voice-generator";

// GET /api/voice/agents/auto-config?brandId=xxx
// Returns auto-generated voice agent config from Brand Brain
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    // Fetch brand with Brand Brain and all related data
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organizationId: org.id,
      },
      include: {
        brandBrain: {
          include: {
            audiences: {
              where: { isActive: true },
              orderBy: { isPrimary: "desc" },
            },
            pillars: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "Brand not found or unauthorized" },
        { status: 404 }
      );
    }

    if (!brand.brandBrain) {
      return NextResponse.json(
        {
          error: "Brand Brain not configured",
          message:
            "Please complete Brand Brain setup before using auto-config.",
        },
        { status: 400 }
      );
    }

    const brain = brand.brandBrain;

    // Map to BrandBrainData interface
    const brandData: BrandBrainData = {
      companyName: brand.name,
      description: brain.description,
      mission: brain.mission,
      values: brain.values || [],
      uniqueSellingPoints: brain.uniqueSellingPoints || [],
      industry: brain.industry,
      voiceTone: brain.voiceTone,
      voiceToneCustom: brain.voiceToneCustom,
      formalityLevel: brain.formalityLevel,
      writingStyle: brain.writingStyle,
      doNotMention: brain.doNotMention || [],
      mustMention: brain.mustMention || [],
      ctaStyle: brain.ctaStyle,
      audiences: brain.audiences.map((a) => ({
        name: a.name,
        description: a.description,
        demographics: a.demographics,
        painPoints: a.painPoints || [],
        goals: a.goals || [],
        interests: a.interests || [],
        isPrimary: a.isPrimary,
      })),
      pillars: brain.pillars.map((p) => ({
        name: p.name,
        description: p.description,
        topics: p.topics || [],
        isActive: p.isActive,
      })),
    };

    // Generate voice agent configuration
    const config = generateVoiceAgentConfig(brandData);

    return NextResponse.json({
      config,
      brandName: brand.name,
      brandId: brand.id,
      voiceTone: brain.voiceTone,
      formalityLevel: brain.formalityLevel,
    });
  } catch (error) {
    console.error("[API] Error generating auto-config:", error);
    return NextResponse.json(
      { error: "Failed to generate auto-config" },
      { status: 500 }
    );
  }
}

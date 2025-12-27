import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import {
  generateSocialContent,
  generateContentWithImage,
  generateContentVariations,
  type GenerateContentRequest,
} from "@/lib/services/ai-social";
import { prisma } from "@epic-ai/database";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get organization details for context
    const orgData = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { name: true },
    });

    const body = await request.json();
    const {
      type,
      tone,
      customPrompt,
      leadName,
      leadService,
      callHighlight,
      customerFeedback,
      contentTheme,
      targetAudience,
      platforms,
      maxLength,
      includeImage,
      variations,
    } = body;

    if (!type) {
      return NextResponse.json(
        { error: "Content type required" },
        { status: 400 }
      );
    }

    const contentRequest: GenerateContentRequest = {
      type,
      tone: tone || "professional",
      businessName: orgData?.name || "Our Business",
      businessDescription: undefined,
      customPrompt,
      leadName,
      leadService,
      callHighlight,
      customerFeedback,
      contentTheme,
      targetAudience,
      platforms,
      maxLength,
    };

    // Generate variations if requested
    if (variations && variations > 1) {
      const results = await generateContentVariations(
        contentRequest,
        Math.min(variations, 5)
      );
      return NextResponse.json({ variations: results });
    }

    // Generate with image if requested
    if (includeImage) {
      const result = await generateContentWithImage(contentRequest);
      return NextResponse.json(result);
    }

    // Standard generation
    const result = await generateSocialContent(contentRequest);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating content:", error);
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }
}

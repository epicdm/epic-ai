/**
 * Social Connect API
 * Returns OAuth connect URLs for social platforms
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const PLATFORM_ROUTES = {
  twitter: "/api/social/connect/twitter",
  linkedin: "/api/social/connect/linkedin",
  facebook: "/api/social/connect/meta",
  instagram: "/api/social/connect/meta",
  meta: "/api/social/connect/meta",
} as const;

/**
 * GET - Get the OAuth connect URL for a platform
 */
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
    const platform = searchParams.get("platform")?.toLowerCase();

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    // Get or create brand for this org
    let brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      // Generate a slug from org name or use a default
      const baseName = org.name || "My Brand";
      const slug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "my-brand";

      brand = await prisma.brand.create({
        data: {
          organizationId: org.id,
          name: baseName,
          slug,
        },
      });
    }

    // Get the connect route for the platform
    const route = PLATFORM_ROUTES[platform as keyof typeof PLATFORM_ROUTES];

    if (!route) {
      return NextResponse.json(
        { error: `Unsupported platform: ${platform}` },
        { status: 400 }
      );
    }

    // Build the OAuth URL with brand ID
    const params = new URLSearchParams({
      brandId: brand.id,
    });

    // For Instagram, add platform param
    if (platform === "instagram") {
      params.set("platform", "instagram");
    }

    const connectUrl = `${BASE_URL}${route}?${params.toString()}`;

    return NextResponse.json({
      url: connectUrl,
      platform,
      brandId: brand.id,
    });
  } catch (error) {
    console.error("Error generating connect URL:", error);
    return NextResponse.json(
      { error: "Failed to generate connect URL" },
      { status: 500 }
    );
  }
}

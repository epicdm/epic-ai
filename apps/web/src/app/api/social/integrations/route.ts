/**
 * Social Integrations API
 * Lists connected social accounts using native OAuth
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

const PLATFORMS = {
  TWITTER: { name: "Twitter/X", icon: "twitter", color: "bg-sky-500" },
  LINKEDIN: { name: "LinkedIn", icon: "linkedin", color: "bg-blue-700" },
  FACEBOOK: { name: "Facebook", icon: "facebook", color: "bg-blue-600" },
  INSTAGRAM: { name: "Instagram", icon: "instagram", color: "bg-gradient-to-r from-purple-500 to-pink-500" },
  TIKTOK: { name: "TikTok", icon: "tiktok", color: "bg-black" },
  YOUTUBE: { name: "YouTube", icon: "youtube", color: "bg-red-600" },
} as const;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get brand for this org
    const brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      return NextResponse.json({
        connected: false,
        integrations: [],
      });
    }

    // Get connected social accounts
    const accounts = await prisma.socialAccount.findMany({
      where: { brandId: brand.id },
      orderBy: { connectedAt: "desc" },
    });

    // Enrich with display info
    const enriched = accounts.map((account) => {
      const platformInfo = PLATFORMS[account.platform as keyof typeof PLATFORMS] || {
        name: account.platform,
        icon: "share",
        color: "bg-gray-500",
      };

      const isActive = account.status === "CONNECTED";
      return {
        id: account.id,
        name: account.displayName || account.username || "Unknown",
        platform: account.platform,
        platformDisplay: platformInfo.name,
        platformColor: platformInfo.color,
        picture: account.avatar,
        username: account.username,
        profileUrl: account.profileUrl,
        isActive,
        disabled: !isActive,
        connectedAt: account.connectedAt,
        expiresAt: account.tokenExpires,
      };
    });

    return NextResponse.json({
      connected: accounts.length > 0,
      integrations: enriched,
    });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 });
  }
}

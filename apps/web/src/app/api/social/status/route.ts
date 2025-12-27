/**
 * Social Status API
 * Returns the status of native social integrations
 */

import { NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();

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
        configured: false,
        status: "no_brand",
        connectedAccounts: 0,
        platforms: [],
        message: "No brand configured. Create a brand first.",
      });
    }

    // Count connected accounts by platform
    const accounts = await prisma.socialAccount.findMany({
      where: { brandId: brand.id },
      select: {
        platform: true,
        status: true,
        tokenExpires: true,
      },
    });

    const platformCounts: Record<string, { total: number; active: number; expiring: number }> = {};
    const now = new Date();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;

    for (const account of accounts) {
      if (!platformCounts[account.platform]) {
        platformCounts[account.platform] = { total: 0, active: 0, expiring: 0 };
      }
      platformCounts[account.platform].total++;
      if (account.status === "CONNECTED") {
        platformCounts[account.platform].active++;
      }
      if (account.tokenExpires && account.tokenExpires.getTime() - now.getTime() < sevenDays) {
        platformCounts[account.platform].expiring++;
      }
    }

    const connectedPlatforms = Object.keys(platformCounts);
    const hasExpiring = Object.values(platformCounts).some((p) => p.expiring > 0);

    return NextResponse.json({
      configured: true,
      status: accounts.length > 0 ? "connected" : "no_accounts",
      connectedAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === "CONNECTED").length,
      platforms: connectedPlatforms,
      platformDetails: platformCounts,
      hasExpiringTokens: hasExpiring,
      message: accounts.length > 0
        ? `Connected to ${connectedPlatforms.length} platform(s)`
        : "No social accounts connected. Connect a platform to start publishing.",
    });
  } catch (error) {
    console.error("Error checking social status:", error);
    return NextResponse.json(
      { error: "Failed to check social status" },
      { status: 500 }
    );
  }
}

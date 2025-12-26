/**
 * Social Setup API
 * GET - Check social connection status
 * POST - No longer needed (native OAuth handles connections)
 * DELETE - Disconnect a social account
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * GET - Check/provision social setup
 */
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
        hasBrand: false,
        accounts: [],
        message: "No brand configured. Create a brand first.",
      });
    }

    // Get connected accounts
    const accounts = await prisma.socialAccount.findMany({
      where: { brandId: brand.id },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        tokenExpires: true,
      },
    });

    const platforms = [...new Set(accounts.map((a) => a.platform))];

    return NextResponse.json({
      connected: accounts.length > 0,
      hasBrand: true,
      brandId: brand.id,
      accounts,
      platforms,
      message: accounts.length > 0
        ? `${accounts.length} account(s) connected`
        : "No accounts connected. Use the connect buttons to link your social accounts.",
    });
  } catch (error) {
    console.error("Error in social setup:", error);
    return NextResponse.json({ error: "Setup check failed" }, { status: 500 });
  }
}

/**
 * POST - Create brand if needed (for new users)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const { brandName } = body;

    // Check if brand exists
    let brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      // Generate a slug from brand/org name
      const baseName = brandName || org.name || "My Brand";
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

    return NextResponse.json({
      success: true,
      brandId: brand.id,
      brandName: brand.name,
    });
  } catch (error) {
    console.error("Error in setup POST:", error);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

/**
 * DELETE - Disconnect a social account
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json({ error: "Account ID required" }, { status: 400 });
    }

    // Get brand for this org
    const brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      return NextResponse.json({ error: "No brand found" }, { status: 404 });
    }

    // Verify account belongs to this brand
    const account = await prisma.socialAccount.findFirst({
      where: { id: accountId, brandId: brand.id },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete the account
    await prisma.socialAccount.delete({
      where: { id: accountId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting:", error);
    return NextResponse.json({ error: "Disconnect failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - List ad accounts
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

    const accounts = await prisma.adAccount.findMany({
      where: { orgId: org.id },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error getting ad accounts:", error);
    return NextResponse.json({ error: "Failed to get accounts" }, { status: 500 });
  }
}

/**
 * POST - Create ad account (manual tracking)
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
    const { platform, accountName, accountId } = body;

    if (!platform || !accountName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const account = await prisma.adAccount.create({
      data: {
        orgId: org.id,
        platform,
        accountName,
        accountId: accountId || null,
        status: "MANUAL",
      },
    });

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error creating ad account:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}

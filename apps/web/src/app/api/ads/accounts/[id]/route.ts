import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get single ad account
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    const account = await prisma.adAccount.findFirst({
      where: {
        id,
        orgId: org.id,
      },
      include: {
        campaigns: {
          include: {
            metrics: true,
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error("Error getting ad account:", error);
    return NextResponse.json({ error: "Failed to get account" }, { status: 500 });
  }
}

/**
 * PUT - Update ad account
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    await prisma.adAccount.updateMany({
      where: {
        id,
        orgId: org.id,
      },
      data: {
        accountName: body.accountName,
        accountId: body.accountId,
        status: body.status,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating ad account:", error);
    return NextResponse.json({ error: "Failed to update account" }, { status: 500 });
  }
}

/**
 * DELETE - Remove ad account
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    await prisma.adAccount.deleteMany({
      where: {
        id,
        orgId: org.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ad account:", error);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}

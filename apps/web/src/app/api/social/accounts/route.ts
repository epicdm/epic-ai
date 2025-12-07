import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * Get social accounts for the current organization.
 *
 * Note: In the future, this will sync with Postiz API.
 * For now, we track which accounts users have connected.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: { organization: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Get social accounts for all brands in this org
    const accounts = await prisma.socialAccount.findMany({
      where: {
        brand: {
          organizationId: membership.organizationId,
        },
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        connectedAt: "desc",
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Error fetching social accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch social accounts" },
      { status: 500 }
    );
  }
}

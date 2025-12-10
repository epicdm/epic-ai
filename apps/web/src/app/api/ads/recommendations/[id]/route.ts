import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT - Apply or dismiss recommendation
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
    const { action } = body; // "apply" or "dismiss"

    const recommendation = await prisma.adRecommendation.findFirst({
      where: {
        id,
        orgId: org.id,
      },
    });

    if (!recommendation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (action === "apply") {
      await prisma.adRecommendation.update({
        where: { id },
        data: {
          status: "APPLIED",
          appliedAt: new Date(),
        },
      });
    } else if (action === "dismiss") {
      await prisma.adRecommendation.update({
        where: { id },
        data: {
          status: "DISMISSED",
          dismissedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}

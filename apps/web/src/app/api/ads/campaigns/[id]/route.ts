import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get single campaign
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

    const campaign = await prisma.adCampaign.findFirst({
      where: {
        id,
        orgId: org.id,
      },
      include: {
        adAccount: true,
        adCreatives: true,
        metrics: true,
        dailyMetrics: {
          orderBy: { date: "desc" },
          take: 30,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error getting campaign:", error);
    return NextResponse.json({ error: "Failed to get campaign" }, { status: 500 });
  }
}

/**
 * PUT - Update campaign
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

    await prisma.adCampaign.updateMany({
      where: {
        id,
        orgId: org.id,
      },
      data: {
        name: body.name,
        status: body.status,
        dailyBudget: body.dailyBudget ? parseFloat(body.dailyBudget) : undefined,
        totalBudget: body.totalBudget ? parseFloat(body.totalBudget) : undefined,
        targeting: body.targeting,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

/**
 * DELETE - Delete campaign
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

    await prisma.adCampaign.deleteMany({
      where: {
        id,
        orgId: org.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}

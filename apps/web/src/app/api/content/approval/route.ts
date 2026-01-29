import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organization = await getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 }
      );
    }

    // Fetch brand
    const brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
    });

    if (!brand) {
      return NextResponse.json(
        { error: "No brand found" },
        { status: 404 }
      );
    }

    // Fetch pending content items
    const pendingItems = await prisma.contentItem.findMany({
      where: {
        brandId: brand.id,
        OR: [
          { status: "PENDING" },
          { approvalStatus: "PENDING" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        contentType: true,
        category: true,
        status: true,
        approvalStatus: true,
        createdAt: true,
        scheduledFor: true,
      },
    });

    // Count approved/rejected today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const approvedToday = await prisma.contentItem.count({
      where: {
        brandId: brand.id,
        approvalStatus: "APPROVED",
        updatedAt: { gte: today },
      },
    });

    const rejectedToday = await prisma.contentItem.count({
      where: {
        brandId: brand.id,
        approvalStatus: "REJECTED",
        updatedAt: { gte: today },
      },
    });

    return NextResponse.json({
      pendingItems,
      approvedToday,
      rejectedToday,
    });
  } catch (error) {
    console.error("Error fetching approval queue:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval queue" },
      { status: 500 }
    );
  }
}

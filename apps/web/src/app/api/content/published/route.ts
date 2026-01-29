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

    // Fetch published content items
    const items = await prisma.contentItem.findMany({
      where: {
        brandId: brand.id,
        status: "PUBLISHED",
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        id: true,
        content: true,
        contentType: true,
        category: true,
        status: true,
        publishedAt: true,
        targetPlatforms: true,
      },
    });

    // Map items with analytics placeholder
    const publishedItems = items.map(item => ({
      ...item,
      analytics: null, // Would fetch from PostAnalytics in production
    }));

    // Calculate stats
    const totalPublished = items.length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const thisWeek = items.filter(item => {
      if (!item.publishedAt) return false;
      return new Date(item.publishedAt) >= weekAgo;
    }).length;

    // TODO: Calculate real totals from PostAnalytics
    const totalImpressions = 0;
    const avgEngagement = 0;

    return NextResponse.json({
      publishedItems,
      totalPublished,
      thisWeek,
      totalImpressions,
      avgEngagement,
    });
  } catch (error) {
    console.error("Error fetching published content:", error);
    return NextResponse.json(
      { error: "Failed to fetch published content" },
      { status: 500 }
    );
  }
}

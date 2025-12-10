import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { Prisma } from "@prisma/client";

/**
 * GET - List campaigns
 */
export async function GET(request: NextRequest) {
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
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");

    const where: Prisma.AdCampaignWhereInput = { orgId: org.id };
    if (status) where.status = status as Prisma.EnumCampaignStatusFilter;
    if (platform) where.platform = platform as Prisma.EnumAdPlatformFilter;

    const campaigns = await prisma.adCampaign.findMany({
      where,
      include: {
        adAccount: {
          select: { accountName: true },
        },
        metrics: true,
        adCreatives: {
          take: 1,
          select: { imageUrl: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate totals
    const totals = await prisma.adCampaignMetrics.aggregate({
      where: {
        campaign: { orgId: org.id },
      },
      _sum: {
        impressions: true,
        clicks: true,
        leads: true,
        spend: true,
      },
    });

    return NextResponse.json({
      campaigns,
      totals: {
        impressions: totals._sum.impressions || 0,
        clicks: totals._sum.clicks || 0,
        leads: totals._sum.leads || 0,
        spend: Number(totals._sum.spend || 0),
      },
    });
  } catch (error) {
    console.error("Error getting campaigns:", error);
    return NextResponse.json({ error: "Failed to get campaigns" }, { status: 500 });
  }
}

/**
 * POST - Create campaign
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
    const {
      name,
      platform,
      objective,
      dailyBudget,
      totalBudget,
      targeting,
      startDate,
      endDate,
      adAccountId,
      creatives,
    } = body;

    if (!name || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create campaign with creatives
    const campaign = await prisma.adCampaign.create({
      data: {
        orgId: org.id,
        adAccountId: adAccountId || null,
        name,
        platform,
        objective: objective || "LEAD_GENERATION",
        status: "DRAFT",
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
        totalBudget: totalBudget ? parseFloat(totalBudget) : null,
        targeting: targeting || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        adCreatives: creatives?.length > 0
          ? {
              create: creatives.map((c: {
                type?: string;
                headline: string;
                primaryText: string;
                description?: string;
                callToAction?: string;
                imageUrl?: string;
                destinationUrl?: string;
              }) => ({
                type: c.type || "IMAGE",
                headline: c.headline,
                primaryText: c.primaryText,
                description: c.description || null,
                callToAction: c.callToAction || "Learn More",
                imageUrl: c.imageUrl || null,
                destinationUrl: c.destinationUrl || null,
                status: "DRAFT",
              })),
            }
          : undefined,
        metrics: {
          create: {},
        },
      },
      include: {
        adCreatives: true,
        metrics: true,
      },
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}

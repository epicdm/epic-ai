import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT - Update campaign metrics (manual entry)
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

    // Verify campaign ownership
    const campaign = await prisma.adCampaign.findFirst({
      where: { id, orgId: org.id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { impressions, clicks, leads, conversions, spend } = body;

    // Calculate derived metrics
    const ctr = impressions > 0 ? clicks / impressions : null;
    const cpc = clicks > 0 ? spend / clicks : null;
    const cpl = leads > 0 ? spend / leads : null;
    const cpa = conversions > 0 ? spend / conversions : null;

    // Update or create metrics
    const metrics = await prisma.adCampaignMetrics.upsert({
      where: { campaignId: id },
      create: {
        campaignId: id,
        impressions: impressions || 0,
        clicks: clicks || 0,
        leads: leads || 0,
        conversions: conversions || 0,
        spend: spend || 0,
        ctr,
        cpc,
        cpl,
        cpa,
        lastUpdated: new Date(),
      },
      update: {
        impressions: impressions || 0,
        clicks: clicks || 0,
        leads: leads || 0,
        conversions: conversions || 0,
        spend: spend || 0,
        ctr,
        cpc,
        cpl,
        cpa,
        lastUpdated: new Date(),
      },
    });

    // Also add daily snapshot
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.adDailyMetrics.upsert({
      where: {
        campaignId_date: {
          campaignId: id,
          date: today,
        },
      },
      create: {
        campaignId: id,
        date: today,
        impressions: impressions || 0,
        clicks: clicks || 0,
        leads: leads || 0,
        conversions: conversions || 0,
        spend: spend || 0,
      },
      update: {
        impressions: impressions || 0,
        clicks: clicks || 0,
        leads: leads || 0,
        conversions: conversions || 0,
        spend: spend || 0,
      },
    });

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Error updating metrics:", error);
    return NextResponse.json({ error: "Failed to update metrics" }, { status: 500 });
  }
}

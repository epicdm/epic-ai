import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - Get recommendations
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

    // Get pending recommendations
    const recommendations = await prisma.adRecommendation.findMany({
      where: {
        orgId: org.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    return NextResponse.json({ error: "Failed to get recommendations" }, { status: 500 });
  }
}

/**
 * POST - Generate recommendations based on campaign performance
 */
export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get active campaigns with metrics
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        orgId: org.id,
        status: "ACTIVE",
      },
      include: {
        metrics: true,
      },
    });

    const recommendations: {
      orgId: string;
      campaignId: string;
      type: "SCALE_WINNER" | "PAUSE_UNDERPERFORMING" | "NEW_CREATIVE";
      title: string;
      description: string;
      impact: "HIGH" | "MEDIUM" | "LOW";
      actionType: string;
      actionData?: { suggestedIncrease: number };
    }[] = [];

    for (const campaign of campaigns) {
      const metrics = campaign.metrics;
      if (!metrics) continue;

      // High CTR, low spend → Scale winner
      if (Number(metrics.ctr) > 0.02 && Number(metrics.spend) < 500) {
        recommendations.push({
          orgId: org.id,
          campaignId: campaign.id,
          type: "SCALE_WINNER",
          title: `Scale "${campaign.name}"`,
          description: `This campaign has a ${(Number(metrics.ctr) * 100).toFixed(2)}% CTR, above average. Consider increasing budget.`,
          impact: "HIGH",
          actionType: "INCREASE_BUDGET",
          actionData: { suggestedIncrease: 50 },
        });
      }

      // High CPL → Pause or optimize
      if (Number(metrics.cpl) > 50 && metrics.leads > 5) {
        recommendations.push({
          orgId: org.id,
          campaignId: campaign.id,
          type: "PAUSE_UNDERPERFORMING",
          title: `Review "${campaign.name}"`,
          description: `Cost per lead is $${Number(metrics.cpl).toFixed(2)}, which may be too high. Consider pausing or optimizing.`,
          impact: "MEDIUM",
          actionType: "REVIEW_CAMPAIGN",
        });
      }

      // Low CTR → New creative
      if (Number(metrics.ctr) < 0.005 && metrics.impressions > 1000) {
        recommendations.push({
          orgId: org.id,
          campaignId: campaign.id,
          type: "NEW_CREATIVE",
          title: `New creative for "${campaign.name}"`,
          description: `CTR is below 0.5%. Fresh creative could improve performance.`,
          impact: "MEDIUM",
          actionType: "CREATE_CREATIVE",
        });
      }
    }

    // Create recommendations
    if (recommendations.length > 0) {
      await prisma.adRecommendation.createMany({
        data: recommendations,
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      generated: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}

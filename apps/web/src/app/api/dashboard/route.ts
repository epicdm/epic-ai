/**
 * Unified Dashboard API - PKG-026
 * Aggregates all data for the main dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - Get unified dashboard data
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get("period") || "30");

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);
    startDate.setHours(0, 0, 0, 0);

    // If no organization, return empty dashboard data for setup state
    if (!org) {
      return NextResponse.json(getEmptyDashboardData(period, startDate));
    }

    // Get brand for this org
    const brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    // Parallel fetch all dashboard data with error handling for each query
    const [
      brandBrain,
      socialAccounts,
      contentStats,
      socialMetrics,
      leadStats,
      adStats,
      learnings,
      recentActivity,
      failedJobsCount,
    ] = await Promise.all([
      // Brand Brain status
      brand
        ? prisma.brandBrain.findUnique({
            where: { brandId: brand.id },
            include: {
              _count: {
                select: {
                  audiences: true,
                  pillars: true,
                  brandCompetitors: true,
                  brandLearnings: true,
                },
              },
            },
          }).catch((e) => { console.error("Error fetching brandBrain:", e); return null; })
        : null,

      // Social accounts
      brand
        ? prisma.socialAccount.findMany({
            where: { brandId: brand.id, status: "CONNECTED" },
            select: {
              id: true,
              platform: true,
              username: true,
              displayName: true,
              avatar: true,
              followerCount: true,
            },
          }).catch((e) => { console.error("Error fetching socialAccounts:", e); return []; })
        : [],

      // Content queue stats
      brand
        ? prisma.contentItem.groupBy({
            by: ["status"],
            where: { brandId: brand.id },
            _count: true,
          }).catch((e) => { console.error("Error fetching contentStats:", e); return []; })
        : [],

      // Social metrics (last N days)
      prisma.postAnalytics.aggregate({
        where: {
          orgId: org.id,
          publishedAt: { gte: startDate },
        },
        _sum: {
          impressions: true,
          engagements: true,
          likes: true,
          comments: true,
          shares: true,
        },
        _avg: {
          engagementRate: true,
        },
        _count: true,
      }).catch((e) => {
        console.error("Error fetching socialMetrics:", e);
        return {
          _sum: { impressions: null, engagements: null, likes: null, comments: null, shares: null },
          _avg: { engagementRate: null },
          _count: 0,
        };
      }),

      // Lead stats
      prisma.lead.groupBy({
        by: ["status"],
        where: {
          organizationId: org.id,
          createdAt: { gte: startDate },
        },
        _count: true,
      }).catch((e) => { console.error("Error fetching leadStats:", e); return []; }),

      // Ad campaign stats
      brand
        ? prisma.adCampaign
            .aggregate({
              where: {
                brandId: brand.id,
                createdAt: { gte: startDate },
              },
              _sum: {
                spend: true,
                impressions: true,
                clicks: true,
                leads: true,
              },
            })
            .catch(() => null)
        : null,

      // Top AI learnings
      brand
        ? prisma.brandLearning.findMany({
            where: {
              brain: { brandId: brand.id },
              isActive: true,
            },
            orderBy: { confidence: "desc" },
            take: 5,
          }).catch((e) => { console.error("Error fetching learnings:", e); return []; })
        : [],

      // Recent activity
      getRecentActivity(org.id, brand?.id || null, 10),

      // T048: Failed jobs count for notification badge
      brand
        ? prisma.job.count({
            where: {
              brandId: brand.id,
              status: 'FAILED',
            },
          }).catch((e) => { console.error("Error fetching failed jobs:", e); return 0; })
        : 0,
    ]);

    // Process content stats
    const contentCounts: Record<string, number> = {};
    (contentStats as { status: string; _count: number }[]).forEach((s) => {
      contentCounts[s.status] = s._count;
    });

    // Process lead stats
    const leadCounts: Record<string, number> = {};
    leadStats.forEach((s) => {
      leadCounts[s.status] = s._count;
    });
    const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);

    // Calculate flywheel health
    const flywheelHealth = calculateFlywheelHealth({
      hasBrandBrain: !!brandBrain?.companyName,
      hasAudience: (brandBrain?._count?.audiences || 0) > 0,
      hasPillars: (brandBrain?._count?.pillars || 0) > 0,
      hasAccounts: (socialAccounts as unknown[]).length > 0,
      hasContent: (contentCounts.PUBLISHED || 0) > 0,
      hasAnalytics: (socialMetrics._count || 0) > 0,
      hasLearnings: learnings.length > 0,
    });

    // Calculate ROI (simplified)
    const adSpend = Number(adStats?._sum?.spend || 0);
    const adLeads = adStats?._sum?.leads || 0;
    const organicLeads = totalLeads - adLeads;
    const costPerLead = adLeads > 0 ? adSpend / adLeads : 0;

    return NextResponse.json({
      // Brand info (for child components that need brandId)
      brand: {
        id: brand?.id || null,
      },

      // Brand Brain status
      brandBrain: {
        isSetup: !!brandBrain?.companyName,
        companyName: brandBrain?.companyName || null,
        audienceCount: brandBrain?._count?.audiences || 0,
        pillarCount: brandBrain?._count?.pillars || 0,
        learningCount: brandBrain?._count?.brandLearnings || 0,
      },

      // Social accounts
      accounts: {
        total: (socialAccounts as unknown[]).length,
        totalFollowers: (socialAccounts as { followerCount: number | null }[]).reduce(
          (sum, a) => sum + (a.followerCount || 0),
          0
        ),
        list: socialAccounts,
      },

      // Content stats
      content: {
        draft: contentCounts.DRAFT || 0,
        pending: contentCounts.PENDING || 0,
        approved: contentCounts.APPROVED || 0,
        scheduled: contentCounts.SCHEDULED || 0,
        published: contentCounts.PUBLISHED || 0,
        total: Object.values(contentCounts).reduce((a, b) => a + b, 0),
      },

      // Organic social metrics
      organic: {
        posts: socialMetrics._count || 0,
        impressions: socialMetrics._sum?.impressions || 0,
        engagements: socialMetrics._sum?.engagements || 0,
        likes: socialMetrics._sum?.likes || 0,
        comments: socialMetrics._sum?.comments || 0,
        shares: socialMetrics._sum?.shares || 0,
        avgEngagementRate: socialMetrics._avg?.engagementRate || 0,
      },

      // Paid ads metrics
      paid: {
        spend: adSpend,
        impressions: adStats?._sum?.impressions || 0,
        clicks: adStats?._sum?.clicks || 0,
        conversions: adStats?._sum?.leads || 0,
        ctr: adStats?._sum?.impressions
          ? ((adStats._sum.clicks || 0) / Number(adStats._sum.impressions)) * 100
          : 0,
        cpa: costPerLead,
      },

      // Lead stats
      leads: {
        total: totalLeads,
        new: leadCounts.NEW || 0,
        contacted: leadCounts.CONTACTED || 0,
        qualified: leadCounts.QUALIFIED || 0,
        converted: leadCounts.WON || 0,
        organic: organicLeads,
        paid: adLeads,
      },

      // ROI
      roi: {
        totalSpend: adSpend,
        totalLeads,
        costPerLead,
        organicLeads,
        paidLeads: adLeads,
        conversionRate:
          totalLeads > 0 ? ((leadCounts.WON || 0) / totalLeads) * 100 : 0,
      },

      // AI Insights
      insights: learnings.map((l) => ({
        id: l.id,
        type: l.type,
        insight: l.insight,
        confidence: Number(l.confidence),
      })),

      // Flywheel status
      flywheel: flywheelHealth,

      // Recent activity
      activity: recentActivity,

      // T048: Background jobs status for notification badge
      jobs: {
        failed: failedJobsCount,
      },

      // Period info
      period: {
        days: period,
        start: startDate.toISOString(),
        end: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error getting dashboard:", error);
    // Return detailed error in development/preview for debugging
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to get dashboard",
        message: errorMessage,
        stack: process.env.NODE_ENV !== 'production' ? errorStack : undefined,
        details: process.env.VERCEL ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Calculate flywheel health score
 */
function calculateFlywheelHealth(components: {
  hasBrandBrain: boolean;
  hasAudience: boolean;
  hasPillars: boolean;
  hasAccounts: boolean;
  hasContent: boolean;
  hasAnalytics: boolean;
  hasLearnings: boolean;
}): {
  score: number;
  status: "inactive" | "starting" | "spinning" | "accelerating" | "optimal";
  components: { name: string; active: boolean }[];
} {
  const items = [
    { name: "Brand Brain", active: components.hasBrandBrain },
    { name: "Target Audience", active: components.hasAudience },
    { name: "Content Pillars", active: components.hasPillars },
    { name: "Social Accounts", active: components.hasAccounts },
    { name: "Published Content", active: components.hasContent },
    { name: "Analytics Active", active: components.hasAnalytics },
    { name: "AI Learnings", active: components.hasLearnings },
  ];

  const activeCount = items.filter((i) => i.active).length;
  const score = Math.round((activeCount / items.length) * 100);

  let status: "inactive" | "starting" | "spinning" | "accelerating" | "optimal";
  if (score === 0) status = "inactive";
  else if (score < 30) status = "starting";
  else if (score < 60) status = "spinning";
  else if (score < 90) status = "accelerating";
  else status = "optimal";

  return { score, status, components: items };
}

interface ActivityItem {
  type: string;
  title: string;
  description: string;
  timestamp: Date;
  platform?: string;
  status?: string;
}

/**
 * Get recent activity across all modules
 */
async function getRecentActivity(
  orgId: string,
  brandId: string | null,
  limit: number
): Promise<ActivityItem[]> {
  const activities: ActivityItem[] = [];

  // Recent published content - wrap in try-catch for resilience
  if (brandId) {
    try {
      const recentContent = await prisma.contentVariation.findMany({
        where: {
          content: { brandId },
          status: "PUBLISHED",
        },
        orderBy: { publishedAt: "desc" },
        take: 5,
        include: {
          account: { select: { platform: true, username: true } },
        },
      });

      recentContent.forEach((variation) => {
        if (variation.publishedAt) {
          activities.push({
            type: "post_published",
            title: `Published to ${variation.platform}`,
            description: variation.text.substring(0, 60) + "...",
            timestamp: variation.publishedAt,
            platform: variation.platform,
          });
        }
      });
    } catch (e) {
      console.error("Error fetching content variations:", e);
    }
  }

  // Recent leads - wrap in try-catch for resilience
  try {
    const recentLeads = await prisma.lead.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    recentLeads.forEach((lead) => {
      activities.push({
        type: "lead_created",
        title: "New lead captured",
        description: `${lead.firstName} ${lead.lastName || ""} - ${lead.email || "No email"}`,
        timestamp: lead.createdAt,
      });
    });
  } catch (e) {
    console.error("Error fetching recent leads:", e);
  }

  // Recent content generated - wrap in try-catch for resilience
  if (brandId) {
    try {
      const recentItems = await prisma.contentItem.findMany({
        where: { brandId },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      recentItems.forEach((item) => {
        activities.push({
          type: "content_generated",
          title: "Content created",
          description: item.content.substring(0, 60) + "...",
          timestamp: item.createdAt,
          status: item.status,
        });
      });
    } catch (e) {
      console.error("Error fetching content items:", e);
    }
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get empty dashboard data for users without organization/brand
 */
function getEmptyDashboardData(period: number, startDate: Date) {
  return {
    brandBrain: {
      isSetup: false,
      companyName: null,
      audienceCount: 0,
      pillarCount: 0,
      learningCount: 0,
    },
    accounts: {
      total: 0,
      totalFollowers: 0,
      list: [],
    },
    content: {
      draft: 0,
      pending: 0,
      approved: 0,
      scheduled: 0,
      published: 0,
      total: 0,
    },
    organic: {
      posts: 0,
      impressions: 0,
      engagements: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      avgEngagementRate: 0,
    },
    paid: {
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      cpa: 0,
    },
    leads: {
      total: 0,
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      organic: 0,
      paid: 0,
    },
    roi: {
      totalSpend: 0,
      totalLeads: 0,
      costPerLead: 0,
      organicLeads: 0,
      paidLeads: 0,
      conversionRate: 0,
    },
    insights: [],
    flywheel: {
      score: 0,
      status: "inactive",
      components: [
        { name: "Brand Brain", active: false },
        { name: "Target Audience", active: false },
        { name: "Content Pillars", active: false },
        { name: "Social Accounts", active: false },
        { name: "Published Content", active: false },
        { name: "Analytics Active", active: false },
        { name: "AI Learnings", active: false },
      ],
    },
    activity: [],
    jobs: {
      failed: 0,
    },
    period: {
      days: period,
      start: startDate.toISOString(),
      end: new Date().toISOString(),
    },
  };
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * GET /api/voice/stats
 * Fetch voice usage statistics for the dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const organizationId = membership.organizationId;

    // Get time range from query params (default to last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate call statistics from CallLog
    const callStats = await prisma.callLog.aggregate({
      where: {
        organizationId,
        startedAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { duration: true },
    });

    // Count successful calls (COMPLETED outcome)
    const successfulCalls = await prisma.callLog.count({
      where: {
        organizationId,
        startedAt: { gte: startDate },
        outcome: "COMPLETED",
      },
    });

    // Count active agents
    const activeAgents = await prisma.voiceAgent.count({
      where: {
        organizationId,
        isActive: true,
      },
    });

    // Count phone numbers
    const phoneNumbers = await prisma.phoneMapping.count({
      where: { organizationId },
    });

    // Calculate metrics
    const totalCalls = callStats._count.id || 0;
    const totalSeconds = callStats._sum.duration || 0;
    const totalMinutes = Math.round(totalSeconds / 60);
    const successRate = totalCalls > 0
      ? Math.round((successfulCalls / totalCalls) * 100)
      : 0;

    // Get recent usage record for cost data (if available)
    const usageRecord = await prisma.voiceUsageRecord.findFirst({
      where: { organizationId },
      orderBy: { periodEnd: "desc" },
    });

    // Get call breakdown by outcome
    const outcomeBreakdown = await prisma.callLog.groupBy({
      by: ["outcome"],
      where: {
        organizationId,
        startedAt: { gte: startDate },
        outcome: { not: null },
      },
      _count: { id: true },
    });

    // Get call breakdown by direction
    const directionBreakdown = await prisma.callLog.groupBy({
      by: ["direction"],
      where: {
        organizationId,
        startedAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { duration: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        // Summary stats
        totalCalls,
        totalMinutes,
        successRate,
        activeAgents,
        phoneNumbers,

        // Cost data
        totalCost: usageRecord?.totalCost ? Number(usageRecord.totalCost) : 0,
        currency: "USD",

        // Breakdowns
        outcomeBreakdown: outcomeBreakdown.map(item => ({
          outcome: item.outcome,
          count: item._count.id,
        })),
        directionBreakdown: directionBreakdown.map(item => ({
          direction: item.direction,
          count: item._count.id,
          minutes: Math.round((item._sum.duration || 0) / 60),
        })),

        // Time range
        periodDays: days,
        periodStart: startDate.toISOString(),
        periodEnd: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching voice stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice statistics" },
      { status: 500 }
    );
  }
}

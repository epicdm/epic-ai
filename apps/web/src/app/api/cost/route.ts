/**
 * Cost Tracking API
 * GET - Get cost summary and breakdown for organization
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// Voice service URL for Magnus billing data
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

/**
 * GET /api/cost - Get cost summary
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // day, week, month, year
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range
    let dateFrom: Date;
    let dateTo: Date = new Date();

    if (startDate && endDate) {
      dateFrom = new Date(startDate);
      dateTo = new Date(endDate);
    } else {
      switch (period) {
        case "day":
          dateFrom = new Date(dateTo);
          dateFrom.setDate(dateFrom.getDate() - 1);
          break;
        case "week":
          dateFrom = new Date(dateTo);
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case "year":
          dateFrom = new Date(dateTo);
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
          break;
        default: // month
          dateFrom = new Date(dateTo);
          dateFrom.setMonth(dateFrom.getMonth() - 1);
      }
    }

    // Get call logs with costs
    const callLogs = await prisma.callLog.findMany({
      where: {
        organizationId: org.id,
        startedAt: {
          gte: dateFrom,
          lte: dateTo,
        },
      },
      select: {
        id: true,
        direction: true,
        duration: true,
        cost: true,
        costCurrency: true,
        startedAt: true,
        agentId: true,
        agent: { select: { name: true } },
      },
    });

    // Calculate totals
    let totalCost = 0;
    let totalDuration = 0;
    let totalCalls = callLogs.length;
    let inboundCalls = 0;
    let outboundCalls = 0;
    let inboundCost = 0;
    let outboundCost = 0;
    let inboundDuration = 0;
    let outboundDuration = 0;

    const agentCosts: Record<string, { name: string; cost: number; calls: number; duration: number }> = {};
    const dailyCosts: Record<string, { cost: number; calls: number }> = {};

    for (const call of callLogs) {
      const cost = call.cost ? Number(call.cost) : 0;
      const duration = call.duration || 0;

      totalCost += cost;
      totalDuration += duration;

      if (call.direction === "INBOUND") {
        inboundCalls++;
        inboundCost += cost;
        inboundDuration += duration;
      } else {
        outboundCalls++;
        outboundCost += cost;
        outboundDuration += duration;
      }

      // Agent breakdown
      if (call.agentId) {
        if (!agentCosts[call.agentId]) {
          agentCosts[call.agentId] = {
            name: call.agent?.name || "Unknown",
            cost: 0,
            calls: 0,
            duration: 0,
          };
        }
        agentCosts[call.agentId].cost += cost;
        agentCosts[call.agentId].calls++;
        agentCosts[call.agentId].duration += duration;
      }

      // Daily breakdown
      const dayKey = call.startedAt.toISOString().split("T")[0];
      if (!dailyCosts[dayKey]) {
        dailyCosts[dayKey] = { cost: 0, calls: 0 };
      }
      dailyCosts[dayKey].cost += cost;
      dailyCosts[dayKey].calls++;
    }

    // Try to get Magnus balance
    let magnusBalance = null;
    try {
      const balanceResponse = await fetch(`${VOICE_SERVICE_URL}/api/magnus/balance`, {
        headers: { "Content-Type": "application/json" },
      });
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        magnusBalance = balanceData.balance;
      }
    } catch {
      // Magnus balance not available
    }

    // Format agent costs as array
    const agentBreakdown = Object.entries(agentCosts)
      .map(([agentId, data]) => ({
        agentId,
        ...data,
      }))
      .sort((a, b) => b.cost - a.cost);

    // Format daily costs as array
    const dailyBreakdown = Object.entries(dailyCosts)
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalCalls,
        totalDuration,
        averageCostPerCall: totalCalls > 0 ? Math.round((totalCost / totalCalls) * 100) / 100 : 0,
        averageCallDuration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        currency: "USD",
      },
      breakdown: {
        inbound: {
          calls: inboundCalls,
          cost: Math.round(inboundCost * 100) / 100,
          duration: inboundDuration,
        },
        outbound: {
          calls: outboundCalls,
          cost: Math.round(outboundCost * 100) / 100,
          duration: outboundDuration,
        },
      },
      byAgent: agentBreakdown,
      byDay: dailyBreakdown,
      magnusBalance,
      period: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching cost data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost data" },
      { status: 500 }
    );
  }
}

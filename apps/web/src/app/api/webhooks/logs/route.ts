import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";

/**
 * GET - List webhook logs
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
    const platform = searchParams.get("platform");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const where: any = { orgId: org.id };
    if (platform) where.platform = platform;
    if (status) where.status = status;

    const logs = await prisma.webhookLog.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      take: limit,
    });

    // Get counts by status
    const counts = await prisma.webhookLog.groupBy({
      by: ["status"],
      where: { orgId: org.id },
      _count: true,
    });

    const countMap: Record<string, number> = {};
    counts.forEach((c) => {
      countMap[c.status] = c._count;
    });

    return NextResponse.json({
      logs,
      counts: {
        total: Object.values(countMap).reduce((a, b) => a + b, 0),
        success: countMap.SUCCESS || 0,
        failed: countMap.FAILED || 0,
        duplicate: countMap.DUPLICATE || 0,
      },
    });
  } catch (error) {
    console.error("Error getting webhook logs:", error);
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}

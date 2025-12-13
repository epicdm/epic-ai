import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

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

    const [total, byStatus, bySource, thisWeek, converted, totalValue] =
      await Promise.all([
        // Total leads
        prisma.lead.count({
          where: { organizationId: org.id },
        }),

        // By status
        prisma.lead.groupBy({
          by: ["status"],
          where: { organizationId: org.id },
          _count: { id: true },
        }),

        // By source
        prisma.lead.groupBy({
          by: ["source"],
          where: { organizationId: org.id },
          _count: { id: true },
        }),

        // Created this week
        prisma.lead.count({
          where: {
            organizationId: org.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),

        // Won leads (converted)
        prisma.lead.count({
          where: {
            organizationId: org.id,
            status: "WON",
          },
        }),

        // Total score (no estimatedValue in schema)
        prisma.lead.aggregate({
          where: { organizationId: org.id },
          _sum: { score: true },
        }),
      ]);

    const conversionRate = total > 0 ? (converted / total) * 100 : 0;

    return NextResponse.json({
      total,
      thisWeek,
      converted,
      conversionRate: Math.round(conversionRate * 10) / 10,
      totalValue: totalValue._sum?.score || 0,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
      bySource: bySource.reduce(
        (acc, item) => {
          acc[item.source] = item._count.id;
          return acc;
        },
        {} as Record<string, number>
      ),
    });
  } catch (error) {
    console.error("Error fetching lead stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

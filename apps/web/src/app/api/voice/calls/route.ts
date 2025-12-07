import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// GET all calls
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
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: {
      brand: { organizationId: string };
      agentId?: string;
      status?: string;
    } = {
      brand: {
        organizationId: org.id,
      },
    };

    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true },
          },
          brand: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.call.count({ where }),
    ]);

    return NextResponse.json({ calls, total, limit, offset });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

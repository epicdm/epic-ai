/**
 * Automation Instances API
 *
 * List and manage workflow instances for an automation.
 * Part of the "One Brain, Many Voices" architecture.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { WorkflowStatus } from "@epic-ai/database";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET list instances for an automation
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Parse filter parameters
    const status = searchParams.get("status") as WorkflowStatus | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Verify automation exists and belongs to org
    const automation = await prisma.automation.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!automation) {
      return NextResponse.json(
        { error: `Automation not found: ${id}` },
        { status: 404 }
      );
    }

    // Build filter
    const where: Record<string, unknown> = {
      automationId: id,
    };

    if (status) {
      where.status = status;
    }

    // Get instances with step executions
    const [instances, total] = await Promise.all([
      prisma.workflowInstance.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          stepExecutions: {
            orderBy: { executedAt: "desc" },
            take: 5,
            select: {
              id: true,
              stepId: true,
              action: true,
              channel: true,
              success: true,
              errorMessage: true,
              executedAt: true,
            },
          },
          _count: {
            select: {
              stepExecutions: true,
            },
          },
        },
      }),
      prisma.workflowInstance.count({ where }),
    ]);

    // Calculate summary stats
    const statusCounts = await prisma.workflowInstance.groupBy({
      by: ["status"],
      where: { automationId: id },
      _count: { status: true },
    });

    const stats = {
      total,
      byStatus: statusCounts.reduce(
        (acc, curr) => {
          acc[curr.status] = curr._count.status;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return NextResponse.json({
      instances: instances.map((instance) => ({
        ...instance,
        stepExecutionCount: instance._count.stepExecutions,
        recentSteps: instance.stepExecutions,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats,
    });
  } catch (error) {
    console.error("Error fetching instances:", error);
    return NextResponse.json(
      { error: "Failed to fetch instances" },
      { status: 500 }
    );
  }
}

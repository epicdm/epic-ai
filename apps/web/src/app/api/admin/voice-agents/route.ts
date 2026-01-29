/**
 * Voice Agents Admin API
 * GET - List all voice agents across all organizations
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * GET /api/admin/voice-agents
 * List voice agents for admin test call functionality
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    // Fetch voice agents from database
    const agents = await prisma.voiceAgent.findMany({
      take: limit,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        organizationId: true,
        organization: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      agents: agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        organizationId: agent.organizationId,
        organizationName: agent.organization?.name || null,
      })),
      totalCount: agents.length,
    });
  } catch (error) {
    console.error("[Admin Voice Agents] Error fetching agents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch voice agents" },
      { status: 500 }
    );
  }
}

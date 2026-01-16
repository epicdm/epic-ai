/**
 * LiveKit Call History Admin API
 * GET - Fetch recent calls from database
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * GET /api/admin/livekit/calls
 * List recent voice calls for troubleshooting
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction");
    const agentId = searchParams.get("agentId");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (direction) where.direction = direction;
    if (agentId) where.agentId = agentId;

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          agent: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.callLog.count({ where }),
    ]);

    // Get aggregate stats
    const stats = await prisma.callLog.aggregate({
      _avg: {
        duration: true,
      },
      _sum: {
        duration: true,
      },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      calls: calls.map((call) => ({
        id: call.id,
        roomName: call.livekitRoomName,
        roomSid: call.livekitRoomSid,
        direction: call.direction,
        status: call.status,
        outcome: call.outcome,
        fromNumber: call.callerNumber,
        toNumber: call.phoneNumber,
        duration: call.duration,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
        agentName: call.agent?.name || null,
        agentId: call.agentId,
        sipCallId: call.sipCallId,
        recordingUrl: call.recordingUrl,
        metadata: call.metadata,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      stats: {
        totalCalls: stats._count,
        avgDuration: Math.round(stats._avg.duration || 0),
        totalMinutes: Math.round((stats._sum.duration || 0) / 60),
      },
    });
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching calls:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

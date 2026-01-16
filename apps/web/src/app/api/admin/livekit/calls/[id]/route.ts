/**
 * LiveKit Call Details Admin API
 * GET - Get specific call details
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * GET /api/admin/livekit/calls/[id]
 * Get detailed information about a specific call
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const call = await prisma.callLog.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            systemPrompt: true,
            voiceId: true,
            sttProvider: true,
            llmProvider: true,
            ttsProvider: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!call) {
      return NextResponse.json(
        { error: "Call not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      call: {
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
        sipCallId: call.sipCallId,
        metadata: call.metadata,
        recordingUrl: call.recordingUrl,
        agent: call.agent
          ? {
              id: call.agent.id,
              name: call.agent.name,
              voiceId: call.agent.voiceId,
              sttProvider: call.agent.sttProvider,
              llmProvider: call.agent.llmProvider,
              ttsProvider: call.agent.ttsProvider,
            }
          : null,
        organization: call.organization
          ? {
              id: call.organization.id,
              name: call.organization.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching call:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch call" },
      { status: 500 }
    );
  }
}

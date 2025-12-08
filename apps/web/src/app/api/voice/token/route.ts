import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { generateToken, getLiveKitUrl, isLiveKitConfigured } from "@/lib/voice/livekit";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * POST /api/voice/token
 * Generate a LiveKit token for joining a voice room
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if LiveKit is configured
    if (!isLiveKitConfigured()) {
      return NextResponse.json(
        { error: "LiveKit is not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { roomName, agentId } = body;

    if (!roomName) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    // Get user organization
    const userOrg = await getUserOrganization();
    if (!userOrg) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // If agentId provided, verify access
    if (agentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: {
          id: agentId,
          brand: {
            organizationId: userOrg.id,
          },
        },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    // Generate token for the user
    const token = await generateToken(roomName, `user-${userId}`, {
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token,
      url: getLiveKitUrl(),
      roomName,
    });
  } catch (error) {
    console.error("Error generating voice token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

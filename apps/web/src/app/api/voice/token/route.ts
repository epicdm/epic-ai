/**
 * Voice Token API (LiveKit)
 * TODO: Implement when LiveKit integration is completed
 */

import { getAuthWithBypass } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * POST /api/voice/token
 * Generate a LiveKit token for joining a voice room
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if LiveKit is configured
    const liveKitConfigured = !!(
      process.env.LIVEKIT_API_KEY &&
      process.env.LIVEKIT_API_SECRET &&
      process.env.LIVEKIT_URL
    );

    if (!liveKitConfigured) {
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

    const userOrg = await getUserOrganization();
    if (!userOrg) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // If agentId provided, verify access
    if (agentId) {
      const brands = await prisma.brand.findMany({
        where: { organizationId: userOrg.id },
        select: { id: true },
      });
      const brandIds = brands.map((b) => b.id);

      const agent = await prisma.voiceAgent.findFirst({
        where: {
          id: agentId,
          brandId: { in: brandIds },
        },
      });

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    // TODO: Implement token generation when LiveKit service is completed
    return NextResponse.json(
      { error: "Voice token generation not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error generating voice token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

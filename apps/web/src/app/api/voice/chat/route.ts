/**
 * Voice Chat API
 * TODO: Implement when voice agent worker is completed
 */

import { getAuthWithBypass } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * POST /api/voice/chat
 * Process a message through the voice agent
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, message } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Agent ID and message are required" },
        { status: 400 }
      );
    }

    const userOrg = await getUserOrganization();
    if (!userOrg) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: userOrg.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    // Get the voice agent
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        brandId: { in: brandIds },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // TODO: Implement voice agent processing when worker is completed
    return NextResponse.json(
      { error: "Voice chat not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error processing chat:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/chat?conversationId=xxx
 * Get conversation transcript and summary
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // TODO: Implement when conversation storage is completed
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error getting conversation:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/chat?conversationId=xxx
 * End a conversation
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    // TODO: Implement when conversation storage is completed
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error ending conversation:", error);
    return NextResponse.json(
      { error: "Failed to end conversation" },
      { status: 500 }
    );
  }
}

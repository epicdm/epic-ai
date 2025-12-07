import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { createVoiceAgentFromConfig } from "@/lib/voice/agent-worker";
import { getUserOrganization } from "@/lib/sync-user";

// Store active conversations in memory (for demo - use Redis in production)
const activeConversations = new Map<string, ReturnType<typeof createVoiceAgentFromConfig>>();

/**
 * POST /api/voice/chat
 * Process a message through the voice agent
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, message, conversationId } = body;

    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Agent ID and message are required" },
        { status: 400 }
      );
    }

    // Get user organization
    const userOrg = await getUserOrganization();
    if (!userOrg) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 });
    }

    // Get the voice agent
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        brand: {
          organizationId: userOrg.organizationId,
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get or create conversation
    const convId = conversationId || `${agentId}-${userId}-${Date.now()}`;
    let voiceAgent = activeConversations.get(convId);

    if (!voiceAgent) {
      voiceAgent = createVoiceAgentFromConfig(agent);
      activeConversations.set(convId, voiceAgent);

      // Clean up old conversations after 30 minutes
      setTimeout(() => {
        activeConversations.delete(convId);
      }, 30 * 60 * 1000);
    }

    // Process the message
    const result = await voiceAgent.processMessage(message);

    return NextResponse.json({
      conversationId: convId,
      response: result.response,
      shouldTransfer: result.shouldTransfer,
      sentiment: result.sentiment,
      stats: voiceAgent.getStats(),
    });
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
    const { userId } = await auth();
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

    const voiceAgent = activeConversations.get(conversationId);

    if (!voiceAgent) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const [transcript, summary] = await Promise.all([
      voiceAgent.getTranscript(),
      voiceAgent.getSummary(),
    ]);

    return NextResponse.json({
      conversationId,
      transcript,
      summary,
      stats: voiceAgent.getStats(),
    });
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
    const { userId } = await auth();
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

    const voiceAgent = activeConversations.get(conversationId);

    if (!voiceAgent) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Get final stats before deleting
    const stats = voiceAgent.getStats();
    const summary = await voiceAgent.getSummary();

    activeConversations.delete(conversationId);

    return NextResponse.json({
      conversationId,
      ended: true,
      stats,
      summary,
    });
  } catch (error) {
    console.error("Error ending conversation:", error);
    return NextResponse.json(
      { error: "Failed to end conversation" },
      { status: 500 }
    );
  }
}

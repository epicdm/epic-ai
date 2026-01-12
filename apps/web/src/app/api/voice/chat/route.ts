/**
 * Voice Chat API
 * Processes messages through voice agents using OpenAI
 */

import { getAuthWithBypass } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { VoiceAgent, createVoiceAgentFromConfig } from "@/lib/voice/agent-worker";

// In-memory store for active conversations (in production, use Redis)
const activeConversations = new Map<string, {
  agent: VoiceAgent;
  agentId: string;
  userId: string;
  orgId: string;
  createdAt: Date;
}>();

// Clean up old conversations (older than 1 hour)
function cleanupOldConversations() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [id, conv] of activeConversations) {
    if (conv.createdAt < oneHourAgo) {
      activeConversations.delete(id);
    }
  }
}

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
    const { agentId, message, conversationId } = body;

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

    // Get voice agent from database
    const dbAgent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: userOrg.id,
      },
    });

    if (!dbAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Clean up periodically
    cleanupOldConversations();

    let voiceAgent: VoiceAgent;
    let convId = conversationId;

    // Check for existing conversation
    if (convId && activeConversations.has(convId)) {
      const existing = activeConversations.get(convId)!;
      // Verify ownership
      if (existing.userId !== userId || existing.agentId !== agentId) {
        return NextResponse.json({ error: "Invalid conversation" }, { status: 403 });
      }
      voiceAgent = existing.agent;
    } else {
      // Create new conversation
      convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Extract settings from the JSON fields
      const settings = (dbAgent.settings as Record<string, unknown>) || {};

      voiceAgent = createVoiceAgentFromConfig({
        id: dbAgent.id,
        name: dbAgent.name,
        systemPrompt: dbAgent.systemPrompt,
        greeting: dbAgent.greetingMessage,
        fallbackMessage: (settings.fallbackMessage as string) || null,
        voiceSettings: settings,
        llmModel: dbAgent.llmModel,
        knowledgeBase: (settings.knowledgeBase as unknown) || [],
        transferNumber: (settings.transferNumber as string) || null,
      });

      activeConversations.set(convId, {
        agent: voiceAgent,
        agentId,
        userId,
        orgId: userOrg.id,
        createdAt: new Date(),
      });
    }

    // Handle special messages
    let response: string;
    let shouldTransfer = false;

    if (message === "[CALL_STARTED]") {
      // Return greeting for new calls
      response = voiceAgent.getGreeting();
    } else if (message === "[CALL_ENDED]") {
      // Clean up the conversation
      activeConversations.delete(convId);
      response = "Call ended. Thank you!";
    } else {
      // Process the message
      const result = await voiceAgent.processMessage(message);
      response = result.response;
      shouldTransfer = result.shouldTransfer;
    }

    const stats = voiceAgent.getStats();

    return NextResponse.json({
      conversationId: convId,
      response,
      stats,
      shouldTransfer,
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

    // Check for active conversation
    const conversation = activeConversations.get(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const voiceAgent = conversation.agent;
    const transcript = voiceAgent.getTranscript();
    const stats = voiceAgent.getStats();
    const summary = await voiceAgent.getSummary();

    return NextResponse.json({
      conversationId,
      transcript,
      summary,
      stats,
      agentId: conversation.agentId,
      createdAt: conversation.createdAt,
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

    // Check for active conversation
    const conversation = activeConversations.get(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (conversation.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get final stats before deletion
    const voiceAgent = conversation.agent;
    const stats = voiceAgent.getStats();
    const summary = await voiceAgent.getSummary();

    // Delete the conversation
    activeConversations.delete(conversationId);

    return NextResponse.json({
      success: true,
      conversationId,
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

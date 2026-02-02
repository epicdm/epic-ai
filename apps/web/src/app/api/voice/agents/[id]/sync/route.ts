/**
 * Voice Agent Sync API
 * Sync agent configuration (including tools) to the voice service for code generation
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

// POST sync agent to voice service
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id: agentId } = await params;

    // Fetch agent with tools, brand, and knowledge bases
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
      },
      include: {
        brand: true,
        tools: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
        knowledgeBases: {
          where: { isActive: true },
          include: {
            knowledgeBase: {
              select: {
                id: true,
                name: true,
                isActive: true,
                documentCount: true,
                chunkCount: true,
              },
            },
          },
          orderBy: { priority: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Build configuration for voice service
    const agentConfig = {
      name: agent.name,
      description: agent.description || "",
      instructions: agent.systemPrompt || "You are a helpful AI assistant.",
      personality: "professional",
      llm: {
        provider: agent.llmProvider || "openai",
        model: agent.llmModel || "gpt-4o-mini",
        temperature: 0.7,
      },
      stt: {
        provider: agent.sttProvider || "deepgram",
        model: "nova-3",
      },
      tts: {
        provider: agent.ttsProvider || "openai",
        voice: agent.ttsVoiceId || agent.voiceId || "nova",
      },
      features: {
        vadEnabled: true,
        preemptiveGeneration: true,
        resumeFalseInterruption: true,
        transcriptionEnabled: true,
      },
      // Include tools for function calling
      tools: agent.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        type: tool.type,
        webhookUrl: tool.webhookUrl,
        webhookMethod: tool.webhookMethod,
        webhookHeaders: tool.webhookHeaders,
        authType: tool.authType,
        authConfig: tool.authConfig,
        parameters: tool.parameters,
        requiredParams: tool.requiredParams,
        responseMapping: tool.responseMapping,
        timeoutMs: tool.timeoutMs,
        retryCount: tool.retryCount,
        builtinType: tool.builtinType,
        builtinConfig: tool.builtinConfig,
        isActive: tool.isActive,
      })),
      // Include RAG knowledge base configuration
      rag: {
        enabled: agent.knowledgeBases.some(
          (link) => link.isActive && link.knowledgeBase.isActive && link.knowledgeBase.chunkCount > 0
        ),
        apiUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        maxResults: agent.knowledgeBases[0]?.maxChunks || 5,
        minScore: agent.knowledgeBases[0]?.minScore || 0.7,
        knowledgeBaseCount: agent.knowledgeBases.filter(
          (link) => link.isActive && link.knowledgeBase.isActive
        ).length,
      },
      // Include agent ID for RAG endpoint
      agentId: agent.id,
    };

    // Send to voice service for code generation
    const response = await fetch(`${VOICE_SERVICE_URL}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(agentConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Voice service sync failed:", errorText);
      return NextResponse.json(
        { error: "Failed to sync agent to voice service", details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();

    const activeKnowledgeBases = agent.knowledgeBases.filter(
      (link) => link.isActive && link.knowledgeBase.isActive
    );

    return NextResponse.json({
      success: true,
      message: "Agent synced to voice service",
      agentId: agent.id,
      voiceServiceResult: result,
      toolsCount: agent.tools.length,
      knowledgeBasesCount: activeKnowledgeBases.length,
      ragEnabled: activeKnowledgeBases.some((link) => link.knowledgeBase.chunkCount > 0),
    });
  } catch (error) {
    console.error("Error syncing agent:", error);
    return NextResponse.json(
      { error: "Failed to sync agent" },
      { status: 500 }
    );
  }
}

/**
 * Voice Runtime API Endpoint
 *
 * HTTP endpoint for voice-service (LiveKit) to call the agent runtime.
 * Handles voice turn requests and returns TTS-ready responses.
 *
 * POST /api/runtime/voice
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// ============================================================================
// Request Schema
// ============================================================================

const VoiceTurnRequestSchema = z.object({
  /** Agent ID or DID (phone number) */
  agentIdOrDid: z.string().min(1),
  /** Call/session identifier from telephony */
  callId: z.string().min(1),
  /** Transcribed user speech */
  transcript: z.string(),
  /** Caller information */
  caller: z
    .object({
      phoneNumber: z.string().optional(),
      callerName: z.string().optional(),
    })
    .optional(),
  /** Call metadata */
  metadata: z
    .object({
      callStartTime: z.string().optional(),
      turnNumber: z.number().optional(),
      isFirstTurn: z.boolean().optional(),
      /** Dev bypass for DRAFT agents (requires EPIC_ALLOW_DRAFT_RUNTIME=true) */
      allowDraftRuntime: z.boolean().optional(),
    })
    .optional(),
});

type VoiceTurnRequest = z.infer<typeof VoiceTurnRequestSchema>;

// ============================================================================
// Response Types
// ============================================================================

interface VoiceTurnResponse {
  success: boolean;
  text: string;
  flowStage: string;
  shouldEndCall: boolean;
  toolActions: Array<{
    toolId: string;
    action: string;
    success: boolean;
    result?: unknown;
  }>;
  requestId: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<VoiceTurnResponse>> {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const parsed = VoiceTurnRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          text: "Invalid request format.",
          flowStage: "error",
          shouldEndCall: false,
          toolActions: [],
          requestId: "validation_error",
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          error: parsed.error.message,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;

    // API key authentication (for voice-service)
    const apiKey = request.headers.get("x-api-key");
    const expectedKey = process.env.VOICE_RUNTIME_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json(
        {
          success: false,
          text: "Unauthorized.",
          flowStage: "error",
          shouldEndCall: false,
          toolActions: [],
          requestId: "auth_error",
          tokensUsed: 0,
          latencyMs: Date.now() - startTime,
          error: "Invalid API key",
        },
        { status: 401 }
      );
    }

    // Call the voice adapter
    // NOTE: In production, this would import from workers package
    // For now, we inline the logic to avoid cross-app imports
    const result = await processVoiceTurn(input);

    return NextResponse.json(result);

  } catch (error) {
    console.error("[VoiceAPI] Error processing turn:", error);

    return NextResponse.json(
      {
        success: false,
        text: "I apologize, but I'm experiencing technical difficulties. Please try again.",
        flowStage: "error",
        shouldEndCall: false,
        toolActions: [],
        requestId: "internal_error",
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Voice Turn Processing (Inline for web app)
// ============================================================================

async function processVoiceTurn(input: VoiceTurnRequest): Promise<VoiceTurnResponse> {
  const { prisma } = await import("@epic-ai/database");
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // 1. Resolve agent from DID or ID
    const agentId = await resolveAgent(input.agentIdOrDid, prisma);
    if (!agentId) {
      return {
        success: false,
        text: "I'm sorry, I couldn't connect you to an agent. Please try again later.",
        flowStage: "error",
        shouldEndCall: true,
        toolActions: [],
        requestId,
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        error: `No agent found for: ${input.agentIdOrDid}`,
      };
    }

    // 2. Get or create session
    const session = await getOrCreateSession(
      agentId,
      input.callId,
      input.caller,
      prisma
    );

    // 3. Load agent configuration
    const agent = await loadAgentConfig(agentId, prisma);
    if (!agent) {
      return {
        success: false,
        text: "Agent configuration not found.",
        flowStage: "error",
        shouldEndCall: true,
        toolActions: [],
        requestId,
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        error: "Agent not found",
      };
    }

    // ✅ Runtime Status Gate v1
    // Only allow TESTING or PUBLISHED agents to answer calls
    const allowedStatuses = ["TESTING", "PUBLISHED"];
    const isAllowed = allowedStatuses.includes(agent.status);

    // Optional dev bypass: EPIC_ALLOW_DRAFT_RUNTIME=true + x-epic-allow-draft-runtime header
    // NOTE: devBypass is checked in caller context, passed via metadata if needed
    const devBypass =
      process.env.EPIC_ALLOW_DRAFT_RUNTIME === "true" &&
      input.metadata?.allowDraftRuntime === true;

    if (!isAllowed && !devBypass) {
      console.log(
        `[VoiceAPI] [${requestId}] Blocked: agent ${agentId} status=${agent.status} (not TESTING/PUBLISHED)`
      );
      return {
        success: false,
        text: "This agent is not yet ready to take calls. Please try again later.",
        flowStage: "error",
        shouldEndCall: true,
        toolActions: [],
        requestId,
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        error: `AGENT_NOT_LIVE: Agent status=${agent.status}. Must be TESTING or PUBLISHED.`,
      };
    }

    // 4. Build prompt
    const prompt = buildVoicePrompt(agent, input.transcript, session);

    // 5. Call LLM
    const llmResult = await callOpenAI(prompt, agent.governance_config);

    // 6. Apply personality
    const responseText = applyVoicePersonality(
      llmResult.content,
      agent.personality_config
    );

    // 7. Clean for TTS
    const ttsText = cleanForTTS(responseText);

    // 8. Determine flow stage and end state
    const flowStage = determineFlowStage(agent.flow_config, input.transcript);
    const shouldEndCall = shouldEnd(flowStage, input.transcript);

    // 9. Save to session
    await saveSessionTurn(session.id, input.transcript, ttsText, prisma);

    // 10. End session if needed
    if (shouldEndCall) {
      await endSession(session.id, prisma);
    }

    return {
      success: true,
      text: ttsText,
      flowStage,
      shouldEndCall,
      toolActions: [],
      requestId,
      tokensUsed: llmResult.tokensUsed,
      latencyMs: Date.now() - startTime,
    };

  } catch (error) {
    console.error(`[VoiceAPI] [${requestId}] Error:`, error);
    return {
      success: false,
      text: "I apologize, but I'm experiencing technical difficulties.",
      flowStage: "error",
      shouldEndCall: false,
      toolActions: [],
      requestId,
      tokensUsed: 0,
      latencyMs: Date.now() - startTime,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function resolveAgent(
  agentIdOrDid: string,
  prisma: any
): Promise<string | null> {
  // UUID format check
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agentIdOrDid)) {
    return agentIdOrDid;
  }

  // Look up by phone number
  const phone = normalizePhone(agentIdOrDid);
  const routing = await prisma.phoneRouting.findFirst({
    where: { phoneNumber: phone, status: "active" },
    select: { agentId: true },
  });

  return routing?.agentId ?? null;
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : `+1${cleaned}`;
}

async function getOrCreateSession(
  agentId: string,
  callId: string,
  caller: VoiceTurnRequest["caller"],
  prisma: any
): Promise<{ id: string; turnCount: number }> {
  const existing = await prisma.agentSession.findFirst({
    where: {
      agentId,
      channel: "voice",
      metadata: { path: ["callId"], equals: callId },
    },
    select: { id: true, turnCount: true },
  });

  if (existing) {
    return existing;
  }

  const now = new Date();
  const created = await prisma.agentSession.create({
    data: {
      agentId,
      channel: "voice",
      status: "active",
      turnCount: 0,
      startedAt: now,
      lastActivityAt: now,
      metadata: {
        callId,
        callerPhone: caller?.phoneNumber,
        callerName: caller?.callerName,
      },
    },
    select: { id: true, turnCount: true },
  });

  return created;
}

async function loadAgentConfig(agentId: string, prisma: any) {
  return prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      status: true,
      roleCard: true,
      brainConfig: true,
      personalityConfig: true,
      flowConfig: true,
      toolConfig: true,
      knowledgeConfig: true,
      memoryConfig: true,
      governanceConfig: true,
    },
  });
}

function buildVoicePrompt(
  agent: any,
  userInput: string,
  session: { id: string; turnCount: number }
): { systemPrompt: string; userPrompt: string } {
  const roleCard = agent.roleCard ?? {};
  const personality = agent.personalityConfig ?? {};

  const systemPrompt = `You are ${roleCard.name || agent.name || "an AI assistant"}.
${roleCard.title ? `Title: ${roleCard.title}` : ""}
${roleCard.company ? `Company: ${roleCard.company}` : ""}
${roleCard.mission ? `Mission: ${roleCard.mission}` : ""}

Voice Tone: ${personality.voiceTone || "friendly"}
This is a voice conversation. Keep responses concise and natural for speech.
${personality.preferredPhrases?.length ? `Use phrases like: ${personality.preferredPhrases.join(", ")}` : ""}
${personality.avoidedPhrases?.length ? `Avoid phrases like: ${personality.avoidedPhrases.join(", ")}` : ""}

${session.turnCount === 0 ? "This is the start of the call. Greet the caller warmly." : ""}`;

  const userPrompt = userInput;

  return { systemPrompt, userPrompt };
}

async function callOpenAI(
  prompt: { systemPrompt: string; userPrompt: string },
  governance: any
): Promise<{ content: string; tokensUsed: number }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const model = governance?.llmSettings?.model ?? "gpt-4o";
  const temperature = governance?.llmSettings?.temperature ?? 0.7;
  const maxTokens = governance?.llmSettings?.maxTokens ?? 500;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content ?? "",
    tokensUsed: data.usage?.total_tokens ?? 0,
  };
}

function applyVoicePersonality(text: string, personality: any): string {
  if (!personality) return text;

  let result = text;

  // Apply voice tone adjustments
  if (personality.voiceTone === "friendly") {
    // Add warmth
    if (!result.includes("!") && result.length < 200) {
      result = result.replace(/\.$/, "!");
    }
  }

  if (personality.voiceTone === "formal") {
    // Remove casual elements
    result = result.replace(/!/g, ".");
  }

  return result;
}

function cleanForTTS(text: string): string {
  let cleaned = text;

  // Remove markdown
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1");
  cleaned = cleaned.replace(/`(.*?)`/g, "$1");
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, "$1");

  // Remove emojis
  cleaned = cleaned.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ""
  );

  // Clean whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

function determineFlowStage(flowConfig: any, userInput: string): string {
  // Simple keyword-based flow detection for v1
  const input = userInput.toLowerCase();

  if (input.includes("bye") || input.includes("goodbye") || input.includes("thank you")) {
    return "closing";
  }

  if (input.includes("help") || input.includes("support")) {
    return "support";
  }

  if (input.includes("price") || input.includes("cost") || input.includes("quote")) {
    return "qualification";
  }

  if (input.includes("appointment") || input.includes("schedule") || input.includes("book")) {
    return "booking";
  }

  return flowConfig?.entryNodeId ?? "conversation";
}

function shouldEnd(flowStage: string, userInput: string): boolean {
  const input = userInput.toLowerCase();

  return (
    flowStage === "closing" ||
    input.includes("goodbye") ||
    input.includes("hang up") ||
    input.includes("end call")
  );
}

async function saveSessionTurn(
  sessionId: string,
  userInput: string,
  agentResponse: string,
  prisma: any
): Promise<void> {
  const now = new Date();

  // Update session
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      turnCount: { increment: 1 },
      lastActivityAt: now,
    },
  });

  // Save messages
  await prisma.agentMessage.createMany({
    data: [
      {
        sessionId,
        role: "user",
        content: userInput,
        timestamp: now,
      },
      {
        sessionId,
        role: "assistant",
        content: agentResponse,
        timestamp: now,
      },
    ],
  });
}

async function endSession(sessionId: string, prisma: any): Promise<void> {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      status: "completed",
      endedAt: new Date(),
    },
  });
}

// ============================================================================
// Health Check Endpoint
// ============================================================================

export async function GET(): Promise<NextResponse> {
  try {
    const { prisma } = await import("@epic-ai/database");

    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check OpenAI key
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    return NextResponse.json({
      status: "healthy",
      checks: {
        database: true,
        openai: hasOpenAI,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

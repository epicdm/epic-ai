/**
 * Voice Runtime Adapter v1
 *
 * Bridge between LiveKit/telephony and the Agent Runtime.
 * Handles voice-specific concerns: DID mapping, session lifecycle,
 * streaming transcripts, and TTS-friendly output.
 *
 * @module runtime/adapters/voice-adapter
 */

import { prisma } from "@epic-ai/database";
import { runAgentTurn } from "../run-agent";
import type { AgentTurnInput, AgentTurnResult } from "../types";
import {
  createRequestContext,
  logTurnStart,
  logTurnComplete,
  logError,
  buildTurnLog,
  type RequestContext,
} from "../observability";

// ============================================================================
// Types
// ============================================================================

export interface VoiceTurnInput {
  /** Agent ID or DID (phone number) for lookup */
  agentIdOrDid: string;
  /** Call/session identifier */
  callId: string;
  /** Transcribed user speech */
  transcript: string;
  /** Optional: caller info */
  caller?: {
    phoneNumber?: string;
    callerName?: string;
  };
  /** Optional: call metadata */
  metadata?: {
    callStartTime?: string;
    turnNumber?: number;
    isFirstTurn?: boolean;
  };
}

export interface VoiceTurnResult {
  /** Success flag */
  success: boolean;
  /** Agent response text (TTS-ready) */
  text: string;
  /** Current flow stage */
  flowStage: string;
  /** Whether conversation should end */
  shouldEndCall: boolean;
  /** Tool actions executed */
  toolActions: Array<{
    toolId: string;
    action: string;
    success: boolean;
    result?: unknown;
  }>;
  /** Request tracking ID */
  requestId: string;
  /** Tokens used */
  tokensUsed: number;
  /** Response latency in ms */
  latencyMs: number;
  /** Error message if failed */
  error?: string;
}

export interface VoiceSessionInfo {
  sessionId: string;
  agentId: string;
  callId: string;
  status: "active" | "ended" | "transferred";
  turnCount: number;
  startedAt: Date;
  lastActivityAt: Date;
}

// ============================================================================
// DID to Agent Mapping
// ============================================================================

/**
 * Resolve agent ID from DID (phone number) or direct agent ID.
 */
export async function resolveAgentFromDid(
  agentIdOrDid: string
): Promise<{ agentId: string; phoneNumber?: string } | null> {
  // If it looks like a UUID, treat as agent ID
  if (isUUID(agentIdOrDid)) {
    return { agentId: agentIdOrDid };
  }

  // Otherwise, look up by phone number (DID)
  const phoneNumber = normalizePhoneNumber(agentIdOrDid);

  const routing = await prisma.phoneRouting.findFirst({
    where: {
      phoneNumber,
      status: "active",
    },
    select: {
      agentId: true,
      phoneNumber: true,
    },
  });

  if (!routing) {
    return null;
  }

  return {
    agentId: routing.agentId,
    phoneNumber: routing.phoneNumber,
  };
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");
  // Ensure E.164 format
  if (!cleaned.startsWith("+")) {
    return `+1${cleaned}`; // Default to US
  }
  return cleaned;
}

// ============================================================================
// Voice Session Management
// ============================================================================

/**
 * Create or get a voice session for the call.
 */
export async function getOrCreateVoiceSession(params: {
  agentId: string;
  callId: string;
  callerPhone?: string;
  callerName?: string;
}): Promise<VoiceSessionInfo> {
  const { agentId, callId, callerPhone, callerName } = params;

  // Check for existing session
  const existing = await prisma.agentSession.findFirst({
    where: {
      agentId,
      channel: "voice",
      metadata: {
        path: ["callId"],
        equals: callId,
      },
    },
    select: {
      id: true,
      agentId: true,
      status: true,
      turnCount: true,
      startedAt: true,
      lastActivityAt: true,
      metadata: true,
    },
  });

  if (existing) {
    return {
      sessionId: existing.id,
      agentId: existing.agentId,
      callId,
      status: existing.status as "active" | "ended" | "transferred",
      turnCount: existing.turnCount,
      startedAt: existing.startedAt,
      lastActivityAt: existing.lastActivityAt,
    };
  }

  // Create new session
  const now = new Date();

  // Try to find or create lead for caller
  let leadId: string | undefined;
  if (callerPhone) {
    const lead = await findOrCreateLeadFromPhone(agentId, callerPhone, callerName);
    leadId = lead?.id;
  }

  const newSession = await prisma.agentSession.create({
    data: {
      agentId,
      channel: "voice",
      leadId,
      status: "active",
      turnCount: 0,
      startedAt: now,
      lastActivityAt: now,
      metadata: {
        callId,
        callerPhone,
        callerName,
        platform: "livekit",
      },
    },
  });

  return {
    sessionId: newSession.id,
    agentId: newSession.agentId,
    callId,
    status: "active",
    turnCount: 0,
    startedAt: now,
    lastActivityAt: now,
  };
}

async function findOrCreateLeadFromPhone(
  agentId: string,
  phone: string,
  name?: string
): Promise<{ id: string } | null> {
  // Get organization from agent
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { organizationId: true },
  });

  if (!agent?.organizationId) {
    return null;
  }

  // Get a brand for the organization (use the first one available)
  const brand = await prisma.brand.findFirst({
    where: { organizationId: agent.organizationId },
    select: { id: true },
  });

  if (!brand) {
    // No brand available - can't create lead
    return null;
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  // Check for existing lead
  const existing = await prisma.lead.findFirst({
    where: {
      organizationId: agent.organizationId,
      phone: normalizedPhone,
    },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  // Parse name into first/last name
  const nameParts = (name ?? "Unknown Caller").split(" ");
  const firstName = nameParts[0] ?? "Unknown";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  // Create new lead
  const newLead = await prisma.lead.create({
    data: {
      organizationId: agent.organizationId,
      brandId: brand.id,
      phone: normalizedPhone,
      firstName,
      lastName,
      source: "VOICE_CALL",
      status: "NEW",
    },
  });

  return { id: newLead.id };
}

/**
 * End a voice session.
 */
export async function endVoiceSession(
  sessionId: string,
  reason: "completed" | "transferred" | "dropped" | "error"
): Promise<void> {
  await prisma.agentSession.update({
    where: { id: sessionId },
    data: {
      status: reason === "transferred" ? "transferred" : "completed",
      endedAt: new Date(),
      metadata: {
        update: {
          endReason: reason,
        },
      },
    },
  });
}

// ============================================================================
// Main Voice Turn Handler
// ============================================================================

/**
 * Process a single voice turn.
 * This is the main entry point for the voice adapter.
 */
export async function handleVoiceTurn(input: VoiceTurnInput): Promise<VoiceTurnResult> {
  let ctx: RequestContext | null = null;

  try {
    // 1. Resolve agent from DID or ID
    const resolved = await resolveAgentFromDid(input.agentIdOrDid);
    if (!resolved) {
      return {
        success: false,
        text: "I'm sorry, I couldn't connect you to an agent. Please try again later.",
        flowStage: "error",
        shouldEndCall: true,
        toolActions: [],
        requestId: "unknown",
        tokensUsed: 0,
        latencyMs: 0,
        error: `No agent found for: ${input.agentIdOrDid}`,
      };
    }

    // 2. Get or create session
    const session = await getOrCreateVoiceSession({
      agentId: resolved.agentId,
      callId: input.callId,
      callerPhone: input.caller?.phoneNumber,
      callerName: input.caller?.callerName,
    });

    // 3. Create request context for observability
    ctx = createRequestContext({
      agentId: resolved.agentId,
      sessionId: session.sessionId,
      channel: "voice",
    });

    logTurnStart(ctx, input.transcript);

    // 4. Build runtime input
    const runtimeInput: AgentTurnInput = {
      agentId: resolved.agentId,
      sessionId: session.sessionId,
      userInput: input.transcript,
      channel: "voice",
      userId: undefined, // Lead ID handled internally
    };

    // 5. Run the agent turn
    const result = await runAgentTurn(runtimeInput);

    // 6. Process for voice output
    const voiceResult = processForVoice(result, ctx.requestId);

    // 7. Log completion
    logTurnComplete(ctx, {
      success: voiceResult.success,
      responseLength: voiceResult.text.length,
      flowStage: voiceResult.flowStage,
    });

    // 8. Check if call should end
    if (voiceResult.shouldEndCall) {
      await endVoiceSession(session.sessionId, "completed");
    }

    return voiceResult;

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (ctx) {
      logError(ctx, err, "handleVoiceTurn");
    } else {
      console.error("[VoiceAdapter] Fatal error:", err);
    }

    return {
      success: false,
      text: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment.",
      flowStage: "error",
      shouldEndCall: false,
      toolActions: [],
      requestId: ctx?.requestId ?? "unknown",
      tokensUsed: 0,
      latencyMs: ctx ? Date.now() - ctx.startTime : 0,
      error: err.message,
    };
  }
}

// ============================================================================
// Voice-Specific Processing
// ============================================================================

/**
 * Process runtime result for voice output.
 */
function processForVoice(result: AgentTurnResult, requestId: string): VoiceTurnResult {
  // Clean text for TTS
  const text = cleanForTTS(result.response);

  // Extract tool actions
  const toolActions = result.toolResult
    ? [
        {
          toolId: result.toolResult.toolId,
          action: "execute",
          success: result.toolResult.success,
          result: result.toolResult.data,
        },
      ]
    : [];

  // Determine if call should end
  const shouldEndCall =
    result.shouldEnd ||
    result.flowState.isExit ||
    result.decision.action === "end" ||
    result.decision.action === "escalate";

  return {
    success: result.ok,
    text,
    flowStage: result.flowState.currentNode,
    shouldEndCall,
    toolActions,
    requestId,
    tokensUsed: result.metadata.tokensUsed ?? 0,
    latencyMs: result.metadata.durationMs,
    error: result.error?.message,
  };
}

/**
 * Clean response text for TTS output.
 */
function cleanForTTS(text: string): string {
  let cleaned = text;

  // Remove markdown formatting
  cleaned = cleaned.replace(/\*\*(.*?)\*\*/g, "$1"); // Bold
  cleaned = cleaned.replace(/\*(.*?)\*/g, "$1"); // Italic
  cleaned = cleaned.replace(/`(.*?)`/g, "$1"); // Code
  cleaned = cleaned.replace(/\[(.*?)\]\(.*?\)/g, "$1"); // Links

  // Remove emojis (TTS doesn't pronounce them well)
  cleaned = cleaned.replace(
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
    ""
  );

  // Clean up multiple spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Add natural pauses
  cleaned = cleaned.replace(/\. /g, "... ");
  cleaned = cleaned.replace(/\? /g, "? ");
  cleaned = cleaned.replace(/! /g, "! ");

  return cleaned;
}

// ============================================================================
// Streaming Support (for real-time transcripts)
// ============================================================================

export interface StreamingVoiceInput {
  agentId: string;
  sessionId: string;
  partialTranscript: string;
  isFinal: boolean;
}

/**
 * Handle streaming transcript input.
 * Only processes when transcript is final.
 */
export async function handleStreamingTranscript(
  input: StreamingVoiceInput
): Promise<VoiceTurnResult | null> {
  // Only process final transcripts
  if (!input.isFinal) {
    return null;
  }

  // Ignore empty transcripts
  if (!input.partialTranscript.trim()) {
    return null;
  }

  return handleVoiceTurn({
    agentIdOrDid: input.agentId,
    callId: input.sessionId,
    transcript: input.partialTranscript,
  });
}

// ============================================================================
// Call Transfer Support
// ============================================================================

export interface TransferRequest {
  sessionId: string;
  targetType: "agent" | "phone" | "queue";
  target: string;
  reason: string;
}

/**
 * Initiate a call transfer.
 */
export async function initiateTransfer(request: TransferRequest): Promise<{
  success: boolean;
  transferId?: string;
  error?: string;
}> {
  try {
    // Record transfer intent
    await prisma.agentSession.update({
      where: { id: request.sessionId },
      data: {
        status: "transferred",
        metadata: {
          update: {
            transferTarget: request.target,
            transferType: request.targetType,
            transferReason: request.reason,
            transferInitiatedAt: new Date().toISOString(),
          },
        },
      },
    });

    // TODO: Integrate with telephony provider for actual transfer
    // This would call LiveKit/Twilio/etc. to transfer the call

    return {
      success: true,
      transferId: `transfer_${Date.now()}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transfer failed",
    };
  }
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check voice adapter health.
 */
export async function checkVoiceAdapterHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // OpenAI check
  checks.openai = !!process.env.OPENAI_API_KEY;

  // LiveKit check (env vars present)
  checks.livekit =
    !!process.env.LIVEKIT_API_KEY && !!process.env.LIVEKIT_API_SECRET;

  return {
    healthy: Object.values(checks).every((v) => v),
    checks,
  };
}

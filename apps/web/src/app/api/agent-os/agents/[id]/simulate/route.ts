/**
 * Agent Simulation API - Testing Harness v1
 *
 * Runs multi-turn conversation simulation for QA without LiveKit.
 * Supports:
 * - Direct agent ID or DID resolution
 * - Multi-turn message sequences
 * - Full transcript output with decision/flow details
 *
 * @module api/agent-os/agents/[id]/simulate
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import {
  runAgentTurn,
  type AgentTurnInput,
  type AgentTurnResult,
  type RuntimeChannel,
} from "@epic-ai/workers/runtime";

// ============================================================================
// Types
// ============================================================================

interface SimulationTurn {
  turnNumber: number;
  userInput: string;
  agentResponse: string;
  decision: {
    action: string;
    confidence: number;
    reasoning: string;
  };
  flowState: {
    currentNode: string;
    previousNode?: string;
    isExit: boolean;
  };
  toolResult?: {
    toolId: string;
    success: boolean;
    summary: string;
  };
  durationMs: number;
  shouldEnd: boolean;
}

interface SimulationResult {
  agentId: string;
  agentName: string;
  sessionId: string;
  channel: RuntimeChannel;
  turns: SimulationTurn[];
  totalDurationMs: number;
  exitedNormally: boolean;
  exitReason?: string;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Validation Schema
// ============================================================================

const SimulateRequestSchema = z.object({
  /** Array of user messages to simulate (in order) */
  messages: z
    .array(z.string().min(1, "Message cannot be empty"))
    .min(1, "At least one message is required")
    .max(50, "Maximum 50 messages per simulation"),

  /** Channel to simulate */
  channel: z
    .enum(["web", "voice", "sms", "email", "whatsapp", "api"])
    .default("voice"),

  /** Optional session ID (will generate if not provided) */
  sessionId: z.string().optional(),

  /** Optional: continue after conversation would normally end */
  continueOnEnd: z.boolean().default(false),

  /** Optional: include full LLM prompt/response in output */
  includeDebug: z.boolean().default(false),

  /** Optional: user ID to associate with session */
  userId: z.string().optional(),

  /** Optional: channel metadata (e.g., callerNumber for voice) */
  channelMetadata: z.record(z.unknown()).optional(),
});

type SimulateRequest = z.infer<typeof SimulateRequestSchema>;

// ============================================================================
// Route Params
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a string is a valid UUID.
 */
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Check if a string looks like a CUID (starts with 'c' followed by lowercase alphanumeric).
 */
function isCUID(str: string): boolean {
  return /^c[a-z0-9]{24,}$/i.test(str);
}

/**
 * Normalize phone number to E.164 format.
 */
function normalizePhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Resolve agent from ID or DID.
 */
async function resolveAgent(
  idOrDid: string,
  organizationId: string
): Promise<{ id: string; name: string; status: string } | null> {
  // If it looks like a CUID or UUID, treat as agent ID
  if (isCUID(idOrDid) || isUUID(idOrDid)) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: idOrDid,
        organizationId,
      },
      select: { id: true, name: true, status: true },
    });
    return agent;
  }

  // Otherwise, try to resolve as phone number (DID)
  const phoneNumber = normalizePhoneNumber(idOrDid);

  // First try PhoneRouting (new model)
  const routing = await prisma.phoneRouting.findFirst({
    where: {
      phoneNumber,
      organizationId,
      status: "active",
    },
    select: { agentId: true },
  });

  if (routing?.agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: routing.agentId },
      select: { id: true, name: true, status: true },
    });
    return agent;
  }

  // Fall back to PhoneMapping (legacy)
  const mapping = await prisma.phoneMapping.findFirst({
    where: {
      phoneNumber,
      organizationId,
      isActive: true,
    },
    select: { agentId: true },
  });

  if (mapping?.agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: mapping.agentId },
      select: { id: true, name: true, status: true },
    });
    return agent;
  }

  return null;
}

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
  return `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert AgentTurnResult to SimulationTurn.
 */
function toSimulationTurn(
  turnNumber: number,
  userInput: string,
  result: AgentTurnResult
): SimulationTurn {
  return {
    turnNumber,
    userInput,
    agentResponse: result.response,
    decision: {
      action: result.decision.action,
      confidence: result.decision.confidence,
      reasoning: result.decision.reasoning,
    },
    flowState: {
      currentNode: result.flowState.currentNode,
      previousNode: result.flowState.previousNode,
      isExit: result.flowState.isExit,
    },
    toolResult: result.toolResult
      ? {
          toolId: result.toolResult.toolId,
          success: result.toolResult.success,
          summary: result.toolResult.summary,
        }
      : undefined,
    durationMs: result.metadata.durationMs,
    shouldEnd: result.shouldEnd,
  };
}

// ============================================================================
// POST Handler - Run Simulation
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<SimulationResult | ErrorResponse>> {
  const startTime = Date.now();

  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership?.organizationId) {
      return NextResponse.json<ErrorResponse>(
        { error: "User has no organization", code: "NO_ORGANIZATION" },
        { status: 403 }
      );
    }

    // 3. Get agent ID or DID from params
    const { id: agentIdOrDid } = await params;

    // 4. Parse and validate body
    const body = await request.json();
    const parseResult = SimulateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return NextResponse.json<ErrorResponse>(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      messages,
      channel,
      sessionId: requestedSessionId,
      continueOnEnd,
      userId: simUserId,
      channelMetadata,
    } = parseResult.data;

    // 5. Resolve agent
    const agent = await resolveAgent(agentIdOrDid, membership.organizationId);

    if (!agent) {
      return NextResponse.json<ErrorResponse>(
        {
          error: `Agent not found for identifier: ${agentIdOrDid}`,
          code: "AGENT_NOT_FOUND",
          details: {
            searchedOrganization: membership.organizationId,
            identifier: agentIdOrDid,
          },
        },
        { status: 404 }
      );
    }

    // 5b. Runtime Status Gate v1
    // Only allow TESTING or PUBLISHED agents to run simulations
    const allowedStatuses = ["TESTING", "PUBLISHED"];
    const isAllowed = allowedStatuses.includes(agent.status);

    // Optional dev bypass: EPIC_ALLOW_DRAFT_RUNTIME=true in env
    const devBypass = process.env.EPIC_ALLOW_DRAFT_RUNTIME === "true";

    if (!isAllowed && !devBypass) {
      console.log(
        `[simulate] Blocked: agent ${agent.id} status=${agent.status} (not TESTING/PUBLISHED)`
      );
      return NextResponse.json<ErrorResponse>(
        {
          error: "Agent not ready for simulation",
          code: "AGENT_NOT_LIVE",
          details: {
            agentId: agent.id,
            currentStatus: agent.status,
            requiredStatus: ["TESTING", "PUBLISHED"],
            hint: "Launch the agent to TESTING or PUBLISHED status first",
          },
        },
        { status: 422 }
      );
    }

    // 6. Generate or use provided session ID
    const sessionId = requestedSessionId || generateSessionId();

    // 7. Run simulation
    const turns: SimulationTurn[] = [];
    let exitedNormally = false;
    let exitReason: string | undefined;

    for (let i = 0; i < messages.length; i++) {
      const userMessage = messages[i];

      const turnInput: AgentTurnInput = {
        agentId: agent.id,
        userInput: userMessage,
        channel: channel as RuntimeChannel,
        sessionId,
        userId: simUserId,
        channelMetadata,
      };

      const result = await runAgentTurn(turnInput);

      turns.push(toSimulationTurn(i + 1, userMessage, result));

      // Check for errors
      if (!result.ok) {
        exitReason = `Turn ${i + 1} failed: ${result.error?.message || "Unknown error"}`;
        break;
      }

      // Check for conversation end
      if (result.shouldEnd && !continueOnEnd) {
        exitedNormally = true;
        exitReason = `Conversation ended at turn ${i + 1}: ${result.decision.action}`;
        break;
      }
    }

    // 8. Calculate total duration
    const totalDurationMs = Date.now() - startTime;

    // 9. Return simulation result
    console.log(
      `[simulate] Completed ${turns.length} turns for agent ${agent.id} in ${totalDurationMs}ms`
    );

    return NextResponse.json<SimulationResult>({
      agentId: agent.id,
      agentName: agent.name,
      sessionId,
      channel: channel as RuntimeChannel,
      turns,
      totalDurationMs,
      exitedNormally,
      exitReason,
    });
  } catch (error) {
    console.error("[simulate] Error:", error);

    return NextResponse.json<ErrorResponse>(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Simulation Info
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Get user's organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership?.organizationId) {
      return NextResponse.json<ErrorResponse>(
        { error: "User has no organization", code: "NO_ORGANIZATION" },
        { status: 403 }
      );
    }

    // 3. Resolve agent
    const { id: agentIdOrDid } = await params;
    const agent = await resolveAgent(agentIdOrDid, membership.organizationId);

    if (!agent) {
      return NextResponse.json<ErrorResponse>(
        {
          error: `Agent not found for identifier: ${agentIdOrDid}`,
          code: "AGENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 3b. Runtime Status Gate v1
    const allowedStatuses = ["TESTING", "PUBLISHED"];
    const isAllowed = allowedStatuses.includes(agent.status);
    const devBypass = process.env.EPIC_ALLOW_DRAFT_RUNTIME === "true";

    if (!isAllowed && !devBypass) {
      return NextResponse.json<ErrorResponse>(
        {
          error: "Agent not ready for simulation",
          code: "AGENT_NOT_LIVE",
          details: {
            agentId: agent.id,
            currentStatus: agent.status,
            requiredStatus: ["TESTING", "PUBLISHED"],
          },
        },
        { status: 422 }
      );
    }

    // 4. Return simulation info
    return NextResponse.json({
      agentId: agent.id,
      agentName: agent.name,
      supportedChannels: ["web", "voice", "sms", "email", "whatsapp", "api"],
      maxMessages: 50,
      usage: {
        method: "POST",
        body: {
          messages: ["Hello", "I need help with..."],
          channel: "voice",
          sessionId: "(optional)",
          continueOnEnd: false,
          includeDebug: false,
        },
      },
    });
  } catch (error) {
    console.error("[simulate/info] Error:", error);

    return NextResponse.json<ErrorResponse>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Agent OS - Voice Deployment API
 *
 * POST /api/agent-os/agents/:id/deploy
 * Deploy an Agent OS agent to the voice channel by creating or updating
 * a linked VoiceAgent with configuration mapped from the agent's config blobs.
 *
 * @module api/agent-os/agents/[id]/deploy
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma, ChannelType } from "@epic-ai/database";
import type { ApiResponse } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import {
  validateAgentAccess,
  isErrorResponse,
  returnError,
} from "../_helpers";
import { VoiceDeploymentAdapter } from "@/lib/adapters/voice-deployment-adapter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeploySuccessData {
  agent: Agent;
  voiceAgentId: string;
  created: boolean;
}

type DeployResponse = ApiResponse<DeploySuccessData>;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// POST Handler
// ---------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<DeployResponse>> {
  try {
    const { id: agentId } = await params;

    // 1. Validate access - agent must exist and belong to the user's org
    const accessResult = await validateAgentAccess(agentId);
    if (isErrorResponse(accessResult)) {
      return returnError<DeploySuccessData>(accessResult);
    }

    const { agent, orgId } = accessResult;

    // 2. Reject archived agents
    if (agent.status === "ARCHIVED") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "AGENT_ARCHIVED",
            message: "Cannot deploy an archived agent.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Verify agent has VOICE channel enabled (or add it)
    const hasVoiceChannel = agent.channels.includes(ChannelType.VOICE);
    if (!hasVoiceChannel) {
      // Automatically add VOICE channel on deploy
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          channels: {
            push: ChannelType.VOICE,
          },
        },
      });
    }

    // 4. Deploy to voice via the adapter
    const result = await VoiceDeploymentAdapter.deploy(agent, orgId, prisma);

    // 5. Return success with the updated agent and voice agent ID
    return NextResponse.json({
      data: {
        agent: result.agent,
        voiceAgentId: result.voiceAgent.id,
        created: result.created,
      },
    });
  } catch (error) {
    console.error("[deploy] Error deploying agent to voice:", error);

    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to deploy agent to voice channel",
        },
      },
      { status: 500 }
    );
  }
}

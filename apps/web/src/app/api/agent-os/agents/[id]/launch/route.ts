/**
 * Agent Launch API
 *
 * Transitions an agent from DRAFT to TESTING or PUBLISHED.
 * Enforces readiness rules:
 * - TESTING: requires >=70 readiness score, no high-severity gaps
 * - PUBLISHED: requires >=85 readiness score, no high-severity gaps
 * - VOICE agents require a DID mapping before launch
 * - PUBLISHED/ARCHIVED agents are immutable
 *
 * @module api/agent-os/agents/[id]/launch
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma, AgentStatus, ChannelType } from "@epic-ai/database";
import type { ApiResponse, GapItem, WarningItem, ConfidenceMap } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import {
  buildWizardSnapshotFromAgentId,
  canLaunchAgentV1,
  LaunchRequestSchema,
  getNonBypassableBlockers,
  type LaunchBlocker,
  type ReadinessEvaluation,
} from "@epic-ai/workers/lib";
import {
  validateAgentAccess,
  isErrorResponse,
  validateBody,
  returnError,
} from "../_helpers";

// ============================================================================
// Types
// ============================================================================

interface LaunchSuccessData {
  agentId: string;
  previousStatus: AgentStatus;
  newStatus: AgentStatus;
  readiness: ReadinessEvaluation;
}

interface LaunchBlockedData {
  agentId: string;
  currentStatus: AgentStatus;
  blockers: LaunchBlocker[];
  readiness?: ReadinessEvaluation;
}

type LaunchResponse = ApiResponse<LaunchSuccessData | LaunchBlockedData>;

// ============================================================================
// Route Params
// ============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<LaunchResponse>> {
  try {
    const { id: agentId } = await params;

    // 1. Validate access (no requireEditable - we handle status checks ourselves)
    const accessResult = await validateAgentAccess(agentId);
    if (isErrorResponse(accessResult)) {
      return returnError<LaunchSuccessData | LaunchBlockedData>(accessResult);
    }

    const { agent } = accessResult;

    // 2. Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const bodyResult = validateBody(body, LaunchRequestSchema);
    if (!bodyResult.success) {
      return returnError<LaunchSuccessData | LaunchBlockedData>(bodyResult.error);
    }

    const { target, force } = bodyResult.data;

    // 3. Build wizard snapshot for readiness evaluation
    const snapshotResult = await buildWizardSnapshotFromAgentId(agentId);
    if (!snapshotResult.ok) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: snapshotResult.error.code,
            message: snapshotResult.error.message,
          },
        },
        { status: 404 }
      );
    }

    const { confidence, gaps, warnings } = snapshotResult;

    // 4. Check if VOICE channel requires DID mapping
    const hasVoiceChannel = agent.channels.includes(ChannelType.VOICE);
    let didMapped = true;

    if (hasVoiceChannel) {
      const phoneMapping = await prisma.phoneMapping.findFirst({
        where: {
          agentId: agent.id,
          isActive: true,
        },
        select: { id: true },
      });
      didMapped = !!phoneMapping;
    }

    // 5. Evaluate launch eligibility
    const eligibility = canLaunchAgentV1({
      target,
      snapshot: { confidence, gaps },
      hasVoiceChannel,
      didMapped,
      agentStatus: agent.status,
    });

    // 6. Handle blockers
    if (!eligibility.ok) {
      // Check if force can bypass remaining blockers
      const nonBypassable = getNonBypassableBlockers(eligibility.blockers);

      if (nonBypassable.length > 0 || !force) {
        // Return blocked response with details
        return NextResponse.json<LaunchResponse>(
          {
            data: {
              agentId: agent.id,
              currentStatus: agent.status,
              blockers: force ? nonBypassable : eligibility.blockers,
              readiness: eligibility.readiness,
            },
            error: {
              code: "LAUNCH_BLOCKED",
              message: force
                ? `Launch blocked by ${nonBypassable.length} non-bypassable blocker(s).`
                : `Launch blocked by ${eligibility.blockers.length} blocker(s). Use force=true to bypass low-confidence issues.`,
              details: {
                blockers: (force ? nonBypassable : eligibility.blockers).map((b: LaunchBlocker) => ({
                  code: b.code,
                  message: b.message,
                })),
                forceUsed: force,
                bypassableCount: eligibility.blockers.length - nonBypassable.length,
              },
            },
            confidence,
            gaps,
            warnings,
          },
          { status: 422 }
        );
      }

      // Force is true and only bypassable blockers remain - continue with launch
    }

    // 7. Determine new status based on target
    const newStatus: AgentStatus =
      target === "PUBLISHED" ? AgentStatus.PUBLISHED : AgentStatus.TESTING;

    // 8. Update agent status
    const previousStatus = agent.status;
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
        // Record launch timestamp (if field exists)
        ...(newStatus === AgentStatus.PUBLISHED && {
          publishedAt: new Date(),
        }),
      },
    });

    console.log(
      `[launch] Agent ${agentId} launched: ${previousStatus} -> ${newStatus}` +
        (force ? " (force=true)" : "")
    );

    // 9. Return success response
    return NextResponse.json<LaunchResponse>({
      data: {
        agentId: updatedAgent.id,
        previousStatus,
        newStatus,
        readiness: eligibility.readiness!,
      },
      confidence,
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("[launch] Error:", error);

    return NextResponse.json<LaunchResponse>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to launch agent",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET Handler - Check launch eligibility without launching
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<LaunchResponse>> {
  try {
    const { id: agentId } = await params;
    const { searchParams } = new URL(request.url);
    const target = (searchParams.get("target") ?? "TESTING") as "TESTING" | "PUBLISHED";

    // 1. Validate access
    const accessResult = await validateAgentAccess(agentId);
    if (isErrorResponse(accessResult)) {
      return returnError<LaunchSuccessData | LaunchBlockedData>(accessResult);
    }

    const { agent } = accessResult;

    // 2. Build wizard snapshot
    const snapshotResult = await buildWizardSnapshotFromAgentId(agentId);
    if (!snapshotResult.ok) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: snapshotResult.error.code,
            message: snapshotResult.error.message,
          },
        },
        { status: 404 }
      );
    }

    const { confidence, gaps, warnings } = snapshotResult;

    // 3. Check DID mapping for VOICE agents
    const hasVoiceChannel = agent.channels.includes(ChannelType.VOICE);
    let didMapped = true;

    if (hasVoiceChannel) {
      const phoneMapping = await prisma.phoneMapping.findFirst({
        where: {
          agentId: agent.id,
          isActive: true,
        },
        select: { id: true },
      });
      didMapped = !!phoneMapping;
    }

    // 4. Evaluate eligibility
    const eligibility = canLaunchAgentV1({
      target,
      snapshot: { confidence, gaps },
      hasVoiceChannel,
      didMapped,
      agentStatus: agent.status,
    });

    // 5. Return eligibility status
    if (!eligibility.ok) {
      return NextResponse.json<LaunchResponse>({
        data: {
          agentId: agent.id,
          currentStatus: agent.status,
          blockers: eligibility.blockers,
          readiness: eligibility.readiness,
        },
        error: {
          code: "LAUNCH_BLOCKED",
          message: `Agent not ready for ${target} launch. ${eligibility.blockers.length} blocker(s) found.`,
          details: {
            blockers: eligibility.blockers.map((b: LaunchBlocker) => ({
              code: b.code,
              message: b.message,
            })),
          },
        },
        confidence,
        gaps,
        warnings,
      });
    }

    // Agent is ready for launch
    return NextResponse.json<LaunchResponse>({
      data: {
        agentId: agent.id,
        previousStatus: agent.status,
        newStatus: target === "PUBLISHED" ? AgentStatus.PUBLISHED : AgentStatus.TESTING,
        readiness: eligibility.readiness,
      },
      confidence,
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("[launch/check] Error:", error);

    return NextResponse.json<LaunchResponse>(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to check launch eligibility",
        },
      },
      { status: 500 }
    );
  }
}

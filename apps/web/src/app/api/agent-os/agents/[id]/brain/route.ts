/**
 * Agent OS - Brain Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/brain
 * Update agent's brain configuration (how the agent thinks)
 */

import { NextRequest, NextResponse } from "next/server";
import { BrainConfigSchema, type ApiResponse } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import {
  validateAgentAccess,
  isErrorResponse,
  validateBody,
  updateAgentModule,
  returnError,
} from "../_helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/agent-os/agents/:id/brain
 * Update brain configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const { id } = await params;

    const context = await validateAgentAccess(id, { requireEditable: true });
    if (isErrorResponse(context)) {
      return returnError<Agent>(context);
    }

    const body = await request.json();
    const validation = validateBody(body, BrainConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const brainData = validation.data;

    const warnings = [];
    if (brainData.reasoning_strategy?.approach === "chain_of_thought") {
      warnings.push({
        code: "COT_LATENCY",
        message: "Chain of thought reasoning may increase response latency",
        severity: "info" as const,
        field_path: "brain_config.reasoning_strategy.approach",
        suggestion: "Consider using 'direct' for faster responses",
      });
    }

    if (brainData.fallback_behavior?.on_uncertainty === "best_guess") {
      warnings.push({
        code: "BEST_GUESS_RISK",
        message: "Best guess fallback may lead to incorrect responses",
        severity: "warning" as const,
        field_path: "brain_config.fallback_behavior.on_uncertainty",
        suggestion: "Consider using 'ask_clarification' for higher accuracy",
      });
    }

    return updateAgentModule(id, "brainConfig", brainData, { warnings });
  } catch (error) {
    console.error("Error updating brain config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update brain config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/brain
 * Get current brain configuration
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Record<string, unknown>>>> {
  try {
    const { id } = await params;

    const context = await validateAgentAccess(id);
    if (isErrorResponse(context)) {
      return returnError<Record<string, unknown>>(context);
    }

    const brainConfig = (context.agent.brainConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      data: brainConfig,
      confidence: {
        brain_config: Object.keys(brainConfig).length > 0 ? 0.7 : 0.3,
      },
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting brain config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get brain config" } },
      { status: 500 }
    );
  }
}

/**
 * Agent OS - Personality Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/personality
 * Update agent's personality configuration (how the agent communicates)
 */

import { NextRequest, NextResponse } from "next/server";
import { PersonalityConfigSchema, type ApiResponse } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import {
  validateAgentAccess,
  isErrorResponse,
  validateBody,
  updateAgentModule,
  getModuleGaps,
  returnError,
} from "../_helpers";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/agent-os/agents/:id/personality
 * Update personality configuration
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
    const validation = validateBody(body, PersonalityConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const personalityData = validation.data;

    // Calculate gaps
    const gaps = getModuleGaps("personality_config", personalityData, ["voice_tone"]);

    // Add warnings based on configuration
    const warnings = [];

    if (personalityData.humor_level && personalityData.humor_level > 3) {
      warnings.push({
        code: "HIGH_HUMOR",
        message: "High humor level may not be appropriate for all business contexts",
        severity: "info" as const,
        field_path: "personality_config.humor_level",
        suggestion: "Consider the target audience when using humor",
      });
    }

    if (personalityData.formality && personalityData.formality === 1) {
      warnings.push({
        code: "VERY_CASUAL",
        message: "Very casual formality may not suit professional contexts",
        severity: "info" as const,
        field_path: "personality_config.formality",
        suggestion: "Consider using at least level 2 for business use",
      });
    }

    if (personalityData.use_emojis && personalityData.voice_tone === "professional") {
      warnings.push({
        code: "EMOJI_MISMATCH",
        message: "Emojis with professional tone may seem inconsistent",
        severity: "info" as const,
        field_path: "personality_config.use_emojis",
        suggestion: "Consider disabling emojis for strictly professional agents",
      });
    }

    return updateAgentModule(id, "personalityConfig", personalityData, {
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("Error updating personality config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update personality config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/personality
 * Get current personality configuration
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

    const personalityConfig = (context.agent.personalityConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      data: personalityConfig,
      confidence: {
        personality_config: personalityConfig.voice_tone ? 0.8 : 0.2,
      },
      gaps: getModuleGaps("personality_config", personalityConfig, ["voice_tone"]),
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting personality config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get personality config" } },
      { status: 500 }
    );
  }
}

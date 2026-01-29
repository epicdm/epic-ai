/**
 * Agent OS - Role Card Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/role-card
 * Update agent's role card configuration (who the agent is)
 */

import { NextRequest, NextResponse } from "next/server";
import { RoleCardSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/role-card
 * Update role card configuration
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<Agent>>> {
  try {
    const { id } = await params;

    // Validate access
    const context = await validateAgentAccess(id, { requireEditable: true });
    if (isErrorResponse(context)) {
      return returnError<Agent>(context);
    }

    // Parse and validate body
    const body = await request.json();
    const validation = validateBody(body, RoleCardSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const roleCardData = validation.data;

    // Calculate gaps for this module
    const gaps = getModuleGaps(
      "role_card",
      roleCardData,
      ["name", "title", "company"]
    );

    // Add specific warnings
    const warnings = [];
    if (roleCardData.boundaries && roleCardData.boundaries.length === 0) {
      warnings.push({
        code: "NO_BOUNDARIES",
        message: "No boundaries defined for the agent",
        severity: "warning" as const,
        field_path: "role_card.boundaries",
        suggestion: "Define what the agent should NOT do",
      });
    }

    if (!roleCardData.escalation_rules || roleCardData.escalation_rules.length === 0) {
      warnings.push({
        code: "NO_ESCALATION_RULES",
        message: "No escalation rules defined",
        severity: "info" as const,
        field_path: "role_card.escalation_rules",
        suggestion: "Define when the agent should hand off to a human",
      });
    }

    return updateAgentModule(id, "roleCard", roleCardData, {
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("Error updating role card:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update role card" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/role-card
 * Get current role card configuration
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

    const roleCard = (context.agent.roleCard as Record<string, unknown>) || {};

    const gaps = getModuleGaps("role_card", roleCard, ["name", "title", "company"]);

    return NextResponse.json({
      data: roleCard,
      confidence: {
        role_card: roleCard.name && roleCard.company ? 0.8 : 0.3,
      },
      gaps,
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting role card:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get role card" } },
      { status: 500 }
    );
  }
}

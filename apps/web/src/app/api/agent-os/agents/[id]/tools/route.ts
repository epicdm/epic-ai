/**
 * Agent OS - Tool Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/tools
 * Update agent's tool configuration (what the agent can do)
 */

import { NextRequest, NextResponse } from "next/server";
import { ToolConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/tools
 * Update tool configuration
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
    const validation = validateBody(body, ToolConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const toolData = validation.data;

    // Calculate gaps and warnings
    const gaps = [];
    const warnings = [];

    const enabledTools = toolData.enabled_tools || [];

    if (enabledTools.length === 0) {
      gaps.push({
        gap_type: "no_tools" as const,
        field_path: "tool_config.enabled_tools",
        severity: "medium" as const,
        impact: "Agent cannot perform any actions",
        recommended_fix: "Enable at least one tool for the agent to use",
        question_to_user: "What actions should this agent be able to perform?",
      });
    }

    // Check for potentially dangerous tool combinations
    const hasWrite = enabledTools.some((t) => t.permissions?.write);
    const hasDelete = enabledTools.some((t) => t.permissions?.delete);

    if (hasDelete && !toolData.tool_policies?.confirm_sensitive_actions) {
      warnings.push({
        code: "DELETE_NO_CONFIRM",
        message: "Delete permissions enabled without confirmation requirement",
        severity: "warning" as const,
        field_path: "tool_config.tool_policies.confirm_sensitive_actions",
        suggestion: "Enable confirmation for sensitive actions",
      });
    }

    if (hasWrite && hasDelete) {
      warnings.push({
        code: "BROAD_PERMISSIONS",
        message: "Agent has both write and delete permissions",
        severity: "info" as const,
        field_path: "tool_config.enabled_tools",
        suggestion: "Review if delete permissions are necessary",
      });
    }

    // Check rate limits
    const unlimitedTools = enabledTools.filter(
      (t) => !t.rate_limits?.calls_per_minute && !t.rate_limits?.calls_per_day
    );

    if (unlimitedTools.length > 0) {
      warnings.push({
        code: "NO_RATE_LIMITS",
        message: `${unlimitedTools.length} tool(s) have no rate limits`,
        severity: "info" as const,
        field_path: "tool_config.enabled_tools",
        suggestion: "Consider adding rate limits to prevent abuse",
      });
    }

    return updateAgentModule(id, "toolConfig", toolData, { gaps, warnings });
  } catch (error) {
    console.error("Error updating tool config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update tool config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/tools
 * Get current tool configuration
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

    const toolConfig = (context.agent.toolConfig as Record<string, unknown>) || {};
    const enabledTools = (toolConfig.enabled_tools as unknown[]) || [];

    return NextResponse.json({
      data: toolConfig,
      confidence: {
        tool_config: enabledTools.length > 0 ? 0.7 : 0.2,
      },
      gaps: enabledTools.length === 0 ? [{
        gap_type: "no_tools" as const,
        field_path: "tool_config.enabled_tools",
        severity: "medium" as const,
        impact: "Agent cannot perform any actions",
        recommended_fix: "Enable at least one tool",
      }] : [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting tool config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get tool config" } },
      { status: 500 }
    );
  }
}

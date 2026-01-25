/**
 * Agent OS - Flow Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/flow
 * Update agent's flow configuration (conversation state machine)
 */

import { NextRequest, NextResponse } from "next/server";
import { FlowConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/flow
 * Update flow configuration
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
    const validation = validateBody(body, FlowConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const flowData = validation.data;

    const warnings = [];

    // Warn if no nodes defined
    if (flowData.nodes && flowData.nodes.length === 0) {
      warnings.push({
        code: "EMPTY_FLOW",
        message: "Flow has no nodes defined",
        severity: "warning" as const,
        field_path: "flow_config.nodes",
        suggestion: "Add conversation nodes to define the flow",
      });
    }

    // Warn if no exit nodes
    if (flowData.exit_node_ids && flowData.exit_node_ids.length === 0) {
      warnings.push({
        code: "NO_EXIT_NODES",
        message: "Flow has no exit nodes defined",
        severity: "warning" as const,
        field_path: "flow_config.exit_node_ids",
        suggestion: "Define at least one exit node for conversation termination",
      });
    }

    // Warn if escalation is completely disabled
    if (
      flowData.guardrails?.escalation &&
      !flowData.guardrails.escalation.on_user_requests_human &&
      !flowData.guardrails.escalation.on_high_stakes_topics
    ) {
      warnings.push({
        code: "ESCALATION_DISABLED",
        message: "All escalation triggers are disabled",
        severity: "warning" as const,
        field_path: "flow_config.guardrails.escalation",
        suggestion: "Consider enabling escalation for human handoff scenarios",
      });
    }

    return updateAgentModule(id, "flowConfig", flowData, { warnings });
  } catch (error) {
    console.error("Error updating flow config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update flow config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/flow
 * Get current flow configuration
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

    const flowConfig = (context.agent.flowConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      data: flowConfig,
      confidence: {
        flow_config: Object.keys(flowConfig).length > 0 ? 0.7 : 0.3,
      },
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting flow config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get flow config" } },
      { status: 500 }
    );
  }
}

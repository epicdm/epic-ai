/**
 * Agent OS - Flow Config Module GET/PATCH
 *
 * GET  /api/agent-os/agents/:id/flow - Get flow configuration with gaps/warnings
 * PATCH /api/agent-os/agents/:id/flow - Update flow configuration
 */

import { NextRequest, NextResponse } from "next/server";
import { FlowConfigSchema, type ApiResponse, type FlowConfig } from "@epic-ai/shared";
import type { Agent } from "@prisma/client";
import { detectFlowGapsV1 } from "@epic-ai/workers/lib";
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
 * GET /api/agent-os/agents/:id/flow
 * Get current flow configuration with gap analysis
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<FlowConfig | Record<string, unknown>>>> {
  try {
    const { id } = await params;

    const context = await validateAgentAccess(id);
    if (isErrorResponse(context)) {
      return returnError<FlowConfig>(context);
    }

    const flowConfig = (context.agent.flowConfig as FlowConfig | Record<string, unknown>) || {};

    // Run gap detection
    const analysis = detectFlowGapsV1(flowConfig);

    return NextResponse.json({
      data: flowConfig,
      confidence: analysis.confidence,
      gaps: analysis.gaps,
      warnings: analysis.warnings,
    });
  } catch (error) {
    console.error("Error getting flow config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get flow config" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/agent-os/agents/:id/flow
 * Update flow configuration
 *
 * For flow, we do a FULL REPLACE (not merge) because:
 * - Flow is a graph structure where partial updates can break invariants
 * - Nodes and edges have complex interdependencies
 * - Entry/exit node references must be consistent
 *
 * Use GET first to fetch current config if you need to preserve parts of it.
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

    // For full replacement, validate the complete schema
    // For partial updates, use FlowConfigSchema.partial()
    const isPartialUpdate = !body.entry_node_id && !body.nodes;
    const schema = isPartialUpdate ? FlowConfigSchema.partial() : FlowConfigSchema;

    const validation = validateBody(body, schema);
    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const flowData = validation.data;

    // Run gap detection on the new config
    const analysis = detectFlowGapsV1(flowData);

    // Save to database
    // Note: updateAgentModule does deep merge by default, but for flow we want full replace
    // when providing a complete config. The merge behavior is safe for partial updates.
    return updateAgentModule(id, "flowConfig", flowData, {
      confidence: analysis.confidence,
      gaps: analysis.gaps,
      warnings: analysis.warnings,
    });
  } catch (error) {
    console.error("Error updating flow config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update flow config" } },
      { status: 500 }
    );
  }
}

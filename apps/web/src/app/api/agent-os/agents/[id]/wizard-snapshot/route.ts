/**
 * Agent OS - Wizard Snapshot API
 *
 * GET /api/agent-os/agents/:id/wizard-snapshot
 *
 * Single source of truth for the wizard UI.
 * Reads agent + company, normalizes all config blobs,
 * calculates confidence/gaps/warnings.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateAgentAccess, isErrorResponse, returnError } from "../_helpers";
import { buildWizardSnapshotFromAgentId } from "@epic-ai/workers/lib";
import type { ApiResponse } from "@epic-ai/shared";
import type { WizardSnapshotResult, WizardSnapshotError } from "@epic-ai/workers/lib";

type WizardSnapshotApiResponse = ApiResponse<WizardSnapshotResult["data"]> & {
  confidence?: WizardSnapshotResult["confidence"];
  gaps?: WizardSnapshotResult["gaps"];
  warnings?: WizardSnapshotResult["warnings"];
  agentId?: string;
  companyId?: string | null;
  deploymentState?: WizardSnapshotResult["deploymentState"];
  templateKey?: string | null;
};

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agent-os/agents/:id/wizard-snapshot
 *
 * Returns a complete snapshot of the agent's configuration for the wizard UI.
 * This is READ-ONLY - the wizard uses this to render current state.
 *
 * Response includes:
 * - data: WizardSnapshot (normalized config for all modules)
 * - confidence: per-module confidence scores (0-1)
 * - gaps: actionable items that need user attention
 * - warnings: non-blocking issues or suggestions
 * - deploymentState: draft | assembling | ready | published | archived
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<WizardSnapshotApiResponse>> {
  try {
    const { id } = await params;

    // Validate auth and agent access (read-only, so no requireEditable)
    const context = await validateAgentAccess(id);
    if (isErrorResponse(context)) {
      return returnError(context);
    }

    // Build the wizard snapshot
    const result = await buildWizardSnapshotFromAgentId(id);

    if (!result.ok) {
      // Agent not found (should be rare since validateAgentAccess already checked)
      return NextResponse.json(
        {
          data: null,
          error: {
            code: result.error.code,
            message: result.error.message,
          },
        },
        { status: 404 }
      );
    }

    // Return successful snapshot
    return NextResponse.json({
      data: result.data,
      confidence: result.confidence,
      gaps: result.gaps,
      warnings: result.warnings,
      agentId: result.agentId,
      companyId: result.companyId,
      deploymentState: result.deploymentState,
      templateKey: result.templateKey,
    });
  } catch (error) {
    console.error("Error building wizard snapshot:", error);
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to build wizard snapshot",
        },
      },
      { status: 500 }
    );
  }
}

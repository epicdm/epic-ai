/**
 * Agent OS - Learning Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/learning
 * Update agent's learning configuration (how the agent improves)
 */

import { NextRequest, NextResponse } from "next/server";
import { LearningConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/learning
 * Update learning configuration
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
    const validation = validateBody(body, LearningConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const learningData = validation.data;

    const gaps = [];
    const warnings = [];

    // Check if learning is enabled without approval
    if (learningData.learning_enabled && !learningData.approval_required) {
      warnings.push({
        code: "NO_APPROVAL",
        message: "Learning enabled without approval requirement",
        severity: "warning" as const,
        field_path: "learning_config.approval_required",
        suggestion: "Enable approval for changes to maintain control",
      });
    }

    // Check if learning is enabled but no approvers
    if (learningData.approval_required && (!learningData.approvers || learningData.approvers.length === 0)) {
      gaps.push({
        gap_type: "missing_config" as const,
        field_path: "learning_config.approvers",
        severity: "high" as const,
        impact: "No one can approve learning updates",
        recommended_fix: "Add approvers to the list",
        question_to_user: "Who should approve learning changes?",
      });
    }

    // Check safe boundaries
    if (learningData.safe_boundaries) {
      if (learningData.safe_boundaries.max_confidence_delta && learningData.safe_boundaries.max_confidence_delta > 0.2) {
        warnings.push({
          code: "HIGH_DELTA",
          message: "High confidence delta allows large behavior changes",
          severity: "warning" as const,
          field_path: "learning_config.safe_boundaries.max_confidence_delta",
          suggestion: "Consider using 0.1 or lower for more stable learning",
        });
      }

      if (!learningData.safe_boundaries.auto_rollback) {
        warnings.push({
          code: "NO_ROLLBACK",
          message: "Auto-rollback disabled",
          severity: "info" as const,
          field_path: "learning_config.safe_boundaries.auto_rollback",
          suggestion: "Enable auto-rollback to revert bad learning",
        });
      }
    }

    // Check feedback loops
    if (learningData.feedback_loops?.outcome_learning && learningData.feedback_loops.min_samples < 5) {
      warnings.push({
        code: "LOW_SAMPLES",
        message: "Learning from very few samples may be unreliable",
        severity: "warning" as const,
        field_path: "learning_config.feedback_loops.min_samples",
        suggestion: "Consider requiring at least 10 samples",
      });
    }

    return updateAgentModule(id, "learningConfig", learningData, { gaps, warnings });
  } catch (error) {
    console.error("Error updating learning config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update learning config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/learning
 * Get current learning configuration
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

    const learningConfig = (context.agent.learningConfig as Record<string, unknown>) || {};

    return NextResponse.json({
      data: learningConfig,
      confidence: {
        learning_config: Object.keys(learningConfig).length > 0 ? 0.5 : 0.3,
      },
      gaps: [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting learning config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get learning config" } },
      { status: 500 }
    );
  }
}

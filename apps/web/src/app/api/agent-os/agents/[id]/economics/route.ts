/**
 * Agent OS - Economics Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/economics
 * Update agent's economics configuration (cost & usage)
 */

import { NextRequest, NextResponse } from "next/server";
import { EconomicsConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/economics
 * Update economics configuration
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
    const validation = validateBody(body, EconomicsConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const economicsData = validation.data;

    const warnings = [];

    // Check budget limits
    if (!economicsData.budget_limits?.daily_cents && !economicsData.budget_limits?.monthly_cents) {
      warnings.push({
        code: "NO_BUDGET",
        message: "No budget limits set - costs may accumulate",
        severity: "warning" as const,
        field_path: "economics_config.budget_limits",
        suggestion: "Set daily or monthly budget limits",
      });
    }

    // Check budget action
    if (economicsData.budget_limits?.on_exceed === "notify") {
      warnings.push({
        code: "SOFT_BUDGET",
        message: "Budget exceeded action is 'notify' only - won't stop usage",
        severity: "info" as const,
        field_path: "economics_config.budget_limits.on_exceed",
        suggestion: "Consider 'block' for hard budget enforcement",
      });
    }

    // Check usage caps
    if (
      !economicsData.usage_caps?.conversations_per_day &&
      !economicsData.usage_caps?.messages_per_conversation
    ) {
      warnings.push({
        code: "NO_USAGE_CAPS",
        message: "No usage caps configured",
        severity: "info" as const,
        field_path: "economics_config.usage_caps",
        suggestion: "Consider setting conversation or message limits",
      });
    }

    // Check cost tracking
    if (!economicsData.cost_tracking?.track_tokens) {
      warnings.push({
        code: "NO_TOKEN_TRACKING",
        message: "Token cost tracking is disabled",
        severity: "info" as const,
        field_path: "economics_config.cost_tracking.track_tokens",
        suggestion: "Enable token tracking to monitor costs",
      });
    }

    // Check billing rules
    if (economicsData.billing_rules?.payer === "end_user") {
      warnings.push({
        code: "END_USER_BILLING",
        message: "End users will be charged for agent usage",
        severity: "info" as const,
        field_path: "economics_config.billing_rules.payer",
        suggestion: "Ensure users are aware of potential charges",
      });
    }

    if (economicsData.billing_rules?.rate_multiplier && economicsData.billing_rules.rate_multiplier > 2) {
      warnings.push({
        code: "HIGH_RATE",
        message: "Rate multiplier is above 2x - significantly increased costs",
        severity: "warning" as const,
        field_path: "economics_config.billing_rules.rate_multiplier",
        suggestion: "Review if high rate multiplier is intended",
      });
    }

    return updateAgentModule(id, "economicsConfig", economicsData, { warnings });
  } catch (error) {
    console.error("Error updating economics config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update economics config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/economics
 * Get current economics configuration
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

    const economicsConfig = (context.agent.economicsConfig as Record<string, unknown>) || {};
    const budgetLimits = economicsConfig.budget_limits as Record<string, unknown> | undefined;
    const hasBudget = budgetLimits?.daily_cents || budgetLimits?.monthly_cents;

    return NextResponse.json({
      data: economicsConfig,
      confidence: {
        economics_config: hasBudget ? 0.7 : 0.3,
      },
      gaps: [],
      warnings: hasBudget ? [] : [{
        code: "NO_BUDGET",
        message: "No budget limits configured",
        severity: "info" as const,
        suggestion: "Set budget limits to control costs",
      }],
    });
  } catch (error) {
    console.error("Error getting economics config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get economics config" } },
      { status: 500 }
    );
  }
}

/**
 * Agent OS - Governance Config Module PATCH
 *
 * PATCH /api/agent-os/agents/:id/governance
 * Update agent's governance configuration (rules & compliance)
 */

import { NextRequest, NextResponse } from "next/server";
import { GovernanceConfigSchema, type ApiResponse } from "@epic-ai/shared";
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
 * PATCH /api/agent-os/agents/:id/governance
 * Update governance configuration
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
    const validation = validateBody(body, GovernanceConfigSchema.partial());

    if (!validation.success) {
      return returnError<Agent>(validation.error);
    }

    const governanceData = validation.data;

    const gaps = [];
    const warnings = [];

    // Check compliance rules
    const complianceRules = governanceData.compliance_rules || [];
    if (complianceRules.length === 0) {
      gaps.push({
        gap_type: "no_compliance" as const,
        field_path: "governance_config.compliance_rules",
        severity: "medium" as const,
        impact: "No compliance rules defined",
        recommended_fix: "Define compliance rules for your industry",
        suggestions: ["GDPR rules", "HIPAA rules", "Financial compliance"],
      });
    }

    // Check PII handling
    if (!governanceData.pii_handling?.auto_detect) {
      warnings.push({
        code: "NO_PII_DETECTION",
        message: "PII auto-detection is disabled",
        severity: "warning" as const,
        field_path: "governance_config.pii_handling.auto_detect",
        suggestion: "Enable PII detection for privacy compliance",
      });
    }

    if (governanceData.pii_handling?.action === "allow") {
      warnings.push({
        code: "PII_ALLOWED",
        message: "PII handling set to allow - data may be exposed",
        severity: "warning" as const,
        field_path: "governance_config.pii_handling.action",
        suggestion: "Consider using 'mask' or 'remove' for better privacy",
      });
    }

    // Check content moderation
    if (governanceData.content_moderation?.enabled === false) {
      warnings.push({
        code: "NO_MODERATION",
        message: "Content moderation is disabled",
        severity: "warning" as const,
        field_path: "governance_config.content_moderation.enabled",
        suggestion: "Enable content moderation for safety",
      });
    }

    // Check audit settings
    if (!governanceData.audit_settings?.log_conversations) {
      warnings.push({
        code: "NO_AUDIT",
        message: "Conversation logging is disabled",
        severity: "info" as const,
        field_path: "governance_config.audit_settings.log_conversations",
        suggestion: "Enable logging for compliance and debugging",
      });
    }

    // Check escalation paths
    const escalationPaths = governanceData.escalation_paths || [];
    if (escalationPaths.length === 0) {
      gaps.push({
        gap_type: "no_escalation" as const,
        field_path: "governance_config.escalation_paths",
        severity: "medium" as const,
        impact: "No escalation paths for critical issues",
        recommended_fix: "Define escalation paths for different severity levels",
      });
    }

    // Check risk thresholds
    if (governanceData.risk_thresholds) {
      if (governanceData.risk_thresholds.low_confidence > 0.8) {
        warnings.push({
          code: "HIGH_CONFIDENCE_THRESHOLD",
          message: "Very high confidence threshold may cause many escalations",
          severity: "info" as const,
          field_path: "governance_config.risk_thresholds.low_confidence",
          suggestion: "Consider 0.5-0.7 for balanced operation",
        });
      }
    }

    return updateAgentModule(id, "governanceConfig", governanceData, { gaps, warnings });
  } catch (error) {
    console.error("Error updating governance config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to update governance config" } },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent-os/agents/:id/governance
 * Get current governance configuration
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

    const governanceConfig = (context.agent.governanceConfig as Record<string, unknown>) || {};
    const complianceRules = (governanceConfig.compliance_rules as unknown[]) || [];

    return NextResponse.json({
      data: governanceConfig,
      confidence: {
        governance_config: complianceRules.length > 0 ? 0.7 : 0.2,
      },
      gaps: complianceRules.length === 0 ? [{
        gap_type: "no_compliance" as const,
        field_path: "governance_config.compliance_rules",
        severity: "medium" as const,
        impact: "No compliance rules defined",
        recommended_fix: "Define compliance rules",
      }] : [],
      warnings: [],
    });
  } catch (error) {
    console.error("Error getting governance config:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to get governance config" } },
      { status: 500 }
    );
  }
}

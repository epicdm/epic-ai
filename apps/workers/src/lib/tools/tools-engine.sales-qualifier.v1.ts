/**
 * Tools Engine v1 - Sales Qualifier
 *
 * Generates a ToolConfig payload for sales_qualifier template.
 * Produces: { tool_config, confidence, gaps, warnings, evidence }
 *
 * Features:
 * - Canonical tool set with stable IDs
 * - Integration status checks (stub for v1)
 * - Per-tool evidence + confidence
 * - Gaps for missing/disabled required tools
 * - Gaps for missing integration auth
 */

import { ToolConfigSchemaStrict } from "@epic-ai/shared";
import type { GapItem, WarningItem, EvidenceItem } from "@epic-ai/shared";
import type { z } from "zod";
import {
  SALES_QUALIFIER_TOOLS_V1,
  toolKeyForStatus,
  type ToolId,
  type ToolRequirement,
} from "./registry.v1";

// Use the inferred type from the strict schema
type ToolConfig = z.infer<typeof ToolConfigSchemaStrict>;

// ============================================================================
// Helpers
// ============================================================================

function nowIso(): string {
  return new Date().toISOString();
}

function gap(item: {
  gap_type?: GapItem["gap_type"];
  field_path: string;
  severity?: GapItem["severity"];
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}): GapItem {
  return {
    gap_type: item.gap_type ?? "missing_required",
    field_path: item.field_path,
    severity: item.severity ?? "medium",
    impact: item.impact,
    recommended_fix: item.recommended_fix,
    question_to_user: item.question_to_user,
    suggestions: item.suggestions,
  };
}

function warn(item: {
  code: string;
  message: string;
  severity?: WarningItem["severity"];
  field_path?: string;
  suggestion?: string;
}): WarningItem {
  return {
    code: item.code,
    message: item.message,
    severity: item.severity ?? "info",
    field_path: item.field_path,
    suggestion: item.suggestion,
  };
}

// ============================================================================
// Integration Status Check (stub for v1)
// ============================================================================

export type IntegrationStatus = "configured" | "missing_auth" | "unknown";

/**
 * Hook point: Check whether tool integration credentials are connected.
 * In v1, this is a stub that returns "unknown".
 * Replace with real integration table query in production.
 */
export async function checkIntegrationStatus(
  _agentId: string,
  _toolId: ToolId
): Promise<IntegrationStatus> {
  // v1 stub — implement by querying your integration table (Google OAuth, Twilio, CRM, etc.)
  return "unknown";
}

// ============================================================================
// Tool Config Builder
// ============================================================================

interface EnabledToolInput {
  id: string;
  name?: string;
  enabled?: boolean;
  permissions?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    requires_confirmation?: boolean;
  };
  rate_limits?: {
    calls_per_minute?: number;
    calls_per_conversation?: number;
    calls_per_day?: number;
  };
  config?: Record<string, unknown>;
}

interface ExistingToolConfig {
  enabled_tools?: EnabledToolInput[];
  tool_policies?: {
    confirm_sensitive_actions?: boolean;
    max_tools_per_turn?: number;
    log_all_usage?: boolean;
  };
  tool_preferences?: {
    preferred_tools?: string[];
    strategy?: "minimal" | "proactive" | "balanced";
  };
}

/**
 * Build a canonical sales_qualifier tool config.
 * Merges with existing config if provided (preserving user customizations).
 */
export function buildSalesQualifierToolConfigV1(input?: ExistingToolConfig): ToolConfig {
  const existingEnabled = Array.isArray(input?.enabled_tools) ? input.enabled_tools : [];
  const byId = new Map<string, EnabledToolInput>();
  for (const t of existingEnabled) byId.set(t.id, t);

  const enabled_tools = SALES_QUALIFIER_TOOLS_V1.map((req: ToolRequirement) => {
    const prev = byId.get(req.id);
    return {
      id: req.id,
      name: prev?.name ?? req.name,
      enabled: prev?.enabled ?? req.defaultEnabled,
      permissions: {
        read: prev?.permissions?.read ?? req.permissions.read,
        write: prev?.permissions?.write ?? req.permissions.write,
        delete: prev?.permissions?.delete ?? req.permissions.delete,
        requires_confirmation: prev?.permissions?.requires_confirmation ?? req.permissions.requires_confirmation,
      },
      rate_limits: prev?.rate_limits,
      config: { ...(req.defaultConfig ?? {}), ...(prev?.config ?? {}) },
    };
  });

  const out = {
    enabled_tools,
    tool_policies: {
      confirm_sensitive_actions: input?.tool_policies?.confirm_sensitive_actions ?? true,
      max_tools_per_turn: input?.tool_policies?.max_tools_per_turn ?? 3,
      log_all_usage: input?.tool_policies?.log_all_usage ?? true,
    },
    tool_preferences: {
      preferred_tools: input?.tool_preferences?.preferred_tools ?? [
        "kb.search",
        "crm.upsert_lead",
        "calendar.book",
        "sms.send",
      ],
      strategy: input?.tool_preferences?.strategy ?? "proactive",
    },
  };

  return ToolConfigSchemaStrict.parse(out);
}

// ============================================================================
// Tools Engine Result
// ============================================================================

export interface ToolsEngineResult {
  tool_config: ToolConfig | null;
  confidence: Record<string, number>;
  gaps: GapItem[];
  warnings: WarningItem[];
  evidence: EvidenceItem[];
}

export interface ToolsEngineParams {
  agentId: string;
  templateKey: string | null;
  existingToolConfig?: unknown | null;
}

// ============================================================================
// Main Engine
// ============================================================================

/**
 * Tools Engine v1 for sales_qualifier template.
 *
 * Generates a canonical tool configuration with gap/warning analysis.
 */
export async function toolsEngineSalesQualifierV1(
  params: ToolsEngineParams
): Promise<ToolsEngineResult> {
  const { agentId, templateKey, existingToolConfig } = params;

  const gaps: GapItem[] = [];
  const warnings: WarningItem[] = [];
  const confidence: Record<string, number> = {};
  const evidence: EvidenceItem[] = [];

  // Only supports sales_qualifier in v1
  if (templateKey !== "sales_qualifier") {
    warnings.push(
      warn({
        code: "TOOLS_ENGINE_TEMPLATE_UNSUPPORTED_V1",
        severity: "info",
        message: `Tools Engine v1 only supports template=sales_qualifier (got ${templateKey ?? "null"}).`,
      })
    );

    return {
      tool_config: (existingToolConfig as ToolConfig) ?? null,
      confidence: { tools: 0.2 },
      gaps,
      warnings,
      evidence,
    };
  }

  // Build canonical config (merge with existing if provided)
  let built: ToolConfig;
  try {
    built = buildSalesQualifierToolConfigV1((existingToolConfig as ExistingToolConfig) ?? {});
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown validation error";
    gaps.push(
      gap({
        gap_type: "invalid",
        field_path: "toolConfig",
        severity: "high",
        impact: "Existing tools configuration is invalid; cannot safely merge.",
        recommended_fix: `Reset tools config or fix it to match ToolConfig schema: ${message.slice(0, 200)}`,
      })
    );
    // If invalid existing, build fresh from scratch
    built = buildSalesQualifierToolConfigV1({});
    warnings.push(
      warn({
        code: "TOOLS_INVALID_EXISTING_RESET",
        severity: "warning",
        message: "Existing tool_config was invalid; generated a fresh default configuration.",
      })
    );
  }

  // Evidence: defaults
  evidence.push({
    source_type: "default_value",
    field_path: "toolConfig",
    confidence: 0.85,
    reasoning: "Using sales_qualifier v1 canonical tool set defaults.",
    timestamp: nowIso(),
  });

  // Validate required tools present/enabled
  const enabledById = new Map<string, (typeof built.enabled_tools)[0]>(
    built.enabled_tools.map((t) => [t.id, t])
  );

  for (const req of SALES_QUALIFIER_TOOLS_V1) {
    const t = enabledById.get(req.id);
    const key = toolKeyForStatus(req.id);

    if (!t) {
      gaps.push(
        gap({
          gap_type: "missing_required",
          field_path: "toolConfig.enabled_tools",
          severity: req.required ? "high" : "medium",
          impact: `Tool ${req.id} missing from tool_config.`,
          recommended_fix: `Add tool ${req.id} to enabled_tools.`,
        })
      );
      confidence[key] = 0.0;
      continue;
    }

    if (req.required && t.enabled !== true) {
      gaps.push(
        gap({
          gap_type: "missing_required",
          field_path: `toolConfig.enabled_tools.${req.id}.enabled`,
          severity: "high",
          impact: `Required tool ${req.id} is disabled.`,
          recommended_fix: `Enable ${req.id} for sales_qualifier to function correctly.`,
        })
      );
      confidence[key] = 0.35;
    } else {
      confidence[key] = 0.9;
    }

    // Integration status checks
    const status = await checkIntegrationStatus(agentId, req.id);
    if (status === "missing_auth") {
      gaps.push(
        gap({
          gap_type: "missing_config",
          field_path: `toolConfig.enabled_tools.${req.id}.config`,
          severity: req.required ? "high" : "medium",
          impact: `Tool ${req.id} is enabled but missing integration authentication.`,
          recommended_fix: `Connect the integration for ${req.id} (OAuth/API key) in Settings.`,
          question_to_user: `Do you want to connect ${req.name} now?`,
        })
      );
      confidence[key] = Math.min(confidence[key] ?? 0.9, 0.5);
    } else if (status === "unknown") {
      warnings.push(
        warn({
          code: "TOOLS_INTEGRATION_STATUS_UNKNOWN",
          severity: "info",
          message: `Integration status for ${req.id} is unknown (v1 stub).`,
          field_path: `toolConfig.enabled_tools.${req.id}`,
          suggestion:
            "Implement checkIntegrationStatus() using your integrations store to mark missing_auth as gaps.",
        })
      );
    }

    // Add evidence for each tool
    evidence.push({
      source_type: "default_value",
      field_path: `toolConfig.enabled_tools.${req.id}`,
      confidence: confidence[key] ?? 0.9,
      reasoning: req.reasons.join(" "),
      timestamp: nowIso(),
    });
  }

  // Overall confidence
  const requiredIds = SALES_QUALIFIER_TOOLS_V1.filter((t) => t.required).map((t) =>
    toolKeyForStatus(t.id)
  );
  const avgReq =
    requiredIds.reduce((acc, k) => acc + (confidence[k] ?? 0.7), 0) / Math.max(1, requiredIds.length);
  const penalty = Math.min(0.4, gaps.length * 0.06 + warnings.length * 0.01);
  const overallTools = Math.max(0.1, Math.min(1, avgReq - penalty));
  confidence["tools"] = overallTools;

  return {
    tool_config: built,
    confidence,
    gaps,
    warnings,
    evidence,
  };
}

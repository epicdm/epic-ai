/**
 * Answer-to-PATCH v1
 *
 * Routes question answers from NextStepPanel to the correct module PATCH endpoints.
 *
 * Flow:
 * 1. Extract answered fields from form values
 * 2. Group by module based on field_path prefix
 * 3. Call the correct PATCH endpoint for each module
 * 4. Return results for UI feedback
 *
 * @module agent-os/answer-to-patch
 */

"use client";

import type { UserQuestion } from "@epic-ai/shared";

// ============================================================================
// Types
// ============================================================================

/**
 * Known Agent OS modules for patch routing.
 */
export type AgentOSModule =
  | "company"
  | "role_card"
  | "brain"
  | "personality"
  | "tools"
  | "knowledge"
  | "flow"
  | "memory"
  | "learning"
  | "governance"
  | "economics";

/**
 * Result of applying patches to modules
 */
export interface PatchResult {
  ok: boolean;
  status: number;
  error?: string;
  response?: unknown;
}

export interface ApplyPatchesResult {
  ok: boolean;
  results: Record<string, PatchResult>;
}

export interface AnswerToPatchResult {
  answered: AnsweredField[];
  modulePatches: Partial<Record<AgentOSModule, unknown>>;
  applied: ApplyPatchesResult;
}

interface AnsweredField {
  question_id: string;
  field_path: string;
  value: unknown;
}

// ============================================================================
// Module Endpoint Mapping
// ============================================================================

/**
 * Map module -> PATCH endpoint.
 * Company is excluded as it patches the company profile, not agent modules.
 */
export const MODULE_ENDPOINTS: Record<
  Exclude<AgentOSModule, "company">,
  (agentId: string) => string
> = {
  role_card: (id) => `/api/agent-os/agents/${id}/role-card`,
  brain: (id) => `/api/agent-os/agents/${id}/brain`,
  personality: (id) => `/api/agent-os/agents/${id}/personality`,
  tools: (id) => `/api/agent-os/agents/${id}/tools`,
  knowledge: (id) => `/api/agent-os/agents/${id}/knowledge`,
  flow: (id) => `/api/agent-os/agents/${id}/flow`,
  memory: (id) => `/api/agent-os/agents/${id}/memory`,
  learning: (id) => `/api/agent-os/agents/${id}/learning`,
  governance: (id) => `/api/agent-os/agents/${id}/governance`,
  economics: (id) => `/api/agent-os/agents/${id}/economics`,
};

// ============================================================================
// Field Path to Module Inference
// ============================================================================

/**
 * Infer module from field_path prefix.
 *
 * Later versions can emit module_name directly in each question,
 * but for v1 we infer from prefixes/keywords.
 */
export function inferModuleFromFieldPath(fieldPath: string): AgentOSModule | null {
  const p = fieldPath.trim().toLowerCase();

  // Company is special - patches company profile, not agent modules
  if (
    p.startsWith("company_profile") ||
    p.startsWith("company.") ||
    p.includes("company_profile")
  ) {
    return "company";
  }

  // Agent modules
  if (p.startsWith("role_card") || p.includes("role_card")) return "role_card";
  if (p.startsWith("brain_config") || p.includes("brain_config") || p.includes("brain"))
    return "brain";
  if (
    p.startsWith("personality_config") ||
    p.includes("personality_config") ||
    p.includes("personality")
  )
    return "personality";
  if (p.startsWith("tool_config") || p.includes("tool_config") || p.includes("tools"))
    return "tools";
  if (
    p.startsWith("knowledge_config") ||
    p.includes("knowledge_config") ||
    p.includes("knowledge")
  )
    return "knowledge";
  if (
    p.startsWith("flow_config") ||
    p.includes("flow_config") ||
    p.includes("flows") ||
    p.includes("flow")
  )
    return "flow";
  if (p.startsWith("memory_config") || p.includes("memory_config") || p.includes("memory"))
    return "memory";
  if (
    p.startsWith("learning_config") ||
    p.includes("learning_config") ||
    p.includes("learning")
  )
    return "learning";
  if (
    p.startsWith("governance_config") ||
    p.includes("governance_config") ||
    p.includes("governance")
  )
    return "governance";
  if (
    p.startsWith("economics_config") ||
    p.includes("economics_config") ||
    p.includes("economics")
  )
    return "economics";

  return null;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Set value at nested path on object.
 * e.g. setByPath({}, "retrieval_settings.top_k", 5)
 * -> { retrieval_settings: { top_k: 5 } }
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return obj;

  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (cur[key] === undefined || cur[key] === null || typeof cur[key] !== "object") {
      cur[key] = {};
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]!] = value;
  return obj;
}

/**
 * Strip known module root prefixes from field path.
 * e.g. "knowledge_config.retrieval_settings.top_k" -> "retrieval_settings.top_k"
 */
function normalizeFieldPath(fieldPath: string): string {
  return fieldPath
    .replace(/^role_card\./, "")
    .replace(/^brain_config\./, "")
    .replace(/^personality_config\./, "")
    .replace(/^tool_config\./, "")
    .replace(/^knowledge_config\./, "")
    .replace(/^flow_config\./, "")
    .replace(/^memory_config\./, "")
    .replace(/^learning_config\./, "")
    .replace(/^governance_config\./, "")
    .replace(/^economics_config\./, "")
    .replace(/^company_profile\./, "")
    .replace(/^company\./, "");
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Extract non-empty answered fields from form values.
 */
export function extractAnsweredFields(params: {
  questions: UserQuestion[];
  values: Record<string, unknown>;
}): AnsweredField[] {
  const { questions, values } = params;
  const answered: AnsweredField[] = [];

  for (const q of questions) {
    const v = values[q.question_id];

    const isEmpty =
      v === undefined ||
      v === null ||
      (typeof v === "string" && v.trim() === "") ||
      (Array.isArray(v) && v.length === 0);

    if (isEmpty) continue;

    answered.push({
      question_id: q.question_id,
      field_path: q.field_path,
      value: v,
    });
  }

  return answered;
}

/**
 * Build module patch payloads from answered fields.
 *
 * Groups fields by module and builds nested objects from field paths.
 */
export function buildModulePatches(
  answered: AnsweredField[]
): Partial<Record<AgentOSModule, unknown>> {
  const patches: Partial<Record<AgentOSModule, Record<string, unknown>>> = {};

  for (const item of answered) {
    const mod = inferModuleFromFieldPath(item.field_path);
    if (!mod) continue;

    patches[mod] ??= {};
    const normalizedPath = normalizeFieldPath(item.field_path);
    setByPath(patches[mod]!, normalizedPath, item.value);
  }

  return patches;
}

/**
 * Execute PATCH requests for each module.
 *
 * NOTE: Company patching is skipped in v1 because company profile
 * is a separate entity. Company answers are passed to enrichment loop instead.
 */
export async function applyModulePatches(params: {
  agentId: string;
  modulePatches: Partial<Record<AgentOSModule, unknown>>;
}): Promise<ApplyPatchesResult> {
  const { agentId, modulePatches } = params;

  const results: Record<string, PatchResult> = {};
  let ok = true;

  // Skip company in v1 - handled by enrichment loop
  const modules = Object.keys(modulePatches).filter(
    (m) => m !== "company"
  ) as Exclude<AgentOSModule, "company">[];

  for (const mod of modules) {
    const payload = modulePatches[mod];
    if (!payload || Object.keys(payload as object).length === 0) continue;

    const endpointFn = MODULE_ENDPOINTS[mod];
    if (!endpointFn) continue;

    const endpoint = endpointFn(agentId);

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        ok = false;
        const text = await res.text().catch(() => "");
        results[mod] = {
          ok: false,
          status: res.status,
          error: text || `PATCH failed: ${endpoint}`,
        };
        continue;
      }

      const json = await res.json().catch(() => ({}));
      results[mod] = { ok: true, status: res.status, response: json };
    } catch (err) {
      ok = false;
      results[mod] = {
        ok: false,
        status: 0,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  return { ok, results };
}

/**
 * One-call helper for NextStepPanel:
 * 1. Extract non-empty answers
 * 2. Build module patches
 * 3. PATCH modules
 *
 * Returns company answers separately for enrichment loop handling.
 */
export async function answerToPatchV1(params: {
  agentId: string;
  questions: UserQuestion[];
  values: Record<string, unknown>;
}): Promise<AnswerToPatchResult> {
  const answered = extractAnsweredFields({
    questions: params.questions,
    values: params.values,
  });
  const modulePatches = buildModulePatches(answered);
  const applied = await applyModulePatches({
    agentId: params.agentId,
    modulePatches,
  });

  return {
    answered,
    modulePatches,
    applied,
  };
}

/**
 * Extract company-specific answers for enrichment loop.
 * These are passed as hints to auto-fill-loop instead of PATCH.
 */
export function extractCompanyHints(params: {
  questions: UserQuestion[];
  values: Record<string, unknown>;
}): Record<string, unknown> {
  const answered = extractAnsweredFields(params);
  const hints: Record<string, unknown> = {};

  for (const item of answered) {
    const mod = inferModuleFromFieldPath(item.field_path);
    if (mod !== "company") continue;

    // Map known company fields to enrichment loop params
    const normalized = normalizeFieldPath(item.field_path);

    if (normalized === "website" || normalized === "websiteUrl") {
      hints.websiteUrl = item.value;
    } else if (normalized === "name" || normalized === "company_name") {
      hints.companyName = item.value;
    } else if (normalized === "industry") {
      hints.industry = item.value;
    } else {
      // Pass through as-is
      hints[normalized] = item.value;
    }
  }

  return hints;
}

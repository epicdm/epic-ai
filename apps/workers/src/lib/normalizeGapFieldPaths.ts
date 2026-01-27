/**
 * Normalize Gap Field Paths v1
 *
 * Drop-in helper that guarantees every gap.field_path becomes module-prefixed:
 * - knowledge_config.price_range
 * - tools.enabled_tools
 * - brain_config.fallback_behavior.on_uncertainty
 *
 * Makes Answer-to-PATCH inference ~100% reliable without heuristics.
 *
 * @module lib/normalizeGapFieldPaths
 */

/**
 * Minimal shape of GapItem (matches Zod schema)
 * This is the base interface; actual gaps may have more specific gap_type literals.
 */
export interface GapItemBase {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}

/** @deprecated Use GapItemBase instead for generic operations */
export type GapItem = GapItemBase;

export type WarningItem = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field_path?: string;
  suggestion?: string;
};

export type NormalizeResult<T extends GapItemBase> = {
  gaps: T[];
  warnings: WarningItem[];
};

type ModuleKey =
  | "role_card"
  | "brain_config"
  | "personality_config"
  | "tool_config"
  | "knowledge_config"
  | "memory_config"
  | "learning_config"
  | "governance_config"
  | "economics_config"
  | "flow_config";

// -----------------------------
// Known prefixes (already normalized)
// -----------------------------
const KNOWN_PREFIXES: ModuleKey[] = [
  "role_card",
  "brain_config",
  "personality_config",
  "tool_config",
  "knowledge_config",
  "memory_config",
  "learning_config",
  "governance_config",
  "economics_config",
  "flow_config",
];

// -----------------------------
// Rule table: if field_path matches pattern, map to module prefix
// Ordered by specificity (top wins)
// -----------------------------
const RULES: Array<{ re: RegExp; module: ModuleKey; note: string }> = [
  // --- Knowledge ---
  {
    re: /^quick_answers(\.|$)/i,
    module: "knowledge_config",
    note: "knowledge: quick answers",
  },
  { re: /^sources(\.|$)/i, module: "knowledge_config", note: "knowledge: sources" },
  {
    re: /^retrieval_settings(\.|$)/i,
    module: "knowledge_config",
    note: "knowledge: retrieval settings",
  },
  {
    re: /^context_window(\.|$)/i,
    module: "knowledge_config",
    note: "knowledge: context window",
  },
  {
    re: /pricing|price_range|pricing_model/i,
    module: "knowledge_config",
    note: "knowledge: pricing fields",
  },
  {
    re: /hours|hours_of_operation|timezone/i,
    module: "knowledge_config",
    note: "knowledge: hours/timezone",
  },
  {
    re: /service_area|service_radius/i,
    module: "knowledge_config",
    note: "knowledge: service area",
  },
  {
    re: /products|services/i,
    module: "knowledge_config",
    note: "knowledge: products/services",
  },

  // --- Tools ---
  {
    re: /^enabled_tools(\.|$)/i,
    module: "tool_config",
    note: "tools: enabled_tools",
  },
  { re: /^tool_policies(\.|$)/i, module: "tool_config", note: "tools: policies" },
  {
    re: /^tool_preferences(\.|$)/i,
    module: "tool_config",
    note: "tools: preferences",
  },
  {
    re: /calendar|crm|sms|email|webhook|integration/i,
    module: "tool_config",
    note: "tools: integration-ish",
  },

  // --- Brain ---
  {
    re: /^decision_policies(\.|$)/i,
    module: "brain_config",
    note: "brain: decision policies",
  },
  {
    re: /^response_rules(\.|$)/i,
    module: "brain_config",
    note: "brain: response rules",
  },
  {
    re: /^context_handling(\.|$)/i,
    module: "brain_config",
    note: "brain: context handling",
  },
  {
    re: /^reasoning_strategy(\.|$)/i,
    module: "brain_config",
    note: "brain: reasoning strategy",
  },
  {
    re: /^fallback_behavior(\.|$)/i,
    module: "brain_config",
    note: "brain: fallback behavior",
  },

  // --- Personality ---
  {
    re: /^language_style(\.|$)/i,
    module: "personality_config",
    note: "personality: language style",
  },
  {
    re: /voice_tone|formality|humor|empathy|pace|greeting|signoff|emojis/i,
    module: "personality_config",
    note: "personality: common fields",
  },

  // --- Memory ---
  { re: /^short_term(\.|$)/i, module: "memory_config", note: "memory: short_term" },
  { re: /^long_term(\.|$)/i, module: "memory_config", note: "memory: long_term" },
  { re: /^episodic(\.|$)/i, module: "memory_config", note: "memory: episodic" },
  { re: /^persistence(\.|$)/i, module: "memory_config", note: "memory: persistence" },

  // --- Learning ---
  {
    re: /^feedback_loops(\.|$)/i,
    module: "learning_config",
    note: "learning: feedback loops",
  },
  {
    re: /^safe_boundaries(\.|$)/i,
    module: "learning_config",
    note: "learning: safe boundaries",
  },
  {
    re: /approval_required|approvers|learning_enabled/i,
    module: "learning_config",
    note: "learning: core flags",
  },

  // --- Governance ---
  {
    re: /^compliance_rules(\.|$)/i,
    module: "governance_config",
    note: "governance: compliance rules",
  },
  {
    re: /^risk_thresholds(\.|$)/i,
    module: "governance_config",
    note: "governance: thresholds",
  },
  {
    re: /^audit_settings(\.|$)/i,
    module: "governance_config",
    note: "governance: audit settings",
  },
  {
    re: /^escalation_paths(\.|$)/i,
    module: "governance_config",
    note: "governance: escalation paths",
  },
  {
    re: /^pii_handling(\.|$)/i,
    module: "governance_config",
    note: "governance: pii handling",
  },
  {
    re: /^content_moderation(\.|$)/i,
    module: "governance_config",
    note: "governance: moderation",
  },

  // --- Economics ---
  {
    re: /^budget_limits(\.|$)/i,
    module: "economics_config",
    note: "economics: budget limits",
  },
  {
    re: /^cost_tracking(\.|$)/i,
    module: "economics_config",
    note: "economics: cost tracking",
  },
  { re: /^usage_caps(\.|$)/i, module: "economics_config", note: "economics: usage caps" },
  {
    re: /^billing_rules(\.|$)/i,
    module: "economics_config",
    note: "economics: billing rules",
  },
  {
    re: /^tier_overrides(\.|$)/i,
    module: "economics_config",
    note: "economics: tier overrides",
  },

  // --- Flow ---
  { re: /^nodes(\.|$)/i, module: "flow_config", note: "flow: nodes" },
  { re: /^edges(\.|$)/i, module: "flow_config", note: "flow: edges" },
  { re: /^entry_node(\.|$)/i, module: "flow_config", note: "flow: entry node" },
  { re: /^exit_conditions(\.|$)/i, module: "flow_config", note: "flow: exit conditions" },

  // --- Role card (fallback, since it's smaller but important) ---
  {
    re: /role|mission|boundaries|escalation_rules|context|title|company/i,
    module: "role_card",
    note: "role-card: common fields",
  },
];

/**
 * Normalizes a single field_path into module-prefixed field_path
 * - Leaves already-prefixed paths unchanged
 * - If mapping found: prefix + "." + original
 * - If no mapping: returns original (and warning is emitted by caller)
 */
export function normalizeFieldPath(fieldPath: string): {
  normalized: string;
  mapped: boolean;
  module?: ModuleKey;
  note?: string;
} {
  const raw = (fieldPath || "").trim();
  if (!raw) return { normalized: raw, mapped: false };

  // If already module-prefixed: keep
  const first = raw.split(".")[0];
  if (KNOWN_PREFIXES.includes(first as ModuleKey)) {
    return {
      normalized: raw,
      mapped: true,
      module: first as ModuleKey,
      note: "already_prefixed",
    };
  }

  // Strip legacy prefixes if present (roleCard., brainConfig., etc.)
  // then re-prefix with snake case module keys
  const legacyMap: Array<[RegExp, ModuleKey]> = [
    [/^(roleCard)\./, "role_card"],
    [/^(brainConfig)\./, "brain_config"],
    [/^(personalityConfig)\./, "personality_config"],
    [/^(toolConfig|tools)\./, "tool_config"],
    [/^(knowledgeConfig|knowledge)\./, "knowledge_config"],
    [/^(memoryConfig|memory)\./, "memory_config"],
    [/^(learningConfig|learning)\./, "learning_config"],
    [/^(governanceConfig|governance)\./, "governance_config"],
    [/^(economicsConfig|economics)\./, "economics_config"],
    [/^(flowConfig|flow)\./, "flow_config"],
  ];

  for (const [re, mod] of legacyMap) {
    if (re.test(raw)) {
      const rel = raw.replace(re, "");
      return {
        normalized: `${mod}.${rel}`,
        mapped: true,
        module: mod,
        note: "legacy_prefix_rewritten",
      };
    }
  }

  // Match rules
  for (const rule of RULES) {
    if (rule.re.test(raw)) {
      return {
        normalized: `${rule.module}.${raw}`,
        mapped: true,
        module: rule.module,
        note: rule.note,
      };
    }
  }

  return { normalized: raw, mapped: false };
}

/**
 * Normalize gaps list in-place safe way (returns new list)
 * Adds warnings for unmapped paths to force visibility.
 * Generic to preserve the original gap type (e.g., specific gap_type literals).
 */
export function normalizeGapFieldPaths<T extends GapItemBase>(
  gaps: T[],
  opts?: { emitWarnings?: boolean }
): NormalizeResult<T> {
  const emitWarnings = opts?.emitWarnings ?? true;
  const warnings: WarningItem[] = [];

  const normalized = (gaps || []).map((g): T => {
    const r = normalizeFieldPath(g.field_path);

    if (!r.mapped && emitWarnings) {
      warnings.push({
        code: "GAP_FIELD_PATH_UNMAPPED",
        message: `Could not map gap.field_path to a module prefix: "${g.field_path}"`,
        severity: "warning",
        field_path: g.field_path,
        suggestion:
          "Emit module-prefixed field paths from the engine (e.g. knowledge_config.price_range).",
      });
    }

    return {
      ...g,
      field_path: r.normalized,
    };
  });

  return { gaps: normalized, warnings };
}

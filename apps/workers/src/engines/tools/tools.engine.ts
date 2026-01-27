/**
 * Tools Engine v1 - Main Orchestrator
 *
 * Turns template intent + company context → tool configuration JSON.
 * Deterministic-first approach with optional AI enhancement.
 *
 * @module engines/tools/engine
 */

import type { AgentType } from "@epic-ai/shared";
import { scoreTools } from "./tools.rules";
import { aiSuggestTools, type AIToolCandidate } from "./tools.ai";
import { TOOL_CATALOG, getToolById } from "./tools.catalog";
import type {
  ToolRecommendationInput,
  ToolMatch,
  ToolConfig,
  EnabledTool,
  ToolPolicies,
  ToolPreferences,
  ToolsEngineResult,
  ToolsEvidence,
  ToolsGap,
  ToolsWarning,
} from "./tools.types";

// ============================================
// CONFIGURATION
// ============================================

/** Minimum score threshold for tool selection */
const SCORE_THRESHOLD = 0.3;

/** Maximum tools to select per template */
const MAX_TOOLS = 10;

/** Default tool policies */
const DEFAULT_POLICIES: ToolPolicies = {
  confirm_sensitive_actions: true,
  max_tools_per_turn: 3,
  log_all_usage: true,
};

// ============================================
// ENGINE PARAMS
// ============================================

export interface ToolsEngineParams {
  /** Template key from Template Engine */
  templateKey: AgentType;
  /** Company context from enrichment */
  company: ToolRecommendationInput["company"];
  /** Target channels */
  channels?: string[];
  /** Optional hints from previous engines */
  hints?: ToolRecommendationInput["hints"];
  /** Whether to attempt AI enhancement */
  useAI?: boolean;
  /** Override score threshold */
  scoreThreshold?: number;
  /** Override max tools */
  maxTools?: number;
}

// ============================================
// MAIN ENGINE
// ============================================

/**
 * Run the Tools Engine
 *
 * Workflow:
 * 1. Score all tools against input context
 * 2. Filter by score threshold
 * 3. Optionally apply AI suggestions
 * 4. Build tool configuration
 * 5. Generate evidence, gaps, and warnings
 *
 * @param params Engine parameters
 * @returns Tool configuration with evidence
 */
export async function runToolsEngine(
  params: ToolsEngineParams
): Promise<ToolsEngineResult> {
  const {
    templateKey,
    company,
    channels,
    hints,
    useAI = false,
    scoreThreshold = SCORE_THRESHOLD,
    maxTools = MAX_TOOLS,
  } = params;

  // Build input for scoring
  const scoringInput: ToolRecommendationInput = {
    templateKey,
    company,
    channels,
    hints,
  };

  // 1. Score all tools
  const allMatches = scoreTools(scoringInput);

  // 2. Filter by threshold and limit
  let selectedMatches = allMatches
    .filter((m) => m.score >= scoreThreshold)
    .slice(0, maxTools);

  // 3. Optionally apply AI suggestions
  const evidence: ToolsEvidence[] = [];
  const warnings: ToolsWarning[] = [];

  if (useAI) {
    const candidates: AIToolCandidate[] = TOOL_CATALOG.map((t) => ({
      toolId: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
    }));

    const aiSuggestion = await aiSuggestTools({
      templateKey,
      company: {
        name: undefined, // Not available in current input
        description: undefined,
        industry: company.industry,
        services: company.services,
      },
      currentTools: selectedMatches.map((m) => m.id),
      candidates,
    });

    if (aiSuggestion) {
      // Apply AI suggestions
      selectedMatches = applyAISuggestions(
        selectedMatches,
        allMatches,
        aiSuggestion.enableTools,
        aiSuggestion.disableTools
      );

      // Add AI evidence
      evidence.push(...aiSuggestion.evidence);

      warnings.push({
        code: "AI_SUGGESTION_APPLIED",
        message: `AI suggested: +${aiSuggestion.enableTools.length} tools, -${aiSuggestion.disableTools.length} tools`,
        severity: "info",
      });
    }
  }

  // Ensure human handoff is always included
  const hasHandoff = selectedMatches.some((m) => m.id === "handoff.human");
  if (!hasHandoff) {
    const handoffMatch = allMatches.find((m) => m.id === "handoff.human");
    if (handoffMatch) {
      selectedMatches.push(handoffMatch);
    }
  }

  // 4. Build tool configuration
  const toolConfig = buildToolConfig(selectedMatches, templateKey);

  // 5. Generate evidence from matches
  for (const match of selectedMatches) {
    evidence.push({
      source_type: "deterministic_scoring",
      field_path: `enabled_tools.${match.id}`,
      confidence: match.score,
      reasoning: match.reasons.join("; "),
      tool_id: match.id,
    });
  }

  // 6. Detect gaps
  const gaps = detectGaps(selectedMatches, scoringInput);

  // 7. Generate warnings
  warnings.push(...generateWarnings(selectedMatches, scoringInput));

  // 8. Calculate confidence scores
  const confidence = calculateConfidence(selectedMatches, evidence);

  return {
    tool_config: toolConfig,
    matches: allMatches,
    evidence,
    confidence,
    gaps,
    warnings,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Apply AI suggestions to selected matches
 */
function applyAISuggestions(
  selected: ToolMatch[],
  allMatches: ToolMatch[],
  enableTools: string[],
  disableTools: string[]
): ToolMatch[] {
  // Remove disabled tools
  let result = selected.filter((m) => !disableTools.includes(m.id));

  // Add enabled tools that aren't already selected
  for (const toolId of enableTools) {
    if (!result.some((m) => m.id === toolId)) {
      const match = allMatches.find((m) => m.id === toolId);
      if (match) {
        result.push(match);
      }
    }
  }

  return result;
}

/**
 * Build tool configuration from matches
 */
function buildToolConfig(
  matches: ToolMatch[],
  templateKey: AgentType
): ToolConfig {
  const enabledTools: EnabledTool[] = matches.map((match) => {
    const definition = getToolById(match.id);
    if (!definition) {
      // Fallback for unknown tools (shouldn't happen)
      return {
        id: match.id,
        name: match.id,
        enabled: true,
        permissions: { read: true },
      };
    }

    return {
      id: definition.id,
      name: definition.name,
      enabled: true,
      permissions: { ...definition.defaultPermissions },
      rate_limits: definition.defaultRateLimits
        ? { ...definition.defaultRateLimits }
        : undefined,
    };
  });

  // Determine strategy based on template
  const strategy = determineStrategy(templateKey);

  const preferences: ToolPreferences = {
    preferred_tools: matches
      .filter((m) => m.score >= 0.5)
      .map((m) => m.id),
    strategy,
  };

  return {
    enabled_tools: enabledTools,
    tool_policies: { ...DEFAULT_POLICIES },
    tool_preferences: preferences,
  };
}

/**
 * Determine tool strategy based on template
 */
function determineStrategy(
  templateKey: AgentType
): ToolPreferences["strategy"] {
  // Support agents should be proactive with tools
  if (templateKey === "customer_support") {
    return "proactive";
  }

  // FAQ bots should be minimal
  if (templateKey === "faq_bot") {
    return "minimal";
  }

  // Default to balanced
  return "balanced";
}

/**
 * Detect gaps in tool configuration
 */
function detectGaps(
  matches: ToolMatch[],
  input: ToolRecommendationInput
): ToolsGap[] {
  const gaps: ToolsGap[] = [];
  const selectedIds = new Set(matches.map((m) => m.id));

  // Check for missing calendar tools when hints suggest booking
  if (input.hints?.needsBooking) {
    const hasCalendar = matches.some((m) => m.id.startsWith("calendar."));
    if (!hasCalendar) {
      gaps.push({
        gap_type: "missing_tool",
        field_path: "enabled_tools.calendar",
        severity: "medium",
        impact: "Agent cannot schedule appointments",
        recommended_fix: "Enable calendar.booking and calendar.availability tools",
        question_to_user: "Do you need appointment scheduling capabilities?",
        suggestions: ["calendar.booking", "calendar.availability"],
      });
    }
  }

  // Check for missing CRM tools when hints suggest CRM
  if (input.hints?.needsCRM) {
    const hasCRM = matches.some((m) => m.id.startsWith("crm."));
    if (!hasCRM) {
      gaps.push({
        gap_type: "missing_tool",
        field_path: "enabled_tools.crm",
        severity: "medium",
        impact: "Agent cannot create or manage leads",
        recommended_fix: "Enable CRM tools for lead management",
        question_to_user: "Do you want to capture and manage leads?",
        suggestions: ["crm.lead_create", "crm.contact_lookup"],
      });
    }
  }

  // Check for missing support tools when hints suggest support
  if (input.hints?.needsSupport) {
    const hasSupport = matches.some((m) => m.id.startsWith("ticket."));
    if (!hasSupport) {
      gaps.push({
        gap_type: "missing_tool",
        field_path: "enabled_tools.support",
        severity: "medium",
        impact: "Agent cannot create or track support tickets",
        recommended_fix: "Enable support ticket tools",
        question_to_user: "Do you need ticket management capabilities?",
        suggestions: ["ticket.create", "ticket.lookup"],
      });
    }
  }

  // Check for missing knowledge tools when hints suggest knowledge
  if (input.hints?.needsKnowledge) {
    const hasKnowledge = matches.some((m) => m.id.startsWith("knowledge."));
    if (!hasKnowledge) {
      gaps.push({
        gap_type: "missing_tool",
        field_path: "enabled_tools.knowledge",
        severity: "low",
        impact: "Agent cannot search knowledge base",
        recommended_fix: "Enable knowledge search tool",
        question_to_user: "Do you have a knowledge base to search?",
        suggestions: ["knowledge.search"],
      });
    }
  }

  // Low tool count warning
  if (matches.length < 2) {
    gaps.push({
      gap_type: "low_tool_count",
      field_path: "enabled_tools",
      severity: "low",
      impact: "Agent has limited capabilities",
      recommended_fix: "Consider enabling more tools based on use case",
    });
  }

  return gaps;
}

/**
 * Generate warnings about the configuration
 */
function generateWarnings(
  matches: ToolMatch[],
  input: ToolRecommendationInput
): ToolsWarning[] {
  const warnings: ToolsWarning[] = [];

  // Check for sensitive tools
  const sensitiveTools = matches.filter((m) => {
    const def = getToolById(m.id);
    return def?.isSensitive;
  });

  if (sensitiveTools.length > 0) {
    warnings.push({
      code: "SENSITIVE_TOOLS_ENABLED",
      message: `${sensitiveTools.length} sensitive tool(s) enabled: ${sensitiveTools.map((t) => t.id).join(", ")}`,
      severity: "warning",
    });
  }

  // Check for channel mismatches
  for (const match of matches) {
    const def = getToolById(match.id);
    if (def && input.channels?.length) {
      const unsupportedChannels = input.channels.filter(
        (c) => !def.channels.includes(c)
      );
      if (unsupportedChannels.length > 0) {
        warnings.push({
          code: "CHANNEL_MISMATCH",
          message: `Tool ${match.id} doesn't support channels: ${unsupportedChannels.join(", ")}`,
          severity: "info",
          tool_id: match.id,
        });
      }
    }
  }

  // Check for too many tools
  if (matches.length > 8) {
    warnings.push({
      code: "MANY_TOOLS_ENABLED",
      message: `${matches.length} tools enabled. Consider reducing for focused agent behavior.`,
      severity: "info",
    });
  }

  return warnings;
}

/**
 * Calculate confidence scores
 */
function calculateConfidence(
  matches: ToolMatch[],
  evidence: ToolsEvidence[]
): Record<string, number> {
  // Overall tool selection confidence
  const avgScore =
    matches.length > 0
      ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length
      : 0;

  // Per-tool confidence
  const toolConfidence: Record<string, number> = {};
  for (const match of matches) {
    toolConfidence[`tool.${match.id}`] = match.score;
  }

  // Evidence-based confidence
  const evidenceConfidence =
    evidence.length > 0
      ? evidence.reduce((sum, e) => sum + e.confidence, 0) / evidence.length
      : 0;

  return {
    enabled_tools: avgScore,
    tool_selection: avgScore,
    evidence_quality: evidenceConfidence,
    ...toolConfidence,
  };
}

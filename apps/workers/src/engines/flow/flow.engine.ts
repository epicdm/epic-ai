/**
 * Flow Engine v1 - Main Orchestrator
 *
 * Generates conversation flow configuration from template and tools.
 * Creates the state machine that controls agent conversations.
 *
 * @module engines/flow/engine
 */

import type { AgentType } from "@epic-ai/shared";
import { getBaseFlowSkeleton, hasCustomFlow } from "./flow.catalog";
import { buildToolHooks } from "./flow.tools";
import { validateFlow, checkFlowWarnings, canReachExit } from "./flow.validation";
import { detectFlowGaps, hasBlockingGaps } from "./flow.gaps";
import type {
  FlowConfig,
  FlowEngineInput,
  FlowEngineResult,
  FlowEvidence,
  FlowGap,
  FlowWarning,
  FlowGuardrails,
} from "./flow.types";

// ============================================
// ENGINE PARAMS
// ============================================

export interface FlowEngineParams extends FlowEngineInput {
  /** Whether to skip validation (for testing) */
  skipValidation?: boolean;
  /** Override default guardrails */
  guardrails?: Partial<FlowGuardrails>;
}

// ============================================
// MAIN ENGINE
// ============================================

/**
 * Run the Flow Engine
 *
 * Workflow:
 * 1. Get base flow skeleton for template
 * 2. Build tool hooks from enabled tools
 * 3. Apply guardrails
 * 4. Validate flow structure
 * 5. Detect gaps and warnings
 * 6. Calculate confidence
 *
 * @param input Engine parameters
 * @returns Flow configuration with evidence
 */
export async function runFlowEngine(
  input: FlowEngineParams
): Promise<FlowEngineResult> {
  const {
    templateKey,
    channels = [],
    tools = [],
    company,
    skipValidation = false,
    guardrails: guardrailOverrides,
  } = input;

  // 1. Get base flow skeleton
  const base = getBaseFlowSkeleton(templateKey);
  const isCustomFlow = hasCustomFlow(templateKey);

  // 2. Get enabled tools
  const enabledToolIds = tools.filter((t) => t.enabled).map((t) => t.id);

  // 3. Build tool hooks
  const toolHooks = buildToolHooks({
    templateKey,
    enabledToolIds,
    nodes: base.nodes,
  });

  // 4. Build guardrails
  const guardrails: FlowGuardrails = {
    escalation: {
      on_user_requests_human: true,
      on_high_stakes_topics: true,
      on_low_confidence: true,
      ...guardrailOverrides?.escalation,
    },
    fallback: {
      max_clarifications: 3,
      fallback_node_id:
        base.nodes.find((n) => n.type === "fallback")?.id ||
        base.entry_node_id,
      ...guardrailOverrides?.fallback,
    },
  };

  // 5. Assemble flow configuration
  const flow: FlowConfig = {
    version: "v1",
    templateKey,
    entry_node_id: base.entry_node_id,
    exit_node_ids: base.exit_node_ids,
    nodes: base.nodes,
    edges: base.edges,
    intents: base.intents,
    tool_hooks: toolHooks,
    guardrails,
  };

  // 6. Validate flow
  const warnings: FlowWarning[] = [];

  if (!skipValidation) {
    try {
      validateFlow(flow);
    } catch (error) {
      // Convert validation error to warning if possible
      if (error instanceof Error) {
        warnings.push({
          code: "VALIDATION_ERROR",
          message: error.message,
          severity: "error",
        });
      }
    }

    // Check for soft warnings
    warnings.push(...checkFlowWarnings(flow));

    // Check exit reachability
    if (!canReachExit(flow)) {
      warnings.push({
        code: "EXIT_UNREACHABLE",
        message: "No path exists from entry to exit nodes. Flow may loop infinitely.",
        severity: "error",
      });
    }
  }

  // 7. Detect gaps
  const gaps = detectFlowGaps(flow, enabledToolIds);

  // 8. Build evidence
  const evidence = buildEvidence(flow, templateKey, isCustomFlow, toolHooks, gaps);

  // 9. Calculate confidence
  const confidence = calculateConfidence(flow, gaps, warnings, isCustomFlow);

  // 10. Add size warnings
  if (flow.nodes.length < 4) {
    warnings.push({
      code: "FLOW_TOO_SMALL",
      message: "Flow has minimal nodes; consider adding richer transitions for better UX.",
      severity: "info",
    });
  }

  if (flow.nodes.length > 12) {
    warnings.push({
      code: "FLOW_COMPLEX",
      message: `Flow has ${flow.nodes.length} nodes. Consider simplifying for better maintainability.`,
      severity: "info",
    });
  }

  // 11. Add tool hook warnings
  if (toolHooks.length === 0 && enabledToolIds.length > 0) {
    warnings.push({
      code: "NO_TOOL_HOOKS",
      message: "Tools are enabled but no hooks were created. Tools may not be used.",
      severity: "warning",
    });
  }

  return {
    flows: flow,
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
 * Build evidence for flow generation
 */
function buildEvidence(
  flow: FlowConfig,
  templateKey: AgentType,
  isCustomFlow: boolean,
  toolHooks: FlowConfig["tool_hooks"],
  gaps: FlowGap[]
): FlowEvidence[] {
  const evidence: FlowEvidence[] = [];

  // Template-based evidence
  evidence.push({
    source_type: "template_catalog",
    field_path: "flows",
    confidence: isCustomFlow ? 0.85 : 0.65,
    reasoning: isCustomFlow
      ? `Flow generated from custom template for ${templateKey}`
      : `Flow generated from default template (${templateKey} not customized)`,
  });

  // Node evidence
  evidence.push({
    source_type: "inference",
    field_path: "flows.nodes",
    confidence: 0.9,
    reasoning: `${flow.nodes.length} nodes defined for ${templateKey} workflow`,
  });

  // Edge evidence
  evidence.push({
    source_type: "inference",
    field_path: "flows.edges",
    confidence: 0.85,
    reasoning: `${flow.edges.length} transitions defined with ${flow.intents.length} intent triggers`,
  });

  // Tool hook evidence
  if (toolHooks.length > 0) {
    evidence.push({
      source_type: "tool_mapping",
      field_path: "flows.tool_hooks",
      confidence: 0.8,
      reasoning: `${toolHooks.length} tool hooks bound to flow nodes`,
    });
  }

  // Gap impact on confidence
  if (gaps.length > 0) {
    const highGaps = gaps.filter((g) => g.severity === "high").length;
    const mediumGaps = gaps.filter((g) => g.severity === "medium").length;

    evidence.push({
      source_type: "gap_analysis",
      field_path: "flows.completeness",
      confidence: Math.max(0.3, 0.9 - highGaps * 0.2 - mediumGaps * 0.1),
      reasoning: `${gaps.length} gaps detected (${highGaps} high, ${mediumGaps} medium severity)`,
    });
  }

  return evidence;
}

/**
 * Calculate confidence scores
 */
function calculateConfidence(
  flow: FlowConfig,
  gaps: FlowGap[],
  warnings: FlowWarning[],
  isCustomFlow: boolean
): Record<string, number> {
  // Base confidence from template
  let baseConfidence = isCustomFlow ? 0.85 : 0.65;

  // Reduce for gaps
  const highGaps = gaps.filter((g) => g.severity === "high").length;
  const mediumGaps = gaps.filter((g) => g.severity === "medium").length;
  baseConfidence -= highGaps * 0.15;
  baseConfidence -= mediumGaps * 0.08;

  // Reduce for errors
  const errors = warnings.filter((w) => w.severity === "error").length;
  baseConfidence -= errors * 0.2;

  // Clamp
  baseConfidence = clamp01(baseConfidence);

  // Node confidence (based on instructions quality)
  const nodesWithInstructions = flow.nodes.filter(
    (n) => n.instructions && n.instructions.length > 20
  ).length;
  const nodeConfidence = clamp01(nodesWithInstructions / flow.nodes.length);

  // Edge confidence (based on coverage)
  const nodesWithOutgoing = new Set(
    flow.edges.filter((e) => e.from !== "*").map((e) => e.from)
  );
  const edgeCoverage = nodesWithOutgoing.size / Math.max(1, flow.nodes.length - 1);
  const edgeConfidence = clamp01(edgeCoverage);

  // Tool hook confidence
  const toolHookConfidence = flow.tool_hooks.length > 0 ? 0.8 : 0.5;

  return {
    flows: baseConfidence,
    "flows.nodes": nodeConfidence,
    "flows.edges": edgeConfidence,
    "flows.tool_hooks": toolHookConfidence,
    "flows.guardrails": 0.9, // Default guardrails are well-defined
  };
}

/**
 * Clamp value between 0 and 1
 */
function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export { clamp01 };

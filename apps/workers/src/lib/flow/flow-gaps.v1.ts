/**
 * Flow Gap Detector v1
 *
 * Analyzes FlowConfig and returns:
 * - gaps: blocking issues (high severity)
 * - warnings: non-blocking recommendations
 * - confidence: {flow: 0-1}
 *
 * Used by:
 * - /flow PATCH route (returns gaps/warnings in response)
 * - wizard-snapshot (rolls up flow confidence)
 * - auto-fill planner (decides whether to overwrite)
 */

import { FlowConfigSchemaStrict } from "@epic-ai/shared";
import type { GapItem, WarningItem } from "@epic-ai/shared";
import type { z } from "zod";

// Use the inferred type from the strict schema - this guarantees defaults are applied
type ParsedFlowConfig = z.infer<typeof FlowConfigSchemaStrict>;

// ============================================================================
// Helpers
// ============================================================================

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
// Main Detector
// ============================================================================

export interface FlowGapResult {
  gaps: GapItem[];
  warnings: WarningItem[];
  confidence: Record<string, number>;
}

/**
 * Detect gaps and warnings in a flow configuration
 */
export function detectFlowGapsV1(flowInput: unknown): FlowGapResult {
  const gaps: GapItem[] = [];
  const warnings: WarningItem[] = [];

  // 0) Handle null/undefined/empty
  if (!flowInput || (typeof flowInput === "object" && Object.keys(flowInput).length === 0)) {
    gaps.push(
      gap({
        gap_type: "missing_required",
        field_path: "flowConfig",
        severity: "high",
        impact: "No flow configuration; agent cannot manage conversation state.",
        recommended_fix: "Define a flow with entry_node_id, nodes, and edges.",
      })
    );
    return { gaps, warnings, confidence: { flow: 0.1 } };
  }

  // 1) Validate/parse (if invalid, return invalid gap)
  let flow: ParsedFlowConfig;
  try {
    flow = FlowConfigSchemaStrict.parse(flowInput);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown validation error";
    gaps.push(
      gap({
        gap_type: "invalid",
        field_path: "flowConfig",
        severity: "high",
        impact: "Flow configuration is invalid; agent cannot reliably run.",
        recommended_fix: `Fix flow JSON to match FlowConfigSchema: ${message.slice(0, 200)}`,
      })
    );
    return { gaps, warnings, confidence: { flow: 0.1 } };
  }

  // 2) Entry node must exist
  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  if (!nodeIds.has(flow.entry_node_id)) {
    gaps.push(
      gap({
        gap_type: "missing_required",
        field_path: "flowConfig.entry_node_id",
        severity: "high",
        impact: "Flow has no valid entry node; agent cannot start a conversation.",
        recommended_fix: "Set entry_node_id to an existing node id.",
      })
    );
  }

  // 3) Must have at least one edge OR single-node flow explicitly allowed
  if (flow.nodes.length > 1 && (flow.edges?.length ?? 0) === 0) {
    gaps.push(
      gap({
        gap_type: "missing_required",
        field_path: "flowConfig.edges",
        severity: "high",
        impact: "Multi-node flow has no edges; agent cannot progress beyond the entry node.",
        recommended_fix: "Add edges connecting nodes (greeting → qualify → route → book/nurture → end).",
      })
    );
  }

  // 4) Detect unreachable nodes (excluding wildcard edges)
  const reachable = new Set<string>();
  const adjacency = new Map<string, string[]>();

  for (const e of flow.edges ?? []) {
    // Skip wildcard edges for reachability analysis
    if (e.from === "*") continue;
    if (!adjacency.has(e.from)) adjacency.set(e.from, []);
    adjacency.get(e.from)!.push(e.to);
  }

  // BFS from entry node
  const stack = [flow.entry_node_id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    for (const nxt of adjacency.get(cur) ?? []) stack.push(nxt);
  }

  // Also mark nodes reachable via wildcard edges
  for (const e of flow.edges ?? []) {
    if (e.from === "*") {
      reachable.add(e.to);
    }
  }

  const unreachable = flow.nodes.filter((n) => !reachable.has(n.id));
  if (unreachable.length) {
    warnings.push(
      warn({
        code: "FLOW_UNREACHABLE_NODES",
        severity: "warning",
        message: `Flow has ${unreachable.length} unreachable node(s): ${unreachable.map((n) => n.id).join(", ")}`,
        field_path: "flowConfig.nodes",
        suggestion: "Remove unreachable nodes or add edges to connect them from the entry path.",
      })
    );
  }

  // 5) Detect dangling edges (excluding wildcard 'from')
  const danglingEdges = (flow.edges ?? []).filter(
    (e) => (e.from !== "*" && !nodeIds.has(e.from)) || !nodeIds.has(e.to)
  );
  if (danglingEdges.length) {
    gaps.push(
      gap({
        gap_type: "invalid",
        field_path: "flowConfig.edges",
        severity: "high",
        impact: "Flow contains edges referencing missing nodes; agent routing can crash.",
        recommended_fix: `Fix edges so 'from' and 'to' reference valid node IDs. Dangling: ${danglingEdges.map((e) => e.id).join(", ")}`,
      })
    );
  }

  // 6) Sales qualifier best-practice checks (non-blocking)
  const nodeTypes = new Set(flow.nodes.map((n) => n.type));
  const hasQualify = nodeTypes.has("qualify");
  const hasBook = nodeTypes.has("book");
  // "close" is the terminal node type in the schema (equivalent to "end")
  const hasClose = nodeTypes.has("close");

  if (!hasQualify && flow.templateKey === "sales_qualifier") {
    warnings.push(
      warn({
        code: "FLOW_MISSING_QUALIFY_NODE",
        severity: "warning",
        message: "Sales qualifier flow usually includes a qualification node.",
        field_path: "flowConfig.nodes",
        suggestion: "Add a qualify node to collect need/timeline/budget/decision maker (BANT-lite).",
      })
    );
  }

  if (!hasBook && flow.templateKey === "sales_qualifier") {
    warnings.push(
      warn({
        code: "FLOW_MISSING_BOOK_NODE",
        severity: "warning",
        message: "Sales qualifier flow usually includes a booking node.",
        field_path: "flowConfig.nodes",
        suggestion: "Add a book node that uses calendar tool to schedule meetings.",
      })
    );
  }

  if (!hasClose) {
    gaps.push(
      gap({
        gap_type: "missing_required",
        field_path: "flowConfig.nodes",
        severity: "medium",
        impact: "No close node; conversations may terminate abruptly without proper closing.",
        recommended_fix: "Add a close node and route all terminal paths to it.",
      })
    );
  }

  // 7) Check exit_node_ids are valid
  for (const exitId of flow.exit_node_ids ?? []) {
    if (!nodeIds.has(exitId)) {
      gaps.push(
        gap({
          gap_type: "invalid",
          field_path: "flowConfig.exit_node_ids",
          severity: "medium",
          impact: `Exit node '${exitId}' does not exist in nodes.`,
          recommended_fix: "Update exit_node_ids to reference existing node ids.",
        })
      );
    }
  }

  // 8) Confidence heuristic
  const highSeverity = gaps.some((g) => g.severity === "high");
  const mediumSeverity = gaps.some((g) => g.severity === "medium");
  let base = 0.9;
  if (highSeverity) base = 0.3;
  else if (mediumSeverity) base = 0.6;

  const penalty = Math.min(0.4, gaps.length * 0.08 + warnings.length * 0.03);
  const flowConfidence = Math.max(0.1, Math.min(1, base - penalty));

  return { gaps, warnings, confidence: { flow: flowConfidence } };
}

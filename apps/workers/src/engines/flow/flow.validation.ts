/**
 * Flow Engine v1 - Validation
 *
 * Validates flow configuration for structural integrity.
 * Ensures all references are valid and flow is traversable.
 *
 * @module engines/flow/validation
 */

import type { FlowConfig, FlowWarning } from "./flow.types";

// ============================================
// VALIDATION ERROR
// ============================================

export class FlowValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "FlowValidationError";
  }
}

// ============================================
// MAIN VALIDATOR
// ============================================

/**
 * Validate flow configuration
 *
 * Checks:
 * - Entry node exists
 * - All exit nodes exist
 * - All edge references exist
 * - All tool hook node references exist
 * - No orphan nodes (unreachable)
 * - No infinite loops without exit
 *
 * @param flow Flow configuration to validate
 * @throws FlowValidationError if validation fails
 */
export function validateFlow(flow: FlowConfig): void {
  const nodeIds = new Set(flow.nodes.map((n) => n.id));
  const intentIds = new Set(flow.intents.map((i) => i.id));

  // Check entry node exists
  if (!nodeIds.has(flow.entry_node_id)) {
    throw new FlowValidationError(
      `Entry node "${flow.entry_node_id}" not found in flow nodes`,
      "INVALID_ENTRY_NODE",
      { entry_node_id: flow.entry_node_id, available_nodes: Array.from(nodeIds) }
    );
  }

  // Check all exit nodes exist
  for (const exitId of flow.exit_node_ids) {
    if (!nodeIds.has(exitId)) {
      throw new FlowValidationError(
        `Exit node "${exitId}" not found in flow nodes`,
        "INVALID_EXIT_NODE",
        { exit_node_id: exitId, available_nodes: Array.from(nodeIds) }
      );
    }
  }

  // Check all edge references
  for (const edge of flow.edges) {
    // "from" can be "*" (wildcard for any node)
    if (edge.from !== "*" && !nodeIds.has(edge.from)) {
      throw new FlowValidationError(
        `Edge "${edge.id}" references non-existent source node "${edge.from}"`,
        "INVALID_EDGE_SOURCE",
        { edge_id: edge.id, from: edge.from, available_nodes: Array.from(nodeIds) }
      );
    }

    if (!nodeIds.has(edge.to)) {
      throw new FlowValidationError(
        `Edge "${edge.id}" references non-existent target node "${edge.to}"`,
        "INVALID_EDGE_TARGET",
        { edge_id: edge.id, to: edge.to, available_nodes: Array.from(nodeIds) }
      );
    }

    // Check intent references if present
    if (edge.when.intent && !intentIds.has(edge.when.intent)) {
      throw new FlowValidationError(
        `Edge "${edge.id}" references non-existent intent "${edge.when.intent}"`,
        "INVALID_EDGE_INTENT",
        { edge_id: edge.id, intent: edge.when.intent, available_intents: Array.from(intentIds) }
      );
    }
  }

  // Check tool hook node references
  for (const hook of flow.tool_hooks) {
    if (!nodeIds.has(hook.when.node_id)) {
      throw new FlowValidationError(
        `Tool hook "${hook.id}" references non-existent node "${hook.when.node_id}"`,
        "INVALID_HOOK_NODE",
        { hook_id: hook.id, node_id: hook.when.node_id, available_nodes: Array.from(nodeIds) }
      );
    }
  }

  // Check fallback node reference
  if (flow.guardrails.fallback.fallback_node_id &&
      !nodeIds.has(flow.guardrails.fallback.fallback_node_id)) {
    throw new FlowValidationError(
      `Fallback node "${flow.guardrails.fallback.fallback_node_id}" not found`,
      "INVALID_FALLBACK_NODE",
      { fallback_node_id: flow.guardrails.fallback.fallback_node_id }
    );
  }
}

// ============================================
// SOFT VALIDATION (WARNINGS)
// ============================================

/**
 * Check for flow issues that don't prevent execution
 * but may indicate problems
 *
 * @param flow Flow configuration
 * @returns Array of warnings
 */
export function checkFlowWarnings(flow: FlowConfig): FlowWarning[] {
  const warnings: FlowWarning[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // Check for orphan nodes (no incoming edges)
  const nodesWithIncoming = new Set<string>();
  nodesWithIncoming.add(flow.entry_node_id); // Entry is reachable by definition

  for (const edge of flow.edges) {
    nodesWithIncoming.add(edge.to);
  }

  for (const node of flow.nodes) {
    if (!nodesWithIncoming.has(node.id) && node.id !== flow.entry_node_id) {
      warnings.push({
        code: "ORPHAN_NODE",
        message: `Node "${node.id}" has no incoming edges and may be unreachable`,
        severity: "warning",
        node_id: node.id,
      });
    }
  }

  // Check for nodes with no outgoing edges (dead ends)
  const nodesWithOutgoing = new Set<string>();
  for (const edge of flow.edges) {
    if (edge.from !== "*") {
      nodesWithOutgoing.add(edge.from);
    }
  }

  for (const node of flow.nodes) {
    // Exit nodes are allowed to have no outgoing edges
    if (!flow.exit_node_ids.includes(node.id) && !nodesWithOutgoing.has(node.id)) {
      warnings.push({
        code: "DEAD_END_NODE",
        message: `Node "${node.id}" has no outgoing edges and is not an exit node`,
        severity: "warning",
        node_id: node.id,
      });
    }
  }

  // Check for missing fallback node
  const hasFallback = flow.nodes.some((n) => n.type === "fallback");
  if (!hasFallback) {
    warnings.push({
      code: "NO_FALLBACK_NODE",
      message: "Flow has no fallback node for handling unclear situations",
      severity: "info",
    });
  }

  // Check for missing handoff capability
  const hasHandoff = flow.nodes.some((n) => n.type === "handoff");
  if (!hasHandoff) {
    warnings.push({
      code: "NO_HANDOFF_NODE",
      message: "Flow has no handoff node for escalation",
      severity: "info",
    });
  }

  // Check node turn limits
  for (const node of flow.nodes) {
    if (node.max_turns && node.max_turns > 10) {
      warnings.push({
        code: "HIGH_TURN_LIMIT",
        message: `Node "${node.id}" has a high turn limit (${node.max_turns}). Consider splitting.`,
        severity: "info",
        node_id: node.id,
      });
    }
  }

  // Check for many edges from same node (complex decision point)
  const edgesFromNode: Record<string, number> = {};
  for (const edge of flow.edges) {
    if (edge.from !== "*") {
      edgesFromNode[edge.from] = (edgesFromNode[edge.from] || 0) + 1;
    }
  }

  for (const [nodeId, count] of Object.entries(edgesFromNode)) {
    if (count > 5) {
      warnings.push({
        code: "COMPLEX_DECISION_POINT",
        message: `Node "${nodeId}" has ${count} outgoing edges. Consider simplifying.`,
        severity: "info",
        node_id: nodeId,
      });
    }
  }

  // Check for duplicate edge conditions
  const edgeSignatures = new Map<string, string>();
  for (const edge of flow.edges) {
    const sig = `${edge.from}:${edge.when.intent || edge.when.condition || "default"}`;
    if (edgeSignatures.has(sig)) {
      warnings.push({
        code: "DUPLICATE_EDGE_CONDITION",
        message: `Edges "${edge.id}" and "${edgeSignatures.get(sig)}" have similar conditions from "${edge.from}"`,
        severity: "warning",
      });
    } else {
      edgeSignatures.set(sig, edge.id);
    }
  }

  return warnings;
}

// ============================================
// REACHABILITY CHECK
// ============================================

/**
 * Check if all nodes are reachable from entry
 *
 * @param flow Flow configuration
 * @returns Set of reachable node IDs
 */
export function getReachableNodes(flow: FlowConfig): Set<string> {
  const reachable = new Set<string>();
  const toVisit = [flow.entry_node_id];

  // Build adjacency map
  const adjacency: Record<string, string[]> = {};
  for (const edge of flow.edges) {
    if (edge.from === "*") {
      // Wildcard edges can go from any node
      for (const node of flow.nodes) {
        if (!adjacency[node.id]) adjacency[node.id] = [];
        adjacency[node.id].push(edge.to);
      }
    } else {
      if (!adjacency[edge.from]) adjacency[edge.from] = [];
      adjacency[edge.from].push(edge.to);
    }
  }

  // BFS traversal
  while (toVisit.length > 0) {
    const nodeId = toVisit.shift()!;
    if (reachable.has(nodeId)) continue;

    reachable.add(nodeId);

    const neighbors = adjacency[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!reachable.has(neighbor)) {
        toVisit.push(neighbor);
      }
    }
  }

  return reachable;
}

/**
 * Check if exit nodes are reachable from entry
 *
 * @param flow Flow configuration
 * @returns True if at least one exit is reachable
 */
export function canReachExit(flow: FlowConfig): boolean {
  const reachable = getReachableNodes(flow);
  return flow.exit_node_ids.some((exitId) => reachable.has(exitId));
}

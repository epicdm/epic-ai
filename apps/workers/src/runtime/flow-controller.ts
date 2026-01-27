/**
 * Flow Controller
 *
 * Tracks and updates conversation flow state based on
 * flow_config, user intent, and decisions.
 *
 * @module runtime/flow-controller
 */

import type {
  FlowConfig,
  RuntimeContext,
  BrainDecision,
  FlowState,
} from "./types";

// ============================================================================
// Flow Controller
// ============================================================================

export interface UpdateFlowParams {
  flowConfig: FlowConfig;
  decision: BrainDecision;
  context: RuntimeContext;
  currentFlowState?: FlowState;
}

/**
 * Update the flow state based on the current decision and context.
 */
export function updateFlow(params: UpdateFlowParams): FlowState {
  const { flowConfig, decision, context, currentFlowState } = params;

  // Initialize flow state if not provided
  const current: FlowState = currentFlowState ?? {
    currentNode: flowConfig.entry_node_id ?? "greeting",
    turnsInNode: 0,
    collectedFields: {},
    isExit: false,
  };

  // Find current node definition
  const currentNodeDef = flowConfig.nodes.find(
    (n) => n.id === current.currentNode
  );

  // Check if we should transition
  const transition = findTransition(
    flowConfig,
    current.currentNode,
    decision,
    context
  );

  if (transition) {
    // Transition to new node
    const newNode = transition.to;
    const isExit = flowConfig.exit_node_ids?.includes(newNode) ?? false;

    return {
      currentNode: newNode,
      previousNode: current.currentNode,
      turnsInNode: 0,
      collectedFields: mergeCollectedFields(current.collectedFields, context),
      isExit,
      suggestedNext: undefined,
      transitionIntent: decision.detectedIntent,
    };
  }

  // Check if we've exceeded max turns in current node
  const maxTurns = currentNodeDef?.max_turns ?? 10;
  if (current.turnsInNode >= maxTurns) {
    // Try to find a fallback transition
    const fallbackNode = findFallbackNode(flowConfig, current.currentNode);
    if (fallbackNode) {
      return {
        currentNode: fallbackNode,
        previousNode: current.currentNode,
        turnsInNode: 0,
        collectedFields: current.collectedFields,
        isExit: flowConfig.exit_node_ids?.includes(fallbackNode) ?? false,
        suggestedNext: undefined,
        transitionIntent: "max_turns_exceeded",
      };
    }
  }

  // Stay in current node
  return {
    ...current,
    turnsInNode: current.turnsInNode + 1,
    collectedFields: mergeCollectedFields(current.collectedFields, context),
    suggestedNext: suggestNextNode(flowConfig, current.currentNode, decision),
  };
}

// ============================================================================
// Transition Logic
// ============================================================================

interface TransitionResult {
  to: string;
  edge: FlowConfig["edges"][0];
}

function findTransition(
  flowConfig: FlowConfig,
  currentNode: string,
  decision: BrainDecision,
  context: RuntimeContext
): TransitionResult | null {
  // Get all edges from current node
  const outgoingEdges = flowConfig.edges.filter((e) => e.from === currentNode);

  if (outgoingEdges.length === 0) {
    return null;
  }

  // Sort by priority (higher first)
  const sortedEdges = [...outgoingEdges].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );

  for (const edge of sortedEdges) {
    if (edgeConditionMet(edge, decision, context, flowConfig)) {
      return { to: edge.to, edge };
    }
  }

  return null;
}

function edgeConditionMet(
  edge: FlowConfig["edges"][0],
  decision: BrainDecision,
  context: RuntimeContext,
  flowConfig: FlowConfig
): boolean {
  const { when } = edge;

  if (!when) {
    // No condition = always transition (catch-all)
    return true;
  }

  // Check intent condition
  if (when.intent) {
    // Look up intent definition
    const intentDef = flowConfig.intents.find((i) => i.id === when.intent);
    if (intentDef) {
      // Check if detected intent matches
      if (decision.detectedIntent === when.intent) {
        return true;
      }

      // Check if any intent examples match the context
      const lastMessage = context.messages[context.messages.length - 1];
      if (lastMessage?.role === "user") {
        const inputLower = lastMessage.content.toLowerCase();
        const exampleMatch = intentDef.examples?.some((ex) =>
          inputLower.includes(ex.toLowerCase())
        );
        if (exampleMatch) {
          return true;
        }
      }
    }
  }

  // Check explicit condition
  if (when.condition) {
    return evaluateCondition(when.condition, decision, context);
  }

  return false;
}

function evaluateCondition(
  condition: string,
  decision: BrainDecision,
  context: RuntimeContext
): boolean {
  const condLower = condition.toLowerCase();

  // Action-based conditions
  if (condLower.startsWith("action:")) {
    const expectedAction = condLower.replace("action:", "").trim();
    return decision.action === expectedAction;
  }

  // Intent-based conditions
  if (condLower.startsWith("intent:")) {
    const expectedIntent = condLower.replace("intent:", "").trim();
    return decision.detectedIntent === expectedIntent;
  }

  // Field collected conditions
  if (condLower.startsWith("has:")) {
    const field = condLower.replace("has:", "").trim();
    return checkFieldCollected(field, context);
  }

  // Always conditions
  if (condLower === "always" || condLower === "true") {
    return true;
  }

  // Default: treat as intent name
  return decision.detectedIntent === condition;
}

function checkFieldCollected(field: string, context: RuntimeContext): boolean {
  // Check entities
  const entityTypeMap: Record<string, string> = {
    email: "email",
    phone: "phone",
    name: "person",
    company: "company",
    date: "date",
    location: "location",
  };

  const entityType = entityTypeMap[field];
  if (entityType) {
    return context.entities.some((e) => e.type === entityType);
  }

  // Check user profile
  if (field === "contact_info") {
    return !!(context.userProfile?.email || context.userProfile?.phone);
  }

  return false;
}

// ============================================================================
// Fallback & Suggestions
// ============================================================================

function findFallbackNode(
  flowConfig: FlowConfig,
  currentNode: string
): string | null {
  // Check guardrails for fallback
  const fallbackId = flowConfig.guardrails?.fallback?.fallback_node_id;
  if (fallbackId) {
    return fallbackId;
  }

  // Check for explicit fallback node in config
  const fallbackNode = flowConfig.nodes.find((n) => n.type === "fallback");
  if (fallbackNode) {
    return fallbackNode.id;
  }

  // Check for any edge with no condition (catch-all)
  const catchAllEdge = flowConfig.edges.find(
    (e) => e.from === currentNode && !e.when
  );
  if (catchAllEdge) {
    return catchAllEdge.to;
  }

  return null;
}

function suggestNextNode(
  flowConfig: FlowConfig,
  currentNode: string,
  decision: BrainDecision
): string | undefined {
  // Based on decision action
  if (decision.action === "escalate") {
    const handoffNode = flowConfig.nodes.find((n) => n.type === "handoff");
    return handoffNode?.id;
  }

  if (decision.action === "end") {
    const exitNodes = flowConfig.exit_node_ids ?? [];
    const closeNode = flowConfig.nodes.find((n) => n.type === "close");
    return closeNode?.id ?? exitNodes[0];
  }

  // Suggest based on common flow patterns
  if (decision.detectedIntent === "book_appointment") {
    const bookNode = flowConfig.nodes.find((n) => n.type === "book");
    return bookNode?.id;
  }

  return undefined;
}

// ============================================================================
// Field Collection
// ============================================================================

function mergeCollectedFields(
  existing: Record<string, unknown>,
  context: RuntimeContext
): Record<string, unknown> {
  const merged = { ...existing };

  // Add entities as collected fields
  for (const entity of context.entities) {
    const key = entity.type === "person" ? "name" : entity.type;
    if (!merged[key]) {
      merged[key] = entity.value;
    }
  }

  // Add user profile fields
  if (context.userProfile) {
    if (context.userProfile.email && !merged.email) {
      merged.email = context.userProfile.email;
    }
    if (context.userProfile.phone && !merged.phone) {
      merged.phone = context.userProfile.phone;
    }
    if (context.userProfile.name && !merged.name) {
      merged.name = context.userProfile.name;
    }
  }

  return merged;
}

// ============================================================================
// Flow State Helpers
// ============================================================================

/**
 * Get instructions for the current flow node.
 */
export function getNodeInstructions(
  flowConfig: FlowConfig,
  flowState: FlowState
): string {
  const node = flowConfig.nodes.find((n) => n.id === flowState.currentNode);

  if (!node) {
    return "";
  }

  const parts: string[] = [];

  if (node.title) {
    parts.push(`Current Stage: ${node.title}`);
  }

  if (node.instructions) {
    parts.push(`Instructions: ${node.instructions}`);
  }

  if (node.required_fields && node.required_fields.length > 0) {
    const missing = node.required_fields.filter(
      (f) => !flowState.collectedFields[f]
    );
    if (missing.length > 0) {
      parts.push(`Still need to collect: ${missing.join(", ")}`);
    }
  }

  return parts.join("\n");
}

/**
 * Check if all required fields for current node are collected.
 */
export function hasRequiredFields(
  flowConfig: FlowConfig,
  flowState: FlowState
): boolean {
  const node = flowConfig.nodes.find((n) => n.id === flowState.currentNode);

  if (!node?.required_fields || node.required_fields.length === 0) {
    return true;
  }

  return node.required_fields.every(
    (field) => flowState.collectedFields[field] !== undefined
  );
}

/**
 * Get list of missing required fields.
 */
export function getMissingFields(
  flowConfig: FlowConfig,
  flowState: FlowState
): string[] {
  const node = flowConfig.nodes.find((n) => n.id === flowState.currentNode);

  if (!node?.required_fields) {
    return [];
  }

  return node.required_fields.filter(
    (field) => flowState.collectedFields[field] === undefined
  );
}

/**
 * Initialize flow state from context or defaults.
 */
export function initializeFlowState(
  flowConfig: FlowConfig,
  context: RuntimeContext
): FlowState {
  const entryNode = flowConfig.entry_node_id ?? "greeting";
  const isExit = flowConfig.exit_node_ids?.includes(entryNode) ?? false;

  return {
    currentNode: context.flowStage || entryNode,
    turnsInNode: 0,
    collectedFields: {},
    isExit,
  };
}

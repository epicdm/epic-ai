/**
 * Flow Engine v1 - Types
 *
 * Type definitions for conversation flow configuration.
 * Defines the state machine that controls agent conversations.
 *
 * @module engines/flow/types
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// NODE TYPES
// ============================================

export type FlowNodeType =
  | "greeting"
  | "intake"
  | "qualify"
  | "triage"
  | "answer"
  | "recommend"
  | "book"
  | "capture"
  | "handoff"
  | "followup"
  | "close"
  | "fallback"
  | "error";

export interface FlowNode {
  /** Unique node identifier */
  id: string;
  /** Node type for categorization */
  type: FlowNodeType;
  /** Human-readable title */
  title: string;
  /** Instructions for runtime prompt builder */
  instructions: string;
  /** Fields this node tries to collect */
  required_fields?: string[];
  /** Maximum conversation turns in this node */
  max_turns?: number;
}

// ============================================
// EDGE TYPES
// ============================================

export interface FlowEdgeCondition {
  /** Intent that triggers this transition */
  intent?: string;
  /** Human-readable condition expression (v1) */
  condition?: string;
}

export interface FlowEdge {
  /** Unique edge identifier */
  id: string;
  /** Source node ID ("*" for any node) */
  from: string;
  /** Target node ID */
  to: string;
  /** Transition condition */
  when: FlowEdgeCondition;
  /** Priority (higher wins when multiple edges match) */
  priority: number;
}

// ============================================
// INTENT TYPES
// ============================================

export interface FlowIntent {
  /** Unique intent identifier */
  id: string;
  /** Human-readable description */
  description: string;
  /** Example utterances */
  examples: string[];
}

// ============================================
// TOOL HOOK TYPES
// ============================================

export type ToolHookEvent = "on_enter" | "on_exit" | "on_collect" | "on_confirm";

export interface ToolHookTrigger {
  /** Node ID where hook activates */
  node_id: string;
  /** Event that triggers the hook */
  event: ToolHookEvent;
}

export interface ToolHook {
  /** Unique hook identifier */
  id: string;
  /** Tool ID to invoke */
  tool_id: string;
  /** When to trigger this hook */
  when: ToolHookTrigger;
  /** Maps conversation fields to tool inputs */
  input_mapping: Record<string, string>;
  /** Maps tool outputs to conversation fields */
  output_mapping?: Record<string, string>;
  /** Whether user confirmation is required */
  requires_confirmation?: boolean;
}

// ============================================
// GUARDRAIL TYPES
// ============================================

export interface EscalationConfig {
  /** Escalate when user requests human */
  on_user_requests_human: boolean;
  /** Escalate on high-stakes topics */
  on_high_stakes_topics: boolean;
  /** Escalate on low confidence */
  on_low_confidence: boolean;
}

export interface FallbackConfig {
  /** Max clarification attempts before fallback */
  max_clarifications: number;
  /** Node to transition to on fallback */
  fallback_node_id: string;
}

export interface FlowGuardrails {
  /** Escalation behavior settings */
  escalation: EscalationConfig;
  /** Fallback behavior settings */
  fallback: FallbackConfig;
}

// ============================================
// FLOW CONFIG
// ============================================

export interface FlowConfig {
  /** Flow version */
  version: "v1";
  /** Template key this flow is for */
  templateKey: AgentType;
  /** Entry point node ID */
  entry_node_id: string;
  /** Exit point node IDs */
  exit_node_ids: string[];
  /** All conversation nodes */
  nodes: FlowNode[];
  /** Transitions between nodes */
  edges: FlowEdge[];
  /** Recognized intents */
  intents: FlowIntent[];
  /** Tool invocation hooks */
  tool_hooks: ToolHook[];
  /** Safety and fallback settings */
  guardrails: FlowGuardrails;
}

// ============================================
// ENGINE INPUT/OUTPUT
// ============================================

export interface FlowEngineInput {
  /** Template key from Template Engine */
  templateKey: AgentType;
  /** Target channels */
  channels?: string[];
  /** Enabled tools from Tools Engine */
  tools?: { id: string; enabled: boolean }[];
  /** Company context */
  company?: {
    name?: string;
    industry?: string;
  };
}

export interface FlowEvidence {
  source_type: string;
  field_path: string;
  confidence: number;
  reasoning?: string;
}

export interface FlowGap {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
}

export interface FlowWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  node_id?: string;
}

export interface FlowEngineResult {
  /** The generated flow configuration */
  flows: FlowConfig;
  /** Evidence supporting the generation */
  evidence: FlowEvidence[];
  /** Confidence scores per field */
  confidence: Record<string, number>;
  /** Gaps requiring user input */
  gaps: FlowGap[];
  /** Warnings about the configuration */
  warnings: FlowWarning[];
}

// ============================================
// FLOW SKELETON (for catalog)
// ============================================

export interface FlowSkeleton {
  nodes: FlowNode[];
  edges: FlowEdge[];
  intents: FlowIntent[];
  entry_node_id: string;
  exit_node_ids: string[];
}

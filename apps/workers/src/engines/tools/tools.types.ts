/**
 * Tools Engine v1 - Types
 *
 * Type definitions for tool recommendation and configuration.
 *
 * @module engines/tools/types
 */

import type { AgentType } from "@epic-ai/shared";

// ============================================
// INPUT TYPES
// ============================================

export interface ToolRecommendationInput {
  /** Template key from Template Engine */
  templateKey: AgentType;
  /** Company context from enrichment */
  company: {
    industry?: string;
    services?: { name: string; description?: string; category?: string }[];
    products?: { name: string; description?: string; category?: string }[];
    pricing_model?: string;
    hours_of_operation?: string;
    service_area?: string;
    phone?: string;
    email?: string;
  };
  /** Target channels */
  channels?: string[];
  /** Optional hints from previous engines */
  hints?: {
    needsBooking?: boolean;
    needsSupport?: boolean;
    needsCRM?: boolean;
    needsKnowledge?: boolean;
    needsMessaging?: boolean;
  };
}

// ============================================
// OUTPUT TYPES
// ============================================

export interface ToolMatch {
  /** Tool ID */
  id: string;
  /** Match score 0..1 */
  score: number;
  /** Human-readable reasons for this match */
  reasons: string[];
  /** Feature hits for debugging */
  featureHits: Record<string, number>;
}

export interface EnabledTool {
  id: string;
  name: string;
  enabled: boolean;
  permissions: ToolPermissions;
  rate_limits?: ToolRateLimits;
  config?: Record<string, unknown>;
}

export interface ToolPermissions {
  read?: boolean;
  write?: boolean;
  delete?: boolean;
  requires_confirmation?: boolean;
}

export interface ToolRateLimits {
  calls_per_minute?: number;
  calls_per_conversation?: number;
  calls_per_day?: number;
}

export interface ToolPolicies {
  confirm_sensitive_actions: boolean;
  max_tools_per_turn: number;
  log_all_usage: boolean;
}

export interface ToolPreferences {
  preferred_tools: string[];
  strategy: "minimal" | "proactive" | "balanced";
}

export interface ToolConfig {
  enabled_tools: EnabledTool[];
  tool_policies: ToolPolicies;
  tool_preferences: ToolPreferences;
}

export interface ToolsEngineResult {
  /** The generated tool configuration */
  tool_config: ToolConfig;
  /** All scored matches */
  matches: ToolMatch[];
  /** Evidence supporting the selection */
  evidence: ToolsEvidence[];
  /** Confidence scores per output field */
  confidence: Record<string, number>;
  /** Gaps requiring user input */
  gaps: ToolsGap[];
  /** Warnings about the configuration */
  warnings: ToolsWarning[];
}

// ============================================
// EVIDENCE & GAP TYPES
// ============================================

export interface ToolsEvidence {
  source_type: string;
  field_path: string;
  confidence: number;
  reasoning?: string;
  tool_id?: string;
}

export interface ToolsGap {
  gap_type: string;
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
}

export interface ToolsWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  tool_id?: string;
}

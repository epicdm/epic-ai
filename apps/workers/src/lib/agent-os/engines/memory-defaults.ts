/**
 * Memory Defaults Engine (MDE v1)
 *
 * Generates memory configuration for conversation and context retention.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * Input: channels + conversation_complexity + retention_requirements
 * Output: { config: MemoryConfig, gaps: MemoryGap[], evidence: EvidenceItem[], confidence: number }
 */

import type { AssemblyPhase } from '../../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type MemoryScope = 'conversation' | 'session' | 'user' | 'global';
export type RetentionPeriod = 'session' | '24h' | '7d' | '30d' | 'indefinite';

export interface MemoryConfig {
  conversation_memory: {
    enabled: boolean;
    max_turns: number;
    include_system_messages: boolean;
    summarize_after: number;
  };
  user_memory: {
    enabled: boolean;
    retention_period: RetentionPeriod;
    track_preferences: boolean;
    track_history: boolean;
  };
  context_window: {
    max_tokens: number;
    priority_order: MemoryScope[];
  };
  vector_store?: {
    enabled: boolean;
    collection_name?: string;
    similarity_threshold?: number;
  };
}

export interface MemoryGap {
  gap_type: 'no_retention_policy' | 'no_vector_store' | 'low_context' | 'incomplete';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface MemoryEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface MemoryInput {
  channels?: string[];
  conversation_complexity?: 'simple' | 'moderate' | 'complex';
  retention_required?: boolean;
  vector_store_enabled?: boolean;
  max_context_tokens?: number;
}

export interface MemoryResult {
  config: MemoryConfig;
  gaps: MemoryGap[];
  evidence: MemoryEvidence[];
  confidence: number;
}

// ============================================================================
// Configuration Presets
// ============================================================================

const COMPLEXITY_TO_TURNS: Record<string, number> = {
  simple: 8,
  moderate: 15,
  complex: 25,
};

const COMPLEXITY_TO_CONTEXT: Record<string, number> = {
  simple: 4000,
  moderate: 8000,
  complex: 16000,
};

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate memory configuration based on conversation requirements
 * Pure function - no side effects
 */
export function runMemoryDefaultsEngine(input: MemoryInput): MemoryResult {
  const {
    channels = [],
    conversation_complexity = 'moderate',
    retention_required = false,
    vector_store_enabled = false,
    max_context_tokens,
  } = input;

  const gaps: MemoryGap[] = [];
  const evidence: MemoryEvidence[] = [];

  // Determine max turns based on complexity
  const maxTurns = COMPLEXITY_TO_TURNS[conversation_complexity] || 15;
  evidence.push({
    field_path: 'memory_config.conversation_memory.max_turns',
    source: 'conversation_complexity',
    reasoning: `Max turns set to ${maxTurns} for ${conversation_complexity} conversations`,
  });

  // Determine context window
  const contextTokens = max_context_tokens || COMPLEXITY_TO_CONTEXT[conversation_complexity] || 8000;
  evidence.push({
    field_path: 'memory_config.context_window.max_tokens',
    source: conversation_complexity,
    reasoning: `Context window of ${contextTokens} tokens for ${conversation_complexity} complexity`,
  });

  // Determine retention period
  let retentionPeriod: RetentionPeriod = 'session';
  if (retention_required) {
    retentionPeriod = '30d';
    evidence.push({
      field_path: 'memory_config.user_memory.retention_period',
      source: 'retention_required',
      reasoning: 'Extended retention enabled (30 days)',
    });
  }

  // Voice channels may need shorter memory for latency
  const hasVoice = channels.some((c) => c.toLowerCase() === 'voice');
  const summarizeAfter = hasVoice ? Math.floor(maxTurns * 0.6) : Math.floor(maxTurns * 0.8);

  // Build config
  const config: MemoryConfig = {
    conversation_memory: {
      enabled: true,
      max_turns: maxTurns,
      include_system_messages: false,
      summarize_after: summarizeAfter,
    },
    user_memory: {
      enabled: retention_required,
      retention_period: retentionPeriod,
      track_preferences: retention_required,
      track_history: retention_required,
    },
    context_window: {
      max_tokens: contextTokens,
      priority_order: ['conversation', 'user', 'session', 'global'],
    },
  };

  // Add vector store if enabled
  if (vector_store_enabled) {
    config.vector_store = {
      enabled: true,
      similarity_threshold: 0.75,
    };
    evidence.push({
      field_path: 'memory_config.vector_store',
      source: 'vector_store_enabled',
      reasoning: 'Vector store enabled for semantic memory retrieval',
    });
  }

  // Identify gaps
  if (!retention_required) {
    gaps.push({
      gap_type: 'no_retention_policy',
      field_path: 'memory_config.user_memory',
      severity: 'low',
      impact: 'User preferences and history not retained between sessions',
      recommended_fix: 'Enable retention for personalized experiences',
      source_phase: 'memory',
    });
  }

  if (!vector_store_enabled && conversation_complexity === 'complex') {
    gaps.push({
      gap_type: 'no_vector_store',
      field_path: 'memory_config.vector_store',
      severity: 'low',
      impact: 'Complex conversations may benefit from semantic memory search',
      recommended_fix: 'Consider enabling vector store for better context retrieval',
      source_phase: 'memory',
    });
  }

  // Calculate confidence
  let confidence = 0.9;
  if (retention_required && vector_store_enabled) {
    confidence = 0.95;
  } else if (conversation_complexity === 'simple') {
    confidence = 0.95;
  }

  evidence.push({
    field_path: 'memory_config',
    source: 'memory_defaults_engine',
    reasoning: `Generated memory config with ${maxTurns} max turns, ${contextTokens} context tokens, retention=${retention_required}`,
  });

  return {
    config,
    gaps,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Alias for backward compatibility
export function getDefaultMemoryConfig(complexity: string = 'moderate'): MemoryConfig {
  const result = runMemoryDefaultsEngine({ conversation_complexity: complexity as 'simple' | 'moderate' | 'complex' });
  return result.config;
}

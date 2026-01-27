/**
 * Learning Defaults Engine (LDE v1)
 *
 * Generates learning and improvement configuration.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * Input: learning_mode + feedback_enabled + improvement_scope
 * Output: { config: LearningConfig, gaps: LearningGap[], evidence: EvidenceItem[], confidence: number }
 */

import type { AssemblyPhase } from '../../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type LearningMode = 'disabled' | 'passive' | 'active' | 'supervised';
export type FeedbackType = 'thumbs' | 'rating' | 'detailed' | 'none';
export type ImprovementScope = 'responses' | 'knowledge' | 'personality' | 'all';

export interface LearningConfig {
  learning_enabled: boolean;
  mode: LearningMode;
  feedback: {
    type: FeedbackType;
    prompt_after_conversation: boolean;
    min_rating_for_success: number;
  };
  improvement: {
    scope: ImprovementScope[];
    auto_apply: boolean;
    require_approval: boolean;
    min_confidence_to_apply: number;
  };
  analytics: {
    track_success_rate: boolean;
    track_response_quality: boolean;
    track_user_satisfaction: boolean;
    retention_days: number;
  };
}

export interface LearningGap {
  gap_type: 'learning_disabled' | 'no_feedback' | 'no_analytics' | 'incomplete';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface LearningEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface LearningInput {
  learning_enabled?: boolean;
  learning_mode?: LearningMode;
  feedback_type?: FeedbackType;
  improvement_scope?: ImprovementScope[];
  require_approval?: boolean;
  track_analytics?: boolean;
}

export interface LearningResult {
  config: LearningConfig;
  gaps: LearningGap[];
  evidence: LearningEvidence[];
  confidence: number;
}

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate learning configuration based on requirements
 * Pure function - no side effects
 */
export function runLearningDefaultsEngine(input: LearningInput): LearningResult {
  const {
    learning_enabled = true,
    learning_mode = 'passive',
    feedback_type = 'thumbs',
    improvement_scope = ['responses'],
    require_approval = true,
    track_analytics = true,
  } = input;

  const gaps: LearningGap[] = [];
  const evidence: LearningEvidence[] = [];

  // Build config
  const config: LearningConfig = {
    learning_enabled,
    mode: learning_enabled ? learning_mode : 'disabled',
    feedback: {
      type: learning_enabled ? feedback_type : 'none',
      prompt_after_conversation: learning_enabled && feedback_type !== 'none',
      min_rating_for_success: feedback_type === 'rating' ? 4 : 1,
    },
    improvement: {
      scope: learning_enabled ? improvement_scope : [],
      auto_apply: learning_mode === 'active' && !require_approval,
      require_approval,
      min_confidence_to_apply: require_approval ? 0.8 : 0.9,
    },
    analytics: {
      track_success_rate: track_analytics,
      track_response_quality: track_analytics,
      track_user_satisfaction: track_analytics && feedback_type !== 'none',
      retention_days: track_analytics ? 90 : 0,
    },
  };

  // Add evidence
  evidence.push({
    field_path: 'learning_config.mode',
    source: 'learning_mode',
    reasoning: `Learning mode set to ${config.mode}`,
  });

  if (learning_enabled) {
    evidence.push({
      field_path: 'learning_config.feedback',
      source: 'feedback_type',
      reasoning: `Feedback collection via ${feedback_type} enabled`,
    });

    evidence.push({
      field_path: 'learning_config.improvement',
      source: 'improvement_scope',
      reasoning: `Improvement scope: ${improvement_scope.join(', ')}${require_approval ? ' (requires approval)' : ''}`,
    });
  }

  if (track_analytics) {
    evidence.push({
      field_path: 'learning_config.analytics',
      source: 'track_analytics',
      reasoning: 'Analytics tracking enabled for performance monitoring',
    });
  }

  // Identify gaps
  if (!learning_enabled) {
    gaps.push({
      gap_type: 'learning_disabled',
      field_path: 'learning_config.learning_enabled',
      severity: 'low',
      impact: 'Agent will not improve over time from interactions',
      recommended_fix: 'Enable learning to allow agent to improve from feedback',
      source_phase: 'learning',
    });
  }

  if (learning_enabled && feedback_type === 'none') {
    gaps.push({
      gap_type: 'no_feedback',
      field_path: 'learning_config.feedback.type',
      severity: 'low',
      impact: 'No feedback collection - improvements must be inferred',
      recommended_fix: 'Enable feedback collection for better improvement signals',
      source_phase: 'learning',
    });
  }

  if (!track_analytics) {
    gaps.push({
      gap_type: 'no_analytics',
      field_path: 'learning_config.analytics',
      severity: 'low',
      impact: 'Cannot measure agent performance over time',
      recommended_fix: 'Enable analytics for performance tracking',
      source_phase: 'learning',
    });
  }

  // Calculate confidence
  let confidence = 0.9;
  if (learning_enabled && feedback_type !== 'none' && track_analytics) {
    confidence = 0.95;
  } else if (!learning_enabled) {
    confidence = 0.85; // Still valid, just limited
  }

  evidence.push({
    field_path: 'learning_config',
    source: 'learning_defaults_engine',
    reasoning: `Generated learning config: mode=${config.mode}, feedback=${feedback_type}, analytics=${track_analytics}`,
  });

  return {
    config,
    gaps,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Alias for backward compatibility
export function getDefaultLearningConfig(enabled: boolean = true): LearningConfig {
  const result = runLearningDefaultsEngine({ learning_enabled: enabled });
  return result.config;
}

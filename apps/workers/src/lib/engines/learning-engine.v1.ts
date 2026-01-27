/**
 * Learning Engine v1 (LE v1)
 *
 * Generates learning_config from template and company profile.
 * Pure function - no DB writes, no self-modification.
 * Orchestrator handles persistence via saveLearning.
 *
 * v1 Strategy:
 * - Default = learning OFF but infrastructure ready
 * - Supports feedback tracking and outcome signals
 * - Enforces safe boundaries (no self-modification)
 * - Signal collection only, not self-modification
 *
 * Input: templateKey, channels, companyProfile
 * Output: LearningEngineResult with config matching LearningConfigSchemaStrict
 */

import type {
  LearningConfig,
  FeedbackLoopConfig,
  SafeLearningBoundaries,
} from '@epic-ai/shared';
import type { AssemblyPhase } from '../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type ChannelType = 'voice' | 'chat' | 'sms' | 'email' | 'social';

export interface CompanyProfile {
  name?: string;
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface LearningGap {
  gap_type: 'learning_disabled' | 'no_feedback' | 'no_outcome_tracking';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface LearningWarning {
  code: string;
  message: string;
  severity: 'info' | 'low' | 'medium' | 'high';
}

export interface LearningEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface LearningEngineInput {
  templateKey: string;
  channels?: ChannelType[];
  companyProfile?: CompanyProfile;
}

export interface LearningEngineResult {
  learning_config: LearningConfig;
  gaps: LearningGap[];
  warnings: LearningWarning[];
  evidence: LearningEvidence[];
  confidence: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_FEEDBACK_LOOPS: FeedbackLoopConfig = {
  explicit_feedback: true,       // thumbs up/down, ratings
  implicit_signals: false,       // advanced v2
  outcome_learning: true,        // conversion, booking success
  min_samples: 20,
};

const DEFAULT_SAFE_BOUNDARIES: SafeLearningBoundaries = {
  max_confidence_delta: 0.1,
  protected_categories: ['governance', 'compliance', 'pricing'],
  review_threshold: 0.3,
  auto_rollback: true,
};

// Templates that should NOT have learning enabled by default
const LEARNING_DISABLED_TEMPLATES = [
  'faq_bot',
  'simple_responder',
  'static_info',
  'compliance_only',
];

// Templates that benefit most from learning
const LEARNING_RECOMMENDED_TEMPLATES = [
  'sales_assistant',
  'appointment_setter',
  'lead_qualifier',
  'customer_support',
  'onboarding_guide',
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine if learning should be enabled based on template
 */
function shouldEnableLearning(templateKey: string): boolean {
  // Explicitly disabled templates
  if (LEARNING_DISABLED_TEMPLATES.includes(templateKey)) {
    return false;
  }

  // For v1, default to disabled but ready
  // Users can enable via wizard
  return false;
}

/**
 * Determine if learning is recommended for this template
 */
function isLearningRecommended(templateKey: string): boolean {
  return LEARNING_RECOMMENDED_TEMPLATES.includes(templateKey);
}

/**
 * Get protected categories based on industry
 */
function getProtectedCategories(companyProfile?: CompanyProfile): string[] {
  const baseCategories = ['governance', 'compliance'];

  // Add industry-specific protected categories
  if (companyProfile?.industry) {
    const industry = companyProfile.industry.toLowerCase();

    if (industry.includes('health') || industry.includes('medical')) {
      baseCategories.push('medical_advice', 'hipaa');
    }
    if (industry.includes('finance') || industry.includes('insurance')) {
      baseCategories.push('financial_advice', 'pricing');
    }
    if (industry.includes('legal')) {
      baseCategories.push('legal_advice');
    }
  }

  return baseCategories;
}

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate learning configuration from template and profile
 * Pure function - no side effects, no self-modification
 */
export function runLearningEngine(input: LearningEngineInput): LearningEngineResult {
  const { templateKey, channels = [], companyProfile } = input;
  const gaps: LearningGap[] = [];
  const warnings: LearningWarning[] = [];
  const evidence: LearningEvidence[] = [];

  // Determine if learning should be enabled
  const learningEnabled = shouldEnableLearning(templateKey);
  const learningRecommended = isLearningRecommended(templateKey);

  // Build feedback loops config
  const feedback_loops: FeedbackLoopConfig = {
    ...DEFAULT_FEEDBACK_LOOPS,
    // Voice channels benefit from outcome learning
    outcome_learning: channels.includes('voice') || channels.includes('chat'),
  };

  // Build safe boundaries with industry-specific protections
  const safe_boundaries: SafeLearningBoundaries = {
    ...DEFAULT_SAFE_BOUNDARIES,
    protected_categories: getProtectedCategories(companyProfile),
  };

  // Build the learning config
  const learning_config: LearningConfig = {
    learning_enabled: learningEnabled,
    feedback_loops,
    safe_boundaries,
    approval_required: true,  // Always require approval in v1
    approvers: [],            // Set by user in wizard
  };

  // Add evidence
  evidence.push({
    field_path: 'learning_config.learning_enabled',
    source: 'template_analysis',
    reasoning: learningEnabled
      ? `Learning enabled for template: ${templateKey}`
      : `Learning disabled by default for template: ${templateKey}`,
  });

  evidence.push({
    field_path: 'learning_config.feedback_loops',
    source: 'channel_analysis',
    reasoning: `Feedback loops configured: explicit=${feedback_loops.explicit_feedback}, outcome=${feedback_loops.outcome_learning}`,
  });

  evidence.push({
    field_path: 'learning_config.safe_boundaries',
    source: 'industry_analysis',
    reasoning: `Protected categories: ${safe_boundaries.protected_categories.join(', ')}`,
  });

  // Add warnings if learning is disabled but recommended
  if (!learningEnabled && learningRecommended) {
    warnings.push({
      code: 'LEARNING_DISABLED',
      message: 'Agent is not improving from conversations. Consider enabling learning for better performance.',
      severity: 'info',
    });
  }

  // Add gaps (informational, not blocking)
  if (!learningEnabled) {
    gaps.push({
      gap_type: 'learning_disabled',
      field_path: 'learning_config.learning_enabled',
      severity: 'low',
      impact: 'Agent will not improve over time from interactions',
      recommended_fix: 'Enable learning to allow agent to improve from feedback',
      source_phase: 'learning',
    });
  }

  // Overall evidence
  evidence.push({
    field_path: 'learning_config',
    source: 'learning_engine_v1',
    reasoning: `Generated learning config: enabled=${learningEnabled}, approval_required=true, protected_categories=${safe_boundaries.protected_categories.length}`,
  });

  // Calculate confidence
  // Higher confidence when learning is configured consistently with template type
  let confidence = 0.7;
  if (!learningEnabled && !learningRecommended) {
    // Correctly disabled for a simple template
    confidence = 0.9;
  } else if (learningEnabled && learningRecommended) {
    // Correctly enabled for a learning-friendly template
    confidence = 0.85;
  } else if (!learningEnabled && learningRecommended) {
    // Could benefit from learning but disabled (user choice)
    confidence = 0.6;
  }

  return {
    learning_config,
    gaps,
    warnings,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Export for use in assembly orchestrator
export { runLearningEngine as generateLearningConfig };

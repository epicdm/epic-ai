/**
 * Snapshot Builder
 *
 * Assembles the final WizardSnapshot from all engine outputs.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * This module aggregates results from all phases into a unified snapshot
 * that can be used to create an agent or present to users for review.
 */

import type {
  AssemblyContext,
  AssemblyResult,
  AssemblyPhase,
  WizardSnapshot,
  SelectedTemplate,
  ToolConfig,
  GovernanceConfig,
  EconomicsConfig,
  CompanyProfile,
  AssemblyBrandVoice,
  KnowledgeConfig,
  ConfidenceBreakdown,
} from '../../processors/agent-os/assembly.orchestrator';

import type { ConversationFlow } from '../../processors/agent-os/conversation-flow.engine';
import type { PersonalityConfig } from '../../processors/agent-os/personality.engine';
import type { TemplateRecommendation } from '../../processors/agent-os/template-recommendation.engine';
import type { ToolAssignmentResult } from '../../processors/agent-os/tool-assignment.engine';

// ============================================================================
// Types
// ============================================================================

export interface SnapshotBuilderInput {
  agentId: string;
  status: 'draft' | 'complete' | 'failed';
  companyProfile?: CompanyProfile;
  brandVoiceProfile?: AssemblyBrandVoice;
  selectedTemplate?: TemplateRecommendation;
  templateAlternatives?: TemplateRecommendation[];
  toolAssignment?: ToolAssignmentResult;
  conversationFlow?: { flow: ConversationFlow; confidence: number; reasoning: string[] };
  personalityResult?: { personality: PersonalityConfig; confidence: number };
  knowledgeConfig?: KnowledgeConfig;
  governanceConfig?: GovernanceConfig;
  economicsConfig?: EconomicsConfig;
  gaps: AssemblyContext['gaps'];
  warnings: AssemblyContext['warnings'];
  evidence: AssemblyContext['evidence'];
  auditLog: AssemblyContext['auditLog'];
  state: AssemblyContext['state'];
  confidence: ConfidenceBreakdown;
}

// ============================================================================
// Default Factories
// ============================================================================

/**
 * Create an empty conversation flow
 */
export function createEmptyFlow(): ConversationFlow {
  return {
    flow_id: 'empty',
    template_type: 'sales_qualifier',
    version: '1.0',
    nodes: [],
    edges: [],
    objection_handlers: [],
    entry_node: 'start',
    success_outcomes: [],
    failure_outcomes: [],
    metadata: {
      estimated_turns: { min: 3, max: 10 },
      complexity_level: 'moderate',
      requires_qualification: false,
    },
  };
}

/**
 * Create an empty personality config
 */
export function createEmptyPersonality(): PersonalityConfig {
  return {
    persona: {
      name: 'Agent',
      role_title: 'AI Assistant',
      backstory_one_liner: 'A helpful AI assistant.',
    },
    tone: {
      traits: ['helpful', 'professional'],
      formality: 2,
      enthusiasm: 2,
      empathy: 2,
      humor: 1,
    },
    language: {
      vocabulary_style: 'balanced',
      sentence_length: 'mixed',
      filler_words: 'none',
      contraction_use: 'medium',
      forbidden_phrases: [],
      preferred_phrases: [],
    },
    conversation_style: {
      ask_permission_before_actions: true,
      confirm_critical_details: true,
      summarize_before_handoff: true,
      handle_interruptions: 'graceful',
      pacing: 'balanced',
    },
    role_boundaries: {
      allowed_topics: [],
      disallowed_topics: [],
      compliance_mode: 'standard',
      escalation_triggers: [],
    },
    channel_tuning: {
      voice: {
        speech_rate_wpm: 150,
        pause_frequency: 'medium',
        pronunciation_style: 'clear',
      },
      sms: {
        max_chars: 160,
        tone_adjustment: 'shorter',
      },
      email: {
        structure: 'paragraphs',
        signoff: 'Best regards',
      },
    },
  };
}

/**
 * Create default governance config
 */
export function createDefaultGovernanceConfig(): GovernanceConfig {
  return {
    compliance_mode: 'standard',
    forbidden_phrases: [
      'I guarantee',
      'I promise',
      '100% guaranteed',
      'absolutely certain',
      'no risk',
    ],
    disallowed_topics: ['competitor pricing', 'internal company issues'],
    escalation_triggers: ['speak to a human', 'get me a manager', 'emergency'],
    pii_handling: 'moderate',
    safe_claim_phrases: ['Based on our experience', 'Typically', 'In most cases'],
    handoff: {
      enabled: true,
      default_handoff_target_id: 'default_queue',
      handoff_targets: [
        {
          id: 'default_queue',
          label: 'Default Queue',
          description: 'Default escalation queue',
          context: 'default_queue',
          exten: '1',
          priority: 1,
          enabled: true,
          tags: ['default'],
        },
      ],
    },
  };
}

/**
 * Create default economics config
 */
export function createDefaultEconomicsConfig(): EconomicsConfig {
  return {
    token_budget_per_conversation: 4000,
    cost_per_channel: {
      VOICE: 0.15,
      CHAT: 0.02,
      SMS: 0.05,
      EMAIL: 0.01,
    },
    max_retries: 3,
    timeout_seconds: 30,
    priority: 'balanced',
  };
}

// ============================================================================
// Snapshot Builder
// ============================================================================

/**
 * Build tool config from assignment result
 */
export function buildToolConfig(toolAssignment?: ToolAssignmentResult): ToolConfig {
  if (!toolAssignment) {
    return { essential: [], recommended: [], optional: [], disabled: [] };
  }

  return {
    essential: toolAssignment.essential_tools.map((t) => ({
      id: t.id,
      reason: t.reason,
    })),
    recommended: toolAssignment.recommended_tools.map((t) => ({
      id: t.id,
      reason: t.reason,
    })),
    optional: toolAssignment.optional_tools.map((t) => ({
      id: t.id,
      reason: t.reason,
    })),
    disabled: toolAssignment.disabled_tools,
  };
}

/**
 * Build selected template summary
 */
export function buildSelectedTemplate(
  template?: TemplateRecommendation,
  alternatives?: TemplateRecommendation[]
): SelectedTemplate {
  if (!template) {
    return {
      template_key: 'unknown',
      match_score: 0,
      match_level: 'none',
      reasons: [],
      alternatives: [],
    };
  }

  return {
    template_key: template.agent_type,
    match_score: template.match_score,
    match_level: template.match_level,
    reasons: template.reasons,
    alternatives: (alternatives || []).map((t) => ({
      template_key: t.agent_type,
      match_score: t.match_score,
    })),
  };
}

/**
 * Build the complete wizard snapshot from all engine outputs
 */
export function buildWizardSnapshot(input: SnapshotBuilderInput): WizardSnapshot {
  return {
    company_profile: input.companyProfile || {},
    brand_voice_profile: input.brandVoiceProfile,
    selected_template: buildSelectedTemplate(
      input.selectedTemplate,
      input.templateAlternatives
    ),
    tools: buildToolConfig(input.toolAssignment),
    flows: input.conversationFlow?.flow || createEmptyFlow(),
    personality: input.personalityResult?.personality || createEmptyPersonality(),
    knowledge: input.knowledgeConfig || { seed_facts: [], knowledge_gaps: [] },
    governance: input.governanceConfig || createDefaultGovernanceConfig(),
    economics: input.economicsConfig || createDefaultEconomicsConfig(),
  };
}

/**
 * Build the full assembly result from context
 * This is the main entry point used by the orchestrator
 */
export function buildAssemblyResult(
  input: SnapshotBuilderInput
): AssemblyResult {
  const wizardSnapshot = buildWizardSnapshot(input);

  return {
    agentId: input.agentId,
    status: input.status,
    wizard_snapshot: wizardSnapshot,
    confidence: input.confidence,
    gaps: input.gaps,
    warnings: input.warnings,
    assembly_state: input.state,
    evidence: input.evidence,
    audit_log: input.auditLog,
  };
}

/**
 * Calculate overall confidence from phase confidences
 */
export function calculateOverallConfidence(
  byPhase: Record<AssemblyPhase, number>
): number {
  const phases = Object.values(byPhase).filter((v) => typeof v === 'number');
  if (phases.length === 0) return 0;
  return phases.reduce((sum, v) => sum + v, 0) / phases.length;
}

/**
 * Calculate confidence by dimension from phase data
 */
export function calculateDimensionConfidence(
  input: SnapshotBuilderInput
): Record<string, number> {
  const dimensions: Record<string, number> = {};

  // Company understanding
  if (input.companyProfile) {
    const companyFields = [
      input.companyProfile.name,
      input.companyProfile.industry,
      input.companyProfile.business_model,
      input.companyProfile.services?.length,
    ];
    dimensions.company_understanding = companyFields.filter(Boolean).length / companyFields.length;
  }

  // Template fit
  if (input.selectedTemplate) {
    dimensions.template_fit = input.selectedTemplate.match_score / 100;
  }

  // Tool coverage
  if (input.toolAssignment) {
    dimensions.tool_coverage = input.toolAssignment.confidence;
  }

  // Conversation design
  if (input.conversationFlow) {
    dimensions.conversation_design = input.conversationFlow.confidence;
  }

  // Personality coherence
  if (input.personalityResult) {
    dimensions.personality_coherence = input.personalityResult.confidence;
  }

  // Knowledge completeness
  if (input.knowledgeConfig) {
    const factCount = input.knowledgeConfig.seed_facts.length;
    const gapCount = input.knowledgeConfig.knowledge_gaps.length;
    dimensions.knowledge_completeness = Math.min(factCount / 10, 1) * (1 - Math.min(gapCount * 0.1, 0.5));
  }

  // Governance strength - always high for defaults
  dimensions.governance_strength = 0.9;

  // Economics feasibility
  dimensions.economics_feasibility = 0.9;

  return dimensions;
}

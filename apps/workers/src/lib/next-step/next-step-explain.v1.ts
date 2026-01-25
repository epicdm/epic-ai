/**
 * Next-step Explain Builder v1
 *
 * Enhanced next-step builder that provides:
 * - Why this step is next
 * - What's missing (gaps)
 * - What autopilot can do (auto_actions)
 * - What user must answer (questions)
 * - Step readiness + confidence
 * - UI rendering hints
 *
 * Uses the existing resolver but enriches the output with
 * actionable information for both UI and autopilot.
 */

import type {
  GapItem,
  WarningItem,
  ConfidenceMap,
  NextStepExplain,
  StepReadiness,
  AutoAction,
  UserQuestion,
  UIHints,
} from '@epic-ai/shared';

import { buildWizardSnapshotFromAgentId } from '../wizard-snapshot';
import { resolveNextStepV1, type ChannelType, type WizardSnapshot } from './resolve-next-step.v1';
import type { WizardStepKey } from './types';

// ============================================================================
// Types
// ============================================================================

export interface NextStepExplainSuccessResult {
  ok: true;
  data: NextStepExplain;
}

export interface NextStepExplainErrorResult {
  ok: false;
  error: { code: string; message: string };
}

export type BuildNextStepExplainResult = NextStepExplainSuccessResult | NextStepExplainErrorResult;

// ============================================================================
// Constants
// ============================================================================

const STEP_ORDER: WizardStepKey[] = [
  'company',
  'template',
  'tools',
  'flow',
  'personality',
  'brain',
  'knowledge',
  'memory',
  'learning',
  'governance',
  'economics',
  'review',
];

/** Steps that can be auto-filled */
const AUTOFILLABLE_STEPS: Set<WizardStepKey> = new Set([
  'tools',
  'flow',
  'personality',
  'brain',
  'knowledge',
  'memory',
  'learning',
]);

/** Step labels for UI */
const STEP_LABELS: Record<WizardStepKey, string> = {
  company: 'Company Profile',
  template: 'Agent Template',
  tools: 'Tools & Integrations',
  flow: 'Conversation Flow',
  personality: 'Personality & Voice',
  brain: 'Decision Engine',
  knowledge: 'Knowledge Base',
  memory: 'Memory System',
  learning: 'Learning Loop',
  governance: 'Governance Rules',
  economics: 'Economics & Pricing',
  review: 'Review & Launch',
};

/** Step descriptions */
const STEP_DESCRIPTIONS: Record<WizardStepKey, string> = {
  company: 'Set up your company profile so the agent knows who it represents.',
  template: 'Choose an agent template that matches your use case.',
  tools: 'Configure which tools and integrations your agent can use.',
  flow: 'Define the conversation flow and decision paths.',
  personality: 'Set the agent\'s voice, tone, and communication style.',
  brain: 'Configure decision-making policies and response rules.',
  knowledge: 'Connect knowledge sources for the agent to reference.',
  memory: 'Set up conversation memory and context handling.',
  learning: 'Configure how the agent learns and improves over time.',
  governance: 'Define compliance rules and operational guardrails.',
  economics: 'Set pricing, quotas, and resource limits.',
  review: 'Review all settings and publish your agent.',
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract channels from snapshot data
 */
function extractChannels(snapshot: WizardSnapshot | null): ChannelType[] {
  if (!snapshot) return ['VOICE'];

  const template = snapshot.selected_template as Record<string, unknown> | null;
  if (template?.channels && Array.isArray(template.channels)) {
    return template.channels.map((c: string) => c.toUpperCase() as ChannelType);
  }

  return ['VOICE'];
}

/**
 * Check if a step has data in the snapshot
 */
function stepHasData(snapshot: WizardSnapshot, step: WizardStepKey): boolean {
  switch (step) {
    case 'company':
      return !!snapshot.company_profile;
    case 'template':
      return !!snapshot.selected_template;
    case 'tools':
      return !!snapshot.tools;
    case 'flow':
      return !!snapshot.flows;
    case 'personality':
      return !!snapshot.personality;
    case 'brain':
      return !!snapshot.brain;
    case 'knowledge':
      return !!snapshot.knowledge;
    case 'memory':
      return !!snapshot.memory;
    case 'learning':
      return !!snapshot.learning;
    case 'governance':
      return !!snapshot.governance;
    case 'economics':
      return !!snapshot.economics;
    case 'review':
      return true;
    default:
      return false;
  }
}

/**
 * Get blocking gaps for a specific step
 */
function getBlockingGapsForStep(gaps: GapItem[], step: WizardStepKey): GapItem[] {
  return gaps.filter((g) => {
    const fp = g.field_path.toLowerCase();
    if (g.severity !== 'high') return false;

    switch (step) {
      case 'company':
        return fp.startsWith('company') || fp.includes('company_profile');
      case 'template':
        return fp.includes('template');
      case 'tools':
        return fp.startsWith('tools') || fp.includes('tool_config');
      case 'flow':
        return fp.startsWith('flow') || fp.includes('flow_config');
      case 'personality':
        return fp.startsWith('personality') || fp.includes('personality_config');
      case 'brain':
        return fp.startsWith('brain') || fp.includes('brain_config');
      case 'knowledge':
        return fp.startsWith('knowledge') || fp.includes('knowledge_config');
      case 'memory':
        return fp.startsWith('memory') || fp.includes('memory_config');
      case 'learning':
        return fp.startsWith('learning') || fp.includes('learning_config');
      case 'governance':
        return fp.startsWith('governance') || fp.includes('governance_config');
      case 'economics':
        return fp.startsWith('economics') || fp.includes('economics_config');
      default:
        return false;
    }
  });
}

/**
 * Build step readiness for all steps
 */
function buildStepReadiness(
  snapshot: WizardSnapshot,
  confidence: ConfidenceMap,
  gaps: GapItem[]
): StepReadiness[] {
  return STEP_ORDER.map((step) => {
    const hasData = stepHasData(snapshot, step);
    const blockingGaps = getBlockingGapsForStep(gaps, step);
    const isComplete = hasData && blockingGaps.length === 0;
    const canAutofill = AUTOFILLABLE_STEPS.has(step);
    const conf = typeof confidence[step] === 'number' ? confidence[step] : hasData ? 0.5 : 0;

    let statusMessage: string;
    if (step === 'review') {
      statusMessage = 'Ready for final review';
    } else if (!hasData) {
      statusMessage = 'Not configured';
    } else if (blockingGaps.length > 0) {
      statusMessage = `${blockingGaps.length} issue(s) to resolve`;
    } else if (conf < 0.7) {
      statusMessage = 'Configured but needs improvement';
    } else {
      statusMessage = 'Complete';
    }

    return {
      step,
      has_data: hasData,
      is_complete: isComplete,
      can_autofill: canAutofill,
      confidence: conf,
      status_message: statusMessage,
    };
  });
}

/**
 * Build questions user needs to answer for the current step
 */
function buildQuestionsForStep(
  step: WizardStepKey,
  snapshot: WizardSnapshot,
  gaps: GapItem[]
): UserQuestion[] {
  const questions: UserQuestion[] = [];

  // Company step questions
  if (step === 'company') {
    if (!snapshot.company_profile) {
      questions.push({
        question_id: 'company_website',
        question: 'What is your company website?',
        field_path: 'company_profile.website',
        input_type: 'url',
        placeholder: 'https://example.com',
        required: true,
        why_needed: 'We use your website to automatically extract company information and brand voice.',
      });
    }
  }

  // Template step questions
  if (step === 'template') {
    if (!snapshot.selected_template) {
      questions.push({
        question_id: 'template_selection',
        question: 'What type of agent do you want to create?',
        field_path: 'selected_template.key',
        input_type: 'select',
        options: [
          { value: 'sales_qualifier', label: 'Sales Qualifier', description: 'Qualify leads and book meetings' },
          { value: 'support_agent', label: 'Support Agent', description: 'Answer customer questions' },
          { value: 'appointment_setter', label: 'Appointment Setter', description: 'Schedule appointments' },
          { value: 'lead_gen', label: 'Lead Generator', description: 'Capture and nurture leads' },
          { value: 'info_assistant', label: 'Information Assistant', description: 'Provide information about products/services' },
        ],
        required: true,
        why_needed: 'The template determines your agent\'s default behavior and conversation flows.',
      });
    }
  }

  // Add questions from gaps
  for (const gap of gaps) {
    if (gap.severity === 'high' && gap.field_path.toLowerCase().includes(step)) {
      // Don't add duplicate questions
      if (!questions.some((q) => q.field_path === gap.field_path)) {
        questions.push({
          question_id: `gap_${gap.field_path.replace(/\./g, '_')}`,
          question: gap.recommended_fix,
          field_path: gap.field_path,
          input_type: 'text',
          required: true,
          why_needed: gap.impact,
        });
      }
    }
  }

  return questions;
}

/**
 * Build auto actions available for the current step
 */
function buildAutoActionsForStep(
  agentId: string,
  step: WizardStepKey,
  snapshot: WizardSnapshot,
  confidence: ConfidenceMap
): AutoAction[] {
  const actions: AutoAction[] = [];

  // Company step - enrich from website
  if (step === 'company') {
    const companyProfile = snapshot.company_profile as Record<string, unknown> | null;
    const website = companyProfile?.website as string | undefined;

    if (website) {
      actions.push({
        action_id: 'enrich_company',
        label: 'Auto-enrich Company',
        description: 'Use AI to extract company information from your website',
        endpoint: `/api/agent-os/agents/${agentId}/auto-fill-loop`,
        method: 'POST',
        body: { websiteUrl: website },
        expected_confidence: 0.85,
      });
    }
  }

  // Template step - auto-select template
  if (step === 'template' && snapshot.company_profile) {
    actions.push({
      action_id: 'auto_select_template',
      label: 'Auto-select Template',
      description: 'Let AI recommend the best template based on your company profile',
      endpoint: `/api/agent-os/agents/${agentId}/auto-fill-loop`,
      method: 'POST',
      body: { autoApplyTemplate: true },
      expected_confidence: 0.8,
    });
  }

  // Auto-fillable steps
  if (AUTOFILLABLE_STEPS.has(step)) {
    const stepConf = confidence[step] ?? 0;

    if (stepConf < 0.9) {
      actions.push({
        action_id: `autofill_${step}`,
        label: `Auto-fill ${STEP_LABELS[step]}`,
        description: `Use AI to configure ${STEP_LABELS[step].toLowerCase()} based on your profile and template`,
        endpoint: `/api/agent-os/agents/${agentId}/auto-fill-next-step`,
        method: 'POST',
        body: { desiredStep: step },
        expected_confidence: 0.85,
      });
    }
  }

  // Full auto-fill loop
  if (step !== 'review') {
    actions.push({
      action_id: 'autofill_all',
      label: 'Auto-fill All Steps',
      description: 'Run the complete auto-fill loop to configure all remaining steps',
      endpoint: `/api/agent-os/agents/${agentId}/auto-fill-loop`,
      method: 'POST',
      body: {},
      expected_confidence: 0.8,
    });
  }

  return actions;
}

/**
 * Build UI hints for the current step
 */
function buildUIHints(
  step: WizardStepKey,
  isBlocked: boolean,
  stepReadiness: StepReadiness[],
  autoActions: AutoAction[],
  questions: UserQuestion[]
): UIHints {
  // Calculate progress
  const completedSteps = stepReadiness.filter((s) => s.is_complete && s.step !== 'review').length;
  const totalSteps = STEP_ORDER.length - 1; // Exclude review
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Determine primary action
  let primaryAction: UIHints['primary_action'];

  if (step === 'review') {
    primaryAction = {
      label: 'Publish Agent',
      action: 'publish',
      disabled: isBlocked,
      disabled_reason: isBlocked ? 'Resolve all issues before publishing' : undefined,
    };
  } else if (questions.length > 0) {
    primaryAction = {
      label: 'Save & Continue',
      action: 'save',
      disabled: false,
    };
  } else if (autoActions.length > 0) {
    primaryAction = {
      label: 'Auto-fill',
      action: 'autofill',
      disabled: false,
    };
  } else {
    primaryAction = {
      label: 'Continue',
      action: 'continue',
      disabled: false,
    };
  }

  // Determine secondary action
  const stepIndex = STEP_ORDER.indexOf(step);
  const secondaryAction: UIHints['secondary_action'] =
    stepIndex > 0 ? { label: 'Back', action: 'back' } : undefined;

  return {
    title: STEP_LABELS[step],
    description: STEP_DESCRIPTIONS[step],
    primary_action: primaryAction,
    secondary_action: secondaryAction,
    progress_percent: progressPercent,
    show_autofill: AUTOFILLABLE_STEPS.has(step) || step === 'company' || step === 'template',
  };
}

/**
 * Build reason detail for why this is the next step
 */
function buildReasonDetail(
  step: WizardStepKey,
  isBlocked: boolean,
  blockingGaps: GapItem[],
  confidence: ConfidenceMap,
  snapshot: WizardSnapshot
): string {
  if (step === 'review') {
    return 'All configuration steps are complete. Review your settings and publish when ready.';
  }

  if (!stepHasData(snapshot, step)) {
    return `The ${STEP_LABELS[step]} step has not been configured yet. This is a required step in the wizard.`;
  }

  if (isBlocked && blockingGaps.length > 0) {
    const gap = blockingGaps[0];
    return `There are ${blockingGaps.length} high-severity issue(s) in ${STEP_LABELS[step]}: ${gap.impact}. ${gap.recommended_fix}`;
  }

  const stepConf = confidence[step] ?? 0;
  if (stepConf < 0.7) {
    return `The ${STEP_LABELS[step]} configuration has low confidence (${Math.round(stepConf * 100)}%). Consider reviewing and improving the settings.`;
  }

  return `The ${STEP_LABELS[step]} configuration needs attention based on the current analysis.`;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Build the enhanced next-step explanation from an agent ID.
 *
 * This function:
 * 1. Loads the wizard snapshot
 * 2. Runs the resolver to determine next step
 * 3. Enriches with questions, auto_actions, step_readiness, and UI hints
 * 4. Returns a comprehensive result for UI and autopilot
 */
export async function buildNextStepExplainFromAgentId(
  agentId: string
): Promise<BuildNextStepExplainResult> {
  const snap = await buildWizardSnapshotFromAgentId(agentId);

  if (!snap.ok) {
    return {
      ok: false,
      error: snap.error,
    };
  }

  const snapshot = (snap.data ?? {}) as WizardSnapshot;
  const channels = extractChannels(snapshot);
  const confidence = snap.confidence ?? {};
  const gaps = snap.gaps ?? [];
  const warnings = snap.warnings ?? [];

  // Run the existing resolver
  const result = resolveNextStepV1({
    agentId,
    deploymentState: snap.deploymentState,
    channels,
    templateKey: snap.templateKey ?? null,
    snapshot,
    confidence,
    gaps,
    warnings,
  });

  // Build enhanced data
  const stepReadiness = buildStepReadiness(snapshot, confidence, gaps);
  const questions = buildQuestionsForStep(result.next_step, snapshot, gaps);
  const autoActions = buildAutoActionsForStep(agentId, result.next_step, snapshot, confidence);
  const uiHints = buildUIHints(result.next_step, result.is_blocked, stepReadiness, autoActions, questions);
  const reasonDetail = buildReasonDetail(
    result.next_step,
    result.is_blocked,
    result.blocking_gaps,
    confidence,
    snapshot
  );

  const explainData: NextStepExplain = {
    agent_id: agentId,
    next_step: result.next_step,
    reason: result.reasons[0] ?? 'Continue wizard configuration',
    reason_detail: reasonDetail,
    is_blocked: result.is_blocked,
    deployment_state: snap.deploymentState,
    step_readiness: stepReadiness,
    confidence,
    gaps,
    warnings,
    questions,
    auto_actions: autoActions,
    ui: uiHints,
  };

  return {
    ok: true,
    data: explainData,
  };
}

// Re-export types
export type { WizardStepKey };

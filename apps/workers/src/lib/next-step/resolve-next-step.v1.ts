/**
 * Next-step Resolver v1
 *
 * Computes the next wizard step deterministically from:
 * - High severity gaps
 * - Lowest confidence modules
 * - Channel requirements (VOICE requires Flow, Tools, etc.)
 *
 * Pure function - no side effects, no DB access.
 */

import type { GapItem, WarningItem, ConfidenceMap } from '@epic-ai/shared';
import type { WizardStepKey } from './types';

// ============================================================================
// Types
// ============================================================================

// Re-export shared types for convenience
export type { GapItem as Gap, WarningItem as Warning, ConfidenceMap };

export type WizardSnapshot = {
  company_profile?: unknown | null;
  brand_voice_profile?: unknown | null;
  selected_template?: unknown | null;
  tools?: unknown | null;
  flows?: unknown | null;
  personality?: unknown | null;
  brain?: unknown | null;
  knowledge?: unknown | null;
  memory?: unknown | null;
  learning?: unknown | null;
  governance?: unknown | null;
  economics?: unknown | null;
};

export type ChannelType = 'VOICE' | 'CHAT' | 'SMS' | 'EMAIL';

export type ResolveArgs = {
  agentId: string;
  deploymentState: 'draft' | 'assembling' | 'ready' | 'published' | 'archived';
  channels: ChannelType[];
  templateKey: string | null;
  snapshot: WizardSnapshot;
  confidence: ConfidenceMap;
  gaps: GapItem[];
  warnings: WarningItem[];
};

export type NextStepResult = {
  next_step: WizardStepKey;
  is_blocked: boolean;
  blocking_gaps: GapItem[];
  reasons: string[];
  recommended_fix: string;
  confidence_summary: {
    overall: number;
    by_module: ConfidenceMap;
  };
};

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

// ============================================================================
// Helpers
// ============================================================================

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pickLowestConfidenceStep(conf: ConfidenceMap): WizardStepKey | null {
  // Map confidence keys -> wizard steps
  const map: Array<[string, WizardStepKey]> = [
    ['company', 'company'],
    ['template', 'template'],
    ['tools', 'tools'],
    ['flow', 'flow'],
    ['personality', 'personality'],
    ['brain', 'brain'],
    ['knowledge', 'knowledge'],
    ['memory', 'memory'],
    ['learning', 'learning'],
    ['governance', 'governance'],
    ['economics', 'economics'],
  ];

  let best: { step: WizardStepKey; score: number } | null = null;
  for (const [k, step] of map) {
    const score = typeof conf[k] === 'number' ? conf[k] : 1;
    if (!best || score < best.score) best = { step, score };
  }
  return best?.step ?? null;
}

function stepFromFieldPath(fieldPath: string): WizardStepKey | null {
  const p = fieldPath.toLowerCase();

  if (p.startsWith('company') || p.includes('company_profile')) return 'company';
  if (p.includes('template')) return 'template';
  if (p.startsWith('tools') || p.includes('tool_config')) return 'tools';
  if (p.startsWith('flow') || p.includes('flow_config')) return 'flow';
  if (p.startsWith('personality') || p.includes('personality_config')) return 'personality';
  if (p.startsWith('brain') || p.includes('brain_config')) return 'brain';
  if (p.startsWith('knowledge') || p.includes('knowledge_config')) return 'knowledge';
  if (p.startsWith('memory') || p.includes('memory_config')) return 'memory';
  if (p.startsWith('learning') || p.includes('learning_config')) return 'learning';
  if (p.startsWith('governance') || p.includes('governance_config')) return 'governance';
  if (p.startsWith('economics') || p.includes('economics_config')) return 'economics';

  return null;
}

function requiredStepsForChannels(channels: ChannelType[]): WizardStepKey[] {
  const isVoice = channels.includes('VOICE');
  if (isVoice) {
    // Voice requires Flow for conversation management
    return ['company', 'template', 'tools', 'flow', 'personality', 'brain', 'governance', 'economics'];
  }
  // Chat/SMS/Email can work without Flow
  return ['company', 'template', 'tools', 'personality', 'brain', 'governance', 'economics'];
}

function snapshotHasStepData(snapshot: WizardSnapshot, step: WizardStepKey): boolean {
  switch (step) {
    case 'company':
      return !!snapshot.company_profile;
    case 'template':
      return !!snapshot.selected_template;
    case 'tools':
      return !!snapshot.tools;
    case 'flow':
      return !!snapshot.flows; // Key is "flows" in WizardSnapshot
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

// ============================================================================
// Main Resolver
// ============================================================================

/**
 * Resolve the next wizard step based on gaps, confidence, and channel requirements.
 * Pure function - no side effects.
 */
export function resolveNextStepV1(args: ResolveArgs): NextStepResult {
  const { deploymentState, channels, templateKey, snapshot, confidence, gaps } = args;

  const required = requiredStepsForChannels(channels);

  // Blocking gaps = high severity
  const blocking = gaps.filter((g) => g.severity === 'high');

  const confidenceSummary = {
    overall: avg(Object.values(confidence).filter((x) => typeof x === 'number')),
    by_module: confidence,
  };

  // 1) If any required step is missing snapshot data, go there first
  for (const step of required) {
    if (!snapshotHasStepData(snapshot, step)) {
      const reason = `Missing required configuration for ${step}.`;
      return {
        next_step: step,
        is_blocked: true,
        blocking_gaps: blocking,
        reasons: [
          reason,
          ...(blocking.length ? [`There are ${blocking.length} high-severity gaps blocking readiness.`] : []),
        ],
        recommended_fix: `Complete the ${step} step to proceed.`,
        confidence_summary: confidenceSummary,
      };
    }
  }

  // 2) If there are high severity gaps, route to the step inferred from the first blocking gap
  if (blocking.length) {
    const inferred = stepFromFieldPath(blocking[0].field_path) ?? 'review';
    return {
      next_step: inferred,
      is_blocked: true,
      blocking_gaps: blocking,
      reasons: [
        `High-severity gap detected in ${inferred}.`,
        `Impact: ${blocking[0].impact}`,
      ],
      recommended_fix: blocking[0].recommended_fix,
      confidence_summary: confidenceSummary,
    };
  }

  // 3) Otherwise pick the lowest-confidence step (excluding review)
  const low = pickLowestConfidenceStep(confidence);
  if (low && low !== 'review') {
    return {
      next_step: low,
      is_blocked: false,
      blocking_gaps: [],
      reasons: [
        `Lowest confidence is in ${low}.`,
        templateKey ? `Template: ${templateKey}.` : 'No template selected.',
      ],
      recommended_fix: `Improve ${low} configuration to increase readiness and performance.`,
      confidence_summary: confidenceSummary,
    };
  }

  // 4) Otherwise review
  return {
    next_step: 'review',
    is_blocked: deploymentState !== 'ready',
    blocking_gaps: [],
    reasons: ['Configuration looks complete. Review and launch when ready.'],
    recommended_fix: 'Review settings and publish when satisfied.',
    confidence_summary: confidenceSummary,
  };
}

/**
 * Next-step Builder v1
 *
 * Builds the next-step result by:
 * 1. Loading the wizard snapshot
 * 2. Running the resolver to determine next step
 * 3. Returning structured result for the UI
 */

import type { GapItem, WarningItem, ConfidenceMap } from '@epic-ai/shared';
import { buildWizardSnapshotFromAgentId } from '../wizard-snapshot';
import { resolveNextStepV1, type ChannelType, type NextStepResult } from './resolve-next-step.v1';
import type { WizardStepKey } from './types';

// ============================================================================
// Types
// ============================================================================

export interface NextStepData extends NextStepResult {
  agentId: string;
  deploymentState: 'draft' | 'assembling' | 'ready' | 'published' | 'archived';
}

export interface NextStepSuccessResult {
  ok: true;
  data: NextStepData;
  confidence: ConfidenceMap;
  gaps: GapItem[];
  warnings: WarningItem[];
}

export interface NextStepErrorResult {
  ok: false;
  error: { code: string; message: string };
}

export type BuildNextStepResult = NextStepSuccessResult | NextStepErrorResult;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extract channels from snapshot data
 */
function extractChannels(snapshot: Record<string, unknown> | null): ChannelType[] {
  if (!snapshot) return ['VOICE'];

  // Try to get channels from selected_template
  const template = snapshot.selected_template as Record<string, unknown> | null;
  if (template?.channels && Array.isArray(template.channels)) {
    return template.channels.map((c: string) => c.toUpperCase() as ChannelType);
  }

  // Default to VOICE if no channels found
  return ['VOICE'];
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Build the next-step result from an agent ID.
 *
 * This function:
 * 1. Loads the wizard snapshot
 * 2. Runs the resolver to determine next step
 * 3. Returns structured result matching the response envelope
 */
export async function buildNextStepFromAgentId(agentId: string): Promise<BuildNextStepResult> {
  const snap = await buildWizardSnapshotFromAgentId(agentId);

  if (!snap.ok) {
    return {
      ok: false,
      error: snap.error,
    };
  }

  const channels = extractChannels(snap.data as Record<string, unknown> | null);

  const result = resolveNextStepV1({
    agentId,
    deploymentState: snap.deploymentState,
    channels,
    templateKey: snap.templateKey ?? null,
    snapshot: snap.data as Record<string, unknown>,
    confidence: snap.confidence ?? {},
    gaps: snap.gaps ?? [],
    warnings: snap.warnings ?? [],
  });

  return {
    ok: true,
    data: {
      agentId,
      deploymentState: snap.deploymentState,
      ...result,
    },
    confidence: snap.confidence ?? {},
    gaps: snap.gaps ?? [],
    warnings: snap.warnings ?? [],
  };
}

// Re-export types for convenience
export type { WizardStepKey, ChannelType, NextStepResult };

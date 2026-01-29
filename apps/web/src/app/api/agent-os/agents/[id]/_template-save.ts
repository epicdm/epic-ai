/**
 * Save Helper for Template Selection
 *
 * Saves template selection to Agent model, including:
 * - templateKey (selected template identifier)
 * - seeds (role_card, brain_config, personality seeds for downstream engines)
 */

import { prisma } from "@epic-ai/database";
import type { TemplateEngineResult, SelectedTemplate, TemplateSeeds } from "@epic-ai/workers/lib";

// ============================================================================
// Types
// ============================================================================

export interface SaveTemplateResult {
  agentId: string;
  templateKey: string;
  savedAt: Date;
  hasSeeds: boolean;
}

export interface TemplateSelectionData {
  templateKey: string;
  selectedTemplate: SelectedTemplate;
  seeds: TemplateSeeds;
  matches: Array<{ templateKey: string; score: number }>;
  confidence: Record<string, number>;
  evidence: Array<{
    source_type: string;
    field_path: string;
    confidence: number;
    reasoning?: string;
    extracted_text?: string;
  }>;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Save template selection to Agent
 *
 * Updates:
 * - roleCard (with template seeds)
 * - Stores template selection metadata in roleCard.templateSelection
 */
export async function saveTemplateSelection(
  agentId: string,
  result: TemplateEngineResult
): Promise<SaveTemplateResult> {
  if (!result.templateKey || !result.selected_template) {
    throw new Error("No template selected in engine result");
  }

  // Build the template selection data to store
  const templateSelection: TemplateSelectionData = {
    templateKey: result.templateKey,
    selectedTemplate: result.selected_template,
    seeds: result.seeds,
    matches: result.matches.map((m) => ({
      templateKey: m.templateKey,
      score: m.score,
    })),
    confidence: result.confidence,
    evidence: result.evidence,
  };

  // Update Agent with template selection
  // Store in roleCard since it's the first config that uses template data
  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: {
      // Store template selection in roleCard for downstream engines
      roleCard: JSON.parse(
        JSON.stringify({
          templateSelection,
          // Also spread seeds.role_card if available
          ...(result.seeds.role_card ?? {}),
        })
      ),
    },
    select: {
      id: true,
      updatedAt: true,
    },
  });

  return {
    agentId: updated.id,
    templateKey: result.templateKey,
    savedAt: updated.updatedAt,
    hasSeeds: !!(result.seeds.role_card || result.seeds.brain_config || result.seeds.personality_seed),
  };
}

/**
 * Get the current template selection for an agent
 */
export async function getAgentTemplateSelection(
  agentId: string
): Promise<TemplateSelectionData | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { roleCard: true },
  });

  if (!agent?.roleCard) return null;

  const roleCard = agent.roleCard as Record<string, unknown>;
  const templateSelection = roleCard.templateSelection as TemplateSelectionData | undefined;

  return templateSelection ?? null;
}

/**
 * Check if agent has a template selected
 */
export async function hasTemplateSelected(agentId: string): Promise<boolean> {
  const selection = await getAgentTemplateSelection(agentId);
  return !!selection?.templateKey;
}

/**
 * Get template key for an agent (if selected)
 *
 * Checks two sources in priority order:
 * 1. governance_config.template_key (Template Engine v1)
 * 2. roleCard.templateSelection.templateKey (legacy full template engine)
 */
export async function getAgentTemplateKey(agentId: string): Promise<string | null> {
  // First check governance_config.template_key (Template Engine v1)
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { governanceConfig: true, roleCard: true },
  });

  if (!agent) return null;

  // Priority 1: governance_config.template_key (Template Engine v1)
  const governanceConfig = agent.governanceConfig as Record<string, unknown> | null;
  if (governanceConfig?.template_key) {
    return governanceConfig.template_key as string;
  }

  // Priority 2: roleCard.templateSelection.templateKey (legacy)
  const roleCard = agent.roleCard as Record<string, unknown> | null;
  const templateSelection = roleCard?.templateSelection as TemplateSelectionData | undefined;
  return templateSelection?.templateKey ?? null;
}

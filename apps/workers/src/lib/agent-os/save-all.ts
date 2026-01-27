/**
 * Agent OS Bulk Save
 *
 * Save all config modules in a single operation with error collection.
 * Designed for use by the assembly orchestrator at the end of each phase.
 */

import { prisma, Prisma, AgentStatus } from '@epic-ai/database';
import { z } from 'zod';

import {
  RoleCardSchemaStrict,
  ToolConfigSchemaStrict,
  BrainConfigSchemaStrict,
  PersonalityConfigSchemaStrict,
  KnowledgeConfigSchemaStrict,
  MemoryConfigSchemaStrict,
  LearningConfigSchemaStrict,
  GovernanceConfigSchemaStrict,
  EconomicsConfigSchemaStrict,
  GapItemSchema,
  WarningItemSchema,
} from '@epic-ai/shared';

import {
  type SaveMeta,
  type SaveResult,
  type GapItem,
  type WarningItem,
  AgentNotFoundError,
  AgentPublishedError,
} from './save-helpers';

// ============================================================================
// Types
// ============================================================================

export type ModulePayloads = {
  role_card?: unknown;
  tools?: unknown;
  brain?: unknown;
  personality?: unknown;
  knowledge?: unknown;
  memory?: unknown;
  learning?: unknown;
  governance?: unknown;
  economics?: unknown;
};

export type SaveAllOptions = {
  meta?: SaveMeta;
  mergeMode?: 'replace' | 'shallow';
  /** If true, stop on first error. Default: false (collect all errors) */
  failFast?: boolean;
};

export type ModuleError = {
  module: string;
  error: string;
  zodIssues?: z.ZodIssue[];
};

export type SaveAllResult = {
  ok: boolean;
  saved: string[];
  errors: ModuleError[];
  gaps: GapItem[];
  warnings: WarningItem[];
};

// ============================================================================
// Schema Map
// ============================================================================

const ModuleSchemas = {
  role_card: RoleCardSchemaStrict,
  tools: ToolConfigSchemaStrict,
  brain: BrainConfigSchemaStrict,
  personality: PersonalityConfigSchemaStrict,
  knowledge: KnowledgeConfigSchemaStrict,
  memory: MemoryConfigSchemaStrict,
  learning: LearningConfigSchemaStrict,
  governance: GovernanceConfigSchemaStrict,
  economics: EconomicsConfigSchemaStrict,
} as const;

// Map module keys to Prisma field names
const ModuleToField = {
  role_card: 'roleCard',
  tools: 'toolConfig',
  brain: 'brainConfig',
  personality: 'personalityConfig',
  knowledge: 'knowledgeConfig',
  memory: 'memoryConfig',
  learning: 'learningConfig',
  governance: 'governanceConfig',
  economics: 'economicsConfig',
} as const;

type ModuleKey = keyof typeof ModuleSchemas;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Save multiple config modules in a single transaction.
 * Collects validation errors and gaps/warnings from each module.
 *
 * Usage:
 * ```typescript
 * const result = await saveAllModulesOrCollectErrors(agent.id, {
 *   role_card: roleCardOut,
 *   tools: toolsOut,
 *   brain: brainOut,
 * }, {
 *   meta: { actor: 'job', jobId: String(job.id) },
 *   mergeMode: 'replace',
 *   failFast: false,
 * });
 *
 * if (!result.ok) {
 *   // Handle errors - some modules may have failed validation
 *   console.error('Save errors:', result.errors);
 * }
 *
 * // Gaps and warnings are always collected for wizard snapshot
 * console.log('Gaps:', result.gaps);
 * console.log('Warnings:', result.warnings);
 * ```
 *
 * @throws AgentNotFoundError if agent doesn't exist
 * @throws AgentPublishedError if agent is not DRAFT
 */
export async function saveAllModulesOrCollectErrors(
  agentId: string,
  payloads: ModulePayloads,
  opts?: SaveAllOptions
): Promise<SaveAllResult> {
  const { meta, mergeMode = 'replace', failFast = false } = opts || {};

  // 1. Load agent and verify DRAFT status
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      status: true,
      roleCard: true,
      brainConfig: true,
      personalityConfig: true,
      toolConfig: true,
      knowledgeConfig: true,
      memoryConfig: true,
      learningConfig: true,
      governanceConfig: true,
      economicsConfig: true,
    },
  });

  if (!agent) {
    throw new AgentNotFoundError(agentId);
  }

  if (agent.status !== AgentStatus.DRAFT) {
    throw new AgentPublishedError(agentId, agent.status);
  }

  // 2. Validate and collect data for each module
  const saved: string[] = [];
  const errors: ModuleError[] = [];
  const allGaps: GapItem[] = [];
  const allWarnings: WarningItem[] = [];
  const updateData: Record<string, unknown> = { updatedAt: new Date() };

  for (const [moduleKey, data] of Object.entries(payloads)) {
    if (data === undefined) continue;

    const module = moduleKey as ModuleKey;
    const schema = ModuleSchemas[module];
    const fieldName = ModuleToField[module];

    if (!schema) {
      errors.push({ module, error: `Unknown module: ${module}` });
      if (failFast) break;
      continue;
    }

    // Validate with strict schema
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      errors.push({
        module,
        error: `Validation failed for ${module}`,
        zodIssues: parsed.error.issues,
      });
      if (failFast) break;
      continue;
    }

    // Extract gaps and warnings if present in the data
    const validatedData = parsed.data as Record<string, unknown>;
    if (Array.isArray(validatedData.gaps)) {
      const gapsResult = z.array(GapItemSchema).safeParse(validatedData.gaps);
      if (gapsResult.success) {
        allGaps.push(...gapsResult.data);
      }
    }
    if (Array.isArray(validatedData.warnings)) {
      const warningsResult = z.array(WarningItemSchema).safeParse(validatedData.warnings);
      if (warningsResult.success) {
        allWarnings.push(...warningsResult.data);
      }
    }

    // Prepare data (merge or replace)
    const existingData = (agent[fieldName as keyof typeof agent] as Record<string, unknown>) || {};
    const finalData = mergeMode === 'shallow' ? { ...existingData, ...validatedData } : validatedData;

    updateData[fieldName] = finalData as Prisma.InputJsonValue;
    saved.push(module);
  }

  // 3. Audit log
  if (process.env.NODE_ENV === 'development' && saved.length > 0) {
    console.log(`[AO:saveAll] agent=${agentId} modules=${saved.join(',')}`, meta);
  }

  // 4. Save all valid modules in one update
  if (saved.length > 0) {
    await prisma.agent.update({
      where: { id: agentId },
      data: updateData as Prisma.AgentUpdateInput,
    });
  }

  // 5. Append gaps and warnings to agent tracking fields
  if (allGaps.length > 0 || allWarnings.length > 0) {
    // Load current gaps/warnings
    const currentAgent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { configGaps: true, configWarnings: true },
    });

    const existingGaps: GapItem[] = [];
    const existingWarnings: WarningItem[] = [];

    if (currentAgent) {
      if (Array.isArray(currentAgent.configGaps)) {
        existingGaps.push(...(currentAgent.configGaps as GapItem[]));
      }
      if (Array.isArray(currentAgent.configWarnings)) {
        existingWarnings.push(...(currentAgent.configWarnings as WarningItem[]));
      }
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        configGaps: [...existingGaps, ...allGaps] as unknown as Prisma.InputJsonValue,
        configWarnings: [...existingWarnings, ...allWarnings] as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return {
    ok: errors.length === 0,
    saved,
    errors,
    gaps: allGaps,
    warnings: allWarnings,
  };
}

/**
 * Convenience function to save all modules and throw on any error.
 * Use this when you want strict validation and don't want to collect partial results.
 */
export async function saveAllModulesOrThrow(
  agentId: string,
  payloads: ModulePayloads,
  opts?: Omit<SaveAllOptions, 'failFast'>
): Promise<{ saved: string[]; gaps: GapItem[]; warnings: WarningItem[] }> {
  const result = await saveAllModulesOrCollectErrors(agentId, payloads, {
    ...opts,
    failFast: true,
  });

  if (!result.ok) {
    const firstError = result.errors[0];
    throw new Error(`Save failed for ${firstError?.module}: ${firstError?.error}`);
  }

  return {
    saved: result.saved,
    gaps: result.gaps,
    warnings: result.warnings,
  };
}

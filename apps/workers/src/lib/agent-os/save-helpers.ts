/**
 * Agent OS Save Helpers
 *
 * Type-safe, validated save functions for all 10 agent config modules.
 * Features:
 * - DRAFT-only enforcement (PUBLISHED/ARCHIVED are immutable)
 * - Zod strict schema validation
 * - Optional shallow merge mode
 * - Audit logging support
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
  FlowConfigSchemaStrict,
  GapItemSchema,
  WarningItemSchema,
} from '@epic-ai/shared';

// ============================================================================
// Types
// ============================================================================

export type SaveMeta = {
  actor?: 'system' | 'user' | 'job';
  actorId?: string;
  jobId?: string;
  phase?: string;
  reason?: string;
};

export type SaveOptions = {
  mergeMode?: 'replace' | 'shallow';
  meta?: SaveMeta;
  onInvalid?: 'throw' | 'return';
};

export type SaveResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; zodIssues?: z.ZodIssue[] };

// ============================================================================
// Errors
// ============================================================================

export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentPublishedError extends Error {
  constructor(agentId: string, status: string) {
    super(`Agent ${agentId} is ${status} and cannot be modified`);
    this.name = 'AgentPublishedError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

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
  flow: FlowConfigSchemaStrict,
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
  flow: 'flowConfig',
} as const;

export type ModuleKey = keyof typeof ModuleSchemas;
type FieldName = (typeof ModuleToField)[ModuleKey];

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Asserts agent exists and is in DRAFT status
 */
async function assertDraftAgent(agentId: string): Promise<{
  id: string;
  status: AgentStatus;
  roleCard: unknown;
  brainConfig: unknown;
  personalityConfig: unknown;
  toolConfig: unknown;
  knowledgeConfig: unknown;
  memoryConfig: unknown;
  learningConfig: unknown;
  governanceConfig: unknown;
  economicsConfig: unknown;
  flowConfig: unknown;
}> {
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
      flowConfig: true,
    },
  });

  if (!agent) {
    throw new AgentNotFoundError(agentId);
  }

  if (agent.status !== AgentStatus.DRAFT) {
    throw new AgentPublishedError(agentId, agent.status);
  }

  return agent;
}

/**
 * Simple audit logging (can be extended to write to DB or external service)
 */
function auditLog(
  agentId: string,
  module: string,
  action: 'save' | 'merge',
  meta?: SaveMeta
): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[AO:save] agent=${agentId} module=${module} action=${action}`, meta);
  }
  // Future: write to audit table or external logging service
}

/**
 * Shallow merge preserving existing values
 */
function shallowMerge<T extends Record<string, unknown>>(base: T, incoming: Partial<T>): T {
  return { ...base, ...incoming };
}

// ============================================================================
// Generic Save Function
// ============================================================================

/**
 * Save a single config module with validation
 */
async function saveModule<K extends ModuleKey>(
  agentId: string,
  module: K,
  data: unknown,
  options?: SaveOptions
): Promise<SaveResult<z.infer<(typeof ModuleSchemas)[K]>>> {
  const { mergeMode = 'replace', meta, onInvalid = 'throw' } = options || {};
  const fieldName = ModuleToField[module];
  const schema = ModuleSchemas[module];

  // 1. Validate with strict schema
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    if (onInvalid === 'throw') {
      throw new ValidationError(`Validation failed for ${module}`, parsed.error.issues);
    }
    return {
      ok: false,
      error: `Validation failed for ${module}`,
      zodIssues: parsed.error.issues,
    };
  }

  // 2. Assert DRAFT status
  const agent = await assertDraftAgent(agentId);

  // 3. Prepare data (merge or replace)
  const existingData = (agent[fieldName as keyof typeof agent] as Record<string, unknown>) || {};
  const finalData = mergeMode === 'shallow' ? shallowMerge(existingData, parsed.data) : parsed.data;

  // 4. Audit log
  auditLog(agentId, module, mergeMode === 'shallow' ? 'merge' : 'save', meta);

  // 5. Save to database
  await prisma.agent.update({
    where: { id: agentId },
    data: {
      [fieldName]: finalData as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { ok: true, data: finalData as z.infer<(typeof ModuleSchemas)[K]> };
}

// ============================================================================
// Individual Save Functions
// ============================================================================

export async function saveRoleCard(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof RoleCardSchemaStrict>>> {
  return saveModule(agentId, 'role_card', data, opts);
}

export async function saveTools(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof ToolConfigSchemaStrict>>> {
  return saveModule(agentId, 'tools', data, opts);
}

export async function saveBrain(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof BrainConfigSchemaStrict>>> {
  return saveModule(agentId, 'brain', data, opts);
}

export async function savePersonality(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof PersonalityConfigSchemaStrict>>> {
  return saveModule(agentId, 'personality', data, opts);
}

export async function saveKnowledge(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof KnowledgeConfigSchemaStrict>>> {
  return saveModule(agentId, 'knowledge', data, opts);
}

export async function saveMemory(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof MemoryConfigSchemaStrict>>> {
  return saveModule(agentId, 'memory', data, opts);
}

export async function saveLearning(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof LearningConfigSchemaStrict>>> {
  return saveModule(agentId, 'learning', data, opts);
}

export async function saveGovernance(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof GovernanceConfigSchemaStrict>>> {
  return saveModule(agentId, 'governance', data, opts);
}

export async function saveEconomics(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof EconomicsConfigSchemaStrict>>> {
  return saveModule(agentId, 'economics', data, opts);
}

export async function saveFlow(
  agentId: string,
  data: unknown,
  opts?: SaveOptions
): Promise<SaveResult<z.infer<typeof FlowConfigSchemaStrict>>> {
  return saveModule(agentId, 'flow', data, opts);
}

// ============================================================================
// Gap & Warning Types
// ============================================================================

export type GapItem = z.infer<typeof GapItemSchema>;
export type WarningItem = z.infer<typeof WarningItemSchema>;

// ============================================================================
// Confidence & Metadata Helpers
// ============================================================================

export interface ConfidenceUpdate {
  overall?: number;
  byPhase?: Record<string, number>;
  byDimension?: Record<string, number>;
  evidence?: Array<{
    field_path: string;
    source: string;
    reasoning: string;
    source_phase?: string;
  }>;
}

/**
 * Update agent's confidence tracking fields
 */
export async function saveConfidence(
  agentId: string,
  confidence: ConfidenceUpdate,
  opts?: { merge?: boolean }
): Promise<SaveResult<ConfidenceUpdate>> {
  const { merge = true } = opts || {};

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true, configConfidence: true },
  });

  if (!agent) {
    return { ok: false, error: 'AGENT_NOT_FOUND' };
  }

  if (agent.status !== AgentStatus.DRAFT) {
    return { ok: false, error: `AGENT_IMMUTABLE:${agent.status}` };
  }

  const existing = (agent.configConfidence as Record<string, unknown>) || {};
  const finalData = merge ? { ...existing, ...confidence } : confidence;

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      configConfidence: finalData as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { ok: true, data: finalData as ConfidenceUpdate };
}

/**
 * Append gaps to agent's configGaps array
 */
export async function appendGaps(agentId: string, gaps: GapItem[]): Promise<SaveResult<GapItem[]>> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true, configGaps: true },
  });

  if (!agent) {
    return { ok: false, error: 'AGENT_NOT_FOUND' };
  }

  if (agent.status !== AgentStatus.DRAFT) {
    return { ok: false, error: `AGENT_IMMUTABLE:${agent.status}` };
  }

  const existingGaps = Array.isArray(agent.configGaps) ? (agent.configGaps as GapItem[]) : [];
  const finalGaps = [...existingGaps, ...gaps];

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      configGaps: finalGaps as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { ok: true, data: finalGaps };
}

/**
 * Append warnings to agent's configWarnings array
 */
export async function appendWarnings(
  agentId: string,
  warnings: WarningItem[]
): Promise<SaveResult<WarningItem[]>> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true, configWarnings: true },
  });

  if (!agent) {
    return { ok: false, error: 'AGENT_NOT_FOUND' };
  }

  if (agent.status !== AgentStatus.DRAFT) {
    return { ok: false, error: `AGENT_IMMUTABLE:${agent.status}` };
  }

  const existingWarnings = Array.isArray(agent.configWarnings)
    ? (agent.configWarnings as WarningItem[])
    : [];
  const finalWarnings = [...existingWarnings, ...warnings];

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      configWarnings: finalWarnings as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return { ok: true, data: finalWarnings };
}

/**
 * Clear gaps and warnings (typically before re-assembly)
 */
export async function clearGapsAndWarnings(agentId: string): Promise<SaveResult<null>> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, status: true },
  });

  if (!agent) {
    return { ok: false, error: 'AGENT_NOT_FOUND' };
  }

  if (agent.status !== AgentStatus.DRAFT) {
    return { ok: false, error: `AGENT_IMMUTABLE:${agent.status}` };
  }

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      configGaps: [],
      configWarnings: [],
      updatedAt: new Date(),
    },
  });

  return { ok: true, data: null };
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { AgentStatus };

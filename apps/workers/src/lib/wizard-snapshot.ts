/**
 * Wizard Snapshot Builder
 *
 * Single source of truth for the wizard UI.
 * Reads agent + company, normalizes the 10 JSONB blobs,
 * calculates confidence/gaps/warnings, and returns a payload
 * matching WizardSnapshotSchema + response envelope.
 *
 * This is the glue between:
 * - AO + save helpers (writes validated JSONB)
 * - Wizard UI (renders snapshot, highlights gaps, shows confidence)
 */

import { prisma, AgentStatus } from '@epic-ai/database';
import { z } from 'zod';
import {
  WizardSnapshotSchema,
  GapItemSchema,
  WarningItemSchema,
  ConfidenceMapSchema,
  // Strict schemas for defensive validation of DB data
  RoleCardSchemaStrict,
  BrainConfigSchemaStrict,
  PersonalityConfigSchemaStrict,
  ToolConfigSchemaStrict,
  KnowledgeConfigSchemaStrict,
  MemoryConfigSchemaStrict,
  LearningConfigSchemaStrict,
  GovernanceConfigSchemaStrict,
  EconomicsConfigSchemaStrict,
  FlowConfigSchemaStrict,
} from '@epic-ai/shared';

// ============================================================================
// Types
// ============================================================================

export type GapItem = z.infer<typeof GapItemSchema>;
export type WarningItem = z.infer<typeof WarningItemSchema>;
export type ConfidenceMap = z.infer<typeof ConfidenceMapSchema>;
export type WizardSnapshot = z.infer<typeof WizardSnapshotSchema>;

export type DeploymentState = 'draft' | 'assembling' | 'ready' | 'published' | 'archived';

export interface WizardSnapshotResult {
  ok: true;
  data: WizardSnapshot;
  confidence: ConfidenceMap;
  gaps: GapItem[];
  warnings: WarningItem[];
  agentId: string;
  companyId: string | null;
  deploymentState: DeploymentState;
  templateKey: string | null;
}

export interface WizardSnapshotError {
  ok: false;
  error: { code: string; message: string };
}

export type BuildWizardSnapshotResult = WizardSnapshotResult | WizardSnapshotError;

// ============================================================================
// Helper Functions
// ============================================================================

function isEmptyObject(v: unknown): v is Record<string, never> {
  return Boolean(v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0);
}

function confScore(has: boolean): number {
  return has ? 1 : 0;
}

function addMissingConfigGap(module: string): GapItem {
  return {
    gap_type: 'missing_config',
    field_path: module,
    severity: 'high',
    impact: `${module} is not configured yet.`,
    recommended_fix: `Complete the ${module} step in the wizard.`,
    question_to_user: `Please provide configuration for ${module}.`,
  };
}

function addInvalidConfigGap(
  module: string,
  issues: { path: string; message: string }[]
): GapItem {
  return {
    gap_type: 'invalid',
    field_path: module,
    severity: 'high',
    impact: `${module} config is invalid and must be fixed.`,
    recommended_fix: `Fix the ${module} config to match schema.`,
    suggestions: issues.slice(0, 8).map((i) => `${i.path}: ${i.message}`),
  };
}

function warn(
  code: string,
  message: string,
  fieldPath?: string,
  suggestion?: string
): WarningItem {
  return {
    code,
    message,
    severity: 'warning',
    field_path: fieldPath,
    suggestion,
  };
}

type ParseResult<T> = { ok: true; data: T; issues: never[] } | { ok: false; data: T; issues: { path: string; message: string }[] };

function safeParseToCanonical<T>(schema: z.ZodTypeAny, data: unknown): ParseResult<T> {
  const parsed = schema.safeParse(data ?? {});
  if (parsed.success) {
    return { ok: true, data: parsed.data as T, issues: [] as never[] };
  }
  return {
    ok: false,
    data: (data ?? {}) as T,
    issues: parsed.error.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      message: i.message,
    })),
  };
}

function mapStatusToDeploymentState(status: AgentStatus): DeploymentState {
  switch (status) {
    case AgentStatus.DRAFT:
      return 'draft';
    case AgentStatus.PUBLISHED:
      return 'published';
    case AgentStatus.ARCHIVED:
      return 'archived';
    default:
      return 'draft';
  }
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Build a complete WizardSnapshot from an agent ID.
 *
 * This function:
 * 1. Loads the agent with its related company/template data
 * 2. Defensively validates all 10 config blobs against schemas
 * 3. Calculates confidence scores per module
 * 4. Detects gaps and warnings
 * 5. Returns a complete snapshot for the wizard UI
 */
export async function buildWizardSnapshotFromAgentId(
  agentId: string
): Promise<BuildWizardSnapshotResult> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      companyProfile: true,
      template: true,
    },
  });

  if (!agent) {
    return {
      ok: false,
      error: { code: 'AGENT_NOT_FOUND', message: 'Agent not found' },
    };
  }

  const gaps: GapItem[] = [];
  const warnings: WarningItem[] = [];
  const confidence: ConfidenceMap = {};

  // Pull DB blobs (using actual Prisma field names)
  const roleCardRaw = agent.roleCard;
  const brainRaw = agent.brainConfig;
  const personalityRaw = agent.personalityConfig;
  const toolsRaw = agent.toolConfig;
  const knowledgeRaw = agent.knowledgeConfig;
  const memoryRaw = agent.memoryConfig;
  const learningRaw = agent.learningConfig;
  const governanceRaw = agent.governanceConfig;
  const economicsRaw = agent.economicsConfig;
  const flowRaw = agent.flowConfig;

  // Defensive schema parse (DB should already be valid, but don't trust forever)
  const roleCard = safeParseToCanonical(RoleCardSchemaStrict, roleCardRaw);
  const brain = safeParseToCanonical(BrainConfigSchemaStrict, brainRaw);
  const personality = safeParseToCanonical(PersonalityConfigSchemaStrict, personalityRaw);
  const tools = safeParseToCanonical(ToolConfigSchemaStrict, toolsRaw);
  const knowledge = safeParseToCanonical(KnowledgeConfigSchemaStrict, knowledgeRaw);
  const memory = safeParseToCanonical(MemoryConfigSchemaStrict, memoryRaw);
  const learning = safeParseToCanonical(LearningConfigSchemaStrict, learningRaw);
  const governance = safeParseToCanonical(GovernanceConfigSchemaStrict, governanceRaw);
  const economics = safeParseToCanonical(EconomicsConfigSchemaStrict, economicsRaw);
  const flow = safeParseToCanonical(FlowConfigSchemaStrict, flowRaw);

  // Gaps + confidence per module
  const modules: Array<[string, ParseResult<unknown>, unknown]> = [
    ['role_card', roleCard, roleCardRaw],
    ['brain', brain, brainRaw],
    ['personality', personality, personalityRaw],
    ['tools', tools, toolsRaw],
    ['knowledge', knowledge, knowledgeRaw],
    ['memory', memory, memoryRaw],
    ['learning', learning, learningRaw],
    ['governance', governance, governanceRaw],
    ['economics', economics, economicsRaw],
    ['flow', flow, flowRaw],
  ];

  for (const [name, parsed, raw] of modules) {
    if (!raw || isEmptyObject(raw)) {
      gaps.push(addMissingConfigGap(name));
      confidence[name] = confScore(false);
      continue;
    }

    if (!parsed.ok) {
      gaps.push(addInvalidConfigGap(name, parsed.issues));
      warnings.push(
        warn(
          'MODULE_SCHEMA_INVALID',
          `Schema validation failed for module "${name}".`,
          name,
          parsed.issues
            .slice(0, 4)
            .map((i) => `${i.path}: ${i.message}`)
            .join('; ')
        )
      );
      confidence[name] = 0.2;
      continue;
    }

    confidence[name] = 0.9;
  }

  // Best practice gap detection

  // Knowledge: quick_answers gap
  const knowledgeData = knowledge.data as Record<string, unknown>;
  const hasQuickAnswers =
    knowledge.ok &&
    Array.isArray(knowledgeData?.quick_answers) &&
    (knowledgeData.quick_answers as unknown[]).length > 0;
  if (!hasQuickAnswers) {
    gaps.push({
      gap_type: 'no_knowledge',
      field_path: 'knowledge.quick_answers',
      severity: 'medium',
      impact: 'No quick answers configured; the agent may respond inconsistently to FAQs.',
      recommended_fix: 'Add quick answers or import FAQs from the website.',
      question_to_user: 'Do you want the agent to handle FAQs with quick answers?',
    });
    confidence['knowledge.quick_answers'] = 0.4;
  }

  // Knowledge: sources gap
  const hasSources =
    knowledge.ok &&
    Array.isArray(knowledgeData?.sources) &&
    (knowledgeData.sources as unknown[]).length > 0;
  if (!hasSources) {
    gaps.push({
      gap_type: 'missing_data',
      field_path: 'knowledge.sources',
      severity: 'high',
      impact: 'No knowledge sources configured; the agent has no reference material.',
      recommended_fix: 'Add knowledge sources such as website URL or company documents.',
      question_to_user: 'What sources should the agent reference when answering questions?',
    });
    confidence['knowledge.sources'] = 0.3;
  }

  // Tools: enabled_tools gap
  const toolsData = tools.data as Record<string, unknown>;
  const enabledTools = tools.ok ? (toolsData?.enabled_tools as string[]) ?? [] : [];
  if (Array.isArray(enabledTools) && enabledTools.length === 0) {
    gaps.push({
      gap_type: 'no_tools',
      field_path: 'tools.enabled_tools',
      severity: 'high',
      impact: 'No tools enabled; the agent cannot take real actions.',
      recommended_fix: 'Enable at least one tool (calendar, CRM, phone, etc.).',
      question_to_user: 'Which actions should your agent be able to perform?',
    });
    confidence['tools.enabled_tools'] = 0.2;
  }

  // Governance: escalation gap
  const governanceData = governance.data as Record<string, unknown>;
  const hasEscalation =
    governance.ok &&
    Array.isArray(governanceData?.escalation_triggers) &&
    (governanceData.escalation_triggers as unknown[]).length > 0;
  if (!hasEscalation) {
    gaps.push({
      gap_type: 'no_escalation',
      field_path: 'governance.escalation_triggers',
      severity: 'medium',
      impact: 'No escalation triggers defined; the agent may not know when to hand off to a human.',
      recommended_fix: 'Define escalation triggers for sensitive situations.',
      question_to_user: 'What situations should trigger escalation to a human?',
    });
    confidence['governance.escalation_triggers'] = 0.5;
  }

  // Build wizard snapshot
  type JsonRecord = Record<string, unknown> | null;
  const snapshot: WizardSnapshot = {
    company_profile: (agent.companyProfile ?? null) as JsonRecord,
    brand_voice_profile: null, // Fill later from enrichment
    selected_template: (agent.template ?? null) as JsonRecord,
    tools: (tools.ok ? tools.data : toolsRaw ?? null) as JsonRecord,
    flows: (flow.ok ? flow.data : flowRaw ?? null) as JsonRecord,
    personality: (personality.ok ? personality.data : personalityRaw ?? null) as JsonRecord,
    knowledge: (knowledge.ok ? knowledge.data : knowledgeRaw ?? null) as JsonRecord,
    memory: (memory.ok ? memory.data : memoryRaw ?? null) as JsonRecord,
    learning: (learning.ok ? learning.data : learningRaw ?? null) as JsonRecord,
    governance: (governance.ok ? governance.data : governanceRaw ?? null) as JsonRecord,
    economics: (economics.ok ? economics.data : economicsRaw ?? null) as JsonRecord,
  };

  // Learning-specific confidence and warning
  const learningData = learning.data as Record<string, unknown>;
  const learningEnabled = learning.ok && learningData?.learning_enabled === true;
  confidence['learning'] = learningEnabled ? 0.7 : 0.3;

  if (!learningEnabled) {
    warnings.push({
      code: 'LEARNING_DISABLED',
      message: 'Agent is not improving from conversations. Consider enabling learning for better performance.',
      severity: 'info',
    });
  }

  // Memory-specific confidence and warnings
  const memoryData = memory.data as Record<string, unknown>;
  const shortTermData = memoryData?.short_term as Record<string, unknown> | undefined;
  const longTermData = memoryData?.long_term as Record<string, unknown> | undefined;
  const shortTermEnabled = memory.ok && shortTermData?.enabled === true;
  const longTermEnabled = memory.ok && longTermData?.enabled === true;

  // Short-term memory should generally be enabled (safe)
  if (!shortTermEnabled) {
    confidence['memory'] = 0.4;
    warnings.push({
      code: 'SHORT_TERM_MEMORY_DISABLED',
      message: 'Short-term memory is disabled. Agent may lose context mid-conversation.',
      severity: 'warning',
    });
  } else if (!longTermEnabled) {
    // Short-term is on but long-term is off (expected default)
    confidence['memory'] = 0.7;
    warnings.push({
      code: 'LONG_TERM_MEMORY_DISABLED',
      message: 'Long-term memory is disabled. Agent will not remember users across conversations.',
      severity: 'info',
    });
  } else {
    // Both enabled
    confidence['memory'] = 0.85;
  }

  // Validate output against WizardSnapshotSchema
  const snapParsed = WizardSnapshotSchema.safeParse(snapshot);
  if (!snapParsed.success) {
    warnings.push({
      code: 'SNAPSHOT_SCHEMA_MISMATCH',
      message: 'Wizard snapshot did not match schema (check builder mapping).',
      severity: 'error',
      suggestion: snapParsed.error.issues
        .slice(0, 6)
        .map((i: z.ZodIssue) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    });
  }

  // Merge in any existing gaps/warnings from the agent
  const existingGaps = Array.isArray(agent.configGaps) ? (agent.configGaps as GapItem[]) : [];
  const existingWarnings = Array.isArray(agent.configWarnings)
    ? (agent.configWarnings as WarningItem[])
    : [];

  // Deduplicate gaps by field_path
  const allGaps = deduplicateByFieldPath([...existingGaps, ...gaps]);
  const allWarnings = [...existingWarnings, ...warnings];

  // Parse final outputs through schemas
  const validatedConfidence = ConfidenceMapSchema.safeParse(confidence);
  const validatedGaps = allGaps.map((g) => {
    const parsed = GapItemSchema.safeParse(g);
    return parsed.success ? parsed.data : g;
  });
  const validatedWarnings = allWarnings.map((w) => {
    const parsed = WarningItemSchema.safeParse(w);
    return parsed.success ? parsed.data : w;
  });

  return {
    ok: true,
    data: snapParsed.success ? snapParsed.data : snapshot,
    confidence: validatedConfidence.success ? validatedConfidence.data : confidence,
    gaps: validatedGaps as GapItem[],
    warnings: validatedWarnings as WarningItem[],
    agentId: agent.id,
    companyId: agent.companyProfileId,
    deploymentState: mapStatusToDeploymentState(agent.status),
    // Prefer governance_config.template_key (Template Engine v1) over agent.template.slug
    templateKey: (governanceData?.template_key as string) ?? agent.template?.slug ?? null,
  };
}

/**
 * Deduplicate gaps by field_path, keeping the first occurrence
 */
function deduplicateByFieldPath(gaps: GapItem[]): GapItem[] {
  const seen = new Set<string>();
  return gaps.filter((gap) => {
    if (seen.has(gap.field_path)) return false;
    seen.add(gap.field_path);
    return true;
  });
}

// ============================================================================
// Backward Compatibility Exports
// ============================================================================

// Re-export the old interface names for backward compatibility
export interface WizardSnapshotData {
  company_profile: unknown;
  role_card: unknown;
  tools: unknown;
  flows: unknown;
  personality: unknown;
  knowledge: unknown;
  governance: unknown;
  economics: unknown;
}

export interface WizardConfidence {
  overall: number;
  byPhase: Record<string, number>;
  byDimension: Record<string, number>;
}

export interface WizardEvidence {
  field_path: string;
  source: string;
  reasoning: string;
  source_phase?: string;
}

export interface WizardGap {
  gap_type: string;
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase?: string;
}

export interface WizardWarning {
  warning_type: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  source_phase?: string;
}

/**
 * Alias for buildWizardSnapshotFromAgentId
 * @deprecated Use buildWizardSnapshotFromAgentId instead
 */
export const buildWizardSnapshotFromAgent = buildWizardSnapshotFromAgentId;

/**
 * Build a minimal empty snapshot for a brand-new agent
 */
export function buildEmptyWizardSnapshot(
  agentId: string,
  agentName: string,
  companyId?: string | null
): WizardSnapshotResult {
  const emptySnapshot: WizardSnapshot = {
    company_profile: null,
    brand_voice_profile: null,
    selected_template: null,
    tools: null,
    flows: null,
    personality: null,
    knowledge: null,
    learning: null,
    governance: null,
    economics: null,
  };

  return {
    ok: true,
    data: emptySnapshot,
    confidence: {},
    gaps: [
      addMissingConfigGap('role_card'),
      addMissingConfigGap('brain'),
      addMissingConfigGap('personality'),
      addMissingConfigGap('tools'),
      addMissingConfigGap('knowledge'),
      addMissingConfigGap('memory'),
      addMissingConfigGap('learning'),
      addMissingConfigGap('governance'),
      addMissingConfigGap('economics'),
      addMissingConfigGap('flow'),
    ],
    warnings: [],
    agentId,
    companyId: companyId ?? null,
    deploymentState: 'draft',
    templateKey: null,
  };
}

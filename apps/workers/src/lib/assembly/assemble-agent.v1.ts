/**
 * Agent Assembly Orchestrator v1
 *
 * End-to-end assembly pipeline that creates/updates DRAFT agents.
 * Runs engines in sequence, saves each module, and accumulates evidence/gaps/warnings.
 *
 * Flow: Template → Tools → Flow → Personality → Brain → Knowledge → Memory → Learning → Governance → Economics
 *
 * @module lib/assembly/assemble-agent.v1
 */

import { prisma, AgentStatus, Prisma, ChannelType } from '@epic-ai/database';
import type { Agent } from '@epic-ai/database';
import type { AgentType } from '@epic-ai/shared';

// V1 Engines
import { runTemplateEngine, type TemplateEngineResult } from '../../engines/template';
import { runToolsEngine, type ToolsEngineResult } from '../../engines/tools';
import { runFlowEngine, type FlowEngineResult } from '../../engines/flow';
import { runPersonalityEngine, type PersonalityEngineResult } from '../../engines/personality';
import { runBrainEngine, type BrainEngineResult } from '../../engines/brain';

// AO Engines (defaults)
import {
  runGovernanceDefaultsEngine,
  runEconomicsDefaultsEngine,
  type GovernanceResult,
  type EconomicsResult,
} from '../agent-os/engines';

// Knowledge Engine v1
import {
  runKnowledgeEngine,
  type KnowledgeEngineResult,
} from '../engines/knowledge-engine.v1';

// Learning Engine v1
import {
  runLearningEngine,
  type LearningEngineResult,
} from '../engines/learning-engine.v1';

// Memory Engine v1
import {
  runMemoryEngine,
  type MemoryEngineResult,
} from '../engines/memory-engine.v1';

// Save Helpers
import {
  saveRoleCard,
  saveTools,
  saveBrain,
  savePersonality,
  saveKnowledge,
  saveMemory,
  saveLearning,
  saveGovernance,
  saveEconomics,
  saveFlow,
  saveConfidence,
  appendGaps,
  appendWarnings,
  clearGapsAndWarnings,
  type SaveMeta,
  type GapItem,
  type WarningItem,
} from '../agent-os/save-helpers';

// ============================================================================
// Types
// ============================================================================

export type AssemblyPhase =
  | 'init'
  | 'template'
  | 'tools'
  | 'flow'
  | 'personality'
  | 'brain'
  | 'knowledge'
  | 'memory'
  | 'learning'
  | 'governance'
  | 'economics'
  | 'complete';

export type DeploymentState =
  | 'not_started'
  | 'in_progress'
  | 'ready_for_review'
  | 'blocked'
  | 'deployed';

export interface AssemblyEvidence {
  field_path: string;
  source_type: 'company_profile' | 'enrichment' | 'template' | 'inference' | 'default' | 'user_input';
  confidence: number;
  reasoning: string;
  source_phase?: AssemblyPhase;
}

export interface AssemblyAuditEntry {
  phase: AssemblyPhase;
  timestamp: string;
  duration_ms: number;
  success: boolean;
  message?: string;
  gaps_found?: number;
  warnings_found?: number;
}

export interface WizardSnapshot {
  current_phase: AssemblyPhase;
  phases_completed: AssemblyPhase[];
  overall_confidence: number;
  confidence_by_phase: Record<string, number>;
  confidence_by_dimension: Record<string, number>;
  total_gaps: number;
  gaps_by_severity: {
    low: number;
    medium: number;
    high: number;
  };
  total_warnings: number;
  warnings_by_severity: {
    info: number;
    warning: number;
    error: number;
  };
  blocking_gaps: GapItem[];
  evidence: AssemblyEvidence[];
  deployment_state: DeploymentState;
  last_updated: string;
}

export interface AssemblyRequest {
  agent_id?: string;
  org_id: string;
  brand_id?: string;
  company_id?: string;
  agent_name?: string;
  channels?: string[];
  template_key?: string;
  skip_phases?: AssemblyPhase[];
  force_reassemble?: boolean;
}

export interface AssemblyContext {
  actor?: 'system' | 'user' | 'job';
  actor_id?: string;
  job_id?: string;
  trace_id?: string;
}

export interface AssemblyResult {
  ok: boolean;
  agent_id: string;
  wizard_snapshot: WizardSnapshot;
  audit_log: AssemblyAuditEntry[];
  error?: string;
  phase_results: {
    template?: TemplateEngineResult;
    tools?: ToolsEngineResult;
    flow?: FlowEngineResult;
    personality?: PersonalityEngineResult;
    brain?: BrainEngineResult;
    knowledge?: KnowledgeEngineResult;
    memory?: MemoryEngineResult;
    learning?: LearningEngineResult;
    governance?: GovernanceResult;
    economics?: EconomicsResult;
  };
}

export interface CompanyProfile {
  name?: string;
  website?: string;
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
  company_size?: 'small' | 'medium' | 'large' | 'enterprise';
  services?: Array<{ name: string; description?: string; is_service: boolean }>;
  contact?: { phone?: string; email?: string; address?: string };
  location?: { city?: string; state?: string; country?: string };
  hours?: { timezone?: string; schedule?: Record<string, { open: string; close: string }> };
  pricing?: { model?: string; range?: { min?: number; max?: number }; currency?: string };
  service_area?: string[];
  service_category_tags?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  brand_voice?: {
    tone?: string;
    formality?: number;
    personality_traits?: string[];
  };
}

// ============================================================================
// Errors
// ============================================================================

export class AssemblyError extends Error {
  constructor(
    message: string,
    public readonly phase: AssemblyPhase,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AssemblyError';
  }
}

export class AgentImmutableError extends AssemblyError {
  constructor(agentId: string, status: string) {
    super(
      `Agent ${agentId} is ${status} and cannot be modified`,
      'init',
      'AGENT_IMMUTABLE'
    );
    this.name = 'AgentImmutableError';
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function normalizeChannels(channels?: string[]): ChannelType[] {
  if (!channels || channels.length === 0) return [ChannelType.CHAT];
  return channels.map((c) => c.toUpperCase() as ChannelType);
}

function calculateOverallConfidence(byPhase: Record<string, number>): number {
  const values = Object.values(byPhase).filter((v) => v > 0);
  if (values.length === 0) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

function determineDeploymentState(
  gaps: GapItem[],
  warnings: WarningItem[],
  phasesCompleted: AssemblyPhase[]
): DeploymentState {
  const hasBlockingGaps = gaps.some((g) => g.severity === 'high');
  const hasErrorWarnings = warnings.some((w) => w.severity === 'error');
  const allPhasesComplete = phasesCompleted.includes('economics');

  if (hasBlockingGaps || hasErrorWarnings) {
    return 'blocked';
  }
  if (!allPhasesComplete) {
    return 'in_progress';
  }
  const hasMediumGaps = gaps.some((g) => g.severity === 'medium');
  const hasWarnings = warnings.some((w) => w.severity === 'warning');
  if (hasMediumGaps || hasWarnings) {
    return 'ready_for_review';
  }
  return 'ready_for_review'; // Always require review before deploy
}

function mapGapToItem(
  gap: { gap_type: string; field_path: string; severity: string; impact: string; recommended_fix: string; suggestions?: string[] },
  _phase: AssemblyPhase
): GapItem {
  return {
    gap_type: gap.gap_type as GapItem['gap_type'],
    field_path: gap.field_path,
    severity: gap.severity as 'low' | 'medium' | 'high',
    impact: gap.impact,
    recommended_fix: gap.recommended_fix,
    suggestions: gap.suggestions,
  };
}

function mapWarningToItem(
  warning: { code: string; message: string; severity: string; suggestion?: string },
  _phase: AssemblyPhase
): WarningItem {
  return {
    code: warning.code,
    message: warning.message,
    severity: warning.severity as 'info' | 'warning' | 'error',
    suggestion: warning.suggestion,
  };
}

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Assemble a DRAFT agent end-to-end
 *
 * @param request Assembly request parameters
 * @param ctx Optional context for audit/tracing
 * @returns Assembly result with wizard snapshot
 */
export async function assembleAgentV1(
  request: AssemblyRequest,
  ctx: AssemblyContext = {}
): Promise<AssemblyResult> {
  const startTime = Date.now();
  const auditLog: AssemblyAuditEntry[] = [];
  const phasesCompleted: AssemblyPhase[] = [];
  const confidenceByPhase: Record<string, number> = {};
  const allEvidence: AssemblyEvidence[] = [];
  const allGaps: GapItem[] = [];
  const allWarnings: WarningItem[] = [];
  const phaseResults: AssemblyResult['phase_results'] = {};

  const saveMeta: SaveMeta = {
    actor: ctx.actor || 'system',
    actorId: ctx.actor_id,
    jobId: ctx.job_id,
  };

  // -------------------------------------------------------------------------
  // Phase 0: Init - Resolve or create agent
  // -------------------------------------------------------------------------
  let agent: Agent;
  let companyProfile: CompanyProfile = {};
  const initStart = Date.now();

  try {
    if (request.agent_id) {
      // Load existing agent
      const existingAgent = await prisma.agent.findUnique({
        where: { id: request.agent_id },
        include: {
          companyProfile: true,
        },
      });

      if (!existingAgent) {
        throw new AssemblyError(`Agent not found: ${request.agent_id}`, 'init', 'AGENT_NOT_FOUND');
      }

      if (existingAgent.status !== AgentStatus.DRAFT) {
        throw new AgentImmutableError(request.agent_id, existingAgent.status);
      }

      agent = existingAgent;

      // Extract company profile from related data
      if (existingAgent.companyProfile) {
        const c = existingAgent.companyProfile;
        companyProfile = {
          name: c.name || undefined,
          website: c.website || undefined,
          industry: c.industry || undefined,
          // Add more fields as available from CompanyProfile model
        };
      }
    } else {
      // Create new DRAFT agent
      agent = await prisma.agent.create({
        data: {
          name: request.agent_name || 'New Agent',
          slug: `agent-${Date.now()}`,
          status: AgentStatus.DRAFT,
          organizationId: request.org_id,
          companyProfileId: request.company_id || null,
          channels: normalizeChannels(request.channels),
        },
      });

      // Load company profile if company_id provided
      if (request.company_id) {
        const cp = await prisma.companyProfile.findUnique({
          where: { id: request.company_id },
        });
        if (cp) {
          companyProfile = {
            name: cp.name || undefined,
            website: cp.website || undefined,
            industry: cp.industry || undefined,
          };
        }
      }
    }

    // Clear existing gaps/warnings if force reassemble
    if (request.force_reassemble) {
      await clearGapsAndWarnings(agent.id);
    }

    auditLog.push({
      phase: 'init',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - initStart,
      success: true,
      message: request.agent_id ? 'Loaded existing agent' : 'Created new DRAFT agent',
    });
    phasesCompleted.push('init');
  } catch (error) {
    auditLog.push({
      phase: 'init',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - initStart,
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      ok: false,
      agent_id: request.agent_id || '',
      wizard_snapshot: buildWizardSnapshot(
        'init',
        phasesCompleted,
        confidenceByPhase,
        allGaps,
        allWarnings,
        allEvidence,
        'blocked'
      ),
      audit_log: auditLog,
      error: error instanceof Error ? error.message : 'Unknown error',
      phase_results: phaseResults,
    };
  }

  const agentId = agent.id;
  const channels = normalizeChannels(request.channels || (agent.channels as string[]));

  // -------------------------------------------------------------------------
  // Phase 1: Template Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('template')) {
    const phaseStart = Date.now();
    try {
      const templateResult = await runTemplateEngine({
        company_profile: {
          name: companyProfile.name,
          industry: companyProfile.industry,
          business_model: companyProfile.business_model,
        },
        brand_voice_profile: {
          detected_tone: companyProfile.brand_voice?.tone,
          formality_level: companyProfile.brand_voice?.formality,
        },
        channels,
        desiredTemplateKey: request.template_key as AgentType | undefined,
      });

      phaseResults.template = templateResult;

      // Save role card if template seeds available
      if (templateResult.seeds?.role_card) {
        const seed = templateResult.seeds.role_card;
        const roleCard = {
          name: seed.name || 'AI Assistant',
          title: seed.title || 'Virtual Assistant',
          company: seed.company || companyProfile.name || '',
          mission: seed.mission || 'Assist users with their queries',
          boundaries: seed.boundaries || [],
          escalation_rules: seed.escalation_rules || [],
          context: seed.context || '',
        };

        await saveRoleCard(agentId, roleCard, { meta: { ...saveMeta, phase: 'template' } });
      }

      // Collect evidence
      templateResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: ev.source_type as AssemblyEvidence['source_type'],
          confidence: ev.confidence,
          reasoning: ev.reasoning || '',
          source_phase: 'template',
        });
      });

      // Collect gaps
      templateResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'template'));
      });

      // Collect warnings
      templateResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem(warning, 'template'));
      });

      confidenceByPhase.template = templateResult.confidence.template_match || 0.8;
      phasesCompleted.push('template');

      auditLog.push({
        phase: 'template',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: templateResult.gaps.length,
        warnings_found: templateResult.warnings.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'template',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Template engine failed',
      });
      allGaps.push({
        gap_type: 'incomplete',
        field_path: 'template',
        severity: 'high',
        impact: 'Template engine failed - cannot determine agent type',
        recommended_fix: 'Check template engine configuration',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 2: Tools Engine
  // -------------------------------------------------------------------------
  const selectedTemplateKey: AgentType = phaseResults.template?.templateKey || 'customer_support';

  if (!request.skip_phases?.includes('tools')) {
    const phaseStart = Date.now();
    try {
      const toolsResult = await runToolsEngine({
        templateKey: selectedTemplateKey,
        channels,
        company: {
          industry: companyProfile.industry,
          services: companyProfile.services?.map(s => ({
            name: s.name,
            description: s.description,
          })),
          phone: companyProfile.contact?.phone,
          email: companyProfile.contact?.email,
          hours_of_operation: companyProfile.hours?.schedule ? 'available' : undefined,
          service_area: companyProfile.service_area?.join(', '),
        },
      });

      phaseResults.tools = toolsResult;

      // Save tool config
      if (toolsResult.tool_config) {
        await saveTools(agentId, toolsResult.tool_config, { meta: { ...saveMeta, phase: 'tools' } });
      }

      // Collect evidence, gaps, warnings
      toolsResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'inference',
          confidence: ev.confidence,
          reasoning: ev.reasoning || '',
          source_phase: 'tools',
        });
      });

      toolsResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'tools'));
      });

      toolsResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem(warning, 'tools'));
      });

      confidenceByPhase.tools = toolsResult.confidence.tools || 0.8;
      phasesCompleted.push('tools');

      auditLog.push({
        phase: 'tools',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: toolsResult.gaps.length,
        warnings_found: toolsResult.warnings.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'tools',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Tools engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 3: Flow Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('flow')) {
    const phaseStart = Date.now();
    try {
      const enabledTools = phaseResults.tools?.tool_config?.enabled_tools || [];

      const flowResult = await runFlowEngine({
        templateKey: selectedTemplateKey,
        channels,
        tools: enabledTools.map((t) => ({
          id: t.id,
          enabled: true,
        })),
        company: {
          name: companyProfile.name,
          industry: companyProfile.industry,
        },
      });

      phaseResults.flow = flowResult;

      // Save flow config to dedicated flowConfig field
      if (flowResult.flows) {
        await saveFlow(agentId, flowResult.flows, { meta: { ...saveMeta, phase: 'flow' } });
      }

      flowResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'inference',
          confidence: ev.confidence,
          reasoning: ev.reasoning || '',
          source_phase: 'flow',
        });
      });

      flowResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'flow'));
      });

      flowResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem(warning, 'flow'));
      });

      confidenceByPhase.flow = flowResult.confidence.flow || 0.8;
      phasesCompleted.push('flow');

      auditLog.push({
        phase: 'flow',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: flowResult.gaps.length,
        warnings_found: flowResult.warnings.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'flow',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Flow engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 4: Personality Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('personality')) {
    const phaseStart = Date.now();
    try {
      const personalityResult = await runPersonalityEngine({
        templateKey: selectedTemplateKey,
        channels,
        company: {
          name: companyProfile.name,
          industry: companyProfile.industry,
        },
        brandVoice: companyProfile.brand_voice ? {
          detected_tone: companyProfile.brand_voice.tone,
          formality_level: companyProfile.brand_voice.formality,
        } : undefined,
      });

      phaseResults.personality = personalityResult;

      // Save personality config
      if (personalityResult.personality_config) {
        await savePersonality(agentId, personalityResult.personality_config, {
          meta: { ...saveMeta, phase: 'personality' },
        });
      }

      personalityResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: ev.source_type as AssemblyEvidence['source_type'],
          confidence: ev.confidence,
          reasoning: ev.reasoning,
          source_phase: 'personality',
        });
      });

      personalityResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'personality'));
      });

      personalityResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem(warning, 'personality'));
      });

      confidenceByPhase.personality = personalityResult.confidence.personality_config || 0.8;
      phasesCompleted.push('personality');

      auditLog.push({
        phase: 'personality',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: personalityResult.gaps.length,
        warnings_found: personalityResult.warnings.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'personality',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Personality engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 5: Brain Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('brain')) {
    const phaseStart = Date.now();
    try {
      const brainResult = await runBrainEngine({
        templateKey: selectedTemplateKey,
        channels,
        company: {
          industry: companyProfile.industry,
        },
        // Governance hints can come from company profile or wizard
      });

      phaseResults.brain = brainResult;

      // Save brain config
      if (brainResult.brain_config) {
        await saveBrain(agentId, brainResult.brain_config, { meta: { ...saveMeta, phase: 'brain' } });
      }

      brainResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: ev.source_type as AssemblyEvidence['source_type'],
          confidence: ev.confidence,
          reasoning: ev.reasoning,
          source_phase: 'brain',
        });
      });

      brainResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'brain'));
      });

      brainResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem(warning, 'brain'));
      });

      confidenceByPhase.brain = brainResult.confidence.brain_config || 0.8;
      phasesCompleted.push('brain');

      auditLog.push({
        phase: 'brain',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: brainResult.gaps.length,
        warnings_found: brainResult.warnings.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'brain',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Brain engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 6: Knowledge Engine v1
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('knowledge')) {
    const phaseStart = Date.now();
    try {
      const knowledgeResult = runKnowledgeEngine({
        company_profile: companyProfile,
      });

      phaseResults.knowledge = knowledgeResult;

      // Save knowledge config (schema-compliant)
      if (knowledgeResult.knowledge_config) {
        await saveKnowledge(agentId, knowledgeResult.knowledge_config, {
          meta: { ...saveMeta, phase: 'knowledge' },
        });
      }

      knowledgeResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'company_profile',
          confidence: knowledgeResult.confidence,
          reasoning: ev.reasoning,
          source_phase: 'knowledge',
        });
      });

      knowledgeResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'knowledge'));
      });

      confidenceByPhase.knowledge = knowledgeResult.confidence;
      phasesCompleted.push('knowledge');

      auditLog.push({
        phase: 'knowledge',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: knowledgeResult.gaps.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'knowledge',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Knowledge engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 7: Memory Engine v1
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('memory')) {
    const phaseStart = Date.now();
    try {
      const memoryResult = runMemoryEngine({
        templateKey: selectedTemplateKey,
        channels: (request.channels || []) as ('voice' | 'chat' | 'sms' | 'email' | 'social')[],
        companyProfile,
      });

      phaseResults.memory = memoryResult;

      // Save memory config (schema-compliant)
      if (memoryResult.memory_config) {
        await saveMemory(agentId, memoryResult.memory_config, {
          meta: { ...saveMeta, phase: 'memory' },
        });
      }

      memoryResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'template',
          confidence: memoryResult.confidence,
          reasoning: ev.reasoning,
          source_phase: 'memory',
        });
      });

      memoryResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'memory'));
      });

      // Process warnings from Memory Engine v1
      memoryResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem({
          code: warning.code,
          message: warning.message,
          severity: warning.severity === 'low' ? 'info' :
                   warning.severity === 'medium' ? 'warning' :
                   warning.severity === 'high' ? 'error' : warning.severity,
        }, 'memory'));
      });

      confidenceByPhase.memory = memoryResult.confidence;
      phasesCompleted.push('memory');

      auditLog.push({
        phase: 'memory',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: memoryResult.gaps.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'memory',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Memory engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 8: Learning Engine v1
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('learning')) {
    const phaseStart = Date.now();
    try {
      const learningResult = runLearningEngine({
        templateKey: selectedTemplateKey,
        channels: (request.channels || []) as ('voice' | 'chat' | 'sms' | 'email' | 'social')[],
        companyProfile,
      });

      phaseResults.learning = learningResult;

      // Save learning config (schema-compliant)
      if (learningResult.learning_config) {
        await saveLearning(agentId, learningResult.learning_config, {
          meta: { ...saveMeta, phase: 'learning' },
        });
      }

      learningResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'template',
          confidence: learningResult.confidence,
          reasoning: ev.reasoning,
          source_phase: 'learning',
        });
      });

      learningResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'learning'));
      });

      // Add warnings to the collection
      learningResult.warnings.forEach((warning) => {
        allWarnings.push(mapWarningToItem({
          code: warning.code,
          message: warning.message,
          severity: warning.severity === 'low' ? 'info' :
                   warning.severity === 'medium' ? 'warning' :
                   warning.severity === 'high' ? 'error' : warning.severity,
        }, 'learning'));
      });

      confidenceByPhase.learning = learningResult.confidence;
      phasesCompleted.push('learning');

      auditLog.push({
        phase: 'learning',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: learningResult.gaps.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'learning',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Learning engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 9: Governance Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('governance')) {
    const phaseStart = Date.now();
    try {
      const governanceResult = runGovernanceDefaultsEngine({
        industry: companyProfile.industry,
        business_model: companyProfile.business_model,
      });

      phaseResults.governance = governanceResult;

      // Save governance config
      if (governanceResult.config) {
        await saveGovernance(agentId, governanceResult.config, {
          meta: { ...saveMeta, phase: 'governance' },
        });
      }

      governanceResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: ev.source === 'industry_detection' ? 'enrichment' : 'default',
          confidence: governanceResult.confidence,
          reasoning: ev.reasoning,
          source_phase: 'governance',
        });
      });

      governanceResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'governance'));
      });

      confidenceByPhase.governance = governanceResult.confidence;
      phasesCompleted.push('governance');

      auditLog.push({
        phase: 'governance',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: governanceResult.gaps.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'governance',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Governance engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Phase 10: Economics Engine
  // -------------------------------------------------------------------------
  if (!request.skip_phases?.includes('economics')) {
    const phaseStart = Date.now();
    try {
      const economicsResult = runEconomicsDefaultsEngine({
        channels: channels as Array<'VOICE' | 'CHAT' | 'SMS' | 'EMAIL'>,
        business_model: companyProfile.business_model,
        company_size: companyProfile.company_size,
        sales_complexity: companyProfile.sales_complexity,
      });

      phaseResults.economics = economicsResult;

      // Save economics config
      if (economicsResult.config) {
        await saveEconomics(agentId, economicsResult.config, {
          meta: { ...saveMeta, phase: 'economics' },
        });
      }

      economicsResult.evidence.forEach((ev) => {
        allEvidence.push({
          field_path: ev.field_path,
          source_type: 'default',
          confidence: economicsResult.confidence,
          reasoning: ev.reasoning,
          source_phase: 'economics',
        });
      });

      economicsResult.gaps.forEach((gap) => {
        allGaps.push(mapGapToItem(gap, 'economics'));
      });

      confidenceByPhase.economics = economicsResult.confidence;
      phasesCompleted.push('economics');

      auditLog.push({
        phase: 'economics',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: true,
        gaps_found: economicsResult.gaps.length,
      });
    } catch (error) {
      auditLog.push({
        phase: 'economics',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - phaseStart,
        success: false,
        message: error instanceof Error ? error.message : 'Economics engine failed',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Finalize: Save confidence, gaps, warnings to agent
  // -------------------------------------------------------------------------
  try {
    // Save accumulated gaps and warnings
    if (allGaps.length > 0) {
      await appendGaps(agentId, allGaps);
    }
    if (allWarnings.length > 0) {
      await appendWarnings(agentId, allWarnings);
    }

    // Save confidence tracking
    await saveConfidence(agentId, {
      overall: calculateOverallConfidence(confidenceByPhase),
      byPhase: confidenceByPhase,
      byDimension: {
        configuration: confidenceByPhase.template || 0,
        behavior: confidenceByPhase.brain || 0,
        personality: confidenceByPhase.personality || 0,
        knowledge: confidenceByPhase.knowledge || 0,
      },
      evidence: allEvidence.map((e) => ({
        field_path: e.field_path,
        source: e.source_type,
        reasoning: e.reasoning,
        source_phase: e.source_phase,
      })),
    });

    phasesCompleted.push('complete');

    auditLog.push({
      phase: 'complete',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      success: true,
      message: 'Assembly complete',
      gaps_found: allGaps.length,
      warnings_found: allWarnings.length,
    });
  } catch (error) {
    auditLog.push({
      phase: 'complete',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      success: false,
      message: error instanceof Error ? error.message : 'Failed to finalize',
    });
  }

  // Build final wizard snapshot
  const deploymentState = determineDeploymentState(allGaps, allWarnings, phasesCompleted);
  const wizardSnapshot = buildWizardSnapshot(
    phasesCompleted.includes('complete') ? 'complete' : phasesCompleted[phasesCompleted.length - 1] || 'init',
    phasesCompleted,
    confidenceByPhase,
    allGaps,
    allWarnings,
    allEvidence,
    deploymentState
  );

  return {
    ok: !allGaps.some((g) => g.severity === 'high'),
    agent_id: agentId,
    wizard_snapshot: wizardSnapshot,
    audit_log: auditLog,
    phase_results: phaseResults,
  };
}

// ============================================================================
// Wizard Snapshot Builder
// ============================================================================

function buildWizardSnapshot(
  currentPhase: AssemblyPhase,
  phasesCompleted: AssemblyPhase[],
  confidenceByPhase: Record<string, number>,
  gaps: GapItem[],
  warnings: WarningItem[],
  evidence: AssemblyEvidence[],
  deploymentState: DeploymentState
): WizardSnapshot {
  const gapsBySeverity = {
    low: gaps.filter((g) => g.severity === 'low').length,
    medium: gaps.filter((g) => g.severity === 'medium').length,
    high: gaps.filter((g) => g.severity === 'high').length,
  };

  const warningsBySeverity = {
    info: warnings.filter((w) => w.severity === 'info').length,
    warning: warnings.filter((w) => w.severity === 'warning').length,
    error: warnings.filter((w) => w.severity === 'error').length,
  };

  return {
    current_phase: currentPhase,
    phases_completed: phasesCompleted,
    overall_confidence: calculateOverallConfidence(confidenceByPhase),
    confidence_by_phase: confidenceByPhase,
    confidence_by_dimension: {
      configuration: confidenceByPhase.template || 0,
      behavior: confidenceByPhase.brain || 0,
      personality: confidenceByPhase.personality || 0,
      knowledge: confidenceByPhase.knowledge || 0,
    },
    total_gaps: gaps.length,
    gaps_by_severity: gapsBySeverity,
    total_warnings: warnings.length,
    warnings_by_severity: warningsBySeverity,
    blocking_gaps: gaps.filter((g) => g.severity === 'high'),
    evidence,
    deployment_state: deploymentState,
    last_updated: new Date().toISOString(),
  };
}


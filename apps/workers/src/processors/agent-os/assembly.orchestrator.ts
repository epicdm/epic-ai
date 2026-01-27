/**
 * Assembly Orchestrator (AO v1)
 *
 * The "conductor" that runs all intelligence engines in order,
 * persists results to config blobs, and produces a complete agent draft.
 *
 * Pipeline:
 *   Phase 0: Enrichment  → company_profile + brand_voice_profile
 *   Phase 1: Template    → role_card.template_key
 *   Phase 2: Tools       → tool_config
 *   Phase 3: Flow        → brain_config.conversation_flows
 *   Phase 4: Personality → personality_config
 *   Phase 5: Knowledge   → knowledge_config
 *   Phase 6: Governance  → governance_config
 *   Phase 7: Economics   → economics_config
 */

// Template Recommendation Engine
import {
  getTemplateRecommendations,
  type TemplateRecommendationInput,
  type TemplateRecommendation,
} from './template-recommendation.engine';

// Tool Assignment Engine
import {
  assignTools,
  type ToolAssignmentInput,
  type ToolAssignmentResult,
} from './tool-assignment.engine';

// Conversation Flow Engine
import {
  generateConversationFlow,
  type FlowGenerationInput,
  type FlowGenerationResult,
  type ConversationFlow,
} from './conversation-flow.engine';

// Personality Engine
import {
  generatePersonality,
  type PersonalityGenerationInput,
  type PersonalityGenerationResult,
  type PersonalityConfig,
  type EvidenceItem,
  type PersonalityGap,
} from './personality.engine';

// New extracted engines
import {
  runKnowledgeSeedEngine,
  type KnowledgeSeedInput,
  type KnowledgeSeedResult,
} from '../../lib/agent-os/engines/knowledge-seed';

import {
  runGovernanceDefaultsEngine,
  type GovernanceInput,
  type GovernanceResult,
} from '../../lib/agent-os/engines/governance-defaults';

import {
  runEconomicsDefaultsEngine,
  type EconomicsInput,
  type EconomicsResult,
} from '../../lib/agent-os/engines/economics-defaults';

import {
  buildWizardSnapshot,
  calculateOverallConfidence,
  calculateDimensionConfidence,
  createEmptyFlow,
  createEmptyPersonality,
  type SnapshotBuilderInput,
} from '../../lib/agent-os/snapshot-builder';

// ============================================================================
// Types - Assembly Input/Output
// ============================================================================

export type AssemblyPhase =
  | 'pending'
  | 'enrichment'
  | 'template'
  | 'tools'
  | 'flow'
  | 'personality'
  | 'knowledge'
  | 'memory'
  | 'learning'
  | 'governance'
  | 'economics'
  | 'done'
  | 'failed';

/** Executable phases (excludes 'pending') */
export type ExecutablePhase = Exclude<AssemblyPhase, 'pending'>;

export type ChannelType = 'VOICE' | 'CHAT' | 'SMS' | 'EMAIL';

/**
 * Input to start assembly
 *
 * Behavior:
 * - If agentId is not provided: creates a new DRAFT agent
 * - If agentId is provided with a DRAFT agent: assembles into existing agent
 * - If agentId is provided with a PUBLISHED/ARCHIVED agent: throws error (immutable)
 */
export interface AssemblyInput {
  agentId?: string; // Optional: if provided, assembles into existing DRAFT agent
  companyId: string;
  websiteUrl?: string;
  desiredTemplateKey?: string;
  channels?: ChannelType[];
  userAnswers?: Record<string, unknown>;
  force?: boolean; // Force re-run all phases
}

/**
 * Checkpoint state for resumability
 */
export interface AssemblyState {
  phase: AssemblyPhase;
  completed: AssemblyPhase[];
  last_success_at?: string;
  error?: string;
}

/**
 * Unified gap type across all engines
 */
export interface AssemblyGap {
  gap_type: string;
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

/**
 * Warning from any phase
 */
export interface AssemblyWarning {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  source_phase: AssemblyPhase;
}

/**
 * Evidence tracking across engines
 */
export interface AssemblyEvidence {
  field_path: string;
  source: string;
  source_phase: AssemblyPhase;
  quote?: string;
  reasoning: string;
}

/**
 * Confidence by dimension
 */
export interface ConfidenceBreakdown {
  overall: number;
  by_phase: Record<AssemblyPhase, number>;
  by_dimension: Record<string, number>;
}

// ============================================================================
// Types - Company Profile (from enrichment)
// ============================================================================

export interface CompanyProfile {
  name?: string;
  website?: string;
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
  company_size?: 'small' | 'medium' | 'large' | 'enterprise';
  founded_year?: number;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    address?: string;
  };
  hours?: {
    timezone?: string;
    schedule?: Record<string, { open: string; close: string }>;
  };
  services?: Array<{
    name: string;
    description?: string;
    is_service: boolean;
  }>;
  pricing?: {
    model?: string;
    range?: { min?: number; max?: number };
    currency?: string;
  };
  service_area?: string[];
  service_category_tags?: string[];
}

/** Brand voice profile for assembly context (different from PersonalityEngine's BrandVoiceProfile) */
export interface AssemblyBrandVoice {
  tone?: string;
  tone_traits?: string[];
  formality_level?: number;
  warmth_level?: number;
  humor_level?: number;
  emoji_usage?: 'never' | 'minimal' | 'moderate' | 'frequent';
  vocabulary_style?: 'simple' | 'professional' | 'technical' | 'casual';
  do_say?: string[];
  dont_say?: string[];
  key_phrases?: string[];
}

// ============================================================================
// Types - Agent Configs (10 blobs)
// ============================================================================

export interface RoleCard {
  template_key: string;
  agent_type: string;
  agent_name: string;
  role_title: string;
  primary_goal: string;
  constraints: string[];
}

export interface ToolConfig {
  essential: Array<{ id: string; reason: string }>;
  recommended: Array<{ id: string; reason: string }>;
  optional: Array<{ id: string; reason: string }>;
  disabled: string[];
}

export interface BrainConfig {
  conversation_flows: ConversationFlow;
}

export interface KnowledgeConfig {
  seed_facts: Array<{
    category: string;
    fact: string;
    source: string;
  }>;
  faqs_generated?: Array<{
    question: string;
    answer: string;
    confidence: number;
  }>;
  knowledge_gaps: string[];
}

export interface GovernanceConfig {
  compliance_mode: 'standard' | 'strict' | 'regulated';
  forbidden_phrases: string[];
  disallowed_topics: string[];
  escalation_triggers: string[];
  pii_handling: 'strict' | 'moderate' | 'relaxed';
  safe_claim_phrases: string[];
  max_message_length?: number;
}

export interface EconomicsConfig {
  token_budget_per_conversation?: number;
  cost_per_channel: Record<ChannelType, number>;
  max_retries: number;
  timeout_seconds: number;
  priority: 'cost' | 'quality' | 'balanced';
}

// ============================================================================
// Types - Wizard Snapshot (full output)
// ============================================================================

export interface SelectedTemplate {
  template_key: string;
  match_score: number;
  match_level: string;
  reasons: string[];
  alternatives: Array<{
    template_key: string;
    match_score: number;
  }>;
}

export interface WizardSnapshot {
  company_profile: CompanyProfile;
  brand_voice_profile?: AssemblyBrandVoice;
  selected_template: SelectedTemplate;
  tools: ToolConfig;
  flows: ConversationFlow;
  personality: PersonalityConfig;
  knowledge: KnowledgeConfig;
  governance: GovernanceConfig;
  economics: EconomicsConfig;
}

/**
 * Full assembly result
 */
export interface AssemblyResult {
  agentId: string;
  status: 'draft' | 'complete' | 'failed';
  wizard_snapshot: WizardSnapshot;
  confidence: ConfidenceBreakdown;
  gaps: AssemblyGap[];
  warnings: AssemblyWarning[];
  assembly_state: AssemblyState;
  evidence: AssemblyEvidence[];
  audit_log: AuditLogEntry[];
}

export interface AuditLogEntry {
  timestamp: string;
  phase: AssemblyPhase;
  action: string;
  details?: Record<string, unknown>;
  duration_ms?: number;
}

// ============================================================================
// Phase Configuration
// ============================================================================

const PHASE_ORDER: ExecutablePhase[] = [
  'enrichment',
  'template',
  'tools',
  'flow',
  'personality',
  'knowledge',
  'governance',
  'economics',
  'done',
];

function getNextPhase(current: ExecutablePhase): ExecutablePhase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return 'done';
  return PHASE_ORDER[idx + 1];
}

/**
 * Maps AssemblyBrandVoice vocabulary_style to PersonalityEngine's VocabularyStyle
 */
function mapVocabularyStyle(
  style: 'professional' | 'casual' | 'simple' | 'technical' | undefined
): 'plain' | 'balanced' | 'technical' | undefined {
  if (!style) return undefined;
  switch (style) {
    case 'professional':
      return 'balanced';
    case 'casual':
    case 'simple':
      return 'plain';
    case 'technical':
      return 'technical';
    default:
      return 'balanced';
  }
}

// ============================================================================
// Gap Merging
// ============================================================================

/**
 * Merge gaps from multiple sources, deduplicating by gap_type + field_path
 */
export function mergeGaps(
  existingGaps: AssemblyGap[],
  newGaps: AssemblyGap[]
): AssemblyGap[] {
  const gapMap = new Map<string, AssemblyGap>();

  // Add existing gaps
  for (const gap of existingGaps) {
    const key = `${gap.gap_type}:${gap.field_path}`;
    gapMap.set(key, gap);
  }

  // Merge new gaps, keeping higher severity
  const severityOrder: Record<string, number> = { low: 1, medium: 2, high: 3 };
  for (const gap of newGaps) {
    const key = `${gap.gap_type}:${gap.field_path}`;
    const existing = gapMap.get(key);
    if (!existing || severityOrder[gap.severity] > severityOrder[existing.severity]) {
      gapMap.set(key, gap);
    }
  }

  return Array.from(gapMap.values());
}

/**
 * Convert PersonalityGap to AssemblyGap
 */
function convertPersonalityGap(gap: PersonalityGap, phase: AssemblyPhase): AssemblyGap {
  const severityMap: Record<string, 'low' | 'medium' | 'high'> = {
    required: 'high',
    recommended: 'medium',
    optional: 'low',
  };

  return {
    gap_type: 'missing_brand_voice',
    field_path: gap.missing_field,
    severity: severityMap[gap.importance] || 'medium',
    impact: `Cannot fully personalize agent: ${gap.question}`,
    recommended_fix: gap.options?.length
      ? `Choose from: ${gap.options.join(', ')}`
      : 'Provide brand voice information',
    source_phase: phase,
  };
}

/**
 * Convert enrichment gap format to AssemblyGap
 */
function convertEnrichmentGap(
  gap: { gap_type: string; field_path: string; severity: string; impact: string; recommended_fix: string },
  phase: AssemblyPhase
): AssemblyGap {
  return {
    ...gap,
    severity: gap.severity as 'low' | 'medium' | 'high',
    source_phase: phase,
  };
}


// ============================================================================
// Assembly Orchestrator Class
// ============================================================================

export interface AssemblyContext {
  input: AssemblyInput;
  agentId: string;
  state: AssemblyState;
  companyProfile?: CompanyProfile;
  brandVoiceProfile?: AssemblyBrandVoice;
  selectedTemplate?: TemplateRecommendation;
  templateAlternatives?: TemplateRecommendation[];
  toolAssignment?: ToolAssignmentResult;
  conversationFlow?: FlowGenerationResult;
  personalityResult?: PersonalityGenerationResult;
  knowledgeConfig?: KnowledgeConfig;
  governanceConfig?: GovernanceConfig;
  economicsConfig?: EconomicsConfig;
  gaps: AssemblyGap[];
  warnings: AssemblyWarning[];
  evidence: AssemblyEvidence[];
  auditLog: AuditLogEntry[];
  confidence: ConfidenceBreakdown;
}

/**
 * Main orchestrator function
 */
export async function assembleAgent(
  input: AssemblyInput,
  existingContext?: Partial<AssemblyContext>
): Promise<AssemblyResult> {
  // Initialize context
  const ctx: AssemblyContext = {
    input,
    agentId: existingContext?.agentId || generateAgentId(),
    state: existingContext?.state || { phase: 'pending', completed: [] },
    gaps: existingContext?.gaps || [],
    warnings: existingContext?.warnings || [],
    evidence: existingContext?.evidence || [],
    auditLog: existingContext?.auditLog || [],
    confidence: existingContext?.confidence || {
      overall: 0,
      by_phase: {} as Record<AssemblyPhase, number>,
      by_dimension: {},
    },
    companyProfile: existingContext?.companyProfile,
    brandVoiceProfile: existingContext?.brandVoiceProfile,
    selectedTemplate: existingContext?.selectedTemplate,
    templateAlternatives: existingContext?.templateAlternatives,
    toolAssignment: existingContext?.toolAssignment,
    conversationFlow: existingContext?.conversationFlow,
    personalityResult: existingContext?.personalityResult,
    knowledgeConfig: existingContext?.knowledgeConfig,
    governanceConfig: existingContext?.governanceConfig,
    economicsConfig: existingContext?.economicsConfig,
  };

  const startTime = Date.now();

  try {
    // Determine starting phase
    let currentPhase: ExecutablePhase = ctx.state.phase === 'pending' ? 'enrichment' : ctx.state.phase as ExecutablePhase;

    // If force=true, reset to beginning
    if (input.force) {
      currentPhase = 'enrichment';
      ctx.state.completed = [];
    }

    // Run phases in order
    while (currentPhase !== 'done' && currentPhase !== 'failed') {
      // Skip if already completed (resumability)
      if (!input.force && ctx.state.completed.includes(currentPhase)) {
        currentPhase = getNextPhase(currentPhase);
        continue;
      }

      const phaseStart = Date.now();

      // Execute phase
      await executePhase(ctx, currentPhase);

      // Record completion
      ctx.state.completed.push(currentPhase);
      ctx.state.last_success_at = new Date().toISOString();

      // Audit log
      ctx.auditLog.push({
        timestamp: new Date().toISOString(),
        phase: currentPhase,
        action: 'phase_completed',
        duration_ms: Date.now() - phaseStart,
      });

      // Move to next phase
      currentPhase = getNextPhase(currentPhase);
      ctx.state.phase = currentPhase;
    }

    // Calculate overall confidence
    ctx.confidence.overall = calculateOverallConfidence(ctx.confidence.by_phase);

    // Build final result
    return buildAssemblyResultFromContext(ctx, 'draft');
  } catch (error) {
    ctx.state.phase = 'failed';
    ctx.state.error = error instanceof Error ? error.message : String(error);

    ctx.auditLog.push({
      timestamp: new Date().toISOString(),
      phase: ctx.state.phase,
      action: 'assembly_failed',
      details: { error: ctx.state.error },
      duration_ms: Date.now() - startTime,
    });

    return buildAssemblyResultFromContext(ctx, 'failed');
  }
}

/**
 * Execute a single phase
 */
async function executePhase(ctx: AssemblyContext, phase: AssemblyPhase): Promise<void> {
  ctx.auditLog.push({
    timestamp: new Date().toISOString(),
    phase,
    action: 'phase_started',
  });

  switch (phase) {
    case 'enrichment':
      await executeEnrichmentPhase(ctx);
      break;
    case 'template':
      await executeTemplatePhase(ctx);
      break;
    case 'tools':
      await executeToolsPhase(ctx);
      break;
    case 'flow':
      await executeFlowPhase(ctx);
      break;
    case 'personality':
      await executePersonalityPhase(ctx);
      break;
    case 'knowledge':
      await executeKnowledgePhase(ctx);
      break;
    case 'governance':
      await executeGovernancePhase(ctx);
      break;
    case 'economics':
      await executeEconomicsPhase(ctx);
      break;
    default:
      break;
  }
}

// ============================================================================
// Phase Implementations
// ============================================================================

/**
 * Phase 0: Enrichment
 * Uses company profile data or runs enrichment if needed
 */
async function executeEnrichmentPhase(ctx: AssemblyContext): Promise<void> {
  // In a real implementation, this would call the enrichment job
  // For now, we use userAnswers or create a minimal profile

  if (ctx.companyProfile) {
    // Already have profile, skip
    ctx.confidence.by_phase.enrichment = 0.9;
    return;
  }

  const userAnswers = ctx.input.userAnswers || {};

  ctx.companyProfile = {
    name: userAnswers.company_name as string | undefined,
    website: ctx.input.websiteUrl,
    industry: userAnswers.industry as string | undefined,
    sub_industry: userAnswers.sub_industry as string | undefined,
    business_model: userAnswers.business_model as CompanyProfile['business_model'],
    sales_complexity: userAnswers.sales_complexity as CompanyProfile['sales_complexity'],
    services: userAnswers.services as CompanyProfile['services'],
    contact: userAnswers.contact as CompanyProfile['contact'],
    hours: userAnswers.hours as CompanyProfile['hours'],
    pricing: userAnswers.pricing as CompanyProfile['pricing'],
    service_area: userAnswers.service_area as string[] | undefined,
    service_category_tags: userAnswers.service_category_tags as string[] | undefined,
  };

  // Extract brand voice if provided
  if (userAnswers.brand_voice) {
    ctx.brandVoiceProfile = userAnswers.brand_voice as AssemblyBrandVoice;
  }

  // Add gaps for missing required data
  if (!ctx.companyProfile.industry) {
    ctx.gaps.push({
      gap_type: 'missing_industry',
      field_path: 'company_profile.industry',
      severity: 'high',
      impact: 'Cannot optimize agent for industry-specific behavior',
      recommended_fix: 'Specify the company industry',
      source_phase: 'enrichment',
    });
  }

  if (!ctx.companyProfile.business_model) {
    ctx.gaps.push({
      gap_type: 'missing_business_model',
      field_path: 'company_profile.business_model',
      severity: 'medium',
      impact: 'Cannot optimize for B2B vs B2C communication style',
      recommended_fix: 'Specify business model (B2B, B2C, SaaS, etc.)',
      source_phase: 'enrichment',
    });
  }

  // Calculate confidence based on data completeness
  const fields = [
    ctx.companyProfile.name,
    ctx.companyProfile.industry,
    ctx.companyProfile.business_model,
    ctx.companyProfile.services?.length,
    ctx.companyProfile.contact,
  ];
  const filledFields = fields.filter(Boolean).length;
  ctx.confidence.by_phase.enrichment = filledFields / fields.length;

  ctx.evidence.push({
    field_path: 'company_profile',
    source: 'user_input',
    source_phase: 'enrichment',
    reasoning: 'Company profile populated from user answers',
  });
}

/**
 * Phase 1: Template Selection
 */
async function executeTemplatePhase(ctx: AssemblyContext): Promise<void> {
  // Check for user override
  if (ctx.input.desiredTemplateKey) {
    // desiredTemplateKey is the AgentType (e.g., 'customer_support')
    const agentType = ctx.input.desiredTemplateKey as TemplateRecommendation['agent_type'];
    ctx.selectedTemplate = {
      template_id: ctx.input.desiredTemplateKey,
      agent_type: agentType,
      match_score: 100,
      match_level: 'excellent',
      reasons: ['User specified template'],
      expected_outcome: {
        kpi: 'user_specified',
        range: 'N/A',
        impact: 'primary revenue driver',
        description: 'Template selected directly by user override',
      },
    };
    ctx.templateAlternatives = [];
    ctx.confidence.by_phase.template = 1.0;

    ctx.evidence.push({
      field_path: 'selected_template',
      source: 'user_override',
      source_phase: 'template',
      reasoning: `User explicitly selected template: ${ctx.input.desiredTemplateKey}`,
    });
    return;
  }

  // Build TRE input from company profile
  const treInput: TemplateRecommendationInput = {
    industry: ctx.companyProfile?.industry,
    sub_industry: ctx.companyProfile?.sub_industry,
    business_model: ctx.companyProfile?.business_model,
    sales_complexity: ctx.companyProfile?.sales_complexity,
    service_category_tags: ctx.companyProfile?.service_category_tags,
    offerings: ctx.companyProfile?.services?.map((s) => ({
      name: s.name,
      description: s.description,
      is_service: s.is_service,
    })),
  };

  // Get recommendations (use default template library, get top 5)
  const recommendations = getTemplateRecommendations(treInput);

  if (recommendations.length === 0) {
    // Fallback to default
    ctx.selectedTemplate = {
      template_id: 'sales_qualifier',
      agent_type: 'sales_qualifier',
      match_score: 50,
      match_level: 'fair',
      reasons: ['Default template - insufficient data for recommendation'],
      expected_outcome: {
        kpi: 'fallback',
        range: 'unknown',
        impact: 'efficiency gain',
        description: 'Fallback to sales_qualifier template due to insufficient data',
      },
    };
    ctx.templateAlternatives = [];
    ctx.confidence.by_phase.template = 0.5;

    ctx.warnings.push({
      code: 'default_template_used',
      message: 'Using default template due to insufficient company data',
      severity: 'warning',
      source_phase: 'template',
    });
  } else {
    ctx.selectedTemplate = recommendations[0];
    ctx.templateAlternatives = recommendations.slice(1);
    ctx.confidence.by_phase.template = recommendations[0].match_score / 100;
  }

  ctx.evidence.push({
    field_path: 'selected_template',
    source: 'template_engine',
    source_phase: 'template',
    reasoning: ctx.selectedTemplate.reasons.join('; '),
  });
}

/**
 * Phase 2: Tools Assignment
 */
async function executeToolsPhase(ctx: AssemblyContext): Promise<void> {
  if (!ctx.selectedTemplate) {
    throw new Error('Template must be selected before tools assignment');
  }

  const taieInput: ToolAssignmentInput = {
    agent_type: ctx.selectedTemplate.agent_type,
    industry: ctx.companyProfile?.industry,
    sub_industry: ctx.companyProfile?.sub_industry,
    business_model: ctx.companyProfile?.business_model,
    sales_complexity: ctx.companyProfile?.sales_complexity,
    service_category_tags: ctx.companyProfile?.service_category_tags,
    has_phone_support: !!ctx.companyProfile?.contact?.phone,
    has_ecommerce: ctx.companyProfile?.services?.some((s) => !s.is_service),
  };

  ctx.toolAssignment = assignTools(taieInput);
  ctx.confidence.by_phase.tools = ctx.toolAssignment.confidence;

  // Add gaps for missing integrations
  const essentialToolIds = ctx.toolAssignment.essential_tools.map((t) => t.id);
  if (essentialToolIds.includes('calendar') && !ctx.input.userAnswers?.calendar_connected) {
    ctx.gaps.push({
      gap_type: 'missing_integration',
      field_path: 'integrations.calendar',
      severity: 'high',
      impact: 'Calendar tool assigned but not connected',
      recommended_fix: 'Connect calendar integration (Google Calendar, Outlook, etc.)',
      source_phase: 'tools',
    });
  }
  if (essentialToolIds.includes('crm_sync') && !ctx.input.userAnswers?.crm_connected) {
    ctx.gaps.push({
      gap_type: 'missing_integration',
      field_path: 'integrations.crm',
      severity: 'medium',
      impact: 'CRM sync tool assigned but not connected',
      recommended_fix: 'Connect CRM integration (HubSpot, Salesforce, etc.)',
      source_phase: 'tools',
    });
  }

  ctx.evidence.push({
    field_path: 'tool_config',
    source: 'tool_engine',
    source_phase: 'tools',
    reasoning: ctx.toolAssignment.reasoning.join('; '),
  });
}

/**
 * Phase 3: Conversation Flow
 */
async function executeFlowPhase(ctx: AssemblyContext): Promise<void> {
  if (!ctx.selectedTemplate || !ctx.toolAssignment) {
    throw new Error('Template and tools must be assigned before flow generation');
  }

  const cfeInput: FlowGenerationInput = {
    template_type: ctx.selectedTemplate.agent_type,
    tools: ctx.toolAssignment,
    industry: ctx.companyProfile?.industry,
    sub_industry: ctx.companyProfile?.sub_industry,
    business_model: ctx.companyProfile?.business_model || 'b2b',
    sales_complexity: ctx.companyProfile?.sales_complexity || 'moderate',
    // has_high_ticket_items and requires_consultation can be inferred from sales_complexity
    service_category_tags: ctx.companyProfile?.service_category_tags,
  };

  ctx.conversationFlow = generateConversationFlow(cfeInput);
  ctx.confidence.by_phase.flow = ctx.conversationFlow.confidence;

  ctx.evidence.push({
    field_path: 'brain_config.conversation_flows',
    source: 'flow_engine',
    source_phase: 'flow',
    reasoning: ctx.conversationFlow.reasoning.join('; '),
  });
}

/**
 * Phase 4: Personality
 */
async function executePersonalityPhase(ctx: AssemblyContext): Promise<void> {
  if (!ctx.selectedTemplate) {
    throw new Error('Template must be selected before personality generation');
  }

  const peInput: PersonalityGenerationInput = {
    agent_type: ctx.selectedTemplate.agent_type,
    industry: ctx.companyProfile?.industry,
    business_model: ctx.companyProfile?.business_model,
    sales_complexity: ctx.companyProfile?.sales_complexity,
    company_name: ctx.companyProfile?.name,
    channels: ctx.input.channels,
    brand_voice: ctx.brandVoiceProfile
      ? {
          tone_traits: ctx.brandVoiceProfile.tone_traits,
          formality: ctx.brandVoiceProfile.formality_level as 0 | 1 | 2 | 3 | 4 | undefined,
          vocabulary_style: mapVocabularyStyle(ctx.brandVoiceProfile.vocabulary_style),
          do_say: ctx.brandVoiceProfile.do_say,
          dont_say: ctx.brandVoiceProfile.dont_say,
          brand_name: ctx.companyProfile?.name,
          humor_allowed: ctx.brandVoiceProfile.humor_level ? ctx.brandVoiceProfile.humor_level > 0 : undefined,
        }
      : undefined,
  };

  ctx.personalityResult = generatePersonality(peInput);
  ctx.confidence.by_phase.personality = ctx.personalityResult.confidence;

  // Convert and merge personality gaps
  const personalityGaps = ctx.personalityResult.gaps.map((g) =>
    convertPersonalityGap(g, 'personality')
  );
  ctx.gaps = mergeGaps(ctx.gaps, personalityGaps);

  // Add evidence
  for (const ev of ctx.personalityResult.evidence) {
    ctx.evidence.push({
      field_path: `personality_config.${ev.field_path}`,
      source: ev.source,
      source_phase: 'personality',
      quote: ev.quote,
      reasoning: ev.reasoning,
    });
  }
}

/**
 * Phase 5: Knowledge Seed
 */
async function executeKnowledgePhase(ctx: AssemblyContext): Promise<void> {
  if (!ctx.companyProfile) {
    throw new Error('Company profile must exist before knowledge generation');
  }

  // Use the new extracted engine
  const result = runKnowledgeSeedEngine({
    company_profile: ctx.companyProfile,
    existing_gaps: ctx.gaps,
  });

  ctx.knowledgeConfig = result.config;
  ctx.confidence.by_phase.knowledge = result.confidence;

  // Merge gaps with source_phase annotation
  const knowledgeGaps: AssemblyGap[] = result.gaps.map((g) => ({
    ...g,
    source_phase: 'knowledge' as AssemblyPhase,
  }));
  ctx.gaps = mergeGaps(ctx.gaps, knowledgeGaps);

  // Add evidence
  for (const ev of result.evidence) {
    ctx.evidence.push({
      field_path: ev.field_path,
      source: ev.source,
      source_phase: 'knowledge',
      reasoning: ev.reasoning,
    });
  }
}

/**
 * Phase 6: Governance
 */
async function executeGovernancePhase(ctx: AssemblyContext): Promise<void> {
  // Add disallowed topics from personality if available
  const additionalForbidden = ctx.personalityResult?.personality.role_boundaries.disallowed_topics || [];

  // Use the new extracted engine
  const result = runGovernanceDefaultsEngine({
    industry: ctx.companyProfile?.industry,
    sub_industry: ctx.companyProfile?.sub_industry,
    business_model: ctx.companyProfile?.business_model,
    additional_forbidden_phrases: additionalForbidden,
    country: ctx.companyProfile?.location?.country,
  });

  ctx.governanceConfig = result.config;
  ctx.confidence.by_phase.governance = result.confidence;

  // Merge gaps with source_phase annotation
  const governanceGaps: AssemblyGap[] = result.gaps.map((g) => ({
    ...g,
    source_phase: 'governance' as AssemblyPhase,
  }));
  ctx.gaps = mergeGaps(ctx.gaps, governanceGaps);

  // Add evidence
  for (const ev of result.evidence) {
    ctx.evidence.push({
      field_path: ev.field_path,
      source: ev.source,
      source_phase: 'governance',
      reasoning: ev.reasoning,
    });
  }
}

/**
 * Phase 7: Economics
 */
async function executeEconomicsPhase(ctx: AssemblyContext): Promise<void> {
  // Use the new extracted engine
  const result = runEconomicsDefaultsEngine({
    channels: ctx.input.channels,
    business_model: ctx.companyProfile?.business_model,
    company_size: ctx.companyProfile?.company_size,
    sales_complexity: ctx.companyProfile?.sales_complexity,
  });

  ctx.economicsConfig = result.config;
  ctx.confidence.by_phase.economics = result.confidence;

  // Merge gaps with source_phase annotation
  const economicsGaps: AssemblyGap[] = result.gaps.map((g) => ({
    ...g,
    source_phase: 'economics' as AssemblyPhase,
  }));
  ctx.gaps = mergeGaps(ctx.gaps, economicsGaps);

  // Add evidence
  for (const ev of result.evidence) {
    ctx.evidence.push({
      field_path: ev.field_path,
      source: ev.source,
      source_phase: 'economics',
      reasoning: ev.reasoning,
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

function generateAgentId(): string {
  return `agent_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildAssemblyResultFromContext(ctx: AssemblyContext, status: 'draft' | 'complete' | 'failed'): AssemblyResult {
  // Use the snapshot builder for consistent assembly
  const snapshotInput: SnapshotBuilderInput = {
    agentId: ctx.agentId,
    status,
    companyProfile: ctx.companyProfile,
    brandVoiceProfile: ctx.brandVoiceProfile,
    selectedTemplate: ctx.selectedTemplate,
    templateAlternatives: ctx.templateAlternatives,
    toolAssignment: ctx.toolAssignment,
    conversationFlow: ctx.conversationFlow,
    personalityResult: ctx.personalityResult,
    knowledgeConfig: ctx.knowledgeConfig,
    governanceConfig: ctx.governanceConfig,
    economicsConfig: ctx.economicsConfig,
    gaps: ctx.gaps,
    warnings: ctx.warnings,
    evidence: ctx.evidence,
    auditLog: ctx.auditLog,
    state: ctx.state,
    confidence: ctx.confidence,
  };

  // Build wizard snapshot using the snapshot builder
  const wizardSnapshot = buildWizardSnapshot(snapshotInput);

  // Calculate dimension confidence
  ctx.confidence.by_dimension = calculateDimensionConfidence(snapshotInput);

  return {
    agentId: ctx.agentId,
    status,
    wizard_snapshot: wizardSnapshot,
    confidence: ctx.confidence,
    gaps: ctx.gaps,
    warnings: ctx.warnings,
    assembly_state: ctx.state,
    evidence: ctx.evidence,
    audit_log: ctx.auditLog,
  };
}

// ============================================================================
// Re-exports from engines for backward compatibility
// ============================================================================

// Re-export engine functions with backward-compatible names
export { runKnowledgeSeedEngine as generateKnowledgeSeed } from '../../lib/agent-os/engines/knowledge-seed';
export { runGovernanceDefaultsEngine, getDefaultGovernanceConfig } from '../../lib/agent-os/engines/governance-defaults';
export { runEconomicsDefaultsEngine, getDefaultEconomicsConfig } from '../../lib/agent-os/engines/economics-defaults';

// ============================================================================
// Exports for testing and external use
// ============================================================================

export {
  executeEnrichmentPhase,
  executeTemplatePhase,
  executeToolsPhase,
  executeFlowPhase,
  executePersonalityPhase,
  executeKnowledgePhase,
  executeGovernancePhase,
  executeEconomicsPhase,
};

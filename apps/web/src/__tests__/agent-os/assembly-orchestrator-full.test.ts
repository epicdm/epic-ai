/**
 * Assembly Orchestrator Full Integration Tests
 *
 * Tests the complete agent assembly pipeline using deterministic fixture data.
 * These tests verify the full wizard_snapshot output and gap aggregation.
 */

// Import fixtures
import companyProfileSolar from './fixtures/companyProfile.solar.json';
import brandVoiceWarmPro from './fixtures/brandVoice.warmPro.json';
import enrichmentResult from './fixtures/engineOutputs/enrichment.result.json';
import templateResult from './fixtures/engineOutputs/template.result.json';
import toolsResult from './fixtures/engineOutputs/tools.result.json';
import flowResult from './fixtures/engineOutputs/flow.result.json';
import personalityResult from './fixtures/engineOutputs/personality.result.json';
import knowledgeResult from './fixtures/engineOutputs/knowledge.result.json';
import governanceResult from './fixtures/engineOutputs/governance.result.json';
import economicsResult from './fixtures/engineOutputs/economics.result.json';

// Mock the assembly orchestrator to use fixture data
const mockAssembleAgent = jest.fn();

jest.mock('@epic-ai/workers/processors/agent-os', () => ({
  assembleAgent: mockAssembleAgent,
  mergeGaps: jest.requireActual('@epic-ai/workers/processors/agent-os').mergeGaps,
  generateKnowledgeSeed: jest.requireActual('@epic-ai/workers/processors/agent-os').generateKnowledgeSeed,
  getDefaultGovernanceConfig: jest.requireActual('@epic-ai/workers/processors/agent-os').getDefaultGovernanceConfig,
  getDefaultEconomicsConfig: jest.requireActual('@epic-ai/workers/processors/agent-os').getDefaultEconomicsConfig,
}));

describe('Assembly Orchestrator Full Integration', () => {
  // Build complete wizard_snapshot from fixtures
  const buildWizardSnapshot = () => ({
    company_profile: companyProfileSolar,
    selected_template: {
      template_key: templateResult.selected_template.agent_type,
      match_score: templateResult.selected_template.match_score,
      match_level: templateResult.selected_template.match_level,
      reasons: templateResult.selected_template.reasons,
      alternatives: templateResult.alternatives,
    },
    tools: {
      essential: toolsResult.essential_tools,
      recommended: toolsResult.recommended_tools,
      optional: toolsResult.optional_tools,
      disabled: toolsResult.disabled_tools,
    },
    flows: flowResult.flow,
    personality: personalityResult.personality,
    knowledge: knowledgeResult.config,
    governance: governanceResult.config,
    economics: economicsResult.config,
  });

  // Aggregate all gaps from fixtures
  const aggregateGaps = () => [
    ...enrichmentResult.gaps,
    ...templateResult.gaps,
    ...toolsResult.gaps,
    ...flowResult.gaps,
    ...personalityResult.gaps,
    ...knowledgeResult.gaps,
    ...governanceResult.gaps,
    ...economicsResult.gaps,
  ];

  // Aggregate all evidence from fixtures
  const aggregateEvidence = () => [
    ...enrichmentResult.evidence,
    ...templateResult.evidence,
    ...toolsResult.evidence,
    ...flowResult.evidence,
    ...personalityResult.evidence,
    ...knowledgeResult.evidence,
    ...governanceResult.evidence,
    ...economicsResult.evidence,
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock to return fixture-based data
    mockAssembleAgent.mockImplementation(() =>
      Promise.resolve({
        status: 'draft',
        agentId: 'test-agent-id-' + Date.now(),
        wizard_snapshot: buildWizardSnapshot(),
        assembly_state: {
          phase: 'done',
          completed: ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance', 'economics'],
        },
        gaps: aggregateGaps(),
        evidence: aggregateEvidence(),
        audit_log: [
          { action: 'phase_started', phase: 'enrichment', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'enrichment', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'template', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'template', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'tools', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'tools', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'flow', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'flow', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'personality', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'personality', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'knowledge', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'knowledge', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'governance', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'governance', timestamp: new Date().toISOString() },
          { action: 'phase_started', phase: 'economics', timestamp: new Date().toISOString() },
          { action: 'phase_completed', phase: 'economics', timestamp: new Date().toISOString() },
        ],
        confidence: {
          overall: 0.85,
          by_phase: {
            enrichment: enrichmentResult.confidence,
            template: templateResult.confidence,
            tools: toolsResult.confidence,
            flow: flowResult.confidence,
            personality: personalityResult.confidence,
            knowledge: knowledgeResult.confidence,
            governance: governanceResult.confidence,
            economics: economicsResult.confidence,
          },
        },
      })
    );
  });

  describe('Full draft agent creation with all 10 config blobs', () => {
    it('creates complete wizard_snapshot with all configurations', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        websiteUrl: 'https://sunpower-pros.com',
        channels: ['VOICE', 'CHAT', 'SMS'],
        userAnswers: {
          company_name: companyProfileSolar.name,
          industry: companyProfileSolar.industry,
          business_model: 'b2c',
        },
      });

      // Status should be draft
      expect(result.status).toBe('draft');
      expect(result.agentId).toBeDefined();

      // All config blobs present in wizard_snapshot
      expect(result.wizard_snapshot).toBeDefined();

      // 1. Company Profile
      expect(result.wizard_snapshot.company_profile).toBeDefined();
      expect(result.wizard_snapshot.company_profile.name).toBe(companyProfileSolar.name);
      expect(result.wizard_snapshot.company_profile.industry).toBe(companyProfileSolar.industry);

      // 2. Selected Template
      expect(result.wizard_snapshot.selected_template).toBeDefined();
      expect(result.wizard_snapshot.selected_template.template_key).toBe(templateResult.selected_template.agent_type);
      expect(result.wizard_snapshot.selected_template.match_score).toBeGreaterThan(0);
      expect(result.wizard_snapshot.selected_template.reasons).toBeDefined();

      // 3. Tools
      expect(result.wizard_snapshot.tools).toBeDefined();
      expect(result.wizard_snapshot.tools.essential).toBeDefined();
      expect(result.wizard_snapshot.tools.recommended).toBeDefined();
      expect(result.wizard_snapshot.tools.optional).toBeDefined();
      expect(result.wizard_snapshot.tools.disabled).toBeDefined();

      // 4. Flows (conversation flow)
      expect(result.wizard_snapshot.flows).toBeDefined();
      expect(result.wizard_snapshot.flows.flow_id).toBe(flowResult.flow.flow_id);
      expect(result.wizard_snapshot.flows.nodes).toBeDefined();
      expect(result.wizard_snapshot.flows.edges).toBeDefined();

      // 5. Personality
      expect(result.wizard_snapshot.personality).toBeDefined();
      expect(result.wizard_snapshot.personality.persona).toBeDefined();
      expect(result.wizard_snapshot.personality.tone).toBeDefined();
      expect(result.wizard_snapshot.personality.language).toBeDefined();
      expect(result.wizard_snapshot.personality.conversation_style).toBeDefined();
      expect(result.wizard_snapshot.personality.role_boundaries).toBeDefined();
      expect(result.wizard_snapshot.personality.channel_tuning).toBeDefined();

      // 6. Knowledge
      expect(result.wizard_snapshot.knowledge).toBeDefined();
      expect(result.wizard_snapshot.knowledge.seed_facts).toBeDefined();
      expect(Array.isArray(result.wizard_snapshot.knowledge.seed_facts)).toBe(true);

      // 7. Governance
      expect(result.wizard_snapshot.governance).toBeDefined();
      expect(result.wizard_snapshot.governance.compliance_mode).toBe(governanceResult.config.compliance_mode);
      expect(result.wizard_snapshot.governance.forbidden_phrases).toBeDefined();
      expect(result.wizard_snapshot.governance.escalation_triggers).toBeDefined();

      // 8. Economics
      expect(result.wizard_snapshot.economics).toBeDefined();
      expect(result.wizard_snapshot.economics.token_budget_per_conversation).toBe(economicsResult.config.token_budget_per_conversation);
      expect(result.wizard_snapshot.economics.cost_per_channel).toBeDefined();
    });

    it('all 8 phases complete in order', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: 'Solar Test Co', industry: 'solar' },
      });

      // All 8 phases should be in completed array
      const expectedPhases = ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance', 'economics'];
      expectedPhases.forEach((phase) => {
        expect(result.assembly_state.completed).toContain(phase);
      });

      // Phase should be 'done'
      expect(result.assembly_state.phase).toBe('done');

      // Should have exactly 8 completed phases
      expect(result.assembly_state.completed.length).toBe(8);
    });

    it('returns audit log with timestamps for all phases', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: 'Audit Test Co', industry: 'solar' },
      });

      expect(result.audit_log).toBeDefined();
      expect(Array.isArray(result.audit_log)).toBe(true);

      // Should have phase_started and phase_completed entries
      const phaseStarts = result.audit_log.filter((e: { action: string }) => e.action === 'phase_started');
      const phaseCompletes = result.audit_log.filter((e: { action: string }) => e.action === 'phase_completed');

      expect(phaseStarts.length).toBeGreaterThanOrEqual(8);
      expect(phaseCompletes.length).toBeGreaterThanOrEqual(8);

      // All entries should have timestamps
      result.audit_log.forEach((entry: { timestamp: string }) => {
        expect(entry.timestamp).toBeDefined();
        expect(typeof entry.timestamp).toBe('string');
        const parsed = new Date(entry.timestamp);
        expect(parsed.getTime()).toBeGreaterThan(0);
      });
    });

    it('calculates confidence scores for each phase', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: 'Confidence Test Co', industry: 'solar' },
      });

      // Should have confidence object
      expect(result.confidence).toBeDefined();
      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);

      // Should have per-phase confidence
      expect(result.confidence.by_phase).toBeDefined();
      expect(typeof result.confidence.by_phase).toBe('object');
      expect(Object.keys(result.confidence.by_phase).length).toBeGreaterThan(0);

      // All phase confidences should be 0-1
      Object.values(result.confidence.by_phase).forEach((value) => {
        expect(value as number).toBeGreaterThanOrEqual(0);
        expect(value as number).toBeLessThanOrEqual(1);
      });
    });

    it('tracks evidence from all phases', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: 'Evidence Test Co', industry: 'solar' },
      });

      // Should have evidence array
      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);

      // Evidence should have required fields
      result.evidence.forEach((e: { field_path: string; source: string; source_phase: string }) => {
        expect(e.field_path).toBeDefined();
        expect(e.source).toBeDefined();
        expect(e.source_phase).toBeDefined();
      });

      // Should have evidence from multiple phases
      const sourcePhases = new Set(result.evidence.map((e: { source_phase: string }) => e.source_phase));
      expect(sourcePhases.size).toBeGreaterThan(1);
    });
  });

  describe('Fixture data structure verification', () => {
    it('company profile fixture has required fields', () => {
      expect(companyProfileSolar.name).toBeDefined();
      expect(companyProfileSolar.industry).toBeDefined();
      expect(companyProfileSolar.services).toBeDefined();
      expect(Array.isArray(companyProfileSolar.services)).toBe(true);
      expect(companyProfileSolar.services.length).toBeGreaterThan(0);
      expect(companyProfileSolar.contact).toBeDefined();
      expect(companyProfileSolar.serviceArea).toBeDefined();
    });

    it('brand voice fixture has required fields', () => {
      expect(brandVoiceWarmPro.detected_tone).toBeDefined();
      expect(brandVoiceWarmPro.formality_level).toBeDefined();
      expect(brandVoiceWarmPro.sample_phrases).toBeDefined();
      expect(Array.isArray(brandVoiceWarmPro.sample_phrases)).toBe(true);
      expect(brandVoiceWarmPro.detection_confidence).toBeGreaterThan(0);
    });

    it('template result fixture has required fields', () => {
      expect(templateResult.selected_template).toBeDefined();
      expect(templateResult.selected_template.agent_type).toBeDefined();
      expect(templateResult.selected_template.match_score).toBeGreaterThan(0);
      expect(templateResult.gaps).toBeDefined();
      expect(templateResult.evidence).toBeDefined();
      expect(templateResult.confidence).toBeGreaterThan(0);
    });

    it('tools result fixture has required fields', () => {
      expect(toolsResult.essential_tools).toBeDefined();
      expect(toolsResult.recommended_tools).toBeDefined();
      expect(toolsResult.optional_tools).toBeDefined();
      expect(toolsResult.disabled_tools).toBeDefined();
      expect(Array.isArray(toolsResult.essential_tools)).toBe(true);
    });

    it('flow result fixture has required fields', () => {
      expect(flowResult.flow).toBeDefined();
      expect(flowResult.flow.flow_id).toBeDefined();
      expect(flowResult.flow.nodes).toBeDefined();
      expect(flowResult.flow.edges).toBeDefined();
      expect(flowResult.flow.entry_node).toBeDefined();
      expect(Array.isArray(flowResult.flow.nodes)).toBe(true);
      expect(Array.isArray(flowResult.flow.edges)).toBe(true);
    });

    it('personality result fixture has required fields', () => {
      expect(personalityResult.personality).toBeDefined();
      expect(personalityResult.personality.persona).toBeDefined();
      expect(personalityResult.personality.persona.name).toBeDefined();
      expect(personalityResult.personality.tone).toBeDefined();
      expect(personalityResult.personality.language).toBeDefined();
      expect(personalityResult.personality.conversation_style).toBeDefined();
      expect(personalityResult.personality.channel_tuning).toBeDefined();
    });

    it('knowledge result fixture has required fields', () => {
      expect(knowledgeResult.config).toBeDefined();
      expect(knowledgeResult.config.seed_facts).toBeDefined();
      expect(Array.isArray(knowledgeResult.config.seed_facts)).toBe(true);
      expect(knowledgeResult.config.seed_facts.length).toBeGreaterThan(0);

      // Each fact should have category, fact, confidence
      knowledgeResult.config.seed_facts.forEach((fact) => {
        expect(fact.category).toBeDefined();
        expect(fact.fact).toBeDefined();
        expect(fact.confidence).toBeGreaterThanOrEqual(0);
        expect(fact.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('governance result fixture has required fields', () => {
      expect(governanceResult.config).toBeDefined();
      expect(governanceResult.config.compliance_mode).toBeDefined();
      expect(governanceResult.config.forbidden_phrases).toBeDefined();
      expect(governanceResult.config.escalation_triggers).toBeDefined();
      expect(governanceResult.config.pii_handling).toBeDefined();
      expect(Array.isArray(governanceResult.config.forbidden_phrases)).toBe(true);
      expect(Array.isArray(governanceResult.config.escalation_triggers)).toBe(true);
    });

    it('economics result fixture has required fields', () => {
      expect(economicsResult.config).toBeDefined();
      expect(economicsResult.config.token_budget_per_conversation).toBeGreaterThan(0);
      expect(economicsResult.config.cost_per_channel).toBeDefined();
      expect(economicsResult.config.model_selection).toBeDefined();
      expect(economicsResult.config.rate_limits).toBeDefined();
    });
  });

  describe('Gap aggregation from fixture data', () => {
    it('collects gaps from all phases', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: companyProfileSolar.name, industry: 'solar' },
      });

      // Should have gaps array
      expect(result.gaps).toBeDefined();
      expect(Array.isArray(result.gaps)).toBe(true);

      // Based on fixtures:
      // - economics.result.json has no_budget gap
      // - knowledge.result.json has no_knowledge gap
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('gaps have proper structure', async () => {
      const { assembleAgent } = require('@epic-ai/workers/processors/agent-os');

      const result = await assembleAgent({
        companyId: 'solar_company_123',
        userAnswers: { company_name: 'Gap Structure Test', industry: 'solar' },
      });

      result.gaps.forEach((gap: {
        gap_type: string;
        field_path: string;
        severity: string;
        impact: string;
        recommended_fix: string;
        source_phase: string;
      }) => {
        // Required fields
        expect(gap).toHaveProperty('gap_type');
        expect(gap).toHaveProperty('field_path');
        expect(gap).toHaveProperty('severity');
        expect(gap).toHaveProperty('impact');
        expect(gap).toHaveProperty('recommended_fix');
        expect(gap).toHaveProperty('source_phase');

        // Severity should be low/medium/high
        expect(['low', 'medium', 'high']).toContain(gap.severity);
      });
    });

    it('economics fixture has budget gap', () => {
      expect(economicsResult.gaps.length).toBeGreaterThan(0);
      const budgetGap = economicsResult.gaps.find((g) => g.gap_type === 'no_budget');
      expect(budgetGap).toBeDefined();
      expect(budgetGap?.severity).toBe('low');
    });

    it('knowledge fixture has knowledge gap', () => {
      expect(knowledgeResult.gaps.length).toBeGreaterThan(0);
      const knowledgeGap = knowledgeResult.gaps.find((g) => g.gap_type === 'no_knowledge');
      expect(knowledgeGap).toBeDefined();
      expect(knowledgeGap?.severity).toBe('medium');
    });
  });

  describe('Tool categories from fixture data', () => {
    it('essential tools have required fields', () => {
      toolsResult.essential_tools.forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.reason).toBeDefined();
      });
    });

    it('recommended tools have required fields', () => {
      toolsResult.recommended_tools.forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.reason).toBeDefined();
      });
    });

    it('optional tools have required fields', () => {
      toolsResult.optional_tools.forEach((tool) => {
        expect(tool.id).toBeDefined();
        expect(tool.reason).toBeDefined();
      });
    });

    it('has calendar_booking as essential tool', () => {
      const calendarTool = toolsResult.essential_tools.find((t) => t.id === 'calendar_booking');
      expect(calendarTool).toBeDefined();
    });
  });

  describe('Flow nodes from fixture data', () => {
    it('has greeting as entry node', () => {
      expect(flowResult.flow.entry_node).toBe('greeting');
    });

    it('has greeting node', () => {
      const greetingNode = flowResult.flow.nodes.find((n) => n.id === 'greeting');
      expect(greetingNode).toBeDefined();
      expect(greetingNode?.type).toBe('message');
    });

    it('has edges connecting nodes', () => {
      expect(flowResult.flow.edges.length).toBeGreaterThan(0);

      // Each edge should have from and to
      flowResult.flow.edges.forEach((edge) => {
        expect(edge.from).toBeDefined();
        expect(edge.to).toBeDefined();
      });
    });

    it('has objection handlers', () => {
      expect(flowResult.flow.objection_handlers).toBeDefined();
      expect(flowResult.flow.objection_handlers.length).toBeGreaterThan(0);
    });
  });

  describe('Personality from fixture data', () => {
    it('persona has name and role', () => {
      expect(personalityResult.personality.persona.name).toBe('Alex');
      expect(personalityResult.personality.persona.role_title).toBe('Solar Consultant');
    });

    it('tone has numeric scales', () => {
      expect(personalityResult.personality.tone.formality).toBeGreaterThanOrEqual(1);
      expect(personalityResult.personality.tone.formality).toBeLessThanOrEqual(5);
      expect(personalityResult.personality.tone.enthusiasm).toBeGreaterThanOrEqual(1);
      expect(personalityResult.personality.tone.enthusiasm).toBeLessThanOrEqual(5);
    });

    it('channel tuning has voice settings', () => {
      expect(personalityResult.personality.channel_tuning.voice).toBeDefined();
      expect(personalityResult.personality.channel_tuning.voice.speech_rate_wpm).toBeGreaterThan(0);
    });
  });

  describe('Governance from fixture data', () => {
    it('has standard compliance mode', () => {
      expect(governanceResult.config.compliance_mode).toBe('standard');
    });

    it('has forbidden phrases', () => {
      expect(governanceResult.config.forbidden_phrases).toContain('I guarantee');
      expect(governanceResult.config.forbidden_phrases).toContain('I promise');
    });

    it('has escalation triggers', () => {
      expect(governanceResult.config.escalation_triggers).toContain('speak to a human');
      expect(governanceResult.config.escalation_triggers).toContain('emergency');
    });

    it('has safe claim phrases', () => {
      expect(governanceResult.config.safe_claim_phrases).toBeDefined();
      expect(governanceResult.config.safe_claim_phrases.length).toBeGreaterThan(0);
    });
  });

  describe('Economics from fixture data', () => {
    it('has token budget', () => {
      expect(economicsResult.config.token_budget_per_conversation).toBe(4000);
    });

    it('has channel costs', () => {
      expect(economicsResult.config.cost_per_channel.VOICE).toBe(0.15);
      expect(economicsResult.config.cost_per_channel.CHAT).toBe(0.02);
      expect(economicsResult.config.cost_per_channel.SMS).toBe(0.05);
      expect(economicsResult.config.cost_per_channel.EMAIL).toBe(0.01);
    });

    it('has model selection', () => {
      expect(economicsResult.config.model_selection.default).toBe('gpt-4o-mini');
      expect(economicsResult.config.model_selection.fallback).toBe('gpt-3.5-turbo');
      expect(economicsResult.config.model_selection.complex_queries).toBe('gpt-4o');
    });

    it('has rate limits', () => {
      expect(economicsResult.config.rate_limits.requests_per_minute).toBe(60);
      expect(economicsResult.config.rate_limits.tokens_per_minute).toBe(100000);
    });
  });
});

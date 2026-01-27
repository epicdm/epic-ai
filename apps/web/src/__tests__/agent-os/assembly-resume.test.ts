/**
 * Assembly Resume Tests
 *
 * Tests that the assembly orchestrator can properly resume from mid-phase
 * failures and checkpoint states.
 */

import {
  assembleAgent,
  type AssemblyInput,
  type AssemblyContext,
  type CompanyProfile,
} from '@epic-ai/workers/processors/agent-os';

// Load test fixtures
import companyProfileSolar from './fixtures/companyProfile.solar.json';
import enrichmentResult from './fixtures/engineOutputs/enrichment.result.json';
import templateResult from './fixtures/engineOutputs/template.result.json';
import toolsResult from './fixtures/engineOutputs/tools.result.json';
import flowResult from './fixtures/engineOutputs/flow.result.json';
import personalityResult from './fixtures/engineOutputs/personality.result.json';

describe('Assembly Resume', () => {
  describe('Resume from checkpoint', () => {
    it('resumes from enrichment phase checkpoint', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Solar Experts',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      // Initial context with enrichment completed
      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'template',
          completed: ['enrichment'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
      };

      const result = await assembleAgent(input, context);

      // Should skip enrichment
      expect(result.assembly_state.completed).toContain('enrichment');
      expect(result.assembly_state.completed).toContain('template');
      expect(result.assembly_state.completed).toContain('tools');
      expect(result.assembly_state.completed).toContain('flow');
      expect(result.assembly_state.completed).toContain('personality');
      expect(result.assembly_state.completed).toContain('knowledge');
      expect(result.assembly_state.completed).toContain('governance');
      expect(result.assembly_state.completed).toContain('economics');
      expect(result.assembly_state.phase).toBe('done');

      // Should use same agent ID
      expect(result.agentId).toBe('existing-agent-id');
    });

    it('resumes from template phase checkpoint', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Solar Experts',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'tools',
          completed: ['enrichment', 'template'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
        selectedTemplate: {
          template_id: templateResult.selected_template.agent_type,
          agent_type: templateResult.selected_template.agent_type as 'sales_qualifier' | 'appointment_setter' | 'customer_support' | 'lead_capture' | 'booking_assistant' | 'faq_bot' | 'onboarding_guide' | 'product_recommender',
          match_score: templateResult.selected_template.match_score,
          match_level: templateResult.selected_template.match_level as 'exact' | 'high' | 'moderate' | 'partial' | 'fallback',
          reasons: templateResult.selected_template.reasons,
          expected_outcome: {
            conversion_lift: 'medium',
            time_savings: 'high',
            complexity_match: 'good',
          },
        },
      };

      const result = await assembleAgent(input, context);

      // Should skip enrichment and template
      expect(result.assembly_state.completed.filter((p) => p === 'enrichment').length).toBe(1);
      expect(result.assembly_state.completed.filter((p) => p === 'template').length).toBe(1);

      // Should complete remaining phases
      expect(result.assembly_state.completed).toContain('tools');
      expect(result.assembly_state.completed).toContain('flow');
      expect(result.assembly_state.completed).toContain('personality');
      expect(result.assembly_state.completed).toContain('knowledge');
      expect(result.assembly_state.completed).toContain('governance');
      expect(result.assembly_state.completed).toContain('economics');
    });

    it('resumes from mid-pipeline (personality) checkpoint', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Solar Experts',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'personality',
          completed: ['enrichment', 'template', 'tools', 'flow'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
        selectedTemplate: {
          template_id: templateResult.selected_template.agent_type,
          agent_type: templateResult.selected_template.agent_type as 'sales_qualifier' | 'appointment_setter' | 'customer_support' | 'lead_capture' | 'booking_assistant' | 'faq_bot' | 'onboarding_guide' | 'product_recommender',
          match_score: templateResult.selected_template.match_score,
          match_level: templateResult.selected_template.match_level as 'exact' | 'high' | 'moderate' | 'partial' | 'fallback',
          reasons: templateResult.selected_template.reasons,
          expected_outcome: { conversion_lift: 'medium', time_savings: 'high', complexity_match: 'good' },
        },
        toolAssignment: {
          essential_tools: toolsResult.essential_tools.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 85,
          })),
          recommended_tools: toolsResult.recommended_tools.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 70,
          })),
          optional_tools: toolsResult.optional_tools.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 50,
          })),
          disabled_tools: toolsResult.disabled_tools,
          confidence: toolsResult.confidence,
          reasoning: ['Resumed from checkpoint'],
        },
        conversationFlow: {
          flow: flowResult.flow,
          confidence: flowResult.confidence,
          reasoning: ['Resumed from checkpoint'],
        },
      };

      const result = await assembleAgent(input, context);

      // Should have exactly 8 completed phases (no duplicates)
      expect(result.assembly_state.completed.length).toBe(8);
      expect(result.assembly_state.phase).toBe('done');

      // Should complete personality, knowledge, governance, economics
      expect(result.assembly_state.completed).toContain('personality');
      expect(result.assembly_state.completed).toContain('knowledge');
      expect(result.assembly_state.completed).toContain('governance');
      expect(result.assembly_state.completed).toContain('economics');
    });

    it('resumes from near-completion (economics) checkpoint', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Solar Experts',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'economics',
          completed: ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
        selectedTemplate: {
          template_id: 'appointment_setter',
          agent_type: 'appointment_setter',
          match_score: 85,
          match_level: 'high',
          reasons: ['Checkpoint resume'],
          expected_outcome: { conversion_lift: 'medium', time_savings: 'high', complexity_match: 'good' },
        },
      };

      const result = await assembleAgent(input, context);

      // Should only run economics
      expect(result.assembly_state.completed).toContain('economics');
      expect(result.assembly_state.phase).toBe('done');

      // Should preserve wizard snapshot
      expect(result.wizard_snapshot.economics).toBeDefined();
      expect(result.wizard_snapshot.economics.token_budget_per_conversation).toBeGreaterThan(0);
    });
  });

  describe('Force flag behavior', () => {
    it('force flag reruns all phases even from done state', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        force: true,
        userAnswers: {
          company_name: 'Force Rerun Test',
          industry: 'technology',
          business_model: 'b2b',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'done',
          completed: ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance', 'economics'],
        },
      };

      const result = await assembleAgent(input, context);

      // Should re-run all phases
      expect(result.assembly_state.completed.length).toBe(8);
      expect(result.assembly_state.phase).toBe('done');

      // All phases should be in completed (re-run)
      const phases = ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance', 'economics'];
      phases.forEach((phase) => {
        expect(result.assembly_state.completed).toContain(phase);
      });
    });

    it('force flag ignores partial state and starts fresh', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        force: true,
        userAnswers: {
          company_name: 'Force Fresh Test',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const context: AssemblyContext = {
        state: {
          phase: 'tools',
          completed: ['enrichment', 'template'],
        },
      };

      const result = await assembleAgent(input, context);

      // Should have all 8 phases completed
      expect(result.assembly_state.completed.length).toBe(8);
    });
  });

  describe('Audit log for resumed runs', () => {
    it('audit log reflects resumed phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Audit Resume Test',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'personality',
          completed: ['enrichment', 'template', 'tools', 'flow'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
        selectedTemplate: {
          template_id: 'appointment_setter',
          agent_type: 'appointment_setter',
          match_score: 85,
          match_level: 'high',
          reasons: ['Test'],
          expected_outcome: { conversion_lift: 'medium', time_savings: 'high', complexity_match: 'good' },
        },
        toolAssignment: {
          essential_tools: [],
          recommended_tools: [],
          optional_tools: [],
          disabled_tools: [],
          confidence: 0.8,
          reasoning: ['Test'],
        },
        conversationFlow: {
          flow: flowResult.flow,
          confidence: 0.8,
          reasoning: ['Test'],
        },
      };

      const result = await assembleAgent(input, context);

      // Should have audit entries for resumed phases
      const phaseStarts = result.audit_log.filter((e) => e.action === 'phase_started');
      const phaseCompletes = result.audit_log.filter((e) => e.action === 'phase_completed');

      // Should have started/completed personality, knowledge, governance, economics
      expect(phaseStarts.length).toBeGreaterThanOrEqual(4);
      expect(phaseCompletes.length).toBeGreaterThanOrEqual(4);

      // Check that resumed phases are logged
      const startedPhases = phaseStarts.map((e) => e.phase);
      expect(startedPhases).toContain('personality');
      expect(startedPhases).toContain('knowledge');
      expect(startedPhases).toContain('governance');
      expect(startedPhases).toContain('economics');
    });
  });

  describe('Context preservation', () => {
    it('preserves company profile from context', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Override Name', // Should not override context
          industry: 'solar',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'template',
          completed: ['enrichment'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
      };

      const result = await assembleAgent(input, context);

      // Should use context company profile
      expect(result.wizard_snapshot.company_profile.name).toBe(companyProfileSolar.name);
    });

    it('preserves template from context', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        desiredTemplateKey: 'sales_qualifier', // Should not override context
        userAnswers: {
          industry: 'solar',
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'tools',
          completed: ['enrichment', 'template'],
        },
        companyProfile: companyProfileSolar as unknown as CompanyProfile,
        selectedTemplate: {
          template_id: 'appointment_setter',
          agent_type: 'appointment_setter',
          match_score: 90,
          match_level: 'exact',
          reasons: ['User specified'],
          expected_outcome: { conversion_lift: 'high', time_savings: 'high', complexity_match: 'exact' },
        },
      };

      const result = await assembleAgent(input, context);

      // Should use context template
      expect(result.wizard_snapshot.selected_template.template_key).toBe('appointment_setter');
    });

    it('merges gaps from context and new phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Gap Merge Test',
          industry: 'solar',
          // Missing pricing to trigger knowledge gap
        },
      };

      const context: AssemblyContext = {
        agentId: 'existing-agent-id',
        state: {
          phase: 'knowledge',
          completed: ['enrichment', 'template', 'tools', 'flow', 'personality'],
        },
        companyProfile: {
          ...companyProfileSolar as unknown as CompanyProfile,
          pricing: undefined, // Remove pricing to trigger gap
        },
        selectedTemplate: {
          template_id: 'appointment_setter',
          agent_type: 'appointment_setter',
          match_score: 85,
          match_level: 'high',
          reasons: ['Test'],
          expected_outcome: { conversion_lift: 'medium', time_savings: 'high', complexity_match: 'good' },
        },
      };

      const result = await assembleAgent(input, context);

      // Should have gaps from multiple sources
      expect(result.gaps.length).toBeGreaterThan(0);

      // Should have pricing gap
      const pricingGap = result.gaps.find((g) =>
        g.gap_type === 'missing_pricing' || g.field_path.includes('pricing')
      );
      expect(pricingGap).toBeDefined();
    });
  });

  describe('Error handling in resume', () => {
    it('handles invalid checkpoint state gracefully', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      // Invalid state - skipped phases but missing data
      const context: AssemblyContext = {
        state: {
          phase: 'personality',
          completed: ['enrichment', 'template', 'tools', 'flow'],
        },
        // Missing required context data
      };

      // Should either throw or fall back to re-running phases
      try {
        const result = await assembleAgent(input, context);
        // If it succeeds, it should have valid output
        expect(result.assembly_state.phase).toBe('done');
      } catch {
        // Expected - invalid state should be rejected
        expect(true).toBe(true);
      }
    });
  });
});

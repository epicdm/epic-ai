/**
 * Assembly Orchestrator (AO v1) Tests
 *
 * Tests the complete agent assembly pipeline that orchestrates
 * all intelligence engines in sequence.
 */

import {
  assembleAgent,
  mergeGaps,
  generateKnowledgeSeed,
  getDefaultGovernanceConfig,
  getDefaultEconomicsConfig,
  type AssemblyInput,
  type AssemblyGap,
  type AssemblyResult,
  type CompanyProfile,
} from '@epic-ai/workers/processors/agent-os';

describe('Assembly Orchestrator v1', () => {
  describe('assembleAgent - basic flow', () => {
    it('creates a draft agent with all config sections', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        websiteUrl: 'https://example.com',
        channels: ['CHAT'],
        userAnswers: {
          company_name: 'Acme Solar',
          industry: 'solar',
          business_model: 'b2c',
          sales_complexity: 'complex',
          services: [
            { name: 'Solar Panel Installation', is_service: true },
            { name: 'Energy Consultation', is_service: true },
          ],
        },
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');
      expect(result.agentId).toBeDefined();
      expect(result.wizard_snapshot).toBeDefined();

      // All 10 config blobs should be present (including flowConfig)
      expect(result.wizard_snapshot.company_profile).toBeDefined();
      expect(result.wizard_snapshot.selected_template).toBeDefined();
      expect(result.wizard_snapshot.tools).toBeDefined();
      expect(result.wizard_snapshot.flows).toBeDefined();
      expect(result.wizard_snapshot.personality).toBeDefined();
      expect(result.wizard_snapshot.knowledge).toBeDefined();
      expect(result.wizard_snapshot.governance).toBeDefined();
      expect(result.wizard_snapshot.economics).toBeDefined();
    });

    it('runs all 8 phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Test Co',
          industry: 'technology',
          business_model: 'b2b',
        },
      };

      const result = await assembleAgent(input);

      // Should have completed all phases
      expect(result.assembly_state.completed).toContain('enrichment');
      expect(result.assembly_state.completed).toContain('template');
      expect(result.assembly_state.completed).toContain('tools');
      expect(result.assembly_state.completed).toContain('flow');
      expect(result.assembly_state.completed).toContain('personality');
      expect(result.assembly_state.completed).toContain('knowledge');
      expect(result.assembly_state.completed).toContain('governance');
      expect(result.assembly_state.completed).toContain('economics');
      expect(result.assembly_state.phase).toBe('done');
    });

    it('returns audit log with all phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'healthcare',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      // Should have audit entries for each phase
      const phaseStarts = result.audit_log.filter((e) => e.action === 'phase_started');
      const phaseCompletes = result.audit_log.filter((e) => e.action === 'phase_completed');

      expect(phaseStarts.length).toBeGreaterThanOrEqual(8);
      expect(phaseCompletes.length).toBeGreaterThanOrEqual(8);

      // Check timestamps are present
      result.audit_log.forEach((entry) => {
        expect(entry.timestamp).toBeDefined();
        expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
      });
    });

    it('calculates overall confidence', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Full Data Company',
          industry: 'saas',
          business_model: 'saas',
          sales_complexity: 'moderate',
          services: [{ name: 'SaaS Platform', is_service: true }],
          contact: { phone: '+1-555-0100', email: 'support@example.com' },
        },
      };

      const result = await assembleAgent(input);

      expect(result.confidence.overall).toBeGreaterThan(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
      expect(result.confidence.by_phase).toBeDefined();
      expect(Object.keys(result.confidence.by_phase).length).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - template selection', () => {
    it('selects template based on company data', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Solar Pros',
          industry: 'solar',
          business_model: 'b2c',
          sales_complexity: 'complex',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.selected_template.template_key).toBeDefined();
      expect(result.wizard_snapshot.selected_template.match_score).toBeGreaterThan(0);
      expect(result.wizard_snapshot.selected_template.reasons.length).toBeGreaterThan(0);
    });

    it('uses user-specified template when provided', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        desiredTemplateKey: 'customer_support',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.selected_template.template_key).toBe('customer_support');
      expect(result.wizard_snapshot.selected_template.match_score).toBe(100);
      expect(result.wizard_snapshot.selected_template.reasons).toContain('User specified template');
    });

    it('returns template alternatives', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'healthcare',
          business_model: 'b2c',
          sales_complexity: 'simple',
        },
      };

      const result = await assembleAgent(input);

      // Should have alternatives when not user-specified
      expect(result.wizard_snapshot.selected_template.alternatives).toBeDefined();
    });
  });

  describe('assembleAgent - tools assignment', () => {
    it('assigns tools based on template and company', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
          sales_complexity: 'complex',
          contact: { phone: '+1-555-0100' },
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.tools.essential.length).toBeGreaterThan(0);
      expect(result.wizard_snapshot.tools.recommended).toBeDefined();
      expect(result.wizard_snapshot.tools.optional).toBeDefined();
      expect(result.wizard_snapshot.tools.disabled).toBeDefined();
    });

    it('adds gaps for missing integrations', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'healthcare',
          business_model: 'b2c',
          // calendar_connected not specified
        },
      };

      const result = await assembleAgent(input);

      // Should have calendar integration gap if calendar tool is essential
      const hasCalendarTool = result.wizard_snapshot.tools.essential.some((t) => t.id === 'calendar');
      if (hasCalendarTool) {
        const hasCalendarGap = result.gaps.some(
          (g) => g.gap_type === 'missing_integration' && g.field_path.includes('calendar')
        );
        expect(hasCalendarGap).toBe(true);
      }
    });
  });

  describe('assembleAgent - conversation flow', () => {
    it('generates conversation flow with nodes and edges', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
          company_name: 'Solar Experts',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.flows).toBeDefined();
      expect(result.wizard_snapshot.flows.nodes).toBeDefined();
      expect(result.wizard_snapshot.flows.edges).toBeDefined();
      expect(result.wizard_snapshot.flows.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - personality', () => {
    it('generates personality config', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        channels: ['VOICE'],
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
          company_name: 'Sunny Solar',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.personality).toBeDefined();
      expect(result.wizard_snapshot.personality.persona).toBeDefined();
      expect(result.wizard_snapshot.personality.tone).toBeDefined();
      expect(result.wizard_snapshot.personality.language).toBeDefined();
      expect(result.wizard_snapshot.personality.conversation_style).toBeDefined();
      expect(result.wizard_snapshot.personality.role_boundaries).toBeDefined();
      expect(result.wizard_snapshot.personality.channel_tuning).toBeDefined();
    });

    it('applies brand voice when provided', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'technology',
          business_model: 'b2b',
          brand_voice: {
            tone: 'professional',
            tone_traits: ['authoritative', 'knowledgeable'],
            formality_level: 4,
            warmth_level: 2,
            vocabulary_style: 'technical',
            do_say: ['We specialize in', 'Our expertise'],
            dont_say: ['Maybe', 'I think'],
          },
        },
      };

      const result = await assembleAgent(input);

      // Personality should reflect brand voice
      expect(result.wizard_snapshot.personality.tone.formality).toBeGreaterThanOrEqual(3);
      expect(result.wizard_snapshot.personality.language.vocabulary_style).toBe('technical');
    });

    it('adds gaps when brand voice is missing', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
          // No brand_voice
        },
      };

      const result = await assembleAgent(input);

      // Should have brand voice gaps
      const brandVoiceGaps = result.gaps.filter((g) => g.gap_type === 'missing_brand_voice');
      expect(brandVoiceGaps.length).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - knowledge seed', () => {
    it('generates seed facts from company profile', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Test Company',
          industry: 'technology',
          business_model: 'b2b',
          services: [
            { name: 'Software Development', is_service: true },
            { name: 'Cloud Hosting', is_service: true },
          ],
          contact: {
            phone: '+1-555-0100',
            email: 'contact@test.com',
          },
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.knowledge.seed_facts.length).toBeGreaterThan(0);

      // Should have company fact
      const hasCompanyFact = result.wizard_snapshot.knowledge.seed_facts.some(
        (f) => f.category === 'company'
      );
      expect(hasCompanyFact).toBe(true);

      // Should have service facts
      const hasServiceFacts = result.wizard_snapshot.knowledge.seed_facts.some(
        (f) => f.category === 'services'
      );
      expect(hasServiceFacts).toBe(true);

      // Should have contact facts
      const hasContactFacts = result.wizard_snapshot.knowledge.seed_facts.some(
        (f) => f.category === 'contact'
      );
      expect(hasContactFacts).toBe(true);
    });

    it('identifies knowledge gaps', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Minimal Co',
          // Missing: services, contact, hours, pricing
        },
      };

      const result = await assembleAgent(input);

      // Should have knowledge gaps
      expect(result.wizard_snapshot.knowledge.knowledge_gaps.length).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - governance', () => {
    it('applies standard compliance for general industry', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'technology',
          business_model: 'b2b',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.governance.compliance_mode).toBe('standard');
    });

    it('applies regulated compliance for healthcare', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'healthcare',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.governance.compliance_mode).toBe('regulated');
      expect(result.wizard_snapshot.governance.pii_handling).toBe('strict');
    });

    it('applies regulated compliance for finance', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'finance',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.governance.compliance_mode).toBe('regulated');
    });

    it('includes forbidden phrases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.governance.forbidden_phrases.length).toBeGreaterThan(0);
      expect(result.wizard_snapshot.governance.forbidden_phrases).toContain('I guarantee');
    });

    it('includes escalation triggers', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.governance.escalation_triggers.length).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - economics', () => {
    it('sets channel costs', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        channels: ['VOICE', 'CHAT'],
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.economics.cost_per_channel).toBeDefined();
      expect(result.wizard_snapshot.economics.cost_per_channel.VOICE).toBeGreaterThan(0);
      expect(result.wizard_snapshot.economics.cost_per_channel.CHAT).toBeGreaterThan(0);
    });

    it('sets token budget', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.wizard_snapshot.economics.token_budget_per_conversation).toBeGreaterThan(0);
    });
  });

  describe('assembleAgent - resumability', () => {
    it('can resume from partial state', async () => {
      // First run - simulate interruption by using partial context
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Resume Test',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      // Complete run
      const result1 = await assembleAgent(input);
      expect(result1.assembly_state.completed.length).toBe(8);

      // "Resume" with same input (should skip completed phases)
      const result2 = await assembleAgent(input, {
        agentId: result1.agentId,
        state: { phase: 'personality', completed: ['enrichment', 'template', 'tools', 'flow'] },
        companyProfile: result1.wizard_snapshot.company_profile,
        selectedTemplate: {
          template_id: result1.wizard_snapshot.selected_template.template_key,
          agent_type: result1.wizard_snapshot.selected_template.template_key as 'sales_qualifier' | 'appointment_setter' | 'customer_support' | 'lead_capture' | 'booking_assistant' | 'faq_bot' | 'onboarding_guide' | 'product_recommender',
          match_score: result1.wizard_snapshot.selected_template.match_score,
          match_level: result1.wizard_snapshot.selected_template.match_level,
          reasons: result1.wizard_snapshot.selected_template.reasons,
          expected_outcome: { conversion_lift: 'unknown', time_savings: 'unknown', complexity_match: 'unknown' },
        },
        toolAssignment: {
          essential_tools: result1.wizard_snapshot.tools.essential.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 85,
          })),
          recommended_tools: result1.wizard_snapshot.tools.recommended.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 70,
          })),
          optional_tools: result1.wizard_snapshot.tools.optional.map((t) => ({
            id: t.id,
            reason: t.reason,
            score: 50,
          })),
          disabled_tools: result1.wizard_snapshot.tools.disabled,
          confidence: 0.8,
          reasoning: ['Resumed from checkpoint'],
        },
        conversationFlow: {
          flow: result1.wizard_snapshot.flows,
          confidence: 0.8,
          reasoning: ['Resumed from checkpoint'],
        },
      });

      // Should have same agentId
      expect(result2.agentId).toBe(result1.agentId);

      // Should complete remaining phases
      expect(result2.assembly_state.completed).toContain('personality');
      expect(result2.assembly_state.completed).toContain('knowledge');
      expect(result2.assembly_state.completed).toContain('governance');
      expect(result2.assembly_state.completed).toContain('economics');
    });

    it('force flag reruns all phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        force: true,
        userAnswers: {
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input, {
        state: { phase: 'done', completed: ['enrichment', 'template', 'tools', 'flow', 'personality', 'knowledge', 'governance', 'economics'] },
      });

      // Should have re-run all phases
      expect(result.assembly_state.completed.filter((p) => p === 'enrichment').length).toBe(1);
    });
  });

  describe('assembleAgent - evidence tracking', () => {
    it('tracks evidence for all phases', async () => {
      const input: AssemblyInput = {
        companyId: 'company_123',
        userAnswers: {
          company_name: 'Evidence Test',
          industry: 'solar',
          business_model: 'b2c',
        },
      };

      const result = await assembleAgent(input);

      expect(result.evidence.length).toBeGreaterThan(0);

      // Should have evidence from multiple phases
      const phases = new Set(result.evidence.map((e) => e.source_phase));
      expect(phases.size).toBeGreaterThan(3);
    });
  });

  describe('mergeGaps', () => {
    it('deduplicates gaps by type and field_path', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Cannot answer pricing questions',
          recommended_fix: 'Add pricing',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'high', // Higher severity
          impact: 'Critical: No pricing info',
          recommended_fix: 'Add pricing immediately',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(1);
      expect(merged[0].severity).toBe('high'); // Should keep higher severity
    });

    it('keeps distinct gaps', () => {
      const existing: AssemblyGap[] = [
        {
          gap_type: 'missing_pricing',
          field_path: 'company.pricing',
          severity: 'medium',
          impact: 'Impact A',
          recommended_fix: 'Fix A',
          source_phase: 'enrichment',
        },
      ];

      const newGaps: AssemblyGap[] = [
        {
          gap_type: 'missing_hours',
          field_path: 'company.hours',
          severity: 'low',
          impact: 'Impact B',
          recommended_fix: 'Fix B',
          source_phase: 'knowledge',
        },
      ];

      const merged = mergeGaps(existing, newGaps);

      expect(merged.length).toBe(2);
    });
  });

  describe('generateKnowledgeSeed', () => {
    it('generates facts from complete profile', () => {
      const companyProfile: CompanyProfile = {
        name: 'Test Company',
        industry: 'technology',
        location: { city: 'San Francisco', state: 'CA' },
        services: [
          { name: 'Software Dev', description: 'Custom software', is_service: true },
        ],
        contact: { phone: '+1-555-0100', email: 'hello@test.com' },
        hours: { timezone: 'America/Los_Angeles' },
        pricing: { model: 'hourly' },
      };

      const result = generateKnowledgeSeed({
        company_profile: companyProfile,
        gaps: [],
      });

      expect(result.config.seed_facts.length).toBeGreaterThan(0);

      // Should have facts for each category
      const categories = result.config.seed_facts.map((f) => f.category);
      expect(categories).toContain('company');
      expect(categories).toContain('location');
      expect(categories).toContain('services');
      expect(categories).toContain('contact');
    });

    it('adds gaps for missing data', () => {
      const companyProfile: CompanyProfile = {
        name: 'Minimal Co',
        // Missing: services, contact, hours, pricing
      };

      const result = generateKnowledgeSeed({
        company_profile: companyProfile,
        gaps: [],
      });

      expect(result.gaps.length).toBeGreaterThan(0);

      const gapTypes = result.gaps.map((g) => g.gap_type);
      expect(gapTypes).toContain('missing_services');
      expect(gapTypes).toContain('missing_contact');
    });
  });

  describe('getDefaultGovernanceConfig', () => {
    it('returns standard mode for general industries', () => {
      const config = getDefaultGovernanceConfig('technology');

      expect(config.compliance_mode).toBe('standard');
      expect(config.pii_handling).toBe('moderate');
    });

    it('returns regulated mode for healthcare', () => {
      const config = getDefaultGovernanceConfig('healthcare');

      expect(config.compliance_mode).toBe('regulated');
      expect(config.pii_handling).toBe('strict');
    });

    it('returns regulated mode for finance', () => {
      const config = getDefaultGovernanceConfig('finance');

      expect(config.compliance_mode).toBe('regulated');
    });

    it('returns regulated mode for legal', () => {
      const config = getDefaultGovernanceConfig('legal');

      expect(config.compliance_mode).toBe('regulated');
    });

    it('includes universal forbidden phrases', () => {
      const config = getDefaultGovernanceConfig();

      expect(config.forbidden_phrases).toContain('I guarantee');
      expect(config.forbidden_phrases).toContain('I promise');
    });

    it('includes escalation triggers', () => {
      const config = getDefaultGovernanceConfig();

      expect(config.escalation_triggers).toContain('speak to a human');
      expect(config.escalation_triggers).toContain('emergency');
    });
  });

  describe('getDefaultEconomicsConfig', () => {
    it('returns channel costs', () => {
      const config = getDefaultEconomicsConfig(['VOICE', 'CHAT']);

      expect(config.cost_per_channel.VOICE).toBeGreaterThan(0);
      expect(config.cost_per_channel.CHAT).toBeGreaterThan(0);
    });

    it('sets token budget', () => {
      const config = getDefaultEconomicsConfig();

      expect(config.token_budget_per_conversation).toBeGreaterThan(0);
    });

    it('sets balanced priority by default', () => {
      const config = getDefaultEconomicsConfig();

      expect(config.priority).toBe('balanced');
    });
  });

  describe('real-world scenarios', () => {
    it('Solar installer - complete assembly', async () => {
      const input: AssemblyInput = {
        companyId: 'solar_co_123',
        websiteUrl: 'https://solarexperts.com',
        channels: ['VOICE', 'CHAT'],
        userAnswers: {
          company_name: 'Solar Experts Inc',
          industry: 'solar',
          sub_industry: 'residential',
          business_model: 'b2c',
          sales_complexity: 'complex',
          services: [
            { name: 'Solar Panel Installation', description: 'Full residential installation', is_service: true },
            { name: 'Energy Audit', description: 'Home energy assessment', is_service: true },
            { name: 'Maintenance Plans', description: 'Annual maintenance', is_service: true },
          ],
          contact: {
            phone: '+1-800-SOLAR-99',
            email: 'info@solarexperts.com',
          },
          brand_voice: {
            tone: 'friendly',
            tone_traits: ['enthusiastic', 'knowledgeable', 'trustworthy'],
            warmth_level: 4,
            formality_level: 2,
            emoji_usage: 'minimal',
          },
        },
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');
      expect(result.wizard_snapshot.selected_template.template_key).toBe('sales_qualifier');

      // Should have phone tool
      const hasPhone = result.wizard_snapshot.tools.essential.some((t) => t.id === 'phone');
      expect(hasPhone).toBe(true);

      // Should have warm personality
      expect(result.wizard_snapshot.personality.tone.empathy).toBeGreaterThanOrEqual(2);

      // Should have knowledge about services
      const servicesFacts = result.wizard_snapshot.knowledge.seed_facts.filter(
        (f) => f.category === 'services'
      );
      expect(servicesFacts.length).toBeGreaterThan(0);
    });

    it('Healthcare practice - regulated compliance', async () => {
      const input: AssemblyInput = {
        companyId: 'dental_123',
        channels: ['CHAT'],
        userAnswers: {
          company_name: 'Smile Dental',
          industry: 'healthcare',
          sub_industry: 'dental',
          business_model: 'b2c',
          sales_complexity: 'simple',
          services: [
            { name: 'Dental Cleaning', is_service: true },
            { name: 'Teeth Whitening', is_service: true },
          ],
          contact: {
            phone: '+1-555-SMILE',
            email: 'appointments@smiledental.com',
          },
        },
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');

      // Should have regulated compliance
      expect(result.wizard_snapshot.governance.compliance_mode).toBe('regulated');
      expect(result.wizard_snapshot.governance.pii_handling).toBe('strict');

      // Should be appointment-focused
      expect(['appointment_setter', 'customer_support', 'faq_bot']).toContain(
        result.wizard_snapshot.selected_template.template_key
      );
    });

    it('B2B SaaS - technical support', async () => {
      const input: AssemblyInput = {
        companyId: 'saas_123',
        channels: ['CHAT'],
        desiredTemplateKey: 'customer_support',
        userAnswers: {
          company_name: 'CloudSync Pro',
          industry: 'saas',
          sub_industry: 'b2b_software',
          business_model: 'saas',
          sales_complexity: 'moderate',
          services: [
            { name: 'CloudSync Platform', description: 'Data synchronization', is_service: true },
            { name: 'API Access', description: 'Developer API', is_service: true },
          ],
          contact: {
            email: 'support@cloudsync.io',
          },
          brand_voice: {
            tone: 'professional',
            vocabulary_style: 'technical',
            formality_level: 3,
          },
        },
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');
      expect(result.wizard_snapshot.selected_template.template_key).toBe('customer_support');

      // Should have knowledge lookup tool
      const hasKnowledge = [...result.wizard_snapshot.tools.essential, ...result.wizard_snapshot.tools.recommended]
        .some((t) => t.id === 'knowledge_lookup');
      expect(hasKnowledge).toBe(true);

      // Should have technical vocabulary
      expect(result.wizard_snapshot.personality.language.vocabulary_style).toBe('technical');
    });

    it('Ecommerce - product recommender', async () => {
      const input: AssemblyInput = {
        companyId: 'ecom_123',
        channels: ['CHAT'],
        userAnswers: {
          company_name: 'TechGadgets Store',
          industry: 'ecommerce',
          business_model: 'b2c',
          sales_complexity: 'simple',
          services: [
            { name: 'Smartphones', is_service: false },
            { name: 'Laptops', is_service: false },
            { name: 'Accessories', is_service: false },
          ],
          brand_voice: {
            tone: 'casual',
            emoji_usage: 'moderate',
            warmth_level: 4,
          },
        },
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');

      // Should have ecommerce-focused template
      expect(['product_recommender', 'sales_qualifier', 'customer_support']).toContain(
        result.wizard_snapshot.selected_template.template_key
      );

      // Should have order lookup tools
      const allTools = [
        ...result.wizard_snapshot.tools.essential,
        ...result.wizard_snapshot.tools.recommended,
        ...result.wizard_snapshot.tools.optional,
      ];
      const hasOrderTools = allTools.some((t) => t.id === 'order_lookup' || t.id === 'payment');
      expect(hasOrderTools).toBe(true);
    });

    it('Minimal input - handles gracefully with gaps', async () => {
      const input: AssemblyInput = {
        companyId: 'minimal_123',
        // No user answers, no website
      };

      const result = await assembleAgent(input);

      expect(result.status).toBe('draft');

      // Should have gaps
      expect(result.gaps.length).toBeGreaterThan(0);

      // Should still produce valid config
      expect(result.wizard_snapshot.selected_template).toBeDefined();
      expect(result.wizard_snapshot.tools).toBeDefined();
      expect(result.wizard_snapshot.flows).toBeDefined();
      expect(result.wizard_snapshot.personality).toBeDefined();

      // Should have warnings about missing data
      const hasIndustryGap = result.gaps.some((g) => g.gap_type === 'missing_industry');
      expect(hasIndustryGap).toBe(true);
    });
  });
});

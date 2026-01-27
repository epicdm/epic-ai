/**
 * Personality Engine (PE v1) Tests
 *
 * Tests the personality generation and configuration algorithm.
 * Schema: persona, tone, language, conversation_style, role_boundaries, channel_tuning
 */

import {
  generatePersonality,
  buildPersonalityInput,
  getTemplatePersonalityBase,
  getIndustryAdjustment,
  getSupportedIndustries,
  validatePersonality,
  describePersonality,
  getDefaultAgentNames,
  type PersonalityGenerationInput,
  type PersonalityConfig,
} from '@epic-ai/workers/processors/agent-os';

describe('Personality Engine v1', () => {
  describe('generatePersonality - schema structure', () => {
    it('returns complete personality config with all sections', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      // Check all top-level sections exist
      expect(result.personality.persona).toBeDefined();
      expect(result.personality.tone).toBeDefined();
      expect(result.personality.language).toBeDefined();
      expect(result.personality.conversation_style).toBeDefined();
      expect(result.personality.role_boundaries).toBeDefined();
      expect(result.personality.channel_tuning).toBeDefined();

      // Check persona fields
      expect(result.personality.persona.name).toBeDefined();
      expect(result.personality.persona.role_title).toBeDefined();

      // Check tone fields (0-4 scale)
      expect(result.personality.tone.traits).toBeInstanceOf(Array);
      expect(result.personality.tone.formality).toBeGreaterThanOrEqual(0);
      expect(result.personality.tone.formality).toBeLessThanOrEqual(4);
      expect(result.personality.tone.enthusiasm).toBeGreaterThanOrEqual(0);
      expect(result.personality.tone.empathy).toBeGreaterThanOrEqual(0);
      expect(result.personality.tone.humor).toBeGreaterThanOrEqual(0);

      // Check language fields
      expect(['plain', 'balanced', 'technical']).toContain(result.personality.language.vocabulary_style);
      expect(['short', 'mixed', 'long']).toContain(result.personality.language.sentence_length);
      expect(result.personality.language.forbidden_phrases).toBeInstanceOf(Array);
      expect(result.personality.language.preferred_phrases).toBeInstanceOf(Array);

      // Check conversation_style fields
      expect(typeof result.personality.conversation_style.ask_permission_before_actions).toBe('boolean');
      expect(typeof result.personality.conversation_style.confirm_critical_details).toBe('boolean');
      expect(['fast', 'balanced', 'slow']).toContain(result.personality.conversation_style.pacing);

      // Check role_boundaries fields
      expect(result.personality.role_boundaries.allowed_topics).toBeInstanceOf(Array);
      expect(result.personality.role_boundaries.disallowed_topics).toBeInstanceOf(Array);
      expect(result.personality.role_boundaries.escalation_triggers).toBeInstanceOf(Array);
      expect(['standard', 'strict']).toContain(result.personality.role_boundaries.compliance_mode);

      // Check channel_tuning fields
      expect(result.personality.channel_tuning.voice.speech_rate_wpm).toBeGreaterThan(0);
      expect(result.personality.channel_tuning.sms.max_chars).toBeGreaterThan(0);
      expect(result.personality.channel_tuning.email.signoff).toBeDefined();
    });

    it('returns evidence and confidence', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.evidence.length).toBeGreaterThan(0);
      expect(result.dimension_confidence.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('returns gaps when brand voice is missing', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      const brandVoiceGap = result.gaps.find((g) => g.missing_field === 'brand_voice');
      expect(brandVoiceGap).toBeDefined();
      expect(brandVoiceGap!.importance).toBe('recommended');
      expect(brandVoiceGap!.question).toContain('brand');
    });
  });

  describe('generatePersonality - agent types', () => {
    it('generates personality for sales_qualifier agent', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.personality.tone.traits).toContain('professional');
      expect(result.personality.tone.traits).toContain('confident');
      expect(result.personality.tone.formality).toBe(3);
      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
      expect(result.personality.persona.role_title).toBe('Sales Concierge');
    });

    it('generates personality for appointment_setter agent', () => {
      const result = generatePersonality({ agent_type: 'appointment_setter' });

      expect(result.personality.tone.traits).toContain('friendly');
      expect(result.personality.tone.enthusiasm).toBe(3);
      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.personality.persona.role_title).toBe('Scheduling Specialist');
    });

    it('generates personality for customer_support agent', () => {
      const result = generatePersonality({ agent_type: 'customer_support' });

      expect(result.personality.tone.traits).toContain('empathetic');
      expect(result.personality.tone.empathy).toBe(4);
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.conversation_style.handle_interruptions).toBe('graceful');
      expect(result.personality.persona.role_title).toBe('Support Specialist');
    });

    it('generates personality for faq_bot agent', () => {
      const result = generatePersonality({ agent_type: 'faq_bot' });

      expect(result.personality.tone.traits).toContain('concise');
      expect(result.personality.language.sentence_length).toBe('short');
      expect(result.personality.conversation_style.ask_permission_before_actions).toBe(false);
      expect(result.personality.persona.role_title).toBe('Information Assistant');
    });

    it('generates personality for product_recommender agent', () => {
      const result = generatePersonality({ agent_type: 'product_recommender' });

      expect(result.personality.tone.traits).toContain('enthusiastic');
      expect(result.personality.tone.enthusiasm).toBe(3);
      expect(result.personality.conversation_style.pacing).toBe('balanced');
    });

    it('generates personality for lead_nurturer agent', () => {
      const result = generatePersonality({ agent_type: 'lead_nurturer' });

      expect(result.personality.tone.traits).toContain('warm');
      expect(result.personality.tone.empathy).toBe(3);
      expect(result.personality.conversation_style.pacing).toBe('slow');
    });

    it('generates personality for survey_agent agent', () => {
      const result = generatePersonality({ agent_type: 'survey_agent' });

      expect(result.personality.tone.traits).toContain('neutral');
      expect(result.personality.language.sentence_length).toBe('short');
      expect(result.personality.conversation_style.ask_permission_before_actions).toBe(true);
    });
  });

  describe('industry adjustments', () => {
    it('applies healthcare industry traits', () => {
      const result = generatePersonality({
        agent_type: 'appointment_setter',
        industry: 'healthcare',
      });

      expect(result.personality.tone.empathy).toBeGreaterThanOrEqual(3);
      expect(result.personality.role_boundaries.compliance_mode).toBe('strict');
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.role_boundaries.disallowed_topics).toContain('medical_diagnosis');
      expect(result.reasoning).toContain('Applied healthcare industry personality norms');
    });

    it('applies finance industry traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'finance',
      });

      expect(result.personality.tone.formality).toBe(4);
      expect(result.personality.tone.humor).toBe(0);
      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.role_boundaries.compliance_mode).toBe('strict');
      expect(result.personality.role_boundaries.disallowed_topics).toContain('investment_advice');
    });

    it('applies legal industry traits', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        industry: 'legal',
      });

      expect(result.personality.tone.formality).toBe(4);
      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.role_boundaries.compliance_mode).toBe('strict');
    });

    it('applies ecommerce industry traits', () => {
      const result = generatePersonality({
        agent_type: 'product_recommender',
        industry: 'ecommerce',
      });

      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.personality.role_boundaries.escalation_triggers).toContain('shipping_complaint');
    });

    it('applies saas industry traits', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        industry: 'saas',
      });

      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.role_boundaries.escalation_triggers).toContain('integration_issue');
    });

    it('applies hospitality industry traits', () => {
      const result = generatePersonality({
        agent_type: 'appointment_setter',
        industry: 'hospitality',
      });

      expect(result.personality.tone.enthusiasm).toBeGreaterThanOrEqual(3);
      expect(result.personality.tone.empathy).toBeGreaterThanOrEqual(3);
    });
  });

  describe('business model adjustments', () => {
    it('applies B2C business model traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        business_model: 'b2c',
      });

      expect(result.personality.language.vocabulary_style).toBe('plain');
      expect(result.personality.language.sentence_length).toBe('short');
      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.reasoning).toContain('Adjusted for b2c business model');
    });

    it('applies B2B business model traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        business_model: 'b2b',
      });

      expect(result.personality.tone.formality).toBe(4);
      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.conversation_style.pacing).toBe('balanced');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
    });

    it('applies SaaS business model traits', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        business_model: 'saas',
      });

      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
    });
  });

  describe('sales complexity adjustments', () => {
    it('applies simple complexity traits', () => {
      const result = generatePersonality({
        agent_type: 'appointment_setter',
        sales_complexity: 'simple',
      });

      expect(result.personality.language.sentence_length).toBe('short');
      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(false);
    });

    it('applies complex complexity traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        sales_complexity: 'complex',
      });

      expect(result.personality.language.sentence_length).toBe('mixed');
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
      expect(result.personality.conversation_style.summarize_before_handoff).toBe(true);
    });

    it('applies enterprise complexity traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        sales_complexity: 'enterprise',
      });

      expect(result.personality.language.sentence_length).toBe('long');
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
    });
  });

  describe('brand voice overlay', () => {
    it('applies brand tone traits', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        brand_voice: {
          tone_traits: ['witty', 'clever', 'irreverent'],
        },
      });

      expect(result.personality.tone.traits).toEqual(['witty', 'clever', 'irreverent']);
      expect(result.evidence.some((e) => e.source === 'brand_voice' && e.field_path === 'tone.traits')).toBe(true);
    });

    it('applies brand formality override', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        brand_voice: {
          formality: 4,
        },
      });

      expect(result.personality.tone.formality).toBe(4);
    });

    it('applies brand vocabulary style', () => {
      const result = generatePersonality({
        agent_type: 'faq_bot',
        brand_voice: {
          vocabulary_style: 'technical',
        },
      });

      expect(result.personality.language.vocabulary_style).toBe('technical');
    });

    it('applies do_say and dont_say phrases', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        brand_voice: {
          do_say: ['happy to help', 'quick question'],
          dont_say: ['cheap', 'no problem'],
        },
      });

      expect(result.personality.language.preferred_phrases).toContain('happy to help');
      expect(result.personality.language.preferred_phrases).toContain('quick question');
      expect(result.personality.language.forbidden_phrases).toContain('cheap');
      expect(result.personality.language.forbidden_phrases).toContain('no problem');
    });

    it('brand overrides take precedence over industry', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'finance', // Would set formality to 4 and technical vocabulary
        brand_voice: {
          formality: 1,
          vocabulary_style: 'plain',
        },
      });

      expect(result.personality.tone.formality).toBe(1);
      expect(result.personality.language.vocabulary_style).toBe('plain');
    });

    it('no gaps when brand voice is provided', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        brand_voice: {
          tone_traits: ['friendly'],
        },
      });

      const brandVoiceGap = result.gaps.find((g) => g.missing_field === 'brand_voice');
      expect(brandVoiceGap).toBeUndefined();
    });
  });

  describe('channel tuning', () => {
    it('adjusts for voice channel', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        sales_complexity: 'enterprise', // Would normally set sentence_length to 'long'
        channels: ['VOICE'],
      });

      // Voice channel should reduce long sentences to mixed
      expect(result.personality.language.sentence_length).toBe('mixed');
      expect(result.personality.language.filler_words).toBe('light');
      expect(result.personality.language.contraction_use).toBe('high');
    });

    it('sets voice config based on pacing', () => {
      const fastResult = generatePersonality({
        agent_type: 'appointment_setter',
        sales_complexity: 'simple',
      });

      const slowResult = generatePersonality({
        agent_type: 'customer_support',
      });

      expect(fastResult.personality.channel_tuning.voice.speech_rate_wpm).toBe(175);
      expect(slowResult.personality.channel_tuning.voice.speech_rate_wpm).toBe(145);
    });

    it('sets email signoff from company name', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        company_name: 'Acme Corp',
      });

      expect(result.personality.channel_tuning.email.signoff).toBe('— Acme Corp Team');
    });

    it('sets email signoff from brand name if no company name', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        brand_voice: {
          brand_name: 'SuperBrand',
        },
      });

      expect(result.personality.channel_tuning.email.signoff).toBe('— SuperBrand Team');
    });
  });

  describe('governance constraints', () => {
    it('includes universal forbidden phrases', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.personality.language.forbidden_phrases).toContain('I guarantee');
      expect(result.personality.language.forbidden_phrases).toContain('I promise');
      expect(result.personality.language.forbidden_phrases).toContain('trust me');
    });

    it('includes universal disallowed topics', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.personality.role_boundaries.disallowed_topics).toContain('legal_advice');
      expect(result.personality.role_boundaries.disallowed_topics).toContain('medical_diagnosis');
      expect(result.personality.role_boundaries.disallowed_topics).toContain('financial_guarantees');
    });

    it('includes universal escalation triggers', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.personality.role_boundaries.escalation_triggers).toContain('angry_customer');
      expect(result.personality.role_boundaries.escalation_triggers).toContain('legal_threat');
      expect(result.personality.role_boundaries.escalation_triggers).toContain('human_request');
    });

    it('applies PII strict mode', () => {
      const result = generatePersonality({
        agent_type: 'faq_bot',
        pii_strict: true,
      });

      expect(result.personality.role_boundaries.compliance_mode).toBe('strict');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
      expect(result.evidence.some((e) => e.source === 'governance')).toBe(true);
    });
  });

  describe('persona generation', () => {
    it('generates persona name from defaults', () => {
      const result = generatePersonality({ agent_type: 'customer_support' });

      expect(result.personality.persona.name).toBe('Emma');
    });

    it('generates backstory with company name', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        company_name: 'SolarPro',
      });

      expect(result.personality.persona.backstory_one_liner).toContain('SolarPro');
    });

    it('uses template name if provided', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        template_name: 'Solar Sales Expert',
      });

      expect(result.personality.persona.role_title).toBe('Solar Sales Expert');
    });
  });

  describe('confidence calculation', () => {
    it('returns base confidence for minimal input', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });

      expect(result.confidence).toBe(0.5);
    });

    it('increases confidence with more context', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
      });

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('increases confidence with brand voice', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        brand_voice: {
          tone_traits: ['empathetic', 'patient'],
          formality: 2,
        },
      });

      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('provides dimension-level confidence', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'solar',
      });

      const toneConfidence = result.dimension_confidence.find((d) => d.dimension === 'tone');
      expect(toneConfidence).toBeDefined();
      expect(toneConfidence!.confidence).toBeGreaterThan(0);
    });
  });

  describe('buildPersonalityInput', () => {
    it('builds input from enrichment data', () => {
      const enrichment = {
        company: {
          name: 'HealthCare Plus',
          industry: 'healthcare',
          sub_industry: 'dental',
          business_model: 'b2c' as const,
          sales_complexity: 'simple' as const,
        },
      };

      const input = buildPersonalityInput('appointment_setter', 'Dental Scheduler', enrichment);

      expect(input.agent_type).toBe('appointment_setter');
      expect(input.template_name).toBe('Dental Scheduler');
      expect(input.company_name).toBe('HealthCare Plus');
      expect(input.industry).toBe('healthcare');
      expect(input.sub_industry).toBe('dental');
      expect(input.business_model).toBe('b2c');
      expect(input.sales_complexity).toBe('simple');
    });

    it('builds input with brand brain settings', () => {
      const enrichment = {
        company: {
          industry: 'technology',
        },
        brand_brain: {
          tone_traits: ['professional', 'innovative'],
          formality_level: 3,
          vocabulary_style: 'technical' as const,
          do_say: ['cutting-edge', 'innovative'],
          dont_say: ['old-fashioned'],
          brand_name: 'TechCorp',
          humor_allowed: false,
        },
      };

      const input = buildPersonalityInput('sales_qualifier', undefined, enrichment);

      expect(input.brand_voice?.tone_traits).toEqual(['professional', 'innovative']);
      expect(input.brand_voice?.formality).toBe(3);
      expect(input.brand_voice?.vocabulary_style).toBe('technical');
      expect(input.brand_voice?.do_say).toContain('cutting-edge');
      expect(input.brand_voice?.dont_say).toContain('old-fashioned');
      expect(input.brand_voice?.brand_name).toBe('TechCorp');
      expect(input.brand_voice?.humor_allowed).toBe(false);
    });

    it('builds input with channel config', () => {
      const enrichment = {
        tools: {
          channels: ['VOICE', 'SMS'] as Array<'VOICE' | 'SMS' | 'EMAIL' | 'CHAT'>,
        },
      };

      const input = buildPersonalityInput('appointment_setter', undefined, enrichment);

      expect(input.channels).toContain('VOICE');
      expect(input.channels).toContain('SMS');
    });

    it('handles missing enrichment data', () => {
      const input = buildPersonalityInput('faq_bot');

      expect(input.agent_type).toBe('faq_bot');
      expect(input.industry).toBeUndefined();
      expect(input.brand_voice).toBeUndefined();
    });
  });

  describe('helper functions', () => {
    it('getTemplatePersonalityBase returns correct base', () => {
      const base = getTemplatePersonalityBase('customer_support');

      expect(base.tone_traits).toContain('empathetic');
      expect(base.empathy).toBe(4);
      expect(base.pacing).toBe('slow');
    });

    it('getIndustryAdjustment returns adjustment', () => {
      const adj = getIndustryAdjustment('healthcare');

      expect(adj).toBeDefined();
      expect(adj!.compliance_mode).toBe('strict');
      expect(adj!.empathy_delta).toBeGreaterThan(0);
    });

    it('getIndustryAdjustment returns undefined for unknown industry', () => {
      const adj = getIndustryAdjustment('unknown_xyz');

      expect(adj).toBeUndefined();
    });

    it('getSupportedIndustries returns list', () => {
      const industries = getSupportedIndustries();

      expect(industries.length).toBeGreaterThan(0);
      expect(industries).toContain('healthcare');
      expect(industries).toContain('finance');
      expect(industries).toContain('ecommerce');
    });

    it('getDefaultAgentNames returns names for agent type', () => {
      const names = getDefaultAgentNames('sales_qualifier');

      expect(names.length).toBeGreaterThan(0);
      expect(names).toContain('Alex');
    });
  });

  describe('validatePersonality', () => {
    it('validates correct personality config', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });
      const validation = validatePersonality(result.personality);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('detects out-of-range tone values', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });
      const badPersonality = {
        ...result.personality,
        tone: {
          ...result.personality.tone,
          formality: 10 as 0 | 1 | 2 | 3 | 4, // Out of range
        },
      };

      const validation = validatePersonality(badPersonality);

      expect(validation.valid).toBe(false);
      expect(validation.issues.some((i) => i.includes('formality'))).toBe(true);
    });

    it('detects missing persona name', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });
      const badPersonality: PersonalityConfig = {
        ...result.personality,
        persona: {
          ...result.personality.persona,
          name: '',
        },
      };

      const validation = validatePersonality(badPersonality);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Persona name is required');
    });

    it('warns about conflicting humor and compliance', () => {
      const result = generatePersonality({ agent_type: 'sales_qualifier' });
      const conflictingPersonality: PersonalityConfig = {
        ...result.personality,
        tone: {
          ...result.personality.tone,
          humor: 3,
        },
        role_boundaries: {
          ...result.personality.role_boundaries,
          compliance_mode: 'strict',
        },
      };

      const validation = validatePersonality(conflictingPersonality);

      expect(validation.issues.some((i) => i.includes('humor') && i.includes('compliance'))).toBe(true);
    });
  });

  describe('describePersonality', () => {
    it('generates human-readable description', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        industry: 'healthcare',
      });

      const description = describePersonality(result.personality);

      expect(description).toContain('empathetic');
      expect(description).toContain('slow-paced');
      expect(description).toContain('highly empathetic');
    });

    it('includes formality level', () => {
      const formalResult = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'finance',
      });

      const casualResult = generatePersonality({
        agent_type: 'appointment_setter',
        business_model: 'b2c',
      });

      expect(describePersonality(formalResult.personality)).toContain('formal');
      expect(describePersonality(casualResult.personality)).toContain('casual');
    });
  });

  describe('real-world scenarios', () => {
    it('Solar sales qualifier - warm professional brand', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
        company_name: 'SunPower Solutions',
        brand_voice: {
          tone_traits: ['professional', 'warm', 'direct'],
          formality: 3,
          do_say: ['happy to help', 'quick question', 'next step'],
          dont_say: ['cheap', 'guaranteed', 'trust me'],
        },
        channels: ['VOICE', 'SMS'],
      });

      expect(result.personality.tone.traits).toEqual(['professional', 'warm', 'direct']);
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.language.preferred_phrases).toContain('happy to help');
      expect(result.personality.channel_tuning.email.signoff).toBe('— SunPower Solutions Team');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.gaps.length).toBe(0); // No gaps because brand voice provided
    });

    it('Healthcare appointment setter - strict compliance', () => {
      const result = generatePersonality({
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
        pii_strict: true,
      });

      expect(result.personality.role_boundaries.compliance_mode).toBe('strict');
      expect(result.personality.role_boundaries.disallowed_topics).toContain('medical_diagnosis');
      expect(result.personality.conversation_style.confirm_critical_details).toBe(true);
    });

    it('B2B SaaS customer support - technical expert', () => {
      const result = generatePersonality({
        agent_type: 'customer_support',
        industry: 'saas',
        business_model: 'b2b',
        sales_complexity: 'complex',
        channels: ['CHAT', 'EMAIL'],
      });

      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.conversation_style.pacing).toBe('slow');
      expect(result.personality.role_boundaries.escalation_triggers).toContain('integration_issue');
    });

    it('Ecommerce product recommender - fast and friendly', () => {
      const result = generatePersonality({
        agent_type: 'product_recommender',
        industry: 'ecommerce',
        business_model: 'b2c',
        sales_complexity: 'simple',
      });

      expect(result.personality.conversation_style.pacing).toBe('fast');
      expect(result.personality.tone.enthusiasm).toBeGreaterThanOrEqual(3);
      expect(result.personality.language.sentence_length).toBe('short');
    });

    it('Enterprise B2B consulting - highly formal', () => {
      const result = generatePersonality({
        agent_type: 'sales_qualifier',
        industry: 'consulting',
        business_model: 'b2b',
        sales_complexity: 'enterprise',
      });

      expect(result.personality.tone.formality).toBe(4);
      expect(result.personality.language.vocabulary_style).toBe('technical');
      expect(result.personality.language.sentence_length).toBe('long');
      expect(result.personality.conversation_style.pacing).toBe('slow');
    });
  });
});

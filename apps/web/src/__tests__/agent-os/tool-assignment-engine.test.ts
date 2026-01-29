/**
 * Tool Assignment Intelligence Engine (TAIE v1) Tests
 *
 * Tests the multi-factor tool scoring and assignment algorithm.
 */

import {
  assignTools,
  buildToolAssignmentInput,
  getToolDefinition,
  getToolsByCategory,
  TOOL_LIBRARY,
  type ToolAssignmentInput,
} from '@epic-ai/workers/processors/agent-os';

describe('Tool Assignment Intelligence Engine v1', () => {
  describe('assignTools', () => {
    it('assigns essential tools for sales_qualifier agent', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
      };

      const result = assignTools(input);

      // Should have essential tools required for sales_qualifier
      const essentialIds = result.essential_tools.map((t) => t.id);
      expect(essentialIds).toContain('phone');
      expect(essentialIds).toContain('qualification_logic');
      expect(essentialIds).toContain('calendar');
    });

    it('assigns appointment tools for appointment_setter agent', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      const essentialIds = result.essential_tools.map((t) => t.id);
      expect(essentialIds).toContain('calendar');
      expect(essentialIds).toContain('sms');
    });

    it('assigns support tools for customer_support agent', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'customer_support',
        industry: 'saas',
        business_model: 'saas',
        sales_complexity: 'moderate',
      };

      const result = assignTools(input);

      const essentialIds = result.essential_tools.map((t) => t.id);
      expect(essentialIds).toContain('knowledge_lookup');
      expect(essentialIds).toContain('live_chat');
    });

    it('boosts industry-specific tools', () => {
      const solarInput: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
      };

      const result = assignTools(solarInput);

      // Solar should get quote_generator as recommended or essential
      const allTools = [
        ...result.essential_tools,
        ...result.recommended_tools,
        ...result.optional_tools,
      ];
      const hasQuoteGenerator = allTools.some((t) => t.id === 'quote_generator');
      expect(hasQuoteGenerator).toBe(true);
    });

    it('includes dependencies automatically', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      // If reminders is included, calendar should also be included (dependency)
      const allToolIds = [
        ...result.essential_tools,
        ...result.recommended_tools,
        ...result.optional_tools,
      ].map((t) => t.id);

      if (allToolIds.includes('reminders')) {
        expect(allToolIds).toContain('calendar');
      }
    });

    it('returns confidence score', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'technology',
        business_model: 'b2b',
        sales_complexity: 'complex',
      };

      const result = assignTools(input);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('returns reasoning for assignments', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0]).toContain('appointment setter');
    });

    it('each tool assignment has a reason', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'customer_support',
        industry: 'ecommerce',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      const allTools = [
        ...result.essential_tools,
        ...result.recommended_tools,
        ...result.optional_tools,
      ];

      allTools.forEach((tool) => {
        expect(tool.reason).toBeDefined();
        expect(tool.reason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('scoring scenarios', () => {
    it('Solar installer gets high-value conversion tools', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
        service_category_tags: ['installation', 'home improvement', 'consultation'],
      };

      const result = assignTools(input);

      // Should have phone, calendar, qualification, and quote generator
      const allToolIds = [
        ...result.essential_tools,
        ...result.recommended_tools,
      ].map((t) => t.id);

      expect(allToolIds).toContain('phone');
      expect(allToolIds).toContain('calendar');
      expect(allToolIds).toContain('qualification_logic');
      expect(allToolIds).toContain('quote_generator');
    });

    it('Healthcare practice gets scheduling-focused tools', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
        service_category_tags: ['appointments', 'scheduling', 'medical'],
      };

      const result = assignTools(input);

      const essentialIds = result.essential_tools.map((t) => t.id);
      expect(essentialIds).toContain('calendar');
      expect(essentialIds).toContain('sms');

      // Reminders should be recommended or essential
      const allToolIds = [...result.essential_tools, ...result.recommended_tools].map((t) => t.id);
      expect(allToolIds).toContain('reminders');
    });

    it('SaaS company gets support and integration tools', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'customer_support',
        industry: 'saas',
        business_model: 'saas',
        sales_complexity: 'moderate',
        service_category_tags: ['support', 'helpdesk', 'software'],
      };

      const result = assignTools(input);

      const allToolIds = [
        ...result.essential_tools,
        ...result.recommended_tools,
      ].map((t) => t.id);

      expect(allToolIds).toContain('knowledge_lookup');
      expect(allToolIds).toContain('live_chat');
      expect(allToolIds).toContain('ticket_creation');
    });

    it('Ecommerce business gets order and payment tools', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'product_recommender',
        industry: 'ecommerce',
        business_model: 'b2c',
        sales_complexity: 'simple',
        has_ecommerce: true,
      };

      const result = assignTools(input);

      const allToolIds = [
        ...result.essential_tools,
        ...result.recommended_tools,
      ].map((t) => t.id);

      expect(allToolIds).toContain('order_lookup');
      expect(allToolIds).toContain('payment');
    });

    it('B2B consulting gets documentation and CRM tools', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'consulting',
        business_model: 'b2b',
        sales_complexity: 'complex',
        service_category_tags: ['consulting', 'advisory', 'professional'],
      };

      const result = assignTools(input);

      const allToolIds = [
        ...result.essential_tools,
        ...result.recommended_tools,
      ].map((t) => t.id);

      expect(allToolIds).toContain('crm_sync');
      expect(allToolIds).toContain('document_sharing');
    });
  });

  describe('buildToolAssignmentInput', () => {
    it('builds input from enrichment result', () => {
      const enrichment = {
        company: {
          industry: 'healthcare',
          sub_industry: 'dental',
          business_model: 'b2c' as const,
          sales_complexity: 'simple' as const,
          service_category_tags: ['appointments', 'dental care'],
          phone: '+1-555-0123',
        },
        offerings: [{ name: 'Dental Cleaning', is_service: true }],
      };

      const input = buildToolAssignmentInput('appointment_setter', enrichment);

      expect(input.agent_type).toBe('appointment_setter');
      expect(input.industry).toBe('healthcare');
      expect(input.sub_industry).toBe('dental');
      expect(input.business_model).toBe('b2c');
      expect(input.sales_complexity).toBe('simple');
      expect(input.has_phone_support).toBe(true);
    });

    it('detects ecommerce from offerings', () => {
      const enrichment = {
        company: {
          industry: 'retail',
          business_model: 'b2c' as const,
        },
        offerings: [
          { name: 'Widget', is_service: false }, // Product, not service
        ],
      };

      const input = buildToolAssignmentInput('product_recommender', enrichment);

      expect(input.has_ecommerce).toBe(true);
    });
  });

  describe('helper functions', () => {
    it('getToolDefinition returns correct tool', () => {
      const phone = getToolDefinition('phone');

      expect(phone).toBeDefined();
      expect(phone!.name).toBe('Voice Calling');
      expect(phone!.category).toBe('communication');
    });

    it('getToolsByCategory returns filtered tools', () => {
      const communicationTools = getToolsByCategory('communication');

      expect(communicationTools.length).toBeGreaterThan(0);
      communicationTools.forEach((tool) => {
        expect(tool.category).toBe('communication');
      });
    });

    it('TOOL_LIBRARY contains expected tools', () => {
      const toolIds = TOOL_LIBRARY.map((t) => t.id);

      // Core tools should exist
      expect(toolIds).toContain('phone');
      expect(toolIds).toContain('sms');
      expect(toolIds).toContain('email');
      expect(toolIds).toContain('calendar');
      expect(toolIds).toContain('knowledge_lookup');
      expect(toolIds).toContain('crm_sync');
    });
  });

  describe('tier classification', () => {
    it('classifies high-scoring tools as essential', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'sales_qualifier',
        industry: 'solar',
        business_model: 'b2c',
        sales_complexity: 'complex',
      };

      const result = assignTools(input);

      // Essential tools should have scores >= 80
      result.essential_tools.forEach((tool) => {
        expect(tool.score).toBeGreaterThanOrEqual(80);
      });
    });

    it('classifies medium-scoring tools as recommended', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'appointment_setter',
        industry: 'healthcare',
        business_model: 'b2c',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      // Recommended tools should have scores between 60-79
      result.recommended_tools.forEach((tool) => {
        expect(tool.score).toBeGreaterThanOrEqual(60);
        expect(tool.score).toBeLessThan(80);
      });
    });

    it('classifies low-scoring tools as optional', () => {
      const input: ToolAssignmentInput = {
        agent_type: 'faq_bot',
        industry: 'technology',
        business_model: 'saas',
        sales_complexity: 'simple',
      };

      const result = assignTools(input);

      // Optional tools should have scores between 40-59
      result.optional_tools.forEach((tool) => {
        expect(tool.score).toBeGreaterThanOrEqual(40);
        expect(tool.score).toBeLessThan(60);
      });
    });
  });
});

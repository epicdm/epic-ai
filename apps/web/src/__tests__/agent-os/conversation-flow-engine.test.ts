/**
 * Conversation Flow Engine (CFE v1) Tests
 *
 * Tests the goal-oriented conversation flow generation algorithm.
 */

import {
  generateConversationFlow,
  buildFlowGenerationInput,
  getFlowNode,
  getNodesByPhase,
  validateFlow,
  type FlowGenerationInput,
  type ConversationFlow,
} from '@epic-ai/workers/processors/agent-os';
import type { ToolAssignmentResult } from '@epic-ai/workers/processors/agent-os';

// Mock tool assignment result for testing
const createMockTools = (essentialIds: string[], recommendedIds: string[] = []): ToolAssignmentResult => ({
  essential_tools: essentialIds.map((id) => ({
    id,
    name: id.replace(/_/g, ' '),
    reason: 'Test tool',
    score: 85,
  })),
  recommended_tools: recommendedIds.map((id) => ({
    id,
    name: id.replace(/_/g, ' '),
    reason: 'Test tool',
    score: 70,
  })),
  optional_tools: [],
  disabled_tools: [],
  confidence: 0.9,
  reasoning: ['Test reasoning'],
});

describe('Conversation Flow Engine v1', () => {
  describe('generateConversationFlow', () => {
    it('generates flow for sales_qualifier agent', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'qualification_logic'], ['crm_sync', 'quote_generator']),
        sales_complexity: 'complex',
        business_model: 'b2b',
        industry: 'solar',
      };

      const result = generateConversationFlow(input);

      expect(result.flow.flow_id).toBe('sales_qualifier_flow_v1');
      expect(result.flow.template_type).toBe('sales_qualifier');
      expect(result.flow.entry_node).toBe('start');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('generates flow for appointment_setter agent', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms', 'reminders']),
        sales_complexity: 'simple',
        business_model: 'b2c',
        industry: 'healthcare',
      };

      const result = generateConversationFlow(input);

      expect(result.flow.template_type).toBe('appointment_setter');
      expect(result.flow.nodes.length).toBeGreaterThan(5);
    });

    it('generates flow for customer_support agent', () => {
      const input: FlowGenerationInput = {
        template_type: 'customer_support',
        tools: createMockTools(['knowledge_lookup', 'live_chat', 'ticket_creation']),
        sales_complexity: 'moderate',
        business_model: 'saas',
        industry: 'saas',
      };

      const result = generateConversationFlow(input);

      // Support flows should have quick resolution path
      const quickResolution = getFlowNode(result.flow, 'quick_resolution');
      expect(quickResolution).toBeDefined();
      expect(quickResolution?.tools_used).toContain('knowledge_lookup');
    });

    it('includes all required phases', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'qualification_logic']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);

      // Check for required phases
      const phases = new Set(result.flow.nodes.map((n) => n.phase));
      expect(phases.has('start')).toBe(true);
      expect(phases.has('discovery')).toBe(true);
      expect(phases.has('action')).toBe(true);
      expect(phases.has('outcome')).toBe(true);
    });

    it('returns reasoning for flow decisions', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']),
        sales_complexity: 'complex',
        business_model: 'b2b',
        industry: 'consulting',
      };

      const result = generateConversationFlow(input);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some((r) => r.toLowerCase().includes('discovery'))).toBe(true);
    });

    it('returns confidence score', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const result = generateConversationFlow(input);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('discovery depth by complexity', () => {
    it('generates fewer discovery questions for simple complexity', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const result = generateConversationFlow(input);
      const discoveryNodes = getNodesByPhase(result.flow, 'discovery');

      expect(discoveryNodes.length).toBe(1);
    });

    it('generates more discovery questions for complex sales', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'qualification_logic']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);
      const discoveryNodes = getNodesByPhase(result.flow, 'discovery');

      expect(discoveryNodes.length).toBeGreaterThanOrEqual(3);
    });

    it('generates comprehensive discovery for enterprise sales', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'qualification_logic', 'crm_sync']),
        sales_complexity: 'enterprise',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);
      const discoveryNodes = getNodesByPhase(result.flow, 'discovery');

      expect(discoveryNodes.length).toBeGreaterThanOrEqual(4);
      expect(result.flow.metadata.estimated_turns.max).toBeGreaterThanOrEqual(20);
    });
  });

  describe('qualification triggers', () => {
    it('includes qualification for B2B business model', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'qualification_logic']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);

      const qualificationNode = getFlowNode(result.flow, 'qualification');
      expect(qualificationNode).toBeDefined();
      expect(qualificationNode?.type).toBe('decision');
      expect(result.flow.metadata.requires_qualification).toBe(true);
    });

    it('skips qualification for simple B2C flows', () => {
      const input: FlowGenerationInput = {
        template_type: 'booking_assistant',
        tools: createMockTools(['calendar', 'payment']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const result = generateConversationFlow(input);

      expect(result.flow.metadata.requires_qualification).toBe(false);
    });

    it('includes qualification for high-ticket items', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']),
        sales_complexity: 'moderate',
        business_model: 'b2c',
        has_high_ticket_items: true,
      };

      const result = generateConversationFlow(input);

      expect(result.flow.metadata.requires_qualification).toBe(true);
    });

    it('includes qualification for consultation-based services', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'phone']),
        sales_complexity: 'moderate',
        business_model: 'b2c',
        requires_consultation: true,
      };

      const result = generateConversationFlow(input);

      expect(result.flow.metadata.requires_qualification).toBe(true);
    });

    it('includes nurture path when qualification exists', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'qualification_logic', 'email', 'crm_sync']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);

      const nurtureNode = getFlowNode(result.flow, 'nurture_path');
      expect(nurtureNode).toBeDefined();
      expect(nurtureNode?.phase).toBe('outcome');
    });
  });

  describe('objection handlers', () => {
    it('includes solar-specific objection handlers', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'quote_generator']),
        sales_complexity: 'complex',
        business_model: 'b2c',
        industry: 'solar',
      };

      const result = generateConversationFlow(input);

      const costHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'cost_concern'
      );
      expect(costHandler).toBeDefined();
      expect(costHandler?.trigger_keywords).toContain('expensive');
    });

    it('includes healthcare-specific objection handlers', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms', 'knowledge_lookup']),
        sales_complexity: 'simple',
        business_model: 'b2c',
        industry: 'healthcare',
      };

      const result = generateConversationFlow(input);

      const insuranceHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'insurance'
      );
      expect(insuranceHandler).toBeDefined();
      expect(insuranceHandler?.trigger_keywords).toContain('insurance');
    });

    it('includes SaaS-specific objection handlers', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['live_chat', 'knowledge_lookup', 'calendar']),
        sales_complexity: 'complex',
        business_model: 'saas',
        industry: 'saas',
      };

      const result = generateConversationFlow(input);

      const integrationHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'integration'
      );
      expect(integrationHandler).toBeDefined();
      expect(integrationHandler?.trigger_keywords).toContain('integrate');
    });

    it('includes default objection handlers for any industry', () => {
      const input: FlowGenerationInput = {
        template_type: 'lead_capture',
        tools: createMockTools(['email', 'crm_sync']),
        sales_complexity: 'moderate',
        business_model: 'b2b',
        industry: 'unknown_industry',
      };

      const result = generateConversationFlow(input);

      const hesitationHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'general_hesitation'
      );
      expect(hesitationHandler).toBeDefined();
    });

    it('filters objection handler tools to available tools', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']), // No quote_generator
        sales_complexity: 'complex',
        business_model: 'b2c',
        industry: 'solar',
      };

      const result = generateConversationFlow(input);

      const costHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'cost_concern'
      );
      // quote_generator should not be in tools_used since it's not available
      expect(costHandler?.tools_used).not.toContain('quote_generator');
    });
  });

  describe('action nodes by template', () => {
    it('sales_qualifier action is book_meeting', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar', 'crm_sync']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);

      const actionNode = getFlowNode(result.flow, 'book_meeting');
      expect(actionNode).toBeDefined();
      expect(actionNode?.type).toBe('action');
      expect(actionNode?.tools_used).toContain('calendar');
    });

    it('appointment_setter action is book_appointment', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms', 'reminders']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const result = generateConversationFlow(input);

      const actionNode = getFlowNode(result.flow, 'book_appointment');
      expect(actionNode).toBeDefined();
      expect(actionNode?.tools_used).toContain('calendar');
    });

    it('customer_support action is resolve_issue', () => {
      const input: FlowGenerationInput = {
        template_type: 'customer_support',
        tools: createMockTools(['knowledge_lookup', 'ticket_creation']),
        sales_complexity: 'moderate',
        business_model: 'saas',
      };

      const result = generateConversationFlow(input);

      const actionNode = getFlowNode(result.flow, 'resolve_issue');
      expect(actionNode).toBeDefined();
      expect(actionNode?.tools_used).toContain('knowledge_lookup');
    });

    it('booking_assistant action is complete_booking', () => {
      const input: FlowGenerationInput = {
        template_type: 'booking_assistant',
        tools: createMockTools(['calendar', 'payment', 'sms']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const result = generateConversationFlow(input);

      const actionNode = getFlowNode(result.flow, 'complete_booking');
      expect(actionNode).toBeDefined();
      expect(actionNode?.tools_used).toContain('calendar');
    });
  });

  describe('flow metadata', () => {
    it('includes estimated turns based on complexity', () => {
      const simpleInput: FlowGenerationInput = {
        template_type: 'faq_bot',
        tools: createMockTools(['knowledge_lookup']),
        sales_complexity: 'simple',
        business_model: 'b2c',
      };

      const complexInput: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']),
        sales_complexity: 'complex',
        business_model: 'b2b',
      };

      const simpleResult = generateConversationFlow(simpleInput);
      const complexResult = generateConversationFlow(complexInput);

      expect(simpleResult.flow.metadata.estimated_turns.max).toBeLessThan(
        complexResult.flow.metadata.estimated_turns.max
      );
    });

    it('tracks complexity level', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']),
        sales_complexity: 'enterprise',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);

      expect(result.flow.metadata.complexity_level).toBe('enterprise');
    });
  });

  describe('buildFlowGenerationInput', () => {
    it('builds input from context', () => {
      const tools = createMockTools(['phone', 'calendar']);
      const context = {
        sales_complexity: 'complex' as const,
        business_model: 'b2b' as const,
        industry: 'technology',
        has_high_ticket_items: true,
      };

      const input = buildFlowGenerationInput('sales_qualifier', tools, context);

      expect(input.template_type).toBe('sales_qualifier');
      expect(input.tools).toBe(tools);
      expect(input.sales_complexity).toBe('complex');
      expect(input.business_model).toBe('b2b');
      expect(input.industry).toBe('technology');
      expect(input.has_high_ticket_items).toBe(true);
    });

    it('uses defaults for missing context', () => {
      const tools = createMockTools(['calendar']);

      const input = buildFlowGenerationInput('appointment_setter', tools, {});

      expect(input.sales_complexity).toBe('moderate');
      expect(input.business_model).toBe('unknown');
    });
  });

  describe('helper functions', () => {
    const mockFlow: ConversationFlow = {
      flow_id: 'test_flow',
      template_type: 'sales_qualifier',
      version: '1.0',
      nodes: [
        { id: 'start', type: 'message', phase: 'start', objective: 'Greet', next: ['discovery_1'] },
        { id: 'discovery_1', type: 'question', phase: 'discovery', objective: 'Ask', next: ['action'] },
        { id: 'action', type: 'action', phase: 'action', objective: 'Do', next: ['outcome'] },
        { id: 'outcome', type: 'message', phase: 'outcome', objective: 'End', next: [] },
      ],
      objection_handlers: [],
      entry_node: 'start',
      success_outcomes: ['outcome'],
      failure_outcomes: [],
      metadata: {
        estimated_turns: { min: 3, max: 6 },
        complexity_level: 'simple',
        requires_qualification: false,
      },
    };

    it('getFlowNode returns correct node', () => {
      const node = getFlowNode(mockFlow, 'discovery_1');

      expect(node).toBeDefined();
      expect(node?.type).toBe('question');
      expect(node?.phase).toBe('discovery');
    });

    it('getFlowNode returns undefined for missing node', () => {
      const node = getFlowNode(mockFlow, 'nonexistent');

      expect(node).toBeUndefined();
    });

    it('getNodesByPhase returns filtered nodes', () => {
      const startNodes = getNodesByPhase(mockFlow, 'start');

      expect(startNodes.length).toBe(1);
      expect(startNodes[0].id).toBe('start');
    });
  });

  describe('validateFlow', () => {
    it('validates a correct flow', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(['phone', 'calendar']),
        sales_complexity: 'moderate',
        business_model: 'b2b',
      };

      const result = generateConversationFlow(input);
      const validation = validateFlow(result.flow);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('detects missing entry node', () => {
      const badFlow: ConversationFlow = {
        flow_id: 'bad_flow',
        template_type: 'sales_qualifier',
        version: '1.0',
        nodes: [
          { id: 'other', type: 'message', phase: 'start', objective: 'Test', next: [] },
        ],
        objection_handlers: [],
        entry_node: 'start', // This doesn't exist
        success_outcomes: ['other'],
        failure_outcomes: [],
        metadata: {
          estimated_turns: { min: 1, max: 2 },
          complexity_level: 'simple',
          requires_qualification: false,
        },
      };

      const validation = validateFlow(badFlow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('Entry node'))).toBe(true);
    });

    it('detects invalid next references', () => {
      const badFlow: ConversationFlow = {
        flow_id: 'bad_flow',
        template_type: 'sales_qualifier',
        version: '1.0',
        nodes: [
          { id: 'start', type: 'message', phase: 'start', objective: 'Test', next: ['nonexistent'] },
        ],
        objection_handlers: [],
        entry_node: 'start',
        success_outcomes: ['start'],
        failure_outcomes: [],
        metadata: {
          estimated_turns: { min: 1, max: 2 },
          complexity_level: 'simple',
          requires_qualification: false,
        },
      };

      const validation = validateFlow(badFlow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('nonexistent'))).toBe(true);
    });

    it('detects flows with no terminal nodes', () => {
      const badFlow: ConversationFlow = {
        flow_id: 'bad_flow',
        template_type: 'sales_qualifier',
        version: '1.0',
        nodes: [
          { id: 'start', type: 'message', phase: 'start', objective: 'Test', next: ['loop'] },
          { id: 'loop', type: 'message', phase: 'start', objective: 'Loop', next: ['start'] },
        ],
        objection_handlers: [],
        entry_node: 'start',
        success_outcomes: ['start'],
        failure_outcomes: [],
        metadata: {
          estimated_turns: { min: 1, max: 2 },
          complexity_level: 'simple',
          requires_qualification: false,
        },
      };

      const validation = validateFlow(badFlow);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes('terminal'))).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('Solar installer flow has cost objection handling', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(
          ['phone', 'calendar', 'qualification_logic'],
          ['quote_generator', 'crm_sync', 'sms']
        ),
        sales_complexity: 'complex',
        business_model: 'b2c',
        industry: 'solar',
        has_high_ticket_items: true,
      };

      const result = generateConversationFlow(input);

      // Should have qualification (high-ticket)
      expect(result.flow.metadata.requires_qualification).toBe(true);

      // Should have cost objection handler
      const costHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'cost_concern'
      );
      expect(costHandler).toBeDefined();

      // Should have thorough discovery
      const discoveryNodes = getNodesByPhase(result.flow, 'discovery');
      expect(discoveryNodes.length).toBeGreaterThanOrEqual(3);

      // Flow should be valid
      expect(validateFlow(result.flow).valid).toBe(true);
    });

    it('Healthcare appointment flow is optimized for scheduling', () => {
      const input: FlowGenerationInput = {
        template_type: 'appointment_setter',
        tools: createMockTools(['calendar', 'sms', 'reminders'], ['knowledge_lookup']),
        sales_complexity: 'simple',
        business_model: 'b2c',
        industry: 'healthcare',
      };

      const result = generateConversationFlow(input);

      // Should be quick flow
      expect(result.flow.metadata.estimated_turns.max).toBeLessThanOrEqual(6);

      // Primary action is book_appointment
      const actionNode = getFlowNode(result.flow, 'book_appointment');
      expect(actionNode).toBeDefined();
      expect(actionNode?.tools_used).toContain('calendar');

      // Has insurance objection handler
      const insuranceHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'insurance'
      );
      expect(insuranceHandler).toBeDefined();
    });

    it('SaaS support flow has quick resolution path', () => {
      const input: FlowGenerationInput = {
        template_type: 'customer_support',
        tools: createMockTools(
          ['knowledge_lookup', 'live_chat', 'ticket_creation'],
          ['sentiment_analysis']
        ),
        sales_complexity: 'moderate',
        business_model: 'saas',
        industry: 'saas',
      };

      const result = generateConversationFlow(input);

      // Should have quick resolution node
      const quickResolution = getFlowNode(result.flow, 'quick_resolution');
      expect(quickResolution).toBeDefined();
      expect(quickResolution?.tools_used).toContain('knowledge_lookup');

      // Should have integration objection handler
      const integrationHandler = result.flow.objection_handlers.find(
        (h) => h.objection_type === 'integration'
      );
      expect(integrationHandler).toBeDefined();

      // Primary action is resolve_issue
      const actionNode = getFlowNode(result.flow, 'resolve_issue');
      expect(actionNode).toBeDefined();
    });

    it('Enterprise B2B flow has comprehensive qualification', () => {
      const input: FlowGenerationInput = {
        template_type: 'sales_qualifier',
        tools: createMockTools(
          ['phone', 'calendar', 'qualification_logic', 'crm_sync'],
          ['document_sharing', 'call_recording', 'email']
        ),
        sales_complexity: 'enterprise',
        business_model: 'b2b',
        industry: 'consulting',
      };

      const result = generateConversationFlow(input);

      // Should have qualification
      expect(result.flow.metadata.requires_qualification).toBe(true);

      // Should have comprehensive discovery (4 questions for enterprise)
      const discoveryNodes = getNodesByPhase(result.flow, 'discovery');
      expect(discoveryNodes.length).toBe(4);

      // Should have high estimated turns
      expect(result.flow.metadata.estimated_turns.min).toBeGreaterThanOrEqual(12);

      // Should have nurture path
      const nurtureNode = getFlowNode(result.flow, 'nurture_path');
      expect(nurtureNode).toBeDefined();
    });
  });
});

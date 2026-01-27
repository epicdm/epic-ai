/**
 * Conversation Flow Engine (CFE v1)
 *
 * Generates goal-oriented conversation flow graphs based on:
 * - Template type (agent role)
 * - Tool configuration (available capabilities)
 * - Sales complexity (conversation depth)
 * - Business model (qualification triggers)
 * - Industry norms (objection handling)
 *
 * Output: Structured flow graph for agent.brain_config.conversation_flows
 *
 * @module processors/agent-os/conversation-flow.engine
 */

import type { AgentType, BusinessModel, SalesComplexity } from './template-recommendation.engine';
import type { ToolAssignmentResult } from './tool-assignment.engine';

// ============================================
// TYPES
// ============================================

/**
 * Node types in the conversation flow
 */
export type FlowNodeType = 'message' | 'question' | 'decision' | 'action' | 'branch' | 'loop';

/**
 * Flow phases
 */
export type FlowPhase = 'start' | 'discovery' | 'qualification' | 'presentation' | 'objection' | 'decision' | 'action' | 'outcome';

/**
 * A single node in the conversation flow graph
 */
export interface FlowNode {
  id: string;
  type: FlowNodeType;
  phase: FlowPhase;
  objective: string;
  description?: string;
  tools_used?: string[];
  success_condition?: string;
  failure_fallback?: string;
  next: string[];
  is_optional?: boolean;
  max_attempts?: number;
}

/**
 * Objection handler node
 */
export interface ObjectionHandler {
  objection_type: string;
  trigger_keywords: string[];
  response_strategy: string;
  tools_used?: string[];
  fallback_node?: string;
}

/**
 * Complete conversation flow configuration
 */
export interface FlowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface ConversationFlow {
  flow_id: string;
  template_type: AgentType;
  version: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  objection_handlers: ObjectionHandler[];
  entry_node: string;
  success_outcomes: string[];
  failure_outcomes: string[];
  metadata: {
    estimated_turns: { min: number; max: number };
    complexity_level: SalesComplexity;
    requires_qualification: boolean;
  };
}

/**
 * Input for flow generation
 */
export interface FlowGenerationInput {
  template_type: AgentType;
  tools: ToolAssignmentResult;
  sales_complexity: SalesComplexity;
  business_model: BusinessModel;
  industry?: string;
  sub_industry?: string;
  has_high_ticket_items?: boolean;
  requires_consultation?: boolean;
  service_category_tags?: string[];
}

/**
 * Flow generation result
 */
export interface FlowGenerationResult {
  flow: ConversationFlow;
  confidence: number;
  reasoning: string[];
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Opening strategies by template type
 */
const OPENING_STRATEGIES: Record<AgentType, { style: string; objective: string }> = {
  sales_qualifier: {
    style: 'purpose-driven',
    objective: 'Greet warmly and identify buying intent',
  },
  appointment_setter: {
    style: 'schedule-oriented',
    objective: 'Greet and offer scheduling assistance',
  },
  customer_support: {
    style: 'help-oriented',
    objective: 'Greet and identify support need',
  },
  lead_capture: {
    style: 'value-first',
    objective: 'Greet and offer valuable information',
  },
  product_recommender: {
    style: 'discovery-oriented',
    objective: 'Greet and understand preferences',
  },
  booking_assistant: {
    style: 'service-oriented',
    objective: 'Greet and offer booking help',
  },
  faq_bot: {
    style: 'helpful',
    objective: 'Greet and offer to answer questions',
  },
  onboarding_guide: {
    style: 'welcoming',
    objective: 'Welcome and guide through setup',
  },
  lead_nurturer: {
    style: 'relationship-building',
    objective: 'Greet warmly and continue building relationship',
  },
  survey_agent: {
    style: 'respectful',
    objective: 'Greet and explain feedback purpose',
  },
};

/**
 * Discovery depth by sales complexity
 */
const DISCOVERY_DEPTH: Record<SalesComplexity, { questions: number; depth: string }> = {
  simple: { questions: 1, depth: 'quick' },
  moderate: { questions: 2, depth: 'standard' },
  complex: { questions: 3, depth: 'thorough' },
  enterprise: { questions: 4, depth: 'comprehensive' },
};

/**
 * Industry-specific objection types
 */
const INDUSTRY_OBJECTIONS: Record<string, ObjectionHandler[]> = {
  solar: [
    {
      objection_type: 'cost_concern',
      trigger_keywords: ['expensive', 'cost', 'afford', 'price', 'budget'],
      response_strategy: 'Acknowledge concern, present ROI and financing options, emphasize long-term savings',
      tools_used: ['quote_generator'],
    },
    {
      objection_type: 'timing',
      trigger_keywords: ['not ready', 'thinking', 'later', 'maybe next year'],
      response_strategy: 'Explore timeline, highlight incentive deadlines, offer no-obligation consultation',
      tools_used: ['calendar'],
    },
    {
      objection_type: 'trust',
      trigger_keywords: ['scam', 'trust', 'reviews', 'legitimate'],
      response_strategy: 'Share credentials, reviews, warranties, and local references',
      tools_used: ['knowledge_lookup'],
    },
  ],
  healthcare: [
    {
      objection_type: 'insurance',
      trigger_keywords: ['insurance', 'coverage', 'pay', 'out of pocket'],
      response_strategy: 'Explain accepted insurances, offer to verify coverage, discuss payment plans',
      tools_used: ['knowledge_lookup'],
    },
    {
      objection_type: 'scheduling',
      trigger_keywords: ['busy', 'time', 'schedule', 'availability'],
      response_strategy: 'Offer flexible scheduling, early/late appointments, emphasize convenience',
      tools_used: ['calendar'],
    },
  ],
  saas: [
    {
      objection_type: 'integration',
      trigger_keywords: ['integrate', 'work with', 'compatible', 'connect'],
      response_strategy: 'Explain integration capabilities, offer technical consultation',
      tools_used: ['knowledge_lookup', 'document_sharing'],
    },
    {
      objection_type: 'pricing',
      trigger_keywords: ['expensive', 'price', 'cost', 'cheaper'],
      response_strategy: 'Focus on ROI, offer trial, explain value vs competitors',
      tools_used: ['quote_generator'],
    },
    {
      objection_type: 'implementation',
      trigger_keywords: ['hard', 'complicated', 'time to implement', 'resources'],
      response_strategy: 'Explain onboarding support, show quick-start guides, offer demo',
      tools_used: ['knowledge_lookup', 'calendar'],
    },
  ],
  ecommerce: [
    {
      objection_type: 'shipping',
      trigger_keywords: ['shipping', 'delivery', 'how long', 'arrive'],
      response_strategy: 'Provide shipping options, tracking info, delivery estimates',
      tools_used: ['order_lookup'],
    },
    {
      objection_type: 'returns',
      trigger_keywords: ['return', 'refund', 'exchange', "doesn't fit"],
      response_strategy: 'Explain return policy, make process easy',
      tools_used: ['knowledge_lookup', 'order_lookup'],
    },
  ],
  consulting: [
    {
      objection_type: 'value',
      trigger_keywords: ['worth it', 'ROI', 'results', 'guarantee'],
      response_strategy: 'Share case studies, specific outcomes, offer initial assessment',
      tools_used: ['document_sharing', 'knowledge_lookup'],
    },
    {
      objection_type: 'scope',
      trigger_keywords: ['scope', 'what exactly', 'deliverables', 'included'],
      response_strategy: 'Clarify engagement scope, provide proposal, discuss customization',
      tools_used: ['document_sharing', 'calendar'],
    },
  ],
};

/**
 * Default objections for any industry
 */
const DEFAULT_OBJECTIONS: ObjectionHandler[] = [
  {
    objection_type: 'general_hesitation',
    trigger_keywords: ['not sure', 'think about', 'let me', 'maybe'],
    response_strategy: 'Acknowledge, ask what specific concerns they have, offer to address them',
  },
  {
    objection_type: 'competitor',
    trigger_keywords: ['other options', 'competitor', 'alternative', 'comparing'],
    response_strategy: 'Acknowledge research is good, highlight unique differentiators',
    tools_used: ['knowledge_lookup'],
  },
];

/**
 * Qualification triggers by business model
 */
const QUALIFICATION_TRIGGERS: Record<BusinessModel, { required: boolean; depth: string }> = {
  b2b: { required: true, depth: 'thorough' },
  b2c: { required: false, depth: 'light' },
  b2b2c: { required: true, depth: 'moderate' },
  saas: { required: true, depth: 'thorough' },
  marketplace: { required: false, depth: 'light' },
  consulting: { required: true, depth: 'comprehensive' },
  service: { required: true, depth: 'moderate' },
  subscription: { required: true, depth: 'moderate' },
  unknown: { required: false, depth: 'light' },
};

/**
 * Estimated conversation turns by complexity
 */
const ESTIMATED_TURNS: Record<SalesComplexity, { min: number; max: number }> = {
  simple: { min: 3, max: 6 },
  moderate: { min: 5, max: 10 },
  complex: { min: 8, max: 15 },
  enterprise: { min: 12, max: 25 },
};

// ============================================
// FLOW GENERATION FUNCTIONS
// ============================================

/**
 * Generate the start/greeting node
 */
function generateStartNode(input: FlowGenerationInput): FlowNode {
  const strategy = OPENING_STRATEGIES[input.template_type] || OPENING_STRATEGIES.customer_support;

  return {
    id: 'start',
    type: 'message',
    phase: 'start',
    objective: strategy.objective,
    description: `${strategy.style} opening to establish rapport and identify initial intent`,
    success_condition: 'User engages with greeting',
    next: ['intent_check'],
  };
}

/**
 * Generate intent identification node
 */
function generateIntentCheckNode(input: FlowGenerationInput): FlowNode {
  const nextNodes = ['discovery_1'];

  // For support, check if it's a known issue first
  if (input.template_type === 'customer_support') {
    return {
      id: 'intent_check',
      type: 'question',
      phase: 'start',
      objective: 'Identify the specific support need',
      description: 'Ask clarifying question to understand the issue category',
      tools_used: input.tools.essential_tools.some((t) => t.id === 'knowledge_lookup')
        ? ['knowledge_lookup']
        : [],
      success_condition: 'User clearly states their issue',
      next: ['discovery_1', 'quick_resolution'],
    };
  }

  return {
    id: 'intent_check',
    type: 'question',
    phase: 'start',
    objective: 'Understand why the user reached out',
    description: 'Open-ended question to capture user intent',
    success_condition: 'User shares their goal or need',
    next: nextNodes,
  };
}

/**
 * Generate discovery phase nodes based on complexity
 */
function generateDiscoveryNodes(input: FlowGenerationInput): FlowNode[] {
  const depth = DISCOVERY_DEPTH[input.sales_complexity];
  const nodes: FlowNode[] = [];

  const discoveryQuestions: Record<AgentType, string[]> = {
    sales_qualifier: [
      'Understand current situation and pain points',
      'Explore timeline and urgency',
      'Identify decision-making process',
      'Understand budget parameters',
    ],
    appointment_setter: [
      'Confirm service interest',
      'Understand scheduling preferences',
    ],
    customer_support: [
      'Gather issue details',
      'Understand impact and urgency',
      'Check for prior troubleshooting',
    ],
    lead_capture: [
      'Understand area of interest',
      'Identify key challenges',
    ],
    product_recommender: [
      'Understand preferences and requirements',
      'Explore use case and context',
      'Identify must-haves vs nice-to-haves',
    ],
    booking_assistant: [
      'Confirm service type',
      'Understand timing preferences',
    ],
    faq_bot: [
      'Clarify the specific question',
    ],
    onboarding_guide: [
      'Understand goals with the product',
      'Identify experience level',
    ],
    lead_nurturer: [
      'Check in on current situation',
      'Understand any new needs or changes',
      'Identify readiness for next steps',
    ],
    survey_agent: [
      'Confirm willingness to provide feedback',
      'Gather initial impressions',
    ],
  };

  const questions = discoveryQuestions[input.template_type] || ['Understand user needs'];
  const numQuestions = Math.min(depth.questions, questions.length);

  for (let i = 0; i < numQuestions; i++) {
    const isLast = i === numQuestions - 1;
    const nextNode = isLast ? getPostDiscoveryNode(input) : `discovery_${i + 2}`;

    nodes.push({
      id: `discovery_${i + 1}`,
      type: 'question',
      phase: 'discovery',
      objective: questions[i],
      description: `Discovery question ${i + 1} of ${numQuestions} (${depth.depth} depth)`,
      success_condition: 'User provides relevant information',
      next: [nextNode],
      is_optional: i > 0, // First discovery is required
    });
  }

  return nodes;
}

/**
 * Determine what comes after discovery
 */
function getPostDiscoveryNode(input: FlowGenerationInput): string {
  const qualTrigger = QUALIFICATION_TRIGGERS[input.business_model];

  if (qualTrigger.required || input.has_high_ticket_items || input.requires_consultation) {
    return 'qualification';
  }

  // For simple flows, go straight to action
  if (input.sales_complexity === 'simple') {
    return getActionNodeId(input.template_type);
  }

  return 'presentation';
}

/**
 * Generate qualification node
 */
function generateQualificationNode(input: FlowGenerationInput): FlowNode | null {
  const qualTrigger = QUALIFICATION_TRIGGERS[input.business_model];

  if (!qualTrigger.required && !input.has_high_ticket_items && !input.requires_consultation) {
    return null;
  }

  const hasQualTool = input.tools.essential_tools.some((t) => t.id === 'qualification_logic') ||
    input.tools.recommended_tools.some((t) => t.id === 'qualification_logic');

  return {
    id: 'qualification',
    type: 'decision',
    phase: 'qualification',
    objective: 'Assess lead quality and fit',
    description: `${qualTrigger.depth} qualification based on BANT criteria`,
    tools_used: hasQualTool ? ['qualification_logic'] : [],
    success_condition: 'Lead meets qualification criteria',
    failure_fallback: 'nurture_path',
    next: ['qualified_presentation', 'nurture_path'],
  };
}

/**
 * Generate presentation node for qualified leads
 */
function generatePresentationNode(input: FlowGenerationInput): FlowNode {
  const tools: string[] = [];

  if (input.tools.essential_tools.some((t) => t.id === 'knowledge_lookup') ||
      input.tools.recommended_tools.some((t) => t.id === 'knowledge_lookup')) {
    tools.push('knowledge_lookup');
  }

  if (input.tools.essential_tools.some((t) => t.id === 'quote_generator') ||
      input.tools.recommended_tools.some((t) => t.id === 'quote_generator')) {
    tools.push('quote_generator');
  }

  return {
    id: 'presentation',
    type: 'message',
    phase: 'presentation',
    objective: 'Present tailored solution or information',
    description: 'Deliver value proposition based on discovered needs',
    tools_used: tools.length > 0 ? tools : undefined,
    success_condition: 'User shows interest in solution',
    next: ['decision_point'],
  };
}

/**
 * Generate qualified presentation node (post-qualification)
 */
function generateQualifiedPresentationNode(input: FlowGenerationInput): FlowNode {
  const tools: string[] = [];

  if (input.tools.essential_tools.some((t) => t.id === 'quote_generator') ||
      input.tools.recommended_tools.some((t) => t.id === 'quote_generator')) {
    tools.push('quote_generator');
  }

  if (input.tools.essential_tools.some((t) => t.id === 'document_sharing') ||
      input.tools.recommended_tools.some((t) => t.id === 'document_sharing')) {
    tools.push('document_sharing');
  }

  return {
    id: 'qualified_presentation',
    type: 'message',
    phase: 'presentation',
    objective: 'Present detailed solution for qualified lead',
    description: 'Comprehensive value presentation with specific details',
    tools_used: tools.length > 0 ? tools : undefined,
    success_condition: 'Lead expresses readiness to proceed',
    next: ['decision_point'],
  };
}

/**
 * Generate decision point node
 */
function generateDecisionPointNode(input: FlowGenerationInput): FlowNode {
  const actionNode = getActionNodeId(input.template_type);

  return {
    id: 'decision_point',
    type: 'decision',
    phase: 'decision',
    objective: 'Determine if user is ready to take action',
    description: 'Branch based on user readiness signals',
    success_condition: 'User indicates readiness',
    failure_fallback: 'objection_handling',
    next: [actionNode, 'objection_handling'],
  };
}

/**
 * Get the primary action node ID based on template
 */
function getActionNodeId(templateType: AgentType): string {
  const actionMapping: Record<AgentType, string> = {
    sales_qualifier: 'book_meeting',
    appointment_setter: 'book_appointment',
    customer_support: 'resolve_issue',
    lead_capture: 'capture_lead',
    product_recommender: 'recommend_product',
    booking_assistant: 'complete_booking',
    faq_bot: 'provide_answer',
    onboarding_guide: 'complete_step',
    lead_nurturer: 'nurture_lead',
    survey_agent: 'collect_feedback',
  };

  return actionMapping[templateType] || 'take_action';
}

/**
 * Generate primary action node based on template
 */
function generateActionNode(input: FlowGenerationInput): FlowNode {
  const actionConfigs: Record<AgentType, { objective: string; tools: string[] }> = {
    sales_qualifier: {
      objective: 'Schedule consultation or demo',
      tools: ['calendar', 'crm_sync'],
    },
    appointment_setter: {
      objective: 'Book the appointment',
      tools: ['calendar', 'sms', 'reminders'],
    },
    customer_support: {
      objective: 'Resolve the support issue',
      tools: ['knowledge_lookup', 'ticket_creation'],
    },
    lead_capture: {
      objective: 'Capture lead information',
      tools: ['crm_sync', 'email'],
    },
    product_recommender: {
      objective: 'Provide product recommendations',
      tools: ['knowledge_lookup', 'order_lookup'],
    },
    booking_assistant: {
      objective: 'Complete the booking',
      tools: ['calendar', 'payment', 'sms'],
    },
    faq_bot: {
      objective: 'Provide accurate answer',
      tools: ['knowledge_lookup'],
    },
    onboarding_guide: {
      objective: 'Complete onboarding step',
      tools: ['knowledge_lookup', 'email'],
    },
    lead_nurturer: {
      objective: 'Continue relationship building',
      tools: ['crm_sync', 'email', 'sms'],
    },
    survey_agent: {
      objective: 'Collect and record feedback',
      tools: ['crm_sync'],
    },
  };

  const config = actionConfigs[input.template_type] || {
    objective: 'Complete primary action',
    tools: [],
  };

  // Filter tools to only those available
  const availableToolIds = new Set([
    ...input.tools.essential_tools.map((t) => t.id),
    ...input.tools.recommended_tools.map((t) => t.id),
  ]);

  const toolsToUse = config.tools.filter((t) => availableToolIds.has(t));

  return {
    id: getActionNodeId(input.template_type),
    type: 'action',
    phase: 'action',
    objective: config.objective,
    description: `Primary conversion action for ${input.template_type.replace(/_/g, ' ')}`,
    tools_used: toolsToUse.length > 0 ? toolsToUse : undefined,
    success_condition: 'Action completed successfully',
    failure_fallback: 'action_fallback',
    next: ['success_outcome'],
  };
}

/**
 * Generate objection handling node
 */
function generateObjectionHandlingNode(input: FlowGenerationInput): FlowNode {
  return {
    id: 'objection_handling',
    type: 'branch',
    phase: 'objection',
    objective: 'Address user concerns and objections',
    description: 'Route to appropriate objection handler based on concern type',
    success_condition: 'Objection addressed, user willing to continue',
    failure_fallback: 'soft_close',
    next: ['decision_point', 'soft_close'],
    max_attempts: 2,
  };
}

/**
 * Generate nurture path node for unqualified leads
 */
function generateNurturePathNode(input: FlowGenerationInput): FlowNode {
  const tools: string[] = [];

  if (input.tools.essential_tools.some((t) => t.id === 'email') ||
      input.tools.recommended_tools.some((t) => t.id === 'email')) {
    tools.push('email');
  }

  if (input.tools.essential_tools.some((t) => t.id === 'crm_sync') ||
      input.tools.recommended_tools.some((t) => t.id === 'crm_sync')) {
    tools.push('crm_sync');
  }

  return {
    id: 'nurture_path',
    type: 'action',
    phase: 'outcome',
    objective: 'Add to nurture sequence',
    description: 'Capture information for future follow-up',
    tools_used: tools.length > 0 ? tools : undefined,
    success_condition: 'Lead captured for nurturing',
    next: ['nurture_outcome'],
  };
}

/**
 * Generate soft close node
 */
function generateSoftCloseNode(input: FlowGenerationInput): FlowNode {
  return {
    id: 'soft_close',
    type: 'message',
    phase: 'outcome',
    objective: 'End conversation gracefully with door open',
    description: 'Provide value and leave positive impression for future engagement',
    success_condition: 'Conversation ended positively',
    next: ['soft_close_outcome'],
  };
}

/**
 * Generate quick resolution node (for support)
 */
function generateQuickResolutionNode(input: FlowGenerationInput): FlowNode | null {
  if (input.template_type !== 'customer_support') {
    return null;
  }

  return {
    id: 'quick_resolution',
    type: 'action',
    phase: 'action',
    objective: 'Provide immediate answer from knowledge base',
    description: 'Fast-path resolution for common issues',
    tools_used: ['knowledge_lookup'],
    success_condition: 'Issue resolved with KB article',
    failure_fallback: 'discovery_1',
    next: ['success_outcome', 'discovery_1'],
  };
}

/**
 * Generate action fallback node
 */
function generateActionFallbackNode(input: FlowGenerationInput): FlowNode {
  return {
    id: 'action_fallback',
    type: 'message',
    phase: 'outcome',
    objective: 'Handle action failure gracefully',
    description: 'Provide alternative path when primary action fails',
    success_condition: 'User provided with alternative',
    next: ['soft_close'],
  };
}

/**
 * Generate outcome nodes
 */
function generateOutcomeNodes(): FlowNode[] {
  return [
    {
      id: 'success_outcome',
      type: 'message',
      phase: 'outcome',
      objective: 'Confirm successful completion',
      description: 'Thank user and confirm next steps',
      next: [],
    },
    {
      id: 'nurture_outcome',
      type: 'message',
      phase: 'outcome',
      objective: 'Set expectations for follow-up',
      description: 'Explain what happens next in nurture sequence',
      next: [],
    },
    {
      id: 'soft_close_outcome',
      type: 'message',
      phase: 'outcome',
      objective: 'End with value and open door',
      description: 'Leave positive impression and clear path to re-engage',
      next: [],
    },
  ];
}

/**
 * Get objection handlers for the input context
 */
function getObjectionHandlers(input: FlowGenerationInput): ObjectionHandler[] {
  const handlers: ObjectionHandler[] = [...DEFAULT_OBJECTIONS];

  // Add industry-specific handlers
  const industry = input.industry?.toLowerCase();
  if (industry && INDUSTRY_OBJECTIONS[industry]) {
    handlers.push(...INDUSTRY_OBJECTIONS[industry]);
  }

  // Check sub-industry
  const subIndustry = input.sub_industry?.toLowerCase();
  if (subIndustry && INDUSTRY_OBJECTIONS[subIndustry]) {
    handlers.push(...INDUSTRY_OBJECTIONS[subIndustry]);
  }

  // Check for related industries
  if (industry) {
    // Solar, roofing, HVAC share objections
    if (['roofing', 'hvac', 'plumbing', 'home services'].includes(industry)) {
      if (!handlers.some((h) => h.objection_type === 'cost_concern')) {
        handlers.push(...(INDUSTRY_OBJECTIONS.solar || []));
      }
    }

    // Tech/SaaS share objections
    if (['technology', 'software', 'tech'].includes(industry)) {
      if (!handlers.some((h) => h.objection_type === 'integration')) {
        handlers.push(...(INDUSTRY_OBJECTIONS.saas || []));
      }
    }
  }

  // Filter handlers to only use available tools
  const availableToolIds = new Set([
    ...input.tools.essential_tools.map((t) => t.id),
    ...input.tools.recommended_tools.map((t) => t.id),
    ...input.tools.optional_tools.map((t) => t.id),
  ]);

  return handlers.map((handler) => ({
    ...handler,
    tools_used: handler.tools_used?.filter((t) => availableToolIds.has(t)),
  }));
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

/**
 * Generate a complete conversation flow for the given input
 */
export function generateConversationFlow(input: FlowGenerationInput): FlowGenerationResult {
  const reasoning: string[] = [];
  const nodes: FlowNode[] = [];

  // 1. Generate start phase
  nodes.push(generateStartNode(input));
  nodes.push(generateIntentCheckNode(input));
  reasoning.push(`Generated ${OPENING_STRATEGIES[input.template_type]?.style || 'standard'} opening for ${input.template_type.replace(/_/g, ' ')}`);

  // 2. Generate discovery phase
  const discoveryNodes = generateDiscoveryNodes(input);
  nodes.push(...discoveryNodes);
  reasoning.push(`Added ${discoveryNodes.length} discovery questions (${DISCOVERY_DEPTH[input.sales_complexity].depth} depth)`);

  // 3. Generate qualification (if needed)
  const qualificationNode = generateQualificationNode(input);
  if (qualificationNode) {
    nodes.push(qualificationNode);
    reasoning.push(`Added qualification gate (${QUALIFICATION_TRIGGERS[input.business_model].depth} assessment)`);
  }

  // 4. Generate presentation phase
  if (qualificationNode) {
    nodes.push(generateQualifiedPresentationNode(input));
  }
  if (input.sales_complexity !== 'simple') {
    nodes.push(generatePresentationNode(input));
  }

  // 5. Generate decision point
  nodes.push(generateDecisionPointNode(input));

  // 6. Generate action nodes
  nodes.push(generateActionNode(input));
  nodes.push(generateActionFallbackNode(input));

  // 7. Generate support-specific nodes
  const quickResolution = generateQuickResolutionNode(input);
  if (quickResolution) {
    nodes.push(quickResolution);
  }

  // 8. Generate objection handling
  nodes.push(generateObjectionHandlingNode(input));

  // 9. Generate nurture path (for qualified flows)
  if (qualificationNode) {
    nodes.push(generateNurturePathNode(input));
  }

  // 10. Generate soft close
  nodes.push(generateSoftCloseNode(input));

  // 11. Generate outcome nodes
  nodes.push(...generateOutcomeNodes());

  // Get objection handlers
  const objectionHandlers = getObjectionHandlers(input);
  reasoning.push(`Added ${objectionHandlers.length} objection handlers${input.industry ? ` (including ${input.industry}-specific)` : ''}`);

  // Determine success/failure outcomes
  const successOutcomes = ['success_outcome'];
  const failureOutcomes = ['soft_close_outcome'];
  if (qualificationNode) {
    failureOutcomes.push('nurture_outcome');
  }

  // Calculate confidence based on tool coverage and flow completeness
  const essentialToolCount = input.tools.essential_tools.length;
  const hasRequiredTools = essentialToolCount >= 2;
  const hasObjectionHandlers = objectionHandlers.length >= 2;
  const flowCompleteness = nodes.length >= 8 ? 1 : nodes.length / 8;

  const confidence = Math.min(
    1,
    (hasRequiredTools ? 0.4 : 0.2) +
    (hasObjectionHandlers ? 0.3 : 0.15) +
    (flowCompleteness * 0.3)
  );

  // Derive edges from node transitions
  const edges: FlowEdge[] = [];
  for (const node of nodes) {
    for (const nextNodeId of node.next) {
      edges.push({ from: node.id, to: nextNodeId });
    }
  }

  // Build the flow
  const flow: ConversationFlow = {
    flow_id: `${input.template_type}_flow_v1`,
    template_type: input.template_type,
    version: '1.0',
    nodes,
    edges,
    objection_handlers: objectionHandlers,
    entry_node: 'start',
    success_outcomes: successOutcomes,
    failure_outcomes: failureOutcomes,
    metadata: {
      estimated_turns: ESTIMATED_TURNS[input.sales_complexity],
      complexity_level: input.sales_complexity,
      requires_qualification: !!qualificationNode,
    },
  };

  reasoning.push(`Flow has ${nodes.length} nodes with ${ESTIMATED_TURNS[input.sales_complexity].min}-${ESTIMATED_TURNS[input.sales_complexity].max} estimated turns`);

  return {
    flow,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}

/**
 * Build flow generation input from context
 */
export function buildFlowGenerationInput(
  templateType: AgentType,
  tools: ToolAssignmentResult,
  context: {
    sales_complexity?: SalesComplexity;
    business_model?: BusinessModel;
    industry?: string;
    sub_industry?: string;
    has_high_ticket_items?: boolean;
    requires_consultation?: boolean;
    service_category_tags?: string[];
  }
): FlowGenerationInput {
  return {
    template_type: templateType,
    tools,
    sales_complexity: context.sales_complexity || 'moderate',
    business_model: context.business_model || 'unknown',
    industry: context.industry,
    sub_industry: context.sub_industry,
    has_high_ticket_items: context.has_high_ticket_items,
    requires_consultation: context.requires_consultation,
    service_category_tags: context.service_category_tags,
  };
}

/**
 * Get flow node by ID
 */
export function getFlowNode(flow: ConversationFlow, nodeId: string): FlowNode | undefined {
  return flow.nodes.find((n) => n.id === nodeId);
}

/**
 * Get all nodes in a specific phase
 */
export function getNodesByPhase(flow: ConversationFlow, phase: FlowPhase): FlowNode[] {
  return flow.nodes.filter((n) => n.phase === phase);
}

/**
 * Validate flow graph integrity
 */
export function validateFlow(flow: ConversationFlow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const nodeIds = new Set(flow.nodes.map((n) => n.id));

  // Check entry node exists
  if (!nodeIds.has(flow.entry_node)) {
    errors.push(`Entry node '${flow.entry_node}' not found in nodes`);
  }

  // Check all next references are valid
  for (const node of flow.nodes) {
    for (const nextId of node.next) {
      if (!nodeIds.has(nextId)) {
        errors.push(`Node '${node.id}' references non-existent next node '${nextId}'`);
      }
    }
    if (node.failure_fallback && !nodeIds.has(node.failure_fallback)) {
      errors.push(`Node '${node.id}' has invalid failure_fallback '${node.failure_fallback}'`);
    }
  }

  // Check outcome nodes exist
  for (const outcome of [...flow.success_outcomes, ...flow.failure_outcomes]) {
    if (!nodeIds.has(outcome)) {
      errors.push(`Outcome node '${outcome}' not found in nodes`);
    }
  }

  // Check for terminal nodes (nodes with no next)
  const terminalNodes = flow.nodes.filter((n) => n.next.length === 0);
  if (terminalNodes.length === 0) {
    errors.push('Flow has no terminal nodes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

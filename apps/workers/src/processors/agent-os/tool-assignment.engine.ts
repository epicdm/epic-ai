/**
 * Tool Assignment Intelligence Engine (TAIE v1)
 *
 * Determines what tools/capabilities an agent needs based on:
 * - Selected template (agent type)
 * - Company intelligence profile
 * - Sales complexity
 * - Industry norms
 *
 * Scoring Formula:
 * - Template Requirement: 40%
 * - Industry Fit: 25%
 * - Complexity Fit: 20%
 * - Business Model Fit: 15%
 *
 * @module processors/agent-os/tool-assignment.engine
 */

import type { CompanyEnrichmentResult } from '../../types/payloads';
import type { AgentType, BusinessModel, SalesComplexity } from './template-recommendation.engine';

// ============================================
// TYPES
// ============================================

/**
 * Tool categories
 */
export type ToolCategory = 'communication' | 'qualification' | 'conversion' | 'support' | 'integration' | 'analytics';

/**
 * Value contribution level
 */
export type ValueContribution = 'critical' | 'high' | 'medium' | 'low';

/**
 * Tool assignment tier based on score
 */
export type ToolTier = 'essential' | 'recommended' | 'optional' | 'hidden';

/**
 * Tool definition with metadata for scoring
 */
export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  required_for_templates: AgentType[];
  best_for_industries: string[];
  business_model_fit: BusinessModel[];
  sales_complexity_fit: SalesComplexity[];
  value_contribution: ValueContribution;
  dependencies?: string[];
  conflicts_with?: string[];
}

/**
 * Input for tool assignment
 */
export interface ToolAssignmentInput {
  agent_type: AgentType;
  industry?: string;
  sub_industry?: string;
  business_model?: BusinessModel;
  sales_complexity?: SalesComplexity;
  service_category_tags?: string[];
  has_phone_support?: boolean;
  has_scheduling?: boolean;
  has_ecommerce?: boolean;
}

/**
 * Tool assignment with reason
 */
export interface ToolAssignment {
  id: string;
  name: string;
  reason: string;
  score: number;
}

/**
 * Tool assignment output
 */
export interface ToolAssignmentResult {
  essential_tools: ToolAssignment[];
  recommended_tools: ToolAssignment[];
  optional_tools: ToolAssignment[];
  disabled_tools: string[];
  confidence: number;
  reasoning: string[];
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  TEMPLATE_REQUIREMENT: 40,
  INDUSTRY_FIT: 25,
  COMPLEXITY_FIT: 20,
  BUSINESS_MODEL_FIT: 15,
} as const;

// ============================================
// TIER THRESHOLDS
// ============================================

const TIER_THRESHOLDS = {
  ESSENTIAL: 80,
  RECOMMENDED: 60,
  OPTIONAL: 40,
} as const;

function getTier(score: number): ToolTier {
  if (score >= TIER_THRESHOLDS.ESSENTIAL) return 'essential';
  if (score >= TIER_THRESHOLDS.RECOMMENDED) return 'recommended';
  if (score >= TIER_THRESHOLDS.OPTIONAL) return 'optional';
  return 'hidden';
}

// ============================================
// TOOL DEFINITIONS LIBRARY
// ============================================

export const TOOL_LIBRARY: ToolDefinition[] = [
  // COMMUNICATION TOOLS
  {
    id: 'phone',
    name: 'Voice Calling',
    description: 'Make and receive phone calls with customers',
    category: 'communication',
    required_for_templates: ['sales_qualifier', 'appointment_setter', 'customer_support'],
    best_for_industries: ['solar', 'roofing', 'hvac', 'healthcare', 'insurance', 'real estate', 'consulting'],
    business_model_fit: ['b2b', 'b2c', 'consulting'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    value_contribution: 'critical',
  },
  {
    id: 'sms',
    name: 'SMS Messaging',
    description: 'Send and receive text messages',
    category: 'communication',
    required_for_templates: ['appointment_setter', 'booking_assistant'],
    best_for_industries: ['solar', 'roofing', 'hvac', 'healthcare', 'restaurants', 'beauty', 'fitness'],
    business_model_fit: ['b2c', 'b2b2c'],
    sales_complexity_fit: ['simple', 'moderate'],
    value_contribution: 'high',
  },
  {
    id: 'email',
    name: 'Email Communication',
    description: 'Send automated and personalized emails',
    category: 'communication',
    required_for_templates: ['lead_capture', 'onboarding_guide'],
    best_for_industries: ['saas', 'technology', 'professional services', 'consulting', 'ecommerce'],
    business_model_fit: ['b2b', 'saas', 'marketplace'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    value_contribution: 'high',
  },
  {
    id: 'live_chat',
    name: 'Live Chat Widget',
    description: 'Real-time chat on website',
    category: 'communication',
    required_for_templates: ['customer_support', 'faq_bot', 'lead_capture'],
    best_for_industries: ['ecommerce', 'saas', 'technology', 'retail'],
    business_model_fit: ['b2c', 'saas', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    value_contribution: 'high',
  },

  // QUALIFICATION TOOLS
  {
    id: 'qualification_logic',
    name: 'Lead Qualification Engine',
    description: 'Score and qualify leads based on BANT criteria',
    category: 'qualification',
    required_for_templates: ['sales_qualifier', 'lead_capture'],
    best_for_industries: ['solar', 'roofing', 'hvac', 'insurance', 'real estate', 'saas', 'consulting'],
    business_model_fit: ['b2b', 'b2c', 'consulting'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    value_contribution: 'critical',
  },
  {
    id: 'survey_forms',
    name: 'Survey & Forms',
    description: 'Collect structured information from leads',
    category: 'qualification',
    required_for_templates: ['lead_capture', 'onboarding_guide'],
    best_for_industries: ['healthcare', 'insurance', 'financial services', 'consulting'],
    business_model_fit: ['b2b', 'b2c', 'consulting'],
    sales_complexity_fit: ['moderate', 'complex'],
    value_contribution: 'medium',
  },

  // CONVERSION TOOLS
  {
    id: 'calendar',
    name: 'Calendar Scheduling',
    description: 'Book meetings and appointments directly',
    category: 'conversion',
    required_for_templates: ['appointment_setter', 'booking_assistant', 'sales_qualifier'],
    best_for_industries: ['healthcare', 'consulting', 'beauty', 'fitness', 'legal', 'real estate', 'solar'],
    business_model_fit: ['b2b', 'b2c', 'consulting'],
    sales_complexity_fit: ['simple', 'moderate', 'complex'],
    value_contribution: 'critical',
  },
  {
    id: 'reminders',
    name: 'Appointment Reminders',
    description: 'Send automated reminders to reduce no-shows',
    category: 'conversion',
    required_for_templates: ['appointment_setter', 'booking_assistant'],
    best_for_industries: ['healthcare', 'beauty', 'fitness', 'restaurants', 'consulting'],
    business_model_fit: ['b2c', 'b2b'],
    sales_complexity_fit: ['simple', 'moderate'],
    value_contribution: 'high',
    dependencies: ['calendar'],
  },
  {
    id: 'payment',
    name: 'Payment Processing',
    description: 'Accept payments and deposits',
    category: 'conversion',
    required_for_templates: ['booking_assistant', 'product_recommender'],
    best_for_industries: ['ecommerce', 'restaurants', 'hospitality', 'beauty', 'fitness'],
    business_model_fit: ['b2c', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    value_contribution: 'high',
  },
  {
    id: 'quote_generator',
    name: 'Quote Generator',
    description: 'Generate instant quotes based on requirements',
    category: 'conversion',
    required_for_templates: ['sales_qualifier'],
    best_for_industries: ['solar', 'roofing', 'hvac', 'insurance', 'construction'],
    business_model_fit: ['b2c', 'b2b'],
    sales_complexity_fit: ['moderate', 'complex'],
    value_contribution: 'high',
  },

  // SUPPORT TOOLS
  {
    id: 'knowledge_lookup',
    name: 'Knowledge Base Search',
    description: 'Search and retrieve information from knowledge base',
    category: 'support',
    required_for_templates: ['customer_support', 'faq_bot', 'onboarding_guide'],
    best_for_industries: ['saas', 'technology', 'ecommerce', 'telecom'],
    business_model_fit: ['saas', 'b2c', 'b2b', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate', 'complex'],
    value_contribution: 'critical',
  },
  {
    id: 'ticket_creation',
    name: 'Support Ticket Creation',
    description: 'Create and route support tickets',
    category: 'support',
    required_for_templates: ['customer_support'],
    best_for_industries: ['saas', 'technology', 'ecommerce', 'telecom'],
    business_model_fit: ['saas', 'b2b', 'marketplace'],
    sales_complexity_fit: ['moderate', 'complex'],
    value_contribution: 'high',
    dependencies: ['knowledge_lookup'],
  },
  {
    id: 'order_lookup',
    name: 'Order Status Lookup',
    description: 'Check order status and tracking',
    category: 'support',
    required_for_templates: ['customer_support', 'product_recommender'],
    best_for_industries: ['ecommerce', 'retail', 'restaurants'],
    business_model_fit: ['b2c', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    value_contribution: 'high',
  },

  // INTEGRATION TOOLS
  {
    id: 'crm_sync',
    name: 'CRM Integration',
    description: 'Sync leads and conversations with CRM',
    category: 'integration',
    required_for_templates: ['sales_qualifier', 'lead_capture'],
    best_for_industries: ['saas', 'consulting', 'real estate', 'insurance', 'solar'],
    business_model_fit: ['b2b', 'saas', 'consulting'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    value_contribution: 'high',
  },
  {
    id: 'call_recording',
    name: 'Call Recording',
    description: 'Record calls for quality and training',
    category: 'integration',
    required_for_templates: ['sales_qualifier'],
    best_for_industries: ['insurance', 'financial services', 'consulting', 'solar'],
    business_model_fit: ['b2b', 'b2c', 'consulting'],
    sales_complexity_fit: ['complex', 'enterprise'],
    value_contribution: 'medium',
    dependencies: ['phone'],
  },
  {
    id: 'document_sharing',
    name: 'Document Sharing',
    description: 'Share contracts, proposals, and documents',
    category: 'integration',
    required_for_templates: ['sales_qualifier', 'onboarding_guide'],
    best_for_industries: ['consulting', 'legal', 'financial services', 'real estate'],
    business_model_fit: ['b2b', 'consulting'],
    sales_complexity_fit: ['complex', 'enterprise'],
    value_contribution: 'medium',
  },

  // ANALYTICS TOOLS
  {
    id: 'conversation_analytics',
    name: 'Conversation Analytics',
    description: 'Track conversation metrics and outcomes',
    category: 'analytics',
    required_for_templates: [],
    best_for_industries: ['saas', 'technology', 'consulting'],
    business_model_fit: ['b2b', 'saas', 'b2c'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    value_contribution: 'medium',
  },
  {
    id: 'sentiment_analysis',
    name: 'Sentiment Analysis',
    description: 'Analyze customer sentiment during conversations',
    category: 'analytics',
    required_for_templates: ['customer_support'],
    best_for_industries: ['saas', 'ecommerce', 'telecom'],
    business_model_fit: ['b2c', 'saas', 'marketplace'],
    sales_complexity_fit: ['moderate', 'complex'],
    value_contribution: 'medium',
  },
];

// ============================================
// INDUSTRY TOOL BOOSTS
// ============================================

const INDUSTRY_TOOL_BOOSTS: Record<string, string[]> = {
  // Home services need SMS reminders and call capabilities
  solar: ['phone', 'sms', 'calendar', 'reminders', 'quote_generator', 'crm_sync'],
  roofing: ['phone', 'sms', 'calendar', 'reminders', 'quote_generator'],
  hvac: ['phone', 'sms', 'calendar', 'reminders', 'quote_generator'],
  plumbing: ['phone', 'sms', 'calendar', 'reminders'],

  // Healthcare needs scheduling and compliance
  healthcare: ['calendar', 'reminders', 'sms', 'phone'],
  medical: ['calendar', 'reminders', 'sms', 'survey_forms'],
  dental: ['calendar', 'reminders', 'sms'],

  // Ecommerce needs product and order tools
  ecommerce: ['live_chat', 'order_lookup', 'payment', 'knowledge_lookup'],
  retail: ['live_chat', 'order_lookup', 'payment'],

  // SaaS needs support and analytics
  saas: ['live_chat', 'knowledge_lookup', 'ticket_creation', 'email', 'crm_sync'],
  technology: ['live_chat', 'knowledge_lookup', 'ticket_creation', 'email'],

  // Professional services need documentation
  consulting: ['phone', 'calendar', 'crm_sync', 'document_sharing', 'call_recording'],
  legal: ['phone', 'calendar', 'document_sharing', 'call_recording'],
  'financial services': ['phone', 'calendar', 'crm_sync', 'document_sharing', 'call_recording'],

  // Hospitality needs booking
  restaurants: ['sms', 'reminders', 'calendar', 'payment'],
  hotels: ['sms', 'reminders', 'calendar', 'payment', 'live_chat'],
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Score tool based on template requirement (0-40 points)
 */
function scoreTemplateRequirement(tool: ToolDefinition, agentType: AgentType): number {
  if (tool.required_for_templates.includes(agentType)) {
    return SCORING_WEIGHTS.TEMPLATE_REQUIREMENT;
  }
  return 0;
}

/**
 * Score tool based on industry fit (0-25 points)
 */
function scoreIndustryFit(tool: ToolDefinition, input: ToolAssignmentInput): number {
  if (!input.industry) return SCORING_WEIGHTS.INDUSTRY_FIT * 0.3; // Partial credit

  const industryLower = input.industry.toLowerCase();
  const subIndustryLower = input.sub_industry?.toLowerCase();

  // Check direct industry match
  const directMatch = tool.best_for_industries.some(
    (i) =>
      i.toLowerCase() === industryLower ||
      i.toLowerCase() === subIndustryLower ||
      industryLower.includes(i.toLowerCase()) ||
      i.toLowerCase().includes(industryLower)
  );

  if (directMatch) return SCORING_WEIGHTS.INDUSTRY_FIT;

  // Check industry boost list
  const boostedTools = INDUSTRY_TOOL_BOOSTS[industryLower] || [];
  if (boostedTools.includes(tool.id)) {
    return SCORING_WEIGHTS.INDUSTRY_FIT * 0.8;
  }

  // Check service category tags
  if (input.service_category_tags?.length) {
    const tagMatch = tool.best_for_industries.some((i) =>
      input.service_category_tags!.some((t) => t.toLowerCase().includes(i.toLowerCase()))
    );
    if (tagMatch) return SCORING_WEIGHTS.INDUSTRY_FIT * 0.6;
  }

  return 0;
}

/**
 * Score tool based on sales complexity fit (0-20 points)
 */
function scoreComplexityFit(tool: ToolDefinition, input: ToolAssignmentInput): number {
  if (!input.sales_complexity) return SCORING_WEIGHTS.COMPLEXITY_FIT * 0.3;

  if (tool.sales_complexity_fit.includes(input.sales_complexity)) {
    return SCORING_WEIGHTS.COMPLEXITY_FIT;
  }

  // Adjacent complexity partial credit
  const complexityOrder: SalesComplexity[] = ['simple', 'moderate', 'complex', 'enterprise'];
  const inputIndex = complexityOrder.indexOf(input.sales_complexity);
  const hasAdjacent = tool.sales_complexity_fit.some((c) => {
    const toolIndex = complexityOrder.indexOf(c);
    return Math.abs(toolIndex - inputIndex) === 1;
  });

  if (hasAdjacent) return SCORING_WEIGHTS.COMPLEXITY_FIT * 0.6;

  return 0;
}

/**
 * Score tool based on business model fit (0-15 points)
 */
function scoreBusinessModelFit(tool: ToolDefinition, input: ToolAssignmentInput): number {
  if (!input.business_model || input.business_model === 'unknown') {
    return SCORING_WEIGHTS.BUSINESS_MODEL_FIT * 0.3;
  }

  if (tool.business_model_fit.includes(input.business_model)) {
    return SCORING_WEIGHTS.BUSINESS_MODEL_FIT;
  }

  // B2B2C gets partial credit for both B2B and B2C tools
  if (input.business_model === 'b2b2c') {
    if (tool.business_model_fit.includes('b2b') || tool.business_model_fit.includes('b2c')) {
      return SCORING_WEIGHTS.BUSINESS_MODEL_FIT * 0.7;
    }
  }

  return 0;
}

/**
 * Calculate total score for a tool
 */
function calculateToolScore(
  tool: ToolDefinition,
  input: ToolAssignmentInput
): { score: number; reasons: string[] } {
  const reasons: string[] = [];

  const templateScore = scoreTemplateRequirement(tool, input.agent_type);
  const industryScore = scoreIndustryFit(tool, input);
  const complexityScore = scoreComplexityFit(tool, input);
  const businessModelScore = scoreBusinessModelFit(tool, input);

  // Build reasons
  if (templateScore > 0) {
    reasons.push(`Required for ${input.agent_type.replace(/_/g, ' ')}`);
  }
  if (industryScore >= SCORING_WEIGHTS.INDUSTRY_FIT * 0.7) {
    reasons.push(`High fit for ${input.industry} industry`);
  }
  if (complexityScore >= SCORING_WEIGHTS.COMPLEXITY_FIT * 0.7) {
    reasons.push(`Matches ${input.sales_complexity} sales complexity`);
  }
  if (businessModelScore >= SCORING_WEIGHTS.BUSINESS_MODEL_FIT * 0.7) {
    reasons.push(`Optimized for ${input.business_model?.toUpperCase()} model`);
  }

  // Fallback reason
  if (reasons.length === 0) {
    reasons.push(`Enhances ${tool.category} capabilities`);
  }

  const total = templateScore + industryScore + complexityScore + businessModelScore;

  return {
    score: Math.round(total * 100) / 100,
    reasons,
  };
}

// ============================================
// DEPENDENCY RESOLUTION
// ============================================

/**
 * Ensure all dependencies are included
 */
function resolveDependencies(
  selectedTools: Map<string, { score: number; reason: string }>,
  toolLibrary: ToolDefinition[]
): void {
  const toolMap = new Map(toolLibrary.map((t) => [t.id, t]));

  // Iterate until no more dependencies added
  let changed = true;
  while (changed) {
    changed = false;
    for (const [toolId] of selectedTools) {
      const tool = toolMap.get(toolId);
      if (tool?.dependencies) {
        for (const depId of tool.dependencies) {
          if (!selectedTools.has(depId)) {
            const depTool = toolMap.get(depId);
            if (depTool) {
              selectedTools.set(depId, {
                score: TIER_THRESHOLDS.RECOMMENDED, // Dependencies get recommended tier
                reason: `Required by ${tool.name}`,
              });
              changed = true;
            }
          }
        }
      }
    }
  }
}

/**
 * Check for conflicts and remove lower-scored conflicting tools
 */
function resolveConflicts(
  selectedTools: Map<string, { score: number; reason: string }>,
  toolLibrary: ToolDefinition[]
): string[] {
  const removed: string[] = [];
  const toolMap = new Map(toolLibrary.map((t) => [t.id, t]));

  for (const [toolId, { score }] of selectedTools) {
    const tool = toolMap.get(toolId);
    if (tool?.conflicts_with) {
      for (const conflictId of tool.conflicts_with) {
        if (selectedTools.has(conflictId)) {
          const conflictScore = selectedTools.get(conflictId)!.score;
          // Remove the lower-scored tool
          if (conflictScore < score) {
            selectedTools.delete(conflictId);
            removed.push(conflictId);
          }
        }
      }
    }
  }

  return removed;
}

// ============================================
// MAIN ASSIGNMENT FUNCTION
// ============================================

/**
 * Assign tools to an agent based on multi-factor scoring
 */
export function assignTools(
  input: ToolAssignmentInput,
  toolLibrary: ToolDefinition[] = TOOL_LIBRARY
): ToolAssignmentResult {
  const reasoning: string[] = [];
  const scoredTools = new Map<string, { score: number; reason: string; name: string }>();

  // Build set of required tool IDs for this agent type
  const requiredToolIdsForAgent = new Set(
    toolLibrary
      .filter((t) => t.required_for_templates.includes(input.agent_type))
      .map((t) => t.id)
  );

  // Score all tools
  for (const tool of toolLibrary) {
    const { score, reasons } = calculateToolScore(tool, input);
    const isRequired = requiredToolIdsForAgent.has(tool.id);

    // Include tool if it scores above threshold OR is required for this agent type
    if (score >= TIER_THRESHOLDS.OPTIONAL || isRequired) {
      scoredTools.set(tool.id, {
        score: isRequired ? Math.max(score, TIER_THRESHOLDS.ESSENTIAL) : score,
        reason: reasons[0] || `Enhances ${tool.category}`,
        name: tool.name,
      });
    }
  }

  // Resolve dependencies
  resolveDependencies(scoredTools, toolLibrary);

  // Resolve conflicts
  const removedConflicts = resolveConflicts(scoredTools, toolLibrary);
  if (removedConflicts.length > 0) {
    reasoning.push(`Removed conflicting tools: ${removedConflicts.join(', ')}`);
  }

  // Categorize by tier
  const essential: ToolAssignment[] = [];
  const recommended: ToolAssignment[] = [];
  const optional: ToolAssignment[] = [];
  const disabled: string[] = [];

  for (const [id, { score, reason, name }] of scoredTools) {
    const tier = getTier(score);
    const assignment: ToolAssignment = { id, name, reason, score };

    switch (tier) {
      case 'essential':
        essential.push(assignment);
        break;
      case 'recommended':
        recommended.push(assignment);
        break;
      case 'optional':
        optional.push(assignment);
        break;
      default:
        disabled.push(id);
    }
  }

  // Sort by score descending within each tier
  essential.sort((a, b) => b.score - a.score);
  recommended.sort((a, b) => b.score - a.score);
  optional.sort((a, b) => b.score - a.score);

  // Calculate confidence based on how many essential tools were found
  const expectedEssentialCount = toolLibrary.filter((t) =>
    t.required_for_templates.includes(input.agent_type)
  ).length;
  const foundEssentialCount = essential.filter((t) =>
    toolLibrary.find((tl) => tl.id === t.id)?.required_for_templates.includes(input.agent_type)
  ).length;
  const confidence =
    expectedEssentialCount > 0
      ? Math.min(1, foundEssentialCount / expectedEssentialCount)
      : 0.7; // Default confidence if no required tools

  // Build reasoning summary
  reasoning.unshift(
    `Assigned ${essential.length} essential, ${recommended.length} recommended, ${optional.length} optional tools for ${input.agent_type.replace(/_/g, ' ')}`
  );
  if (input.industry) {
    reasoning.push(`Optimized for ${input.industry} industry`);
  }
  if (input.sales_complexity) {
    reasoning.push(`Configured for ${input.sales_complexity} sales complexity`);
  }

  return {
    essential_tools: essential,
    recommended_tools: recommended,
    optional_tools: optional,
    disabled_tools: disabled,
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
  };
}

/**
 * Build tool assignment input from enrichment result
 */
export function buildToolAssignmentInput(
  agentType: AgentType,
  enrichment: Partial<CompanyEnrichmentResult>
): ToolAssignmentInput {
  return {
    agent_type: agentType,
    industry: enrichment.company?.industry,
    sub_industry: enrichment.company?.sub_industry,
    business_model: enrichment.company?.business_model,
    sales_complexity: enrichment.company?.sales_complexity,
    service_category_tags: enrichment.company?.service_category_tags,
    has_phone_support: enrichment.company?.phone ? true : false,
    has_scheduling:
      enrichment.company?.service_category_tags?.some((t) =>
        ['scheduling', 'appointments', 'booking'].includes(t.toLowerCase())
      ) ?? false,
    has_ecommerce:
      enrichment.company?.industry?.toLowerCase().includes('ecommerce') ||
      enrichment.offerings?.some((o) => !o.is_service),
  };
}

/**
 * Get tool definition by ID
 */
export function getToolDefinition(toolId: string): ToolDefinition | undefined {
  return TOOL_LIBRARY.find((t) => t.id === toolId);
}

/**
 * Get all tools for a category
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOL_LIBRARY.filter((t) => t.category === category);
}

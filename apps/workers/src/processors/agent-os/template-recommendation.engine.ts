/**
 * Template Recommendation Engine (TRE v1)
 *
 * Multi-factor weighted scoring algorithm for recommending AI agent templates
 * based on company enrichment data.
 *
 * Scoring Formula (0-100 total):
 * - Industry Match: 30 points
 * - Business Model Match: 15 points
 * - Sales Complexity Match: 15 points
 * - Service Category Fit: 10 points
 * - AI Recommended Type: 10 points
 * - Conversation Fit: 10 points
 * - Market Effectiveness Score: 10 points
 *
 * @module processors/agent-os/template-recommendation.engine
 */

import type { CompanyEnrichmentResult, OfferingResult } from '../../types/payloads';

// ============================================
// TYPES
// ============================================

/**
 * Agent types that can be recommended
 */
export type AgentType =
  | 'sales_qualifier'
  | 'appointment_setter'
  | 'customer_support'
  | 'lead_capture'
  | 'booking_assistant'
  | 'faq_bot'
  | 'onboarding_guide'
  | 'product_recommender'
  | 'lead_nurturer'
  | 'survey_agent';

/**
 * Business model types
 */
export type BusinessModel = 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'saas' | 'consulting' | 'service' | 'subscription' | 'unknown';

/**
 * Sales complexity levels
 */
export type SalesComplexity = 'simple' | 'moderate' | 'complex' | 'enterprise';

/**
 * Conversation type the agent handles
 */
export type ConversationType = 'lead_gen' | 'support' | 'booking' | 'education' | 'sales';

/**
 * Match level thresholds
 */
export type MatchLevel = 'excellent' | 'strong' | 'good' | 'fair' | 'poor';

/**
 * Agent template definition
 */
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  agent_type: AgentType;
  industries: string[];
  business_models: BusinessModel[];
  sales_complexity_fit: SalesComplexity[];
  service_categories: string[];
  conversation_type: ConversationType;
  market_effectiveness: number; // 0-100 based on historical performance
  featured: boolean;
  popularity: number;
}

/**
 * Input data for template recommendation
 */
export interface TemplateRecommendationInput {
  industry?: string;
  sub_industry?: string;
  business_model?: BusinessModel;
  sales_complexity?: SalesComplexity;
  service_category_tags?: string[];
  recommended_agent_types?: AgentType[];
  offerings?: OfferingResult[];
}

/**
 * Scoring breakdown for transparency
 */
export interface ScoreBreakdown {
  industry_match: number;
  business_model_match: number;
  sales_complexity_match: number;
  service_category_fit: number;
  ai_recommended_type: number;
  conversation_fit: number;
  market_effectiveness: number;
}

/**
 * Expected outcome with KPIs
 */
export interface ExpectedOutcome {
  kpi: string;
  range: string;
  impact: 'primary revenue driver' | 'efficiency gain' | 'cost reduction' | 'customer satisfaction';
  description: string;
}

/**
 * Enhanced recommendation output
 */
export interface TemplateRecommendation {
  template_id: string;
  agent_type: AgentType;
  match_score: number;
  match_level: MatchLevel;
  reasons: string[];
  expected_outcome: ExpectedOutcome;
  score_breakdown?: ScoreBreakdown;
}

// ============================================
// SCORING WEIGHTS
// ============================================

const SCORING_WEIGHTS = {
  INDUSTRY_MATCH: 30,
  BUSINESS_MODEL_MATCH: 15,
  SALES_COMPLEXITY_MATCH: 15,
  SERVICE_CATEGORY_FIT: 10,
  AI_RECOMMENDED_TYPE: 10,
  CONVERSATION_FIT: 10,
  MARKET_EFFECTIVENESS: 10,
} as const;

// ============================================
// MATCH LEVEL THRESHOLDS
// ============================================

function getMatchLevel(score: number): MatchLevel {
  if (score >= 80) return 'excellent';
  if (score >= 65) return 'strong';
  if (score >= 50) return 'good';
  if (score >= 35) return 'fair';
  return 'poor';
}

// ============================================
// EXPECTED OUTCOMES (KPI-based)
// ============================================

const EXPECTED_OUTCOMES: Record<AgentType, ExpectedOutcome> = {
  sales_qualifier: {
    kpi: 'qualified_leads_per_week',
    range: '15-30',
    impact: 'primary revenue driver',
    description: 'Qualify leads and identify high-intent prospects before sales team engagement',
  },
  appointment_setter: {
    kpi: 'meetings_booked_per_week',
    range: '12-20',
    impact: 'primary revenue driver',
    description: 'Automate scheduling and reduce no-shows by 40%',
  },
  customer_support: {
    kpi: 'tickets_resolved_automatically',
    range: '60-80%',
    impact: 'cost reduction',
    description: 'Resolve common inquiries without human intervention',
  },
  lead_capture: {
    kpi: 'lead_capture_rate_increase',
    range: '20-35%',
    impact: 'primary revenue driver',
    description: 'Increase lead capture with conversational engagement',
  },
  booking_assistant: {
    kpi: 'bookings_per_week',
    range: '25-50',
    impact: 'efficiency gain',
    description: 'Streamline reservations and reduce booking friction',
  },
  faq_bot: {
    kpi: 'questions_answered_daily',
    range: '50-200',
    impact: 'customer satisfaction',
    description: 'Provide instant answers to common questions 24/7',
  },
  onboarding_guide: {
    kpi: 'activation_rate_improvement',
    range: '15-30%',
    impact: 'customer satisfaction',
    description: 'Improve customer activation and reduce time-to-value',
  },
  product_recommender: {
    kpi: 'average_order_value_increase',
    range: '10-25%',
    impact: 'primary revenue driver',
    description: 'Increase AOV through personalized suggestions',
  },
  lead_nurturer: {
    kpi: 'conversion_rate_improvement',
    range: '15-25%',
    impact: 'primary revenue driver',
    description: 'Nurture leads over time and improve conversion through relationship building',
  },
  survey_agent: {
    kpi: 'feedback_response_rate',
    range: '30-50%',
    impact: 'customer satisfaction',
    description: 'Collect customer feedback and improve response rates',
  },
};

// ============================================
// MARKET EFFECTIVENESS PRIORS
// ============================================

const MARKET_EFFECTIVENESS_PRIORS: Record<AgentType, number> = {
  sales_qualifier: 90,
  appointment_setter: 85,
  lead_capture: 80,
  customer_support: 82,
  booking_assistant: 80,
  onboarding_guide: 76,
  product_recommender: 74,
  faq_bot: 72,
  lead_nurturer: 78,
  survey_agent: 70,
};

// ============================================
// INDUSTRY CLUSTERS (for sector matching)
// ============================================

const INDUSTRY_CLUSTERS: Record<string, string[]> = {
  home_services: ['solar', 'roofing', 'hvac', 'plumbing', 'electrical', 'landscaping', 'renovation', 'construction'],
  healthcare: ['medical', 'dental', 'wellness', 'fitness', 'mental health', 'therapy', 'chiropractic'],
  professional_services: ['legal', 'accounting', 'consulting', 'financial', 'insurance', 'real estate'],
  technology: ['software', 'saas', 'tech', 'it services', 'cybersecurity', 'ai', 'fintech'],
  retail: ['ecommerce', 'retail', 'fashion', 'electronics', 'consumer goods'],
  hospitality: ['restaurants', 'hotels', 'travel', 'entertainment', 'events'],
  education: ['edtech', 'training', 'tutoring', 'courses', 'coaching'],
};

// ============================================
// CONVERSATION TYPE MAPPING
// ============================================

/**
 * Business situation to best agent type mapping
 * From spec:
 * - High ticket + consultation → sales_qualifier
 * - Scheduling heavy → appointment_setter
 * - Long nurture cycles → lead_capture (lead_nurture)
 * - FAQ heavy → faq_bot (support_agent)
 */
const BUSINESS_SITUATION_TO_AGENT: Array<{
  condition: (input: TemplateRecommendationInput) => boolean;
  bestAgents: AgentType[];
  conversationTypes: ConversationType[];
}> = [
  {
    // Home services with high-ticket installation → sales_qualifier (solar, roofing, hvac)
    condition: (input) => {
      const homeServicesIndustries = ['solar', 'roofing', 'hvac', 'plumbing', 'electrical', 'construction'];
      const industryLower = input.industry?.toLowerCase() || '';
      const isHomeServices = homeServicesIndustries.some((i) => industryLower.includes(i));
      const hasInstallation =
        input.service_category_tags?.some((t) =>
          ['installation', 'home improvement', 'renovation', 'construction'].includes(t.toLowerCase())
        ) ?? false;
      return isHomeServices || hasInstallation;
    },
    bestAgents: ['sales_qualifier', 'appointment_setter'],
    conversationTypes: ['sales', 'lead_gen'],
  },
  {
    // High ticket + consultation → sales_qualifier
    condition: (input) =>
      (input.sales_complexity === 'complex' || input.sales_complexity === 'enterprise') &&
      (input.service_category_tags?.some((t) =>
        ['consulting', 'consultation', 'advisory', 'professional'].includes(t.toLowerCase())
      ) ?? false),
    bestAgents: ['sales_qualifier'],
    conversationTypes: ['sales', 'lead_gen'],
  },
  {
    // Healthcare and wellness → appointment_setter
    condition: (input) => {
      const healthcareIndustries = ['healthcare', 'medical', 'dental', 'wellness', 'therapy', 'chiropractic'];
      const industryLower = input.industry?.toLowerCase() || '';
      return healthcareIndustries.some((i) => industryLower.includes(i));
    },
    bestAgents: ['appointment_setter'],
    conversationTypes: ['booking'],
  },
  {
    // Scheduling heavy businesses → appointment_setter
    condition: (input) =>
      input.service_category_tags?.some((t) =>
        ['appointments', 'scheduling', 'booking', 'calendar', 'reservations'].includes(t.toLowerCase())
      ) ?? false,
    bestAgents: ['appointment_setter', 'booking_assistant'],
    conversationTypes: ['booking'],
  },
  {
    // E-commerce businesses → product_recommender + support
    condition: (input) => {
      const ecommerceIndustries = ['ecommerce', 'retail', 'fashion', 'electronics'];
      const industryLower = input.industry?.toLowerCase() || '';
      return ecommerceIndustries.some((i) => industryLower.includes(i));
    },
    bestAgents: ['product_recommender', 'customer_support'],
    conversationTypes: ['sales', 'support'],
  },
  {
    // Recurring services → support/nurture
    condition: (input) =>
      input.service_category_tags?.some((t) =>
        ['subscription', 'recurring', 'maintenance', 'managed services'].includes(t.toLowerCase())
      ) ?? false,
    bestAgents: ['customer_support', 'lead_capture'],
    conversationTypes: ['support', 'education'],
  },
];

/**
 * Maps business characteristics to optimal conversation types
 */
function inferConversationType(input: TemplateRecommendationInput): ConversationType[] {
  const types: ConversationType[] = [];

  // Check specific business situations first
  for (const situation of BUSINESS_SITUATION_TO_AGENT) {
    if (situation.condition(input)) {
      types.push(...situation.conversationTypes);
    }
  }

  // Service businesses often need support and booking
  const hasServices = input.offerings?.some((o) => o.is_service);
  if (hasServices) {
    types.push('support', 'booking');
  }

  // B2B typically needs lead gen and sales
  if (input.business_model === 'b2b' || input.business_model === 'saas') {
    types.push('lead_gen', 'sales');
  }

  // B2C often needs support and education
  if (input.business_model === 'b2c' || input.business_model === 'marketplace') {
    types.push('support', 'education');
  }

  // Complex sales need qualification
  if (input.sales_complexity === 'complex' || input.sales_complexity === 'enterprise') {
    types.push('sales', 'lead_gen');
  }

  // Default to lead_gen if nothing else
  if (types.length === 0) {
    types.push('lead_gen');
  }

  return [...new Set(types)];
}

/**
 * Get best agent types based on business situation
 */
function inferBestAgentTypes(input: TemplateRecommendationInput): AgentType[] {
  const agents: AgentType[] = [];

  for (const situation of BUSINESS_SITUATION_TO_AGENT) {
    if (situation.condition(input)) {
      agents.push(...situation.bestAgents);
    }
  }

  return [...new Set(agents)];
}

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Find which cluster an industry belongs to
 */
function findIndustryCluster(industry: string): string | null {
  const industryLower = industry.toLowerCase();
  for (const [cluster, industries] of Object.entries(INDUSTRY_CLUSTERS)) {
    if (industries.some((i) => industryLower.includes(i) || i.includes(industryLower))) {
      return cluster;
    }
  }
  return null;
}

/**
 * Score industry match (0-30 points)
 * Tiered scoring per spec:
 * - 30: Exact industry match
 * - 25: Sub-industry match
 * - 18: Similar sector cluster
 * - 8: Base score (no match but still usable)
 */
function scoreIndustryMatch(template: AgentTemplate, input: TemplateRecommendationInput): number {
  const BASE_SCORE = 8; // Every template gets a base score

  if (!input.industry) return BASE_SCORE; // Partial credit for unknown

  const industryLower = input.industry.toLowerCase();
  const subIndustryLower = input.sub_industry?.toLowerCase();

  // Tier 1: Exact industry match → 30 points
  const exactIndustryMatch = template.industries.some((i) => i.toLowerCase() === industryLower);
  if (exactIndustryMatch) return SCORING_WEIGHTS.INDUSTRY_MATCH; // 30

  // Tier 2: Sub-industry match → 25 points
  if (subIndustryLower) {
    const subIndustryMatch = template.industries.some((i) => i.toLowerCase() === subIndustryLower);
    if (subIndustryMatch) return 25;
  }

  // Tier 3: Similar sector cluster → 18 points
  const inputCluster = findIndustryCluster(industryLower);
  if (inputCluster) {
    // Check if template targets any industry in the same cluster
    const clusterIndustries = INDUSTRY_CLUSTERS[inputCluster] || [];
    const sameClusterMatch = template.industries.some((ti) =>
      clusterIndustries.some((ci) => ti.toLowerCase().includes(ci) || ci.includes(ti.toLowerCase()))
    );
    if (sameClusterMatch) return 18;
  }

  // Also check if template has 'any' industry (universal templates)
  if (template.industries.includes('any')) return 18;

  // Tier 4: Base score → 8 points (template is still valid, just not optimal)
  return BASE_SCORE;
}

/**
 * Score business model match (0-15 points)
 */
function scoreBusinessModelMatch(template: AgentTemplate, input: TemplateRecommendationInput): number {
  if (!input.business_model || input.business_model === 'unknown') {
    return SCORING_WEIGHTS.BUSINESS_MODEL_MATCH * 0.3;
  }

  // Exact match
  if (template.business_models.includes(input.business_model)) {
    return SCORING_WEIGHTS.BUSINESS_MODEL_MATCH;
  }

  // Related models (b2b2c matches both b2b and b2c)
  if (input.business_model === 'b2b2c') {
    if (template.business_models.includes('b2b') || template.business_models.includes('b2c')) {
      return SCORING_WEIGHTS.BUSINESS_MODEL_MATCH * 0.7;
    }
  }

  return 0;
}

/**
 * Score sales complexity match (0-15 points)
 */
function scoreSalesComplexityMatch(template: AgentTemplate, input: TemplateRecommendationInput): number {
  if (!input.sales_complexity) {
    return SCORING_WEIGHTS.SALES_COMPLEXITY_MATCH * 0.3;
  }

  // Exact match
  if (template.sales_complexity_fit.includes(input.sales_complexity)) {
    return SCORING_WEIGHTS.SALES_COMPLEXITY_MATCH;
  }

  // Adjacent complexity levels
  const complexityOrder: SalesComplexity[] = ['simple', 'moderate', 'complex', 'enterprise'];
  const inputIndex = complexityOrder.indexOf(input.sales_complexity);
  const hasAdjacent = template.sales_complexity_fit.some((c) => {
    const templateIndex = complexityOrder.indexOf(c);
    return Math.abs(templateIndex - inputIndex) === 1;
  });

  if (hasAdjacent) {
    return SCORING_WEIGHTS.SALES_COMPLEXITY_MATCH * 0.6;
  }

  return 0;
}

/**
 * Score service category fit (0-10 points)
 */
function scoreServiceCategoryFit(template: AgentTemplate, input: TemplateRecommendationInput): number {
  if (!input.service_category_tags || input.service_category_tags.length === 0) {
    return SCORING_WEIGHTS.SERVICE_CATEGORY_FIT * 0.2;
  }

  const inputCategories = input.service_category_tags.map((c) => c.toLowerCase());
  const templateCategories = template.service_categories.map((c) => c.toLowerCase());

  // Count matches
  const matches = inputCategories.filter((c) =>
    templateCategories.some((tc) => tc.includes(c) || c.includes(tc))
  ).length;

  if (matches === 0) return 0;

  // Proportional scoring based on match ratio
  const matchRatio = matches / Math.max(inputCategories.length, 1);
  return SCORING_WEIGHTS.SERVICE_CATEGORY_FIT * Math.min(matchRatio, 1);
}

/**
 * Score AI recommended type match (0-10 points)
 */
function scoreAIRecommendedType(template: AgentTemplate, input: TemplateRecommendationInput): number {
  if (!input.recommended_agent_types || input.recommended_agent_types.length === 0) {
    return 0;
  }

  // Exact match with LLM recommendation
  if (input.recommended_agent_types.includes(template.agent_type)) {
    return SCORING_WEIGHTS.AI_RECOMMENDED_TYPE;
  }

  return 0;
}

/**
 * Score conversation fit (0-10 points)
 */
function scoreConversationFit(template: AgentTemplate, input: TemplateRecommendationInput): number {
  const inferredTypes = inferConversationType(input);

  if (inferredTypes.includes(template.conversation_type)) {
    return SCORING_WEIGHTS.CONVERSATION_FIT;
  }

  // Partial credit for related conversation types
  const relatedTypes: Record<ConversationType, ConversationType[]> = {
    lead_gen: ['sales'],
    sales: ['lead_gen'],
    support: ['education'],
    booking: ['support'],
    education: ['support'],
  };

  const related = relatedTypes[template.conversation_type] || [];
  if (related.some((t) => inferredTypes.includes(t))) {
    return SCORING_WEIGHTS.CONVERSATION_FIT * 0.5;
  }

  return 0;
}

/**
 * Score market effectiveness (0-10 points)
 * Uses template's market_effectiveness or falls back to MARKET_EFFECTIVENESS_PRIORS
 */
function scoreMarketEffectiveness(template: AgentTemplate): number {
  // Use template's effectiveness or fall back to priors
  const effectiveness =
    template.market_effectiveness > 0
      ? template.market_effectiveness
      : MARKET_EFFECTIVENESS_PRIORS[template.agent_type] || 70;

  // Normalize (0-100) to scoring weight (0-10)
  return (effectiveness / 100) * SCORING_WEIGHTS.MARKET_EFFECTIVENESS;
}

/**
 * Score business situation bonus (additional factor that amplifies other scores)
 * This gives extra weight to templates that match the inferred business situation
 */
function scoreBusinessSituationBonus(template: AgentTemplate, input: TemplateRecommendationInput): number {
  const inferredAgents = inferBestAgentTypes(input);

  // If template matches an inferred best agent, boost its score
  if (inferredAgents.includes(template.agent_type)) {
    return 5; // Bonus points for matching business situation
  }

  return 0;
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

/**
 * Calculate total score for a template
 */
export function calculateTemplateScore(
  template: AgentTemplate,
  input: TemplateRecommendationInput
): { total: number; breakdown: ScoreBreakdown; reasons: string[] } {
  const reasons: string[] = [];

  // Calculate each factor
  const industryMatch = scoreIndustryMatch(template, input);
  const businessModelMatch = scoreBusinessModelMatch(template, input);
  const salesComplexityMatch = scoreSalesComplexityMatch(template, input);
  const serviceCategoryFit = scoreServiceCategoryFit(template, input);
  const aiRecommendedType = scoreAIRecommendedType(template, input);
  const conversationFit = scoreConversationFit(template, input);
  const marketEffectiveness = scoreMarketEffectiveness(template);
  const businessSituationBonus = scoreBusinessSituationBonus(template, input);

  // Build reasons based on tiered scoring
  if (industryMatch === SCORING_WEIGHTS.INDUSTRY_MATCH) {
    reasons.push(`Perfect industry match for ${input.industry}`);
  } else if (industryMatch >= 25) {
    reasons.push(`Strong fit for ${input.sub_industry || input.industry} sector`);
  } else if (industryMatch >= 18) {
    reasons.push(`Relevant for your industry cluster`);
  }

  if (businessModelMatch >= SCORING_WEIGHTS.BUSINESS_MODEL_MATCH * 0.7) {
    reasons.push(`Optimized for ${input.business_model?.toUpperCase()} businesses`);
  }

  if (salesComplexityMatch >= SCORING_WEIGHTS.SALES_COMPLEXITY_MATCH * 0.7) {
    reasons.push(`Handles ${input.sales_complexity} sales cycles effectively`);
  }

  if (aiRecommendedType === SCORING_WEIGHTS.AI_RECOMMENDED_TYPE) {
    reasons.push('AI analysis recommends this agent type for your profile');
  }

  if (businessSituationBonus > 0) {
    reasons.push('Matches your business situation perfectly');
  }

  if (conversationFit >= SCORING_WEIGHTS.CONVERSATION_FIT * 0.7) {
    reasons.push(`Conversation style aligns with your customer journey`);
  }

  if (marketEffectiveness >= SCORING_WEIGHTS.MARKET_EFFECTIVENESS * 0.8) {
    const effectiveness =
      template.market_effectiveness > 0
        ? template.market_effectiveness
        : MARKET_EFFECTIVENESS_PRIORS[template.agent_type] || 70;
    reasons.push(`Proven ${effectiveness}% effectiveness in similar businesses`);
  }

  // Fallback reason based on agent type
  if (reasons.length === 0) {
    const outcome = EXPECTED_OUTCOMES[template.agent_type];
    reasons.push(`Can help achieve ${outcome.kpi.replace(/_/g, ' ')}`);
  }

  // Total score (capped at 100)
  const total = Math.min(
    100,
    industryMatch +
      businessModelMatch +
      salesComplexityMatch +
      serviceCategoryFit +
      aiRecommendedType +
      conversationFit +
      marketEffectiveness +
      businessSituationBonus
  );

  return {
    total: Math.round(total * 100) / 100, // Round to 2 decimals
    breakdown: {
      industry_match: Math.round(industryMatch * 100) / 100,
      business_model_match: Math.round(businessModelMatch * 100) / 100,
      sales_complexity_match: Math.round(salesComplexityMatch * 100) / 100,
      service_category_fit: Math.round(serviceCategoryFit * 100) / 100,
      ai_recommended_type: Math.round(aiRecommendedType * 100) / 100,
      conversation_fit: Math.round(conversationFit * 100) / 100,
      market_effectiveness: Math.round(marketEffectiveness * 100) / 100,
    },
    reasons,
  };
}

// ============================================
// TEMPLATE LIBRARY (will be moved to DB)
// ============================================

/**
 * Default template library for testing
 * In production, this will be loaded from the database
 */
export const DEFAULT_TEMPLATE_LIBRARY: AgentTemplate[] = [
  {
    id: 'tpl_sales_qualifier_001',
    name: 'Sales Qualifier Pro',
    description: 'Qualify leads based on budget, authority, need, and timeline',
    agent_type: 'sales_qualifier',
    industries: ['saas', 'technology', 'professional services', 'consulting', 'software'],
    business_models: ['b2b', 'saas', 'consulting'],
    sales_complexity_fit: ['moderate', 'complex', 'enterprise'],
    service_categories: ['sales', 'lead qualification', 'crm'],
    conversation_type: 'lead_gen',
    market_effectiveness: 78,
    featured: true,
    popularity: 245,
  },
  {
    id: 'tpl_sales_qualifier_home_services',
    name: 'Home Services Lead Qualifier',
    description: 'Qualify homeowner leads for high-ticket home improvement and installation projects',
    agent_type: 'sales_qualifier',
    industries: ['solar', 'roofing', 'hvac', 'plumbing', 'electrical', 'home improvement', 'construction'],
    business_models: ['b2c', 'b2b'],
    sales_complexity_fit: ['moderate', 'complex'],
    service_categories: ['installation', 'home improvement', 'renovation', 'consultation', 'sales'],
    conversation_type: 'lead_gen',
    market_effectiveness: 90,
    featured: true,
    popularity: 187,
  },
  {
    id: 'tpl_appointment_001',
    name: 'Smart Scheduler',
    description: 'Handle appointment booking and calendar management',
    agent_type: 'appointment_setter',
    industries: ['healthcare', 'professional services', 'beauty', 'wellness', 'consulting', 'legal'],
    business_models: ['b2c', 'b2b', 'consulting'],
    sales_complexity_fit: ['simple', 'moderate'],
    service_categories: ['appointments', 'scheduling', 'calendar', 'booking'],
    conversation_type: 'booking',
    market_effectiveness: 85,
    featured: true,
    popularity: 312,
  },
  {
    id: 'tpl_support_001',
    name: 'Support Assistant',
    description: 'Handle common support inquiries and ticket routing',
    agent_type: 'customer_support',
    industries: ['ecommerce', 'saas', 'retail', 'technology', 'telecom'],
    business_models: ['b2c', 'b2b', 'saas', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    service_categories: ['support', 'helpdesk', 'customer service', 'technical support'],
    conversation_type: 'support',
    market_effectiveness: 82,
    featured: true,
    popularity: 456,
  },
  {
    id: 'tpl_lead_capture_001',
    name: 'Lead Magnet',
    description: 'Capture and qualify website visitors',
    agent_type: 'lead_capture',
    industries: ['marketing', 'real estate', 'insurance', 'financial services', 'education'],
    business_models: ['b2b', 'b2c', 'b2b2c'],
    sales_complexity_fit: ['simple', 'moderate', 'complex'],
    service_categories: ['marketing', 'lead generation', 'sales'],
    conversation_type: 'lead_gen',
    market_effectiveness: 75,
    featured: false,
    popularity: 189,
  },
  {
    id: 'tpl_booking_001',
    name: 'Reservation Bot',
    description: 'Handle reservations for restaurants, hotels, and venues',
    agent_type: 'booking_assistant',
    industries: ['hospitality', 'restaurants', 'hotels', 'events', 'entertainment'],
    business_models: ['b2c', 'marketplace'],
    sales_complexity_fit: ['simple'],
    service_categories: ['reservations', 'booking', 'hospitality'],
    conversation_type: 'booking',
    market_effectiveness: 80,
    featured: false,
    popularity: 134,
  },
  {
    id: 'tpl_faq_001',
    name: 'Knowledge Base Bot',
    description: 'Answer frequently asked questions from your knowledge base',
    agent_type: 'faq_bot',
    industries: ['any'],
    business_models: ['b2b', 'b2c', 'saas', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    service_categories: ['faq', 'knowledge base', 'documentation'],
    conversation_type: 'education',
    market_effectiveness: 72,
    featured: false,
    popularity: 267,
  },
  {
    id: 'tpl_onboarding_001',
    name: 'Onboarding Guide',
    description: 'Guide new users through product setup and first steps',
    agent_type: 'onboarding_guide',
    industries: ['saas', 'technology', 'fintech', 'edtech'],
    business_models: ['saas', 'b2b', 'b2c'],
    sales_complexity_fit: ['moderate', 'complex'],
    service_categories: ['onboarding', 'training', 'activation'],
    conversation_type: 'education',
    market_effectiveness: 76,
    featured: false,
    popularity: 98,
  },
  {
    id: 'tpl_recommender_001',
    name: 'Product Advisor',
    description: 'Recommend products based on customer preferences',
    agent_type: 'product_recommender',
    industries: ['ecommerce', 'retail', 'fashion', 'electronics'],
    business_models: ['b2c', 'marketplace'],
    sales_complexity_fit: ['simple', 'moderate'],
    service_categories: ['recommendations', 'shopping', 'product discovery'],
    conversation_type: 'sales',
    market_effectiveness: 74,
    featured: false,
    popularity: 156,
  },
];

// ============================================
// MAIN RECOMMENDATION FUNCTION
// ============================================

/**
 * Get template recommendations using TRE v1 scoring algorithm
 */
export function getTemplateRecommendations(
  input: TemplateRecommendationInput,
  templates: AgentTemplate[] = DEFAULT_TEMPLATE_LIBRARY,
  maxResults: number = 5
): TemplateRecommendation[] {
  // Score all templates
  const scoredTemplates = templates.map((template) => {
    const { total, breakdown, reasons } = calculateTemplateScore(template, input);
    return {
      template,
      total,
      breakdown,
      reasons,
    };
  });

  // Sort by score descending
  scoredTemplates.sort((a, b) => b.total - a.total);

  // Take top N results
  const topTemplates = scoredTemplates.slice(0, maxResults);

  // Map to output format
  return topTemplates.map(({ template, total, breakdown, reasons }) => ({
    template_id: template.id,
    agent_type: template.agent_type,
    match_score: total / 100, // Normalize to 0-1 for API compatibility
    match_level: getMatchLevel(total),
    reasons,
    expected_outcome: EXPECTED_OUTCOMES[template.agent_type],
    score_breakdown: breakdown,
  }));
}

/**
 * Build input from enrichment result
 */
export function buildRecommendationInput(
  result: Partial<CompanyEnrichmentResult>
): TemplateRecommendationInput {
  return {
    industry: result.company?.industry,
    sub_industry: result.company?.sub_industry,
    business_model: result.company?.business_model,
    sales_complexity: result.company?.sales_complexity,
    service_category_tags: result.company?.service_category_tags,
    recommended_agent_types: result.company?.recommended_agent_types,
    offerings: result.offerings,
  };
}

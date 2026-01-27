/**
 * Knowledge Seed Engine (KSE v1)
 *
 * Generates initial knowledge base facts from company profile data.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * Input: company_profile + existing gaps
 * Output: { config: KnowledgeConfig, gaps: AssemblyGap[], evidence: EvidenceItem[], confidence: number }
 */

import type { AssemblyPhase } from '../../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
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

export interface KnowledgeGap {
  gap_type:
    | 'missing_services'
    | 'missing_contact'
    | 'missing_hours'
    | 'missing_pricing'
    | 'missing_location'
    | 'missing_service_area'
    | 'no_knowledge';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface KnowledgeEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface KnowledgeSeedInput {
  company_profile: CompanyProfile;
  existing_gaps?: Array<{
    gap_type: string;
    field_path: string;
    severity: string;
    impact: string;
    recommended_fix: string;
    source_phase: AssemblyPhase;
  }>;
}

export interface KnowledgeSeedResult {
  config: KnowledgeConfig;
  gaps: KnowledgeGap[];
  evidence: KnowledgeEvidence[];
  confidence: number;
}

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate knowledge seed facts from company profile
 * Pure function - no side effects
 */
export function runKnowledgeSeedEngine(input: KnowledgeSeedInput): KnowledgeSeedResult {
  const { company_profile, existing_gaps = [] } = input;
  const gaps: KnowledgeGap[] = [];
  const evidence: KnowledgeEvidence[] = [];
  const seedFacts: KnowledgeConfig['seed_facts'] = [];

  // Company basics
  if (company_profile.name) {
    seedFacts.push({
      category: 'company',
      fact: `Our company is ${company_profile.name}`,
      source: 'company_profile',
    });
    evidence.push({
      field_path: 'seed_facts.company',
      source: 'company_profile.name',
      reasoning: 'Company name extracted from profile',
    });
  }

  // Industry context
  if (company_profile.industry) {
    seedFacts.push({
      category: 'industry',
      fact: `We operate in the ${company_profile.industry} industry${
        company_profile.sub_industry ? `, specifically ${company_profile.sub_industry}` : ''
      }`,
      source: 'company_profile',
    });
    evidence.push({
      field_path: 'seed_facts.industry',
      source: 'company_profile.industry',
      reasoning: 'Industry context from profile',
    });
  }

  // Location
  if (company_profile.location?.city || company_profile.location?.state) {
    const locationParts = [
      company_profile.location.city,
      company_profile.location.state,
      company_profile.location.country,
    ].filter(Boolean);
    seedFacts.push({
      category: 'location',
      fact: `We are located in ${locationParts.join(', ')}`,
      source: 'company_profile',
    });
    evidence.push({
      field_path: 'seed_facts.location',
      source: 'company_profile.location',
      reasoning: 'Location extracted from company profile',
    });
  }

  // Services
  if (company_profile.services?.length) {
    for (const service of company_profile.services.slice(0, 5)) {
      seedFacts.push({
        category: 'services',
        fact: `We offer ${service.name}${
          service.description ? `: ${service.description}` : ''
        }`,
        source: 'company_profile',
      });
    }
    evidence.push({
      field_path: 'seed_facts.services',
      source: 'company_profile.services',
      reasoning: `${Math.min(company_profile.services.length, 5)} services extracted from profile`,
    });
  } else {
    gaps.push({
      gap_type: 'missing_services',
      field_path: 'company_profile.services',
      severity: 'high',
      impact: 'Agent cannot describe what services/products are offered',
      recommended_fix: 'Add services or products to company profile',
      source_phase: 'knowledge',
    });
  }

  // Contact info
  if (company_profile.contact?.phone) {
    seedFacts.push({
      category: 'contact',
      fact: `You can reach us by phone at ${company_profile.contact.phone}`,
      source: 'company_profile',
    });
  }
  if (company_profile.contact?.email) {
    seedFacts.push({
      category: 'contact',
      fact: `Our email address is ${company_profile.contact.email}`,
      source: 'company_profile',
    });
  }
  if (company_profile.contact?.address) {
    seedFacts.push({
      category: 'contact',
      fact: `Our address is ${company_profile.contact.address}`,
      source: 'company_profile',
    });
  }
  if (
    !company_profile.contact?.phone &&
    !company_profile.contact?.email &&
    !company_profile.contact?.address
  ) {
    gaps.push({
      gap_type: 'missing_contact',
      field_path: 'company_profile.contact',
      severity: 'medium',
      impact: 'Agent cannot provide contact information',
      recommended_fix: 'Add phone number, email, or address to company profile',
      source_phase: 'knowledge',
    });
  } else {
    evidence.push({
      field_path: 'seed_facts.contact',
      source: 'company_profile.contact',
      reasoning: 'Contact information extracted from profile',
    });
  }

  // Hours
  if (company_profile.hours?.schedule) {
    const dayNames = Object.keys(company_profile.hours.schedule);
    seedFacts.push({
      category: 'hours',
      fact: `Our business hours are available ${dayNames.length} days a week`,
      source: 'company_profile',
    });
    evidence.push({
      field_path: 'seed_facts.hours',
      source: 'company_profile.hours',
      reasoning: 'Business hours schedule available',
    });
  } else {
    gaps.push({
      gap_type: 'missing_hours',
      field_path: 'company_profile.hours',
      severity: 'low',
      impact: 'Agent cannot answer questions about business hours',
      recommended_fix: 'Add business hours to company profile',
      source_phase: 'knowledge',
    });
  }

  // Pricing
  if (company_profile.pricing?.model || company_profile.pricing?.range) {
    if (company_profile.pricing.model) {
      seedFacts.push({
        category: 'pricing',
        fact: `Our pricing model is ${company_profile.pricing.model}`,
        source: 'company_profile',
      });
    }
    if (company_profile.pricing.range?.min || company_profile.pricing.range?.max) {
      const currency = company_profile.pricing.currency || 'USD';
      const priceRange = company_profile.pricing.range;
      if (priceRange.min && priceRange.max) {
        seedFacts.push({
          category: 'pricing',
          fact: `Our pricing typically ranges from ${priceRange.min} to ${priceRange.max} ${currency}`,
          source: 'company_profile',
        });
      }
    }
    evidence.push({
      field_path: 'seed_facts.pricing',
      source: 'company_profile.pricing',
      reasoning: 'Pricing information available',
    });
  } else {
    gaps.push({
      gap_type: 'missing_pricing',
      field_path: 'company_profile.pricing',
      severity: 'medium',
      impact: 'Agent cannot answer pricing questions accurately',
      recommended_fix: 'Add pricing information or ranges',
      source_phase: 'knowledge',
    });
  }

  // Service area
  if (company_profile.service_area?.length) {
    seedFacts.push({
      category: 'service_area',
      fact: `We serve the following areas: ${company_profile.service_area.join(', ')}`,
      source: 'company_profile',
    });
    evidence.push({
      field_path: 'seed_facts.service_area',
      source: 'company_profile.service_area',
      reasoning: 'Service areas defined in profile',
    });
  }

  // Build knowledge gaps list
  const knowledgeGapPaths: string[] = [];
  for (const gap of [...existing_gaps, ...gaps]) {
    if (gap.gap_type.startsWith('missing_')) {
      knowledgeGapPaths.push(gap.field_path);
    }
  }

  // Calculate confidence based on seed facts and gaps
  const maxExpectedFacts = 10;
  const factsScore = Math.min(seedFacts.length / maxExpectedFacts, 1);
  const gapsScore = Math.max(0, 1 - gaps.length * 0.15);
  const confidence = factsScore * 0.6 + gapsScore * 0.4;

  // Add overall evidence
  evidence.push({
    field_path: 'knowledge_config',
    source: 'knowledge_seed_engine',
    reasoning: `Generated ${seedFacts.length} seed facts with ${gaps.length} gaps identified`,
  });

  return {
    config: {
      seed_facts: seedFacts,
      knowledge_gaps: knowledgeGapPaths,
    },
    gaps,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Alias for backward compatibility
export { runKnowledgeSeedEngine as generateKnowledgeSeed };

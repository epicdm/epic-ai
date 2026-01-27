/**
 * Knowledge Engine v1 (KE v1)
 *
 * Generates knowledge_config from company profile and defaults.
 * Pure function - no DB writes, no vector operations, no embeddings.
 * Orchestrator handles persistence via saveKnowledge.
 *
 * Input: company_profile (from Enrichment)
 * Output: KnowledgeEngineResult with config matching KnowledgeConfigSchemaStrict
 */

import type {
  KnowledgeConfig,
  RetrievalSettings,
  ContextWindowConfig,
  KnowledgeSource,
  QuickAnswer,
} from '@epic-ai/shared';
import type { AssemblyPhase } from '../../processors/agent-os/assembly.orchestrator';

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
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export interface KnowledgeGap {
  gap_type:
    | 'missing_services'
    | 'missing_contact'
    | 'missing_hours'
    | 'missing_pricing'
    | 'missing_location'
    | 'missing_service_area'
    | 'no_knowledge_sources'
    | 'no_quick_answers';
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

export interface KnowledgeEngineInput {
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

export interface KnowledgeEngineResult {
  knowledge_config: KnowledgeConfig;
  gaps: KnowledgeGap[];
  evidence: KnowledgeEvidence[];
  confidence: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_RETRIEVAL_SETTINGS: RetrievalSettings = {
  top_k: 5,
  similarity_threshold: 0.7,
  rerank: false,
  rerank_model: undefined,
};

const DEFAULT_CONTEXT_WINDOW: ContextWindowConfig = {
  max_knowledge_tokens: 4000,
  overflow_strategy: 'truncate',
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build quick answers from company services and FAQs
 */
function buildQuickAnswers(profile: CompanyProfile): QuickAnswer[] {
  const quickAnswers: QuickAnswer[] = [];

  // Build from services
  if (profile.services?.length) {
    for (const svc of profile.services.slice(0, 5)) {
      quickAnswers.push({
        triggers: [
          `what is ${svc.name}`,
          `tell me about ${svc.name}`,
          `do you offer ${svc.name}`,
          svc.name.toLowerCase(),
        ],
        answer: svc.description || `We offer ${svc.name}.`,
        confidence_threshold: 0.8,
      });
    }
  }

  // Build from FAQs if available
  if (profile.faqs?.length) {
    for (const faq of profile.faqs.slice(0, 10)) {
      quickAnswers.push({
        triggers: [faq.question.toLowerCase()],
        answer: faq.answer,
        confidence_threshold: 0.85,
      });
    }
  }

  // Build from contact info
  if (profile.contact?.phone) {
    quickAnswers.push({
      triggers: ['phone number', 'call you', 'contact number', 'how to call'],
      answer: `You can reach us at ${profile.contact.phone}.`,
      confidence_threshold: 0.9,
    });
  }

  if (profile.contact?.email) {
    quickAnswers.push({
      triggers: ['email', 'email address', 'contact email'],
      answer: `Our email address is ${profile.contact.email}.`,
      confidence_threshold: 0.9,
    });
  }

  if (profile.contact?.address) {
    quickAnswers.push({
      triggers: ['address', 'location', 'where are you', 'office location'],
      answer: `We are located at ${profile.contact.address}.`,
      confidence_threshold: 0.9,
    });
  }

  // Build from hours
  if (profile.hours?.schedule) {
    const days = Object.keys(profile.hours.schedule);
    const scheduleLines = days.map((day) => {
      const hours = profile.hours?.schedule?.[day];
      return hours ? `${day}: ${hours.open} - ${hours.close}` : null;
    }).filter(Boolean);

    quickAnswers.push({
      triggers: ['hours', 'open', 'business hours', 'when are you open', 'operating hours'],
      answer: `Our business hours are:\n${scheduleLines.join('\n')}${
        profile.hours.timezone ? ` (${profile.hours.timezone})` : ''
      }`,
      confidence_threshold: 0.9,
    });
  }

  // Build from pricing
  if (profile.pricing?.model) {
    quickAnswers.push({
      triggers: ['pricing', 'cost', 'how much', 'price', 'rates'],
      answer: `Our pricing model is ${profile.pricing.model}.${
        profile.pricing.range?.min && profile.pricing.range?.max
          ? ` Prices typically range from ${profile.pricing.range.min} to ${profile.pricing.range.max} ${profile.pricing.currency || 'USD'}.`
          : ''
      }`,
      confidence_threshold: 0.75,
    });
  }

  // Build from service area
  if (profile.service_area?.length) {
    quickAnswers.push({
      triggers: ['service area', 'where do you serve', 'coverage area', 'locations served'],
      answer: `We serve the following areas: ${profile.service_area.join(', ')}.`,
      confidence_threshold: 0.9,
    });
  }

  return quickAnswers;
}

/**
 * Build knowledge sources from company profile
 */
function buildSources(profile: CompanyProfile): KnowledgeSource[] {
  const sources: KnowledgeSource[] = [];
  let priority = 1;

  // Add website as primary source if available
  if (profile.website) {
    sources.push({
      id: 'website_primary',
      type: 'website',
      name: profile.website,
      priority: priority++,
    });
  }

  // Company profile itself is a document source
  sources.push({
    id: 'company_profile',
    type: 'document',
    name: 'Company Profile',
    priority: priority++,
  });

  return sources;
}

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate knowledge configuration from company profile
 * Pure function - no side effects, no vector operations
 */
export function runKnowledgeEngine(input: KnowledgeEngineInput): KnowledgeEngineResult {
  const { company_profile } = input;
  const gaps: KnowledgeGap[] = [];
  const evidence: KnowledgeEvidence[] = [];

  // Build quick answers from services and FAQs
  const quick_answers = buildQuickAnswers(company_profile);

  if (quick_answers.length === 0) {
    gaps.push({
      gap_type: 'no_quick_answers',
      field_path: 'knowledge_config.quick_answers',
      severity: 'medium',
      impact: 'Agent cannot provide immediate answers to common questions',
      recommended_fix: 'Add services, FAQs, or contact information to company profile',
      source_phase: 'knowledge',
    });
  } else {
    evidence.push({
      field_path: 'knowledge_config.quick_answers',
      source: 'company_profile',
      reasoning: `Generated ${quick_answers.length} quick answers from profile data`,
    });
  }

  // Build sources from profile
  const sources = buildSources(company_profile);

  if (sources.length === 0) {
    gaps.push({
      gap_type: 'no_knowledge_sources',
      field_path: 'knowledge_config.sources',
      severity: 'high',
      impact: 'Agent has no knowledge sources to reference',
      recommended_fix: 'Add website or document sources',
      source_phase: 'knowledge',
    });
  } else {
    evidence.push({
      field_path: 'knowledge_config.sources',
      source: 'company_profile',
      reasoning: `Configured ${sources.length} knowledge sources`,
    });
  }

  // Add gaps for missing critical information
  if (!company_profile.services?.length) {
    gaps.push({
      gap_type: 'missing_services',
      field_path: 'company_profile.services',
      severity: 'high',
      impact: 'Agent cannot describe what services/products are offered',
      recommended_fix: 'Add services or products to company profile',
      source_phase: 'knowledge',
    });
  }

  if (!company_profile.contact?.phone && !company_profile.contact?.email) {
    gaps.push({
      gap_type: 'missing_contact',
      field_path: 'company_profile.contact',
      severity: 'medium',
      impact: 'Agent cannot provide contact information',
      recommended_fix: 'Add phone number or email to company profile',
      source_phase: 'knowledge',
    });
  }

  // Build the knowledge config
  const knowledge_config: KnowledgeConfig = {
    knowledge_bases: [], // No vector DBs in v1
    retrieval_settings: { ...DEFAULT_RETRIEVAL_SETTINGS },
    context_window: { ...DEFAULT_CONTEXT_WINDOW },
    sources,
    quick_answers,
  };

  // Add overall evidence
  evidence.push({
    field_path: 'knowledge_config',
    source: 'knowledge_engine_v1',
    reasoning: `Generated knowledge config with ${sources.length} sources and ${quick_answers.length} quick answers`,
  });

  // Calculate confidence based on completeness
  const hasServices = (company_profile.services?.length ?? 0) > 0;
  const hasContact = Boolean(company_profile.contact?.phone || company_profile.contact?.email);
  const hasWebsite = Boolean(company_profile.website);
  const hasHours = Boolean(company_profile.hours?.schedule);

  let confidence = 0.3; // Base confidence
  if (hasServices) confidence += 0.25;
  if (hasContact) confidence += 0.15;
  if (hasWebsite) confidence += 0.15;
  if (hasHours) confidence += 0.1;
  if (quick_answers.length >= 5) confidence += 0.05;

  return {
    knowledge_config,
    gaps,
    evidence,
    confidence: Math.round(Math.min(confidence, 1) * 100) / 100,
  };
}

// Export for use in assembly orchestrator
export { runKnowledgeEngine as generateKnowledgeConfig };

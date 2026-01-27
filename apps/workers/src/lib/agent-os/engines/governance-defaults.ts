/**
 * Governance Defaults Engine (GDE v1)
 *
 * Generates governance configuration based on industry regulations and company context.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * Input: industry + business_model + compliance_requirements
 * Output: { config: GovernanceConfig, gaps: GovernanceGap[], evidence: EvidenceItem[], confidence: number }
 */

import type { AssemblyPhase } from '../../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type ComplianceMode = 'standard' | 'strict' | 'regulated';
export type PIIHandling = 'strict' | 'moderate' | 'relaxed';

export interface GovernanceConfig {
  compliance_mode: ComplianceMode;
  forbidden_phrases: string[];
  disallowed_topics: string[];
  escalation_triggers: string[];
  pii_handling: PIIHandling;
  safe_claim_phrases: string[];
  max_message_length?: number;
  require_disclaimers?: boolean;
  record_conversations?: boolean;
  audit_level?: 'minimal' | 'standard' | 'comprehensive';
}

export interface GovernanceGap {
  gap_type: 'no_compliance' | 'missing_escalation' | 'no_pii_policy' | 'incomplete';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface GovernanceEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface GovernanceInput {
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  compliance_mode_override?: ComplianceMode;
  additional_forbidden_phrases?: string[];
  custom_escalation_triggers?: string[];
  country?: string;
}

export interface GovernanceResult {
  config: GovernanceConfig;
  gaps: GovernanceGap[];
  evidence: GovernanceEvidence[];
  confidence: number;
}

// ============================================================================
// Industry Configuration
// ============================================================================

const REGULATED_INDUSTRIES = [
  'healthcare',
  'finance',
  'insurance',
  'legal',
  'banking',
  'pharmaceuticals',
  'medical devices',
  'financial services',
];

const STRICT_INDUSTRIES = [
  'real estate',
  'education',
  'government',
  'nonprofit',
  'childcare',
];

const INDUSTRY_SPECIFIC_FORBIDDEN: Record<string, string[]> = {
  healthcare: [
    'I diagnose',
    'this will cure',
    'guaranteed treatment',
    'medical advice',
    'you should take',
    'prescription',
  ],
  finance: [
    'guaranteed returns',
    'risk-free investment',
    'sure thing',
    'cannot lose',
    'insider information',
    'tax advice',
  ],
  insurance: [
    'guaranteed coverage',
    'will definitely pay out',
    'no exclusions',
    'better than policy terms',
    'legal advice',
  ],
  legal: [
    'legal advice',
    'I recommend suing',
    'you will win',
    'guaranteed outcome',
    'attorney-client privilege',
  ],
  real_estate: [
    'guaranteed appreciation',
    'property will definitely sell',
    'no inspection needed',
    'skip the paperwork',
  ],
};

const INDUSTRY_SPECIFIC_TOPICS: Record<string, string[]> = {
  healthcare: ['other patients', 'specific medications without context', 'off-label uses'],
  finance: ['specific stock picks', 'guaranteed returns', 'insider trading'],
  insurance: ['claim processing details', 'policy loopholes', 'fraud schemes'],
  legal: ['case-specific legal strategy', 'courtroom tactics', 'other clients'],
};

// ============================================================================
// Default Phrase Libraries
// ============================================================================

const DEFAULT_FORBIDDEN_PHRASES = [
  'I guarantee',
  'I promise',
  '100% guaranteed',
  'absolutely certain',
  'no risk',
  'best in the market',
  'competitors are bad',
  'definitely will',
  'cannot fail',
  'trust me',
];

const DEFAULT_DISALLOWED_TOPICS = [
  'competitor pricing',
  'internal company issues',
  'employee salaries',
  'unreleased products',
  'legal disputes',
  'confidential information',
  'other customers',
];

const DEFAULT_ESCALATION_TRIGGERS = [
  'speak to a human',
  'talk to someone real',
  'get me a manager',
  'I want to complain',
  'this is urgent',
  'emergency',
  'legal action',
  'lawyer',
  'sue',
  'refund',
  'cancel everything',
  'threatening',
  'frustrated',
];

const DEFAULT_SAFE_CLAIM_PHRASES = [
  'Based on our experience',
  'Many of our customers find',
  'Typically',
  'In most cases',
  'Our team can help',
  'Generally speaking',
  'From what we understand',
  'According to our records',
];

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate governance configuration based on industry and context
 * Pure function - no side effects
 */
export function runGovernanceDefaultsEngine(input: GovernanceInput): GovernanceResult {
  const {
    industry,
    sub_industry,
    business_model,
    compliance_mode_override,
    additional_forbidden_phrases = [],
    custom_escalation_triggers = [],
    country,
  } = input;

  const gaps: GovernanceGap[] = [];
  const evidence: GovernanceEvidence[] = [];

  // Determine compliance mode
  let complianceMode: ComplianceMode = 'standard';
  let complianceReason = 'Default standard compliance mode';

  if (compliance_mode_override) {
    complianceMode = compliance_mode_override;
    complianceReason = 'Compliance mode specified by user override';
  } else if (industry) {
    const normalizedIndustry = industry.toLowerCase();
    if (REGULATED_INDUSTRIES.some((r) => normalizedIndustry.includes(r))) {
      complianceMode = 'regulated';
      complianceReason = `Regulated industry detected: ${industry}`;
    } else if (STRICT_INDUSTRIES.some((s) => normalizedIndustry.includes(s))) {
      complianceMode = 'strict';
      complianceReason = `Strict compliance recommended for: ${industry}`;
    }
  }

  evidence.push({
    field_path: 'governance_config.compliance_mode',
    source: industry ? 'industry_detection' : 'default',
    reasoning: complianceReason,
  });

  // Build forbidden phrases
  const forbiddenPhrases = new Set(DEFAULT_FORBIDDEN_PHRASES);

  // Add industry-specific forbidden phrases
  if (industry) {
    const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '_');
    const industryPhrases = INDUSTRY_SPECIFIC_FORBIDDEN[normalizedIndustry] || [];
    industryPhrases.forEach((p) => forbiddenPhrases.add(p));

    if (industryPhrases.length > 0) {
      evidence.push({
        field_path: 'governance_config.forbidden_phrases',
        source: 'industry_library',
        reasoning: `Added ${industryPhrases.length} industry-specific forbidden phrases for ${industry}`,
      });
    }
  }

  // Add user-provided forbidden phrases
  additional_forbidden_phrases.forEach((p) => forbiddenPhrases.add(p));
  if (additional_forbidden_phrases.length > 0) {
    evidence.push({
      field_path: 'governance_config.forbidden_phrases',
      source: 'user_input',
      reasoning: `Added ${additional_forbidden_phrases.length} user-specified forbidden phrases`,
    });
  }

  // Build disallowed topics
  const disallowedTopics = new Set(DEFAULT_DISALLOWED_TOPICS);

  if (industry) {
    const normalizedIndustry = industry.toLowerCase().replace(/\s+/g, '_');
    const industryTopics = INDUSTRY_SPECIFIC_TOPICS[normalizedIndustry] || [];
    industryTopics.forEach((t) => disallowedTopics.add(t));
  }

  // Build escalation triggers
  const escalationTriggers = new Set(DEFAULT_ESCALATION_TRIGGERS);
  custom_escalation_triggers.forEach((t) => escalationTriggers.add(t));

  if (custom_escalation_triggers.length > 0) {
    evidence.push({
      field_path: 'governance_config.escalation_triggers',
      source: 'user_input',
      reasoning: `Added ${custom_escalation_triggers.length} custom escalation triggers`,
    });
  }

  // Determine PII handling
  let piiHandling: PIIHandling = 'moderate';
  if (complianceMode === 'regulated') {
    piiHandling = 'strict';
  } else if (complianceMode === 'standard' && business_model === 'b2c') {
    piiHandling = 'moderate';
  }

  evidence.push({
    field_path: 'governance_config.pii_handling',
    source: 'compliance_mode',
    reasoning: `PII handling set to ${piiHandling} based on ${complianceMode} compliance mode`,
  });

  // Build config
  const config: GovernanceConfig = {
    compliance_mode: complianceMode,
    forbidden_phrases: Array.from(forbiddenPhrases),
    disallowed_topics: Array.from(disallowedTopics),
    escalation_triggers: Array.from(escalationTriggers),
    pii_handling: piiHandling,
    safe_claim_phrases: DEFAULT_SAFE_CLAIM_PHRASES,
    max_message_length: complianceMode === 'regulated' ? 500 : undefined,
    require_disclaimers: complianceMode === 'regulated',
    record_conversations: complianceMode !== 'standard',
    audit_level:
      complianceMode === 'regulated'
        ? 'comprehensive'
        : complianceMode === 'strict'
          ? 'standard'
          : 'minimal',
  };

  // Identify gaps
  if (!industry) {
    gaps.push({
      gap_type: 'incomplete',
      field_path: 'input.industry',
      severity: 'medium',
      impact: 'Cannot apply industry-specific compliance rules',
      recommended_fix: 'Specify the company industry for better governance defaults',
      source_phase: 'governance',
    });
  }

  // Calculate confidence
  let confidence = 0.9; // Defaults are always valid base
  if (industry) {
    confidence = complianceMode === 'regulated' ? 0.95 : 0.9;
  } else {
    confidence = 0.75; // Lower confidence without industry context
  }
  if (compliance_mode_override) {
    confidence = Math.max(confidence, 0.9); // User override increases confidence
  }

  evidence.push({
    field_path: 'governance_config',
    source: 'governance_defaults_engine',
    reasoning: `Generated governance config with ${complianceMode} mode, ${forbiddenPhrases.size} forbidden phrases, ${escalationTriggers.size} escalation triggers`,
  });

  return {
    config,
    gaps,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Alias for backward compatibility
export function getDefaultGovernanceConfig(
  industry?: string,
  complianceMode?: ComplianceMode
): GovernanceConfig {
  const result = runGovernanceDefaultsEngine({
    industry,
    compliance_mode_override: complianceMode,
  });
  return result.config;
}

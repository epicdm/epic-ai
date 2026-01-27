/**
 * Memory Engine v1 (ME v1)
 *
 * Generates memory_config from template and company profile.
 * Pure function - no DB writes, no self-modification.
 * Orchestrator handles persistence via saveMemory.
 *
 * v1 Strategy:
 * - Short-term memory ON by default (safe, per-conversation context)
 * - Long-term OFF by default (risk - needs governance approval)
 * - Episodic OFF by default (risk - stores interaction history)
 * - Persistence encryption ON by default (safe)
 *
 * Input: templateKey, channels, companyProfile
 * Output: MemoryEngineResult with config matching MemoryConfigSchemaStrict
 */

import type {
  MemoryConfig,
  ShortTermMemory,
  LongTermMemory,
  EpisodicMemory,
  MemoryPersistence,
} from '@epic-ai/shared';
import type { AssemblyPhase } from '../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type ChannelType = 'voice' | 'chat' | 'sms' | 'email' | 'social';

export interface CompanyProfile {
  name?: string;
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface MemoryGap {
  gap_type: 'no_long_term' | 'no_episodic' | 'no_entity_extraction' | 'small_context_window';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface MemoryWarning {
  code: string;
  message: string;
  severity: 'info' | 'low' | 'medium' | 'high';
}

export interface MemoryEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface MemoryEngineInput {
  templateKey: string;
  channels?: ChannelType[];
  companyProfile?: CompanyProfile;
}

export interface MemoryEngineResult {
  memory_config: MemoryConfig;
  gaps: MemoryGap[];
  warnings: MemoryWarning[];
  evidence: MemoryEvidence[];
  confidence: number;
}

// ============================================================================
// Defaults
// ============================================================================

const DEFAULT_SHORT_TERM: ShortTermMemory = {
  enabled: true,           // Always safe - per conversation only
  window_size: 10,         // Last 10 messages
  include_system: false,   // Don't include system messages
};

const DEFAULT_LONG_TERM: LongTermMemory = {
  enabled: false,          // Off by default - requires governance
  summary_strategy: 'per_conversation',
  max_summaries: 100,
  extract_entities: ['name', 'email', 'phone'],
};

const DEFAULT_EPISODIC: EpisodicMemory = {
  enabled: false,          // Off by default - stores interaction history
  store_interactions: true,
  store_outcomes: true,
  retention_days: 30,
};

const DEFAULT_PERSISTENCE: MemoryPersistence = {
  storage: 'database',
  encrypt: true,           // Always encrypt by default
  auto_cleanup: true,      // Clean up expired data
};

// Templates that benefit from larger context windows
const LARGE_CONTEXT_TEMPLATES = [
  'customer_support',
  'technical_support',
  'onboarding_guide',
  'consultation',
];

// Templates that benefit from long-term memory
const LONG_TERM_RECOMMENDED_TEMPLATES = [
  'sales_assistant',
  'account_manager',
  'customer_success',
  'relationship_manager',
];

// Templates that should have minimal memory (privacy-focused)
const MINIMAL_MEMORY_TEMPLATES = [
  'anonymous_support',
  'public_faq',
  'one_time_interaction',
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine optimal context window size based on template and channels
 */
function getOptimalWindowSize(templateKey: string, channels: ChannelType[]): number {
  // Minimal memory templates get smaller window
  if (MINIMAL_MEMORY_TEMPLATES.includes(templateKey)) {
    return 5;
  }

  // Large context templates get bigger window
  if (LARGE_CONTEXT_TEMPLATES.includes(templateKey)) {
    return 20;
  }

  // Voice channels benefit from larger context (conversation flow)
  if (channels.includes('voice')) {
    return 15;
  }

  // Default
  return 10;
}

/**
 * Determine if long-term memory is recommended for this template
 */
function isLongTermRecommended(templateKey: string): boolean {
  return LONG_TERM_RECOMMENDED_TEMPLATES.includes(templateKey);
}

/**
 * Get entity extraction fields based on industry
 */
function getEntityExtractionFields(companyProfile?: CompanyProfile): string[] {
  const baseEntities = ['name', 'email', 'phone'];

  if (companyProfile?.industry) {
    const industry = companyProfile.industry.toLowerCase();

    if (industry.includes('health') || industry.includes('medical')) {
      // Don't auto-extract medical info - compliance risk
      return baseEntities;
    }
    if (industry.includes('real estate') || industry.includes('property')) {
      baseEntities.push('address', 'property_type', 'budget');
    }
    if (industry.includes('finance') || industry.includes('insurance')) {
      // Don't auto-extract financial info - compliance risk
      return baseEntities;
    }
    if (industry.includes('automotive') || industry.includes('car')) {
      baseEntities.push('vehicle_interest', 'trade_in');
    }
  }

  // B2B benefits from company extraction
  if (companyProfile?.business_model === 'b2b' || companyProfile?.business_model === 'saas') {
    baseEntities.push('company', 'job_title');
  }

  return baseEntities;
}

/**
 * Determine retention days based on industry compliance needs
 */
function getRetentionDays(companyProfile?: CompanyProfile): number {
  if (companyProfile?.industry) {
    const industry = companyProfile.industry.toLowerCase();

    // Healthcare and finance may have compliance requirements
    if (industry.includes('health') || industry.includes('medical')) {
      return 7; // Short retention for sensitive data
    }
    if (industry.includes('finance') || industry.includes('insurance')) {
      return 14; // Short retention for financial data
    }
  }

  // Default 30 days
  return 30;
}

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate memory configuration from template and profile
 * Pure function - no side effects, no self-modification
 */
export function runMemoryEngine(input: MemoryEngineInput): MemoryEngineResult {
  const { templateKey, channels = [], companyProfile } = input;
  const gaps: MemoryGap[] = [];
  const warnings: MemoryWarning[] = [];
  const evidence: MemoryEvidence[] = [];

  // Calculate optimal settings
  const windowSize = getOptimalWindowSize(templateKey, channels);
  const longTermRecommended = isLongTermRecommended(templateKey);
  const entityFields = getEntityExtractionFields(companyProfile);
  const retentionDays = getRetentionDays(companyProfile);

  // Build short-term config (always enabled)
  const short_term: ShortTermMemory = {
    ...DEFAULT_SHORT_TERM,
    window_size: windowSize,
    // Include system messages for complex support scenarios
    include_system: LARGE_CONTEXT_TEMPLATES.includes(templateKey),
  };

  // Build long-term config (disabled by default)
  const long_term: LongTermMemory = {
    ...DEFAULT_LONG_TERM,
    enabled: false, // Always off by default - governance must enable
    extract_entities: entityFields,
  };

  // Build episodic config (disabled by default)
  const episodic: EpisodicMemory = {
    ...DEFAULT_EPISODIC,
    enabled: false, // Always off by default - governance must enable
    retention_days: retentionDays,
  };

  // Build persistence config (encryption always on)
  const persistence: MemoryPersistence = {
    ...DEFAULT_PERSISTENCE,
    encrypt: true, // Always encrypt
  };

  // Build the memory config
  const memory_config: MemoryConfig = {
    short_term,
    long_term,
    episodic,
    persistence,
  };

  // Add evidence
  evidence.push({
    field_path: 'memory_config.short_term',
    source: 'template_analysis',
    reasoning: `Short-term memory enabled with window_size=${windowSize} for template: ${templateKey}`,
  });

  evidence.push({
    field_path: 'memory_config.short_term.window_size',
    source: 'channel_analysis',
    reasoning: channels.includes('voice')
      ? 'Larger context window for voice conversation flow'
      : `Standard context window for channels: ${channels.join(', ') || 'default'}`,
  });

  evidence.push({
    field_path: 'memory_config.long_term',
    source: 'governance_policy',
    reasoning: 'Long-term memory disabled by default - requires explicit governance approval',
  });

  evidence.push({
    field_path: 'memory_config.episodic',
    source: 'governance_policy',
    reasoning: 'Episodic memory disabled by default - stores interaction history',
  });

  evidence.push({
    field_path: 'memory_config.persistence',
    source: 'security_policy',
    reasoning: `Encryption enabled, storage=${persistence.storage}, auto_cleanup=${persistence.auto_cleanup}`,
  });

  // Add warnings for recommended features that are disabled
  if (longTermRecommended) {
    warnings.push({
      code: 'LONG_TERM_RECOMMENDED',
      message: 'This template benefits from long-term memory. Enable via governance settings for better personalization.',
      severity: 'info',
    });
  }

  if (windowSize < 10 && !MINIMAL_MEMORY_TEMPLATES.includes(templateKey)) {
    warnings.push({
      code: 'SMALL_CONTEXT_WINDOW',
      message: 'Context window is smaller than default. Agent may lose context in longer conversations.',
      severity: 'low',
    });
  }

  // Add gaps (informational, not blocking)
  if (!long_term.enabled && longTermRecommended) {
    gaps.push({
      gap_type: 'no_long_term',
      field_path: 'memory_config.long_term.enabled',
      severity: 'low',
      impact: 'Agent will not remember users across conversations',
      recommended_fix: 'Enable long-term memory via governance settings for returning user recognition',
      source_phase: 'memory',
    });
  }

  if (!episodic.enabled) {
    gaps.push({
      gap_type: 'no_episodic',
      field_path: 'memory_config.episodic.enabled',
      severity: 'low',
      impact: 'Agent will not track interaction patterns over time',
      recommended_fix: 'Enable episodic memory via governance settings for behavior analysis',
      source_phase: 'memory',
    });
  }

  // Overall evidence
  evidence.push({
    field_path: 'memory_config',
    source: 'memory_engine_v1',
    reasoning: `Generated memory config: short_term=ON (window=${windowSize}), long_term=OFF, episodic=OFF, encrypt=ON`,
  });

  // Calculate confidence
  // Higher confidence when safe defaults are applied
  let confidence = 0.85;
  if (MINIMAL_MEMORY_TEMPLATES.includes(templateKey)) {
    // Privacy-focused template with minimal memory
    confidence = 0.95;
  } else if (longTermRecommended && !long_term.enabled) {
    // Could benefit from long-term but disabled (safe choice)
    confidence = 0.75;
  }

  return {
    memory_config,
    gaps,
    warnings,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Export for use in assembly orchestrator
export { runMemoryEngine as generateMemoryConfig };

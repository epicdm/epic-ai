/**
 * Economics Defaults Engine (EDE v1)
 *
 * Generates cost/usage configuration based on channels and business requirements.
 * Pure function - no DB writes, orchestrator handles persistence.
 *
 * Input: channels + business_model + company_size + priority
 * Output: { config: EconomicsConfig, gaps: EconomicsGap[], evidence: EvidenceItem[], confidence: number }
 */

import type { AssemblyPhase } from '../../../processors/agent-os/assembly.orchestrator';

// ============================================================================
// Types
// ============================================================================

export type ChannelType = 'VOICE' | 'CHAT' | 'SMS' | 'EMAIL';
export type PriorityMode = 'cost' | 'quality' | 'balanced';
export type CompanySize = 'small' | 'medium' | 'large' | 'enterprise';

export interface EconomicsConfig {
  token_budget_per_conversation: number;
  cost_per_channel: Record<ChannelType, number>;
  max_retries: number;
  timeout_seconds: number;
  priority: PriorityMode;
  monthly_budget_limit?: number;
  conversations_per_day_limit?: number;
  model_selection: {
    default: string;
    fallback: string;
    complex_queries: string;
  };
  rate_limits: {
    requests_per_minute: number;
    tokens_per_minute: number;
  };
}

export interface EconomicsGap {
  gap_type: 'no_budget' | 'no_limits' | 'no_fallback' | 'incomplete';
  field_path: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  recommended_fix: string;
  source_phase: AssemblyPhase;
}

export interface EconomicsEvidence {
  field_path: string;
  source: string;
  reasoning: string;
}

export interface EconomicsInput {
  channels?: ChannelType[];
  business_model?: 'b2c' | 'b2b' | 'b2b2c' | 'saas' | 'marketplace';
  company_size?: CompanySize;
  priority?: PriorityMode;
  monthly_budget?: number;
  expected_daily_conversations?: number;
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface EconomicsResult {
  config: EconomicsConfig;
  gaps: EconomicsGap[];
  evidence: EconomicsEvidence[];
  confidence: number;
}

// ============================================================================
// Cost Configuration by Channel
// ============================================================================

// Cost per interaction in USD (approximate)
const BASE_CHANNEL_COSTS: Record<ChannelType, number> = {
  VOICE: 0.15, // Higher due to TTS/STT
  CHAT: 0.02, // Text only
  SMS: 0.05, // Carrier costs
  EMAIL: 0.01, // Lowest cost
};

// Token budgets by complexity
const TOKEN_BUDGETS: Record<string, number> = {
  simple: 2000,
  moderate: 4000,
  complex: 8000,
  enterprise: 12000,
};

// Timeouts by channel (seconds)
const CHANNEL_TIMEOUTS: Record<ChannelType, number> = {
  VOICE: 60, // Longer for speech
  CHAT: 30, // Standard
  SMS: 45, // Account for carrier delays
  EMAIL: 120, // Can be async
};

// Rate limits by company size
const RATE_LIMITS: Record<CompanySize, { requests_per_minute: number; tokens_per_minute: number }> = {
  small: { requests_per_minute: 20, tokens_per_minute: 40000 },
  medium: { requests_per_minute: 60, tokens_per_minute: 100000 },
  large: { requests_per_minute: 150, tokens_per_minute: 250000 },
  enterprise: { requests_per_minute: 500, tokens_per_minute: 500000 },
};

// Model selection by priority
const MODEL_SELECTION: Record<PriorityMode, { default: string; fallback: string; complex_queries: string }> = {
  cost: {
    default: 'gpt-4o-mini',
    fallback: 'gpt-3.5-turbo',
    complex_queries: 'gpt-4o',
  },
  quality: {
    default: 'gpt-4o',
    fallback: 'gpt-4o-mini',
    complex_queries: 'gpt-4o',
  },
  balanced: {
    default: 'gpt-4o-mini',
    fallback: 'gpt-3.5-turbo',
    complex_queries: 'gpt-4o',
  },
};

// ============================================================================
// Engine Implementation
// ============================================================================

/**
 * Generate economics configuration based on channels and business context
 * Pure function - no side effects
 */
export function runEconomicsDefaultsEngine(input: EconomicsInput): EconomicsResult {
  const {
    channels = ['CHAT'],
    business_model,
    company_size = 'medium',
    priority = 'balanced',
    monthly_budget,
    expected_daily_conversations,
    sales_complexity = 'moderate',
  } = input;

  const gaps: EconomicsGap[] = [];
  const evidence: EconomicsEvidence[] = [];

  // Calculate adjusted channel costs based on business model
  const costPerChannel: Record<ChannelType, number> = { ...BASE_CHANNEL_COSTS };

  // B2B typically has longer, more complex conversations
  if (business_model === 'b2b' || business_model === 'saas') {
    costPerChannel.CHAT *= 1.3;
    costPerChannel.VOICE *= 1.2;
    evidence.push({
      field_path: 'economics_config.cost_per_channel',
      source: 'business_model',
      reasoning: `Adjusted costs upward for ${business_model} (typically longer conversations)`,
    });
  }

  // Determine token budget based on complexity
  const tokenBudget = TOKEN_BUDGETS[sales_complexity] || TOKEN_BUDGETS.moderate;
  evidence.push({
    field_path: 'economics_config.token_budget_per_conversation',
    source: 'sales_complexity',
    reasoning: `Token budget of ${tokenBudget} based on ${sales_complexity} complexity`,
  });

  // Calculate timeout based on primary channel
  const primaryChannel = channels[0] || 'CHAT';
  const timeout = CHANNEL_TIMEOUTS[primaryChannel];
  evidence.push({
    field_path: 'economics_config.timeout_seconds',
    source: 'primary_channel',
    reasoning: `Timeout of ${timeout}s optimized for ${primaryChannel} channel`,
  });

  // Get rate limits based on company size
  const rateLimits = RATE_LIMITS[company_size];
  evidence.push({
    field_path: 'economics_config.rate_limits',
    source: 'company_size',
    reasoning: `Rate limits set for ${company_size} company: ${rateLimits.requests_per_minute} RPM`,
  });

  // Get model selection based on priority
  const modelSelection = MODEL_SELECTION[priority];
  evidence.push({
    field_path: 'economics_config.model_selection',
    source: 'priority',
    reasoning: `Model selection optimized for ${priority} priority: default=${modelSelection.default}`,
  });

  // Determine max retries based on channel reliability
  let maxRetries = 3;
  if (channels.includes('SMS')) {
    maxRetries = 4; // SMS can have delivery issues
  }
  if (priority === 'quality') {
    maxRetries = 5; // More retries for quality focus
  }

  // Build config
  const config: EconomicsConfig = {
    token_budget_per_conversation: tokenBudget,
    cost_per_channel: costPerChannel,
    max_retries: maxRetries,
    timeout_seconds: timeout,
    priority,
    monthly_budget_limit: monthly_budget,
    conversations_per_day_limit: expected_daily_conversations,
    model_selection: modelSelection,
    rate_limits: rateLimits,
  };

  // Identify gaps
  if (!monthly_budget) {
    gaps.push({
      gap_type: 'no_budget',
      field_path: 'economics_config.monthly_budget_limit',
      severity: 'low',
      impact: 'No cost ceiling defined - usage could exceed expectations',
      recommended_fix: 'Set a monthly budget limit to control costs',
      source_phase: 'economics',
    });
  }

  if (!expected_daily_conversations) {
    gaps.push({
      gap_type: 'no_limits',
      field_path: 'economics_config.conversations_per_day_limit',
      severity: 'low',
      impact: 'No daily conversation limit - difficult to predict costs',
      recommended_fix: 'Estimate expected daily conversations for better cost prediction',
      source_phase: 'economics',
    });
  }

  // Calculate confidence
  let confidence = 0.9; // Defaults are always valid base
  if (monthly_budget && expected_daily_conversations) {
    confidence = 0.95;
  } else if (channels.length > 0 && company_size) {
    confidence = 0.85;
  } else {
    confidence = 0.75;
  }

  // Estimate monthly cost if we have the data
  if (expected_daily_conversations) {
    const avgCostPerConversation = channels.reduce(
      (sum, ch) => sum + costPerChannel[ch],
      0
    ) / channels.length;
    const estimatedMonthlyCost = avgCostPerConversation * expected_daily_conversations * 30;

    evidence.push({
      field_path: 'economics_config',
      source: 'cost_estimation',
      reasoning: `Estimated monthly cost: $${estimatedMonthlyCost.toFixed(2)} (${expected_daily_conversations} conversations/day)`,
    });

    if (monthly_budget && estimatedMonthlyCost > monthly_budget) {
      gaps.push({
        gap_type: 'no_budget',
        field_path: 'economics_config.monthly_budget_limit',
        severity: 'high',
        impact: `Estimated costs ($${estimatedMonthlyCost.toFixed(2)}) exceed budget ($${monthly_budget})`,
        recommended_fix: 'Increase budget or reduce expected conversations or use cost-priority mode',
        source_phase: 'economics',
      });
      confidence = Math.min(confidence, 0.7);
    }
  }

  evidence.push({
    field_path: 'economics_config',
    source: 'economics_defaults_engine',
    reasoning: `Generated economics config with ${priority} priority, ${channels.length} channels, ${tokenBudget} token budget`,
  });

  return {
    config,
    gaps,
    evidence,
    confidence: Math.round(confidence * 100) / 100,
  };
}

// Alias for backward compatibility
export function getDefaultEconomicsConfig(channels: ChannelType[] = ['CHAT']): EconomicsConfig {
  const result = runEconomicsDefaultsEngine({ channels });
  return result.config;
}

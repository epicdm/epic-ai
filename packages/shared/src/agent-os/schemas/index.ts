/**
 * Agent OS Zod Schemas
 *
 * Runtime validation schemas for Agent OS types.
 *
 * @module agent-os/schemas
 */

import { z } from "zod";

// ============================================
// ROLE CARD SCHEMA
// ============================================

export const EscalationRuleSchema = z.object({
  trigger: z.string().min(1),
  action: z.enum(["transfer", "notify", "pause", "end"]),
  target: z.string().optional(),
  message: z.string().optional(),
});

export const RoleCardSchema = z.object({
  name: z.string().min(1).max(100),
  title: z.string().min(1).max(100),
  company: z.string().min(1).max(200),
  mission: z.string().max(500).optional(),
  boundaries: z.array(z.string()).default([]),
  escalation_rules: z.array(EscalationRuleSchema).default([]),
  context: z.string().max(2000).optional(),
});

// ============================================
// BRAIN CONFIG SCHEMA
// ============================================

export const DecisionPolicySchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  conditions: z.array(z.string()),
  action: z.string(),
  priority: z.number().int().min(0).max(100),
});

export const ResponseRuleSchema = z.object({
  name: z.string().min(1),
  when: z.string(),
  do: z.string(),
  examples: z.array(z.string()).optional(),
});

export const ContextHandlingSchema = z.object({
  conversation_window: z.number().int().min(1).max(100).default(10),
  summarize_long_conversations: z.boolean().default(true),
  track_entities: z.array(z.string()).default([]),
});

export const ReasoningStrategySchema = z.object({
  approach: z.enum(["chain_of_thought", "direct", "deliberative"]).default("direct"),
  show_reasoning: z.boolean().default(false),
  max_reasoning_steps: z.number().int().min(1).max(10).default(3),
});

export const FallbackBehaviorSchema = z.object({
  on_uncertainty: z.enum(["ask_clarification", "best_guess", "escalate"]).default("ask_clarification"),
  default_response: z.string().default("I'm not sure I understand. Could you please clarify?"),
  max_clarifications: z.number().int().min(1).max(5).default(3),
});

export const BrainConfigSchema = z.object({
  decision_policies: z.array(DecisionPolicySchema).default([]),
  response_rules: z.array(ResponseRuleSchema).default([]),
  context_handling: ContextHandlingSchema.default({}),
  reasoning_strategy: ReasoningStrategySchema.default({}),
  fallback_behavior: FallbackBehaviorSchema.default({}),
});

// ============================================
// PERSONALITY CONFIG SCHEMA
// ============================================

export const LanguageStyleSchema = z.object({
  complexity: z.enum(["simple", "moderate", "sophisticated"]).default("moderate"),
  sentence_length: z.enum(["short", "medium", "varied"]).default("medium"),
  use_contractions: z.boolean().default(true),
  use_jargon: z.boolean().default(false),
  locale: z.string().optional(),
});

export const PersonalityConfigSchema = z.object({
  voice_tone: z.enum([
    "professional",
    "friendly",
    "enthusiastic",
    "empathetic",
    "authoritative",
    "casual",
    "warm",
    "formal",
  ]).default("friendly"),
  formality: z.number().int().min(1).max(5).default(3),
  humor_level: z.number().int().min(0).max(5).default(1),
  empathy_level: z.number().int().min(1).max(5).default(4),
  pace: z.enum(["slow", "moderate", "fast"]).default("moderate"),
  language_style: LanguageStyleSchema.default({}),
  preferred_phrases: z.array(z.string()).default([]),
  avoided_phrases: z.array(z.string()).default([]),
  use_emojis: z.boolean().default(false),
  greeting_style: z.string().default("Hi! How can I help you today?"),
  signoff_style: z.string().default("Is there anything else I can help you with?"),
});

// ============================================
// TOOL CONFIG SCHEMA
// ============================================

export const ToolPermissionsSchema = z.object({
  read: z.boolean().default(true),
  write: z.boolean().default(false),
  delete: z.boolean().default(false),
  requires_confirmation: z.boolean().default(false),
});

export const ToolRateLimitsSchema = z.object({
  calls_per_minute: z.number().int().positive().optional(),
  calls_per_conversation: z.number().int().positive().optional(),
  calls_per_day: z.number().int().positive().optional(),
});

export const EnabledToolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  permissions: ToolPermissionsSchema.default({}),
  rate_limits: ToolRateLimitsSchema.optional(),
  config: z.record(z.unknown()).optional(),
});

export const ToolPoliciesSchema = z.object({
  confirm_sensitive_actions: z.boolean().default(true),
  max_tools_per_turn: z.number().int().min(1).max(10).default(3),
  log_all_usage: z.boolean().default(true),
});

export const ToolPreferencesSchema = z.object({
  preferred_tools: z.array(z.string()).default([]),
  strategy: z.enum(["minimal", "proactive", "balanced"]).default("balanced"),
});

export const ToolConfigSchema = z.object({
  enabled_tools: z.array(EnabledToolSchema).default([]),
  tool_policies: ToolPoliciesSchema.default({}),
  tool_preferences: ToolPreferencesSchema.default({}),
});

// ============================================
// KNOWLEDGE CONFIG SCHEMA
// ============================================

export const RetrievalSettingsSchema = z.object({
  top_k: z.number().int().min(1).max(20).default(5),
  similarity_threshold: z.number().min(0).max(1).default(0.7),
  rerank: z.boolean().default(false),
  rerank_model: z.string().optional(),
});

export const ContextWindowConfigSchema = z.object({
  max_knowledge_tokens: z.number().int().min(100).max(16000).default(4000),
  overflow_strategy: z.enum(["truncate", "summarize", "prioritize"]).default("truncate"),
});

export const KnowledgeSourceSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["knowledge_base", "website", "document", "api"]),
  name: z.string().min(1),
  priority: z.number().int().min(0).max(100).default(50),
});

export const QuickAnswerSchema = z.object({
  triggers: z.array(z.string().min(1)).min(1),
  answer: z.string().min(1),
  confidence_threshold: z.number().min(0).max(1).default(0.9),
});

export const KnowledgeConfigSchema = z.object({
  knowledge_bases: z.array(z.string()).default([]),
  retrieval_settings: RetrievalSettingsSchema.default({}),
  context_window: ContextWindowConfigSchema.default({}),
  sources: z.array(KnowledgeSourceSchema).default([]),
  quick_answers: z.array(QuickAnswerSchema).default([]),
});

// ============================================
// MEMORY CONFIG SCHEMA
// ============================================

export const ShortTermMemorySchema = z.object({
  enabled: z.boolean().default(true),
  window_size: z.number().int().min(1).max(50).default(10),
  include_system: z.boolean().default(false),
});

export const LongTermMemorySchema = z.object({
  enabled: z.boolean().default(false),
  summary_strategy: z.enum(["daily", "per_conversation", "rolling"]).default("per_conversation"),
  max_summaries: z.number().int().min(1).max(1000).default(100),
  extract_entities: z.array(z.string()).default(["name", "email", "phone"]),
});

export const EpisodicMemorySchema = z.object({
  enabled: z.boolean().default(false),
  store_interactions: z.boolean().default(true),
  store_outcomes: z.boolean().default(true),
  retention_days: z.number().int().min(1).max(365).default(30),
});

export const MemoryPersistenceSchema = z.object({
  storage: z.enum(["database", "vector_store", "both"]).default("database"),
  encrypt: z.boolean().default(true),
  auto_cleanup: z.boolean().default(true),
});

export const MemoryConfigSchema = z.object({
  short_term: ShortTermMemorySchema.default({}),
  long_term: LongTermMemorySchema.default({}),
  episodic: EpisodicMemorySchema.default({}),
  persistence: MemoryPersistenceSchema.default({}),
});

// ============================================
// LEARNING CONFIG SCHEMA
// ============================================

export const FeedbackLoopConfigSchema = z.object({
  explicit_feedback: z.boolean().default(true),
  implicit_signals: z.boolean().default(false),
  outcome_learning: z.boolean().default(false),
  min_samples: z.number().int().min(1).max(1000).default(10),
});

export const SafeLearningBoundariesSchema = z.object({
  max_confidence_delta: z.number().min(0).max(1).default(0.1),
  protected_categories: z.array(z.string()).default(["governance", "compliance"]),
  review_threshold: z.number().min(0).max(1).default(0.3),
  auto_rollback: z.boolean().default(true),
});

export const LearningConfigSchema = z.object({
  learning_enabled: z.boolean().default(false),
  feedback_loops: FeedbackLoopConfigSchema.default({}),
  safe_boundaries: SafeLearningBoundariesSchema.default({}),
  approval_required: z.boolean().default(true),
  approvers: z.array(z.string()).default([]),
});

// ============================================
// GOVERNANCE CONFIG SCHEMA
// ============================================

/**
 * Template key enum - matches AgentTypeSchema values
 * Used for storing template selection in governance_config
 */
export const TemplateKeySchema = z.enum([
  "sales_qualifier",
  "appointment_setter",
  "customer_support",
  "lead_capture",
  "booking_assistant",
  "faq_bot",
  "onboarding_guide",
  "product_recommender",
]);

export type TemplateKey = z.infer<typeof TemplateKeySchema>;

export const ComplianceRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(["block", "warn", "log"]),
  pattern: z.string().optional(),
  action: z.string(),
});

export const RiskThresholdsSchema = z.object({
  low_confidence: z.number().min(0).max(1).default(0.6),
  high_sensitivity: z.number().min(0).max(1).default(0.8),
  sensitive_topics: z.array(z.string()).default(["legal", "medical", "financial"]),
});

export const AuditSettingsSchema = z.object({
  log_conversations: z.boolean().default(true),
  log_tool_usage: z.boolean().default(true),
  log_decisions: z.boolean().default(false),
  retention_days: z.number().int().min(1).max(2555).default(90),
});

export const EscalationPathSchema = z.object({
  trigger: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  notify: z.array(z.string()).default([]),
  action: z.enum(["continue", "pause", "stop"]).default("continue"),
});

export const PIIHandlingSchema = z.object({
  auto_detect: z.boolean().default(true),
  action: z.enum(["mask", "remove", "flag", "allow"]).default("mask"),
  types: z.array(z.string()).default(["email", "phone", "ssn", "credit_card"]),
  log_detections: z.boolean().default(true),
});

export const ContentModerationSchema = z.object({
  enabled: z.boolean().default(true),
  categories: z.array(z.string()).default(["hate", "violence", "sexual", "self_harm"]),
  action: z.enum(["block", "warn", "log"]).default("block"),
});

export const HandoffTargetSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  // Asterisk dialplan jump target
  context: z.string().min(1),
  exten: z.string().min(1).default("1"),
  priority: z.number().int().min(1).default(1),
  // Optional routing metadata (future)
  enabled: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

export const HandoffConfigSchema = z.object({
  enabled: z.boolean().default(true),
  default_handoff_target_id: z.string().min(1).optional(),
  handoff_targets: z.array(HandoffTargetSchema).default([]),
});

export const
export const GovernanceConfigSchema = z.object({
  /**
   * Template key persisted in governance_config.
   * This is the source of truth for which template is selected.
   */
  template_key: TemplateKeySchema.optional(),
  compliance_rules: z.array(ComplianceRuleSchema).default([]),
  risk_thresholds: RiskThresholdsSchema.default({}),
  audit_settings: AuditSettingsSchema.default({}),
  escalation_paths: z.array(EscalationPathSchema).default([]),
  pii_handling: PIIHandlingSchema.default({}),
  content_moderation: ContentModerationSchema.default({}),
  // Handoff configuration for call transfers to human agents
  handoff: HandoffConfigSchema.default({}),
});;

// ============================================
// ECONOMICS CONFIG SCHEMA
// ============================================

export const BudgetLimitsSchema = z.object({
  daily_cents: z.number().int().positive().optional(),
  monthly_cents: z.number().int().positive().optional(),
  per_conversation_cents: z.number().int().positive().optional(),
  on_exceed: z.enum(["block", "warn", "notify"]).default("warn"),
});

export const CostTrackingSchema = z.object({
  track_tokens: z.boolean().default(true),
  track_tools: z.boolean().default(true),
  track_voice: z.boolean().default(true),
  track_retrieval: z.boolean().default(false),
});

export const UsageCapsSchema = z.object({
  conversations_per_day: z.number().int().positive().optional(),
  messages_per_conversation: z.number().int().positive().optional(),
  tokens_per_conversation: z.number().int().positive().optional(),
  voice_minutes_per_day: z.number().int().positive().optional(),
});

export const BillingRulesSchema = z.object({
  payer: z.enum(["organization", "end_user", "split"]).default("organization"),
  rate_multiplier: z.number().min(0).max(10).default(1),
  minimum_charge_cents: z.number().int().min(0).default(0),
});

export const TierOverridesSchema = z.object({
  by_plan: z.record(z.any()).default({}),
});

export const EconomicsConfigSchema = z.object({
  budget_limits: BudgetLimitsSchema.default({}),
  cost_tracking: CostTrackingSchema.default({}),
  usage_caps: UsageCapsSchema.default({}),
  billing_rules: BillingRulesSchema.default({}),
  tier_overrides: TierOverridesSchema.default({}),
});

// ============================================
// FLOW CONFIG SCHEMA
// ============================================

export const FlowNodeTypeSchema = z.enum([
  "greeting",
  "intake",
  "qualify",
  "triage",
  "answer",
  "recommend",
  "book",
  "capture",
  "handoff",
  "followup",
  "close",
  "fallback",
  "error",
]);

export const FlowNodeSchema = z.object({
  id: z.string().min(1),
  type: FlowNodeTypeSchema,
  title: z.string().min(1),
  instructions: z.string(),
  required_fields: z.array(z.string()).optional(),
  max_turns: z.number().int().positive().optional(),
});

export const FlowEdgeConditionSchema = z.object({
  intent: z.string().optional(),
  condition: z.string().optional(),
});

export const FlowEdgeSchema = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  when: FlowEdgeConditionSchema,
  priority: z.number().int().min(0).default(0),
});

export const FlowIntentSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
  examples: z.array(z.string()).default([]),
});

export const ToolHookEventSchema = z.enum(["on_enter", "on_exit", "on_collect", "on_confirm"]);

export const ToolHookTriggerSchema = z.object({
  node_id: z.string().min(1),
  event: ToolHookEventSchema,
});

export const ToolHookSchema = z.object({
  id: z.string().min(1),
  tool_id: z.string().min(1),
  when: ToolHookTriggerSchema,
  input_mapping: z.record(z.string(), z.string()).default({}),
  output_mapping: z.record(z.string(), z.string()).optional(),
  requires_confirmation: z.boolean().optional(),
});

export const FlowEscalationConfigSchema = z.object({
  on_user_requests_human: z.boolean().default(true),
  on_high_stakes_topics: z.boolean().default(true),
  on_low_confidence: z.boolean().default(false),
});

export const FlowFallbackConfigSchema = z.object({
  max_clarifications: z.number().int().min(1).max(10).default(3),
  fallback_node_id: z.string().min(1).default("fallback"),
});

export const FlowGuardrailsSchema = z.object({
  escalation: FlowEscalationConfigSchema.default({}),
  fallback: FlowFallbackConfigSchema.default({}),
});

export const FlowConfigSchema = z.object({
  version: z.literal("v1").default("v1"),
  templateKey: z.string().min(1).optional(),
  entry_node_id: z.string().min(1).default("greeting"),
  exit_node_ids: z.array(z.string()).default(["close"]),
  nodes: z.array(FlowNodeSchema).default([]),
  edges: z.array(FlowEdgeSchema).default([]),
  intents: z.array(FlowIntentSchema).default([]),
  tool_hooks: z.array(ToolHookSchema).default([]),
  guardrails: FlowGuardrailsSchema.default({}),
});

// ============================================
// COMBINED AGENT CONFIG SCHEMA
// ============================================

export const AgentConfigSchema = z.object({
  role_card: RoleCardSchema,
  brain_config: BrainConfigSchema,
  personality_config: PersonalityConfigSchema,
  tool_config: ToolConfigSchema,
  knowledge_config: KnowledgeConfigSchema,
  memory_config: MemoryConfigSchema,
  learning_config: LearningConfigSchema,
  governance_config: GovernanceConfigSchema,
  economics_config: EconomicsConfigSchema,
  flow_config: FlowConfigSchema,
});

// ============================================
// API REQUEST SCHEMAS
// ============================================

export const CreateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  templateId: z.string().optional(),
  channels: z.array(z.enum(["VOICE", "CHAT", "SMS", "EMAIL"])).default(["VOICE"]),
});

export const UpdateAgentRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  channels: z.array(z.enum(["VOICE", "CHAT", "SMS", "EMAIL"])).optional(),
  status: z.enum(["DRAFT", "TESTING", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "ARCHIVED"]).optional(),
});

export const CreateCompanyProfileRequestSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  companySize: z.enum(["startup", "smb", "mid-market", "enterprise"]).optional(),
  mission: z.string().max(500).optional(),
  values: z.array(z.string()).default([]),
});

export const CreateSimulationRequestSchema = z.object({
  agentId: z.string().min(1),
  name: z.string().min(1).max(100),
  scenario: z.string().min(1).max(2000),
  testInputs: z.array(z.object({
    type: z.enum(["message", "call"]),
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional(),
  })).min(1),
});

// ============================================
// RESPONSE ENVELOPE SCHEMAS
// ============================================

// Import and re-export common schemas (extracted to avoid circular imports)
import {
  GapItemSchema as _GapItemSchema,
  WarningItemSchema as _WarningItemSchema,
  ConfidenceMapSchema as _ConfidenceMapSchema,
} from "./common";

// Re-export for consumers
export const GapItemSchema = _GapItemSchema;
export const WarningItemSchema = _WarningItemSchema;
export const ConfidenceMapSchema = _ConfidenceMapSchema;

/**
 * API error schema
 */
export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

// ============================================
// EVIDENCE & PROMPT ENVELOPE SCHEMAS
// ============================================

/**
 * Evidence item schema - tracks sources and reasoning for AI inferences
 * Used for transparency and audit trail of AI decisions
 */
export const EvidenceItemSchema = z.object({
  source_type: z.enum([
    "website_scrape",
    "manual_input",
    "api_response",
    "document",
    "inference",
    "default_value",
  ]),
  source_url: z.string().optional(),
  extracted_text: z.string().max(2000).optional(),
  field_path: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(500).optional(),
  timestamp: z.string().datetime().optional(),
});

/**
 * Evidence schema - collection of evidence items for a response
 */
export const EvidenceSchema = z.array(EvidenceItemSchema);

/**
 * Prompt envelope schema - wraps AI prompts with context and tracking
 * Ensures all AI calls have proper context, evidence tracking, and governance
 */
export const PromptEnvelopeSchema = z.object({
  // Core prompt content
  system_prompt: z.string().min(1),
  user_prompt: z.string().min(1),

  // Context for the AI
  context: z.object({
    agent_id: z.string().optional(),
    company_profile_id: z.string().optional(),
    job_id: z.string().optional(),
    session_id: z.string().optional(),
  }).strict(),

  // Input evidence - what data was used
  input_evidence: EvidenceSchema.default([]),

  // Expected output format
  expected_output_schema: z.string().optional(),

  // Governance constraints
  governance: z.object({
    pii_allowed: z.boolean().default(false),
    max_tokens: z.number().int().positive().optional(),
    temperature: z.number().min(0).max(2).default(0.7),
    model: z.string().default("gpt-4o"),
  }).strict().default({}),

  // Tracking
  created_at: z.string().datetime().optional(),
  request_id: z.string().optional(),
}).strict();

/**
 * Prompt response envelope - wraps AI responses with confidence and evidence
 */
export const PromptResponseEnvelopeSchema = z.object({
  // The actual response content
  content: z.unknown(),

  // Confidence in the response
  confidence: ConfidenceMapSchema,

  // Evidence for assertions made
  evidence: EvidenceSchema.default([]),

  // Gaps identified during processing
  gaps: z.array(GapItemSchema).default([]),

  // Warnings about the response
  warnings: z.array(WarningItemSchema).default([]),

  // Processing metadata
  metadata: z.object({
    model: z.string(),
    tokens_used: z.number().int().positive().optional(),
    processing_time_ms: z.number().int().positive().optional(),
    request_id: z.string().optional(),
  }).strict().optional(),
}).strict();

/**
 * API response envelope schema factory
 * Creates a typed response schema for any data type
 */
export function createApiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.nullable(),
    confidence: ConfidenceMapSchema.optional(),
    gaps: z.array(GapItemSchema).optional(),
    warnings: z.array(WarningItemSchema).optional(),
    error: ApiErrorSchema.optional(),
  });
}

/**
 * Generic API response schema (when data type is unknown)
 */
export const ApiResponseSchema = z.object({
  data: z.unknown().nullable(),
  confidence: ConfidenceMapSchema.optional(),
  gaps: z.array(GapItemSchema).optional(),
  warnings: z.array(WarningItemSchema).optional(),
  error: ApiErrorSchema.optional(),
});

// ============================================
// STRICT CONFIG SCHEMAS (for PATCH validation)
// ============================================

/**
 * Strict versions reject unknown keys
 * Use these for PATCH endpoint validation
 */
export const RoleCardSchemaStrict = RoleCardSchema.strict();
export const BrainConfigSchemaStrict = BrainConfigSchema.strict();
export const PersonalityConfigSchemaStrict = PersonalityConfigSchema.strict();
export const ToolConfigSchemaStrict = ToolConfigSchema.strict();
export const KnowledgeConfigSchemaStrict = KnowledgeConfigSchema.strict();
export const MemoryConfigSchemaStrict = MemoryConfigSchema.strict();
export const LearningConfigSchemaStrict = LearningConfigSchema.strict();
export const GovernanceConfigSchemaStrict = GovernanceConfigSchema.strict();
export const EconomicsConfigSchemaStrict = EconomicsConfigSchema.strict();
export const FlowConfigSchemaStrict = FlowConfigSchema.strict();

/**
 * Map of module names to their strict schemas
 */
export const StrictConfigSchemas = {
  roleCard: RoleCardSchemaStrict,
  brainConfig: BrainConfigSchemaStrict,
  personalityConfig: PersonalityConfigSchemaStrict,
  toolConfig: ToolConfigSchemaStrict,
  knowledgeConfig: KnowledgeConfigSchemaStrict,
  memoryConfig: MemoryConfigSchemaStrict,
  learningConfig: LearningConfigSchemaStrict,
  governanceConfig: GovernanceConfigSchemaStrict,
  economicsConfig: EconomicsConfigSchemaStrict,
  flowConfig: FlowConfigSchemaStrict,
} as const;

// ============================================
// ENRICHMENT JOB SCHEMAS
// ============================================

/**
 * Manual answers provided during enrichment
 * These fill gaps that can't be scraped from website
 */
export const EnrichmentManualAnswersSchema = z.object({
  // Business hours
  hours_of_operation: z.string().max(500).optional(),
  timezone: z.string().max(50).optional(),

  // Service area
  service_area: z.string().max(500).optional(),
  service_radius_miles: z.number().int().positive().optional(),
  serves_nationwide: z.boolean().optional(),

  // Pricing
  pricing_model: z.enum(["fixed", "hourly", "subscription", "custom", "contact"]).optional(),
  price_range: z.string().max(200).optional(),
  free_consultation: z.boolean().optional(),

  // Contact preferences
  preferred_contact_method: z.enum(["phone", "email", "form", "chat"]).optional(),
  response_time_hours: z.number().int().positive().optional(),

  // Additional context
  unique_selling_points: z.array(z.string()).optional(),
  target_audience_description: z.string().max(1000).optional(),
});

/**
 * Request schema for company enrichment
 */
export const EnrichCompanyRequestSchema = z.object({
  website_url: z.string().url(),
  manual_answers: EnrichmentManualAnswersSchema.optional(),
});

/**
 * Brand voice profile derived from website analysis
 */
export const BrandVoiceProfileSchema = z.object({
  // Detected tone characteristics
  detected_tone: z.enum([
    "professional",
    "friendly",
    "enthusiastic",
    "empathetic",
    "authoritative",
    "casual",
    "warm",
    "formal",
  ]).optional(),
  formality_level: z.number().int().min(1).max(5).optional(),

  // Language patterns
  uses_first_person: z.boolean().optional(),
  uses_technical_jargon: z.boolean().optional(),
  uses_emojis: z.boolean().optional(),

  // Communication style
  sentence_complexity: z.enum(["simple", "moderate", "complex"]).optional(),
  call_to_action_style: z.string().max(200).optional(),

  // Sample phrases extracted
  sample_phrases: z.array(z.string()).default([]),
  avoided_words: z.array(z.string()).default([]),

  // Confidence in detection
  detection_confidence: z.number().min(0).max(1).default(0),
});

/**
 * Enriched company profile data
 */
export const EnrichedCompanyDataSchema = z.object({
  // Basic info extracted
  name: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),

  // Business details
  industry: z.string().optional(),
  founded_year: z.number().int().optional(),
  headquarters: z.string().optional(),

  // Products/Services extracted
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
  services: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
  })).default([]),

  // Contact info extracted
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Social links extracted
  social_links: z.object({
    linkedin: z.string().url().optional(),
    twitter: z.string().url().optional(),
    facebook: z.string().url().optional(),
    instagram: z.string().url().optional(),
    youtube: z.string().url().optional(),
  }).default({}),

  // Manual answers merged in
  hours_of_operation: z.string().optional(),
  service_area: z.string().optional(),
  pricing_model: z.string().optional(),
  price_range: z.string().optional(),
});

/**
 * Complete enrichment result envelope
 */
export const EnrichmentResultSchema = z.object({
  company_profile: EnrichedCompanyDataSchema,
  brand_voice_profile: BrandVoiceProfileSchema,

  // Evidence tracking for AI governance
  evidence: EvidenceSchema.default([]),
  confidence: ConfidenceMapSchema.default({}),
  gaps: z.array(GapItemSchema).default([]),

  // Metadata
  source_url: z.string().url(),
  scraped_at: z.string().datetime(),
  scrape_success: z.boolean(),
  pages_analyzed: z.number().int().min(0).default(1),

  // Raw extracted text (for debugging/transparency)
  raw_text_excerpt: z.string().max(2000).optional(),
});

// Type exports for request schemas only
// Note: GapItem, WarningItem, ConfidenceMap, ApiError types are defined in ../types
// to avoid duplication. The Zod schemas here are for runtime validation.
export type CreateAgentRequest = z.infer<typeof CreateAgentRequestSchema>;
export type UpdateAgentRequest = z.infer<typeof UpdateAgentRequestSchema>;
export type CreateCompanyProfileRequest = z.infer<typeof CreateCompanyProfileRequestSchema>;
export type CreateSimulationRequest = z.infer<typeof CreateSimulationRequestSchema>;
export type EnrichmentManualAnswers = z.infer<typeof EnrichmentManualAnswersSchema>;
export type EnrichCompanyRequest = z.infer<typeof EnrichCompanyRequestSchema>;
export type BrandVoiceProfile = z.infer<typeof BrandVoiceProfileSchema>;
export type EnrichedCompanyData = z.infer<typeof EnrichedCompanyDataSchema>;
export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;
// Note: EvidenceItem, PromptRequestEnvelope, and PromptEnvelope types
// are defined in ../types/index.ts to avoid duplication.
// Use the Zod schemas (EvidenceItemSchema, PromptEnvelopeSchema, etc.)
// for runtime validation.

// ============================================
// ASSEMBLY ORCHESTRATOR SCHEMAS
// ============================================

/**
 * Agent type schema - defines the type of agent to create
 */
export const AgentTypeSchema = z.enum([
  "sales_qualifier",
  "appointment_setter",
  "customer_support",
  "lead_capture",
  "booking_assistant",
  "faq_bot",
  "onboarding_guide",
  "product_recommender",
]);

/**
 * Channel type schema - defines communication channels
 */
export const ChannelTypeSchema = z.enum(["VOICE", "CHAT", "SMS", "EMAIL"]);

/**
 * Request schema for agent assembly
 * Triggers the full assembly orchestrator pipeline
 *
 * Behavior:
 * - If agentId is not provided: creates a new DRAFT agent
 * - If agentId is provided with a DRAFT agent: assembles into existing agent
 * - If agentId is provided with a PUBLISHED/ARCHIVED agent: returns error (immutable)
 */
export const AssembleAgentRequestSchema = z.object({
  // Optional existing agent ID - if provided, assembles into existing DRAFT agent
  // If omitted, creates a new agent
  agentId: z.string().optional(),

  // Optional company profile ID - if not provided, uses org's default
  companyId: z.string().optional(),

  // Website URL for enrichment - if provided, runs enrichment phase
  websiteUrl: z.string().url().optional(),

  // User-provided answers to fill gaps
  userAnswers: z.record(z.string(), z.string()).optional(),

  // Desired template/agent type - if not provided, AI recommends one
  desiredTemplateKey: AgentTypeSchema.nullable().optional(),

  // Target channels for the agent
  channels: z.array(ChannelTypeSchema).default(["VOICE"]),

  // Force re-assembly even if company already enriched
  force: z.boolean().default(false),

  // Optional agent name (used when creating new agent)
  name: z.string().min(1).max(100).optional(),

  // Optional agent slug (used when creating new agent)
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

/**
 * Assembly phase enum for tracking progress
 */
export const AssemblyPhaseSchema = z.enum([
  "enrichment",
  "template",
  "tools",
  "flow",
  "personality",
  "knowledge",
  "governance",
  "economics",
]);

/**
 * Assembly state schema for checkpointing
 */
export const AssemblyStateSchema = z.object({
  phase: AssemblyPhaseSchema,
  completed: z.array(AssemblyPhaseSchema),
  error: z.string().nullable().optional(),
  last_success_at: z.string().datetime().nullable().optional(),
});

/**
 * Assembly evidence schema
 */
export const AssemblyEvidenceSchema = z.object({
  source_phase: z.string(),
  field_path: z.string(),
  source: z.string(),
  reasoning: z.string().optional(),
  quote: z.string().optional(),
});

/**
 * Assembly gap schema
 */
export const AssemblyGapSchema = z.object({
  source_phase: z.string(),
  gap_type: z.string(),
  field_path: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  impact: z.string(),
  recommended_fix: z.string(),
});

/**
 * Assembly warning schema
 */
export const AssemblyWarningSchema = z.object({
  source_phase: z.string(),
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
});

/**
 * Audit log entry schema
 */
export const AuditLogEntrySchema = z.object({
  timestamp: z.string(),
  phase: z.string(),
  action: z.string(),
  details: z.record(z.unknown()).optional(),
  duration_ms: z.number().optional(),
});

/**
 * Wizard snapshot schema - captures all assembly outputs
 */
export const WizardSnapshotSchema = z.object({
  company_profile: z.record(z.unknown()).nullable().optional(),
  brand_voice_profile: z.record(z.unknown()).nullable().optional(),
  selected_template: z.record(z.unknown()).nullable().optional(),
  tools: z.record(z.unknown()).nullable().optional(),
  flows: z.record(z.unknown()).nullable().optional(),
  personality: z.record(z.unknown()).nullable().optional(),
  knowledge: z.record(z.unknown()).nullable().optional(),
  memory: z.record(z.unknown()).nullable().optional(),
  learning: z.record(z.unknown()).nullable().optional(),
  governance: z.record(z.unknown()).nullable().optional(),
  economics: z.record(z.unknown()).nullable().optional(),
});

/**
 * Assembly result schema - returned from the orchestrator
 */
export const AssemblyResultSchema = z.object({
  status: z.enum(["draft", "complete", "failed"]),
  agentId: z.string(),
  assembly_state: AssemblyStateSchema,
  confidence: z.object({
    overall: z.number().min(0).max(1),
    by_phase: z.record(z.string(), z.number()),
    by_dimension: z.record(z.string(), z.number()),
  }),
  gaps: z.array(AssemblyGapSchema),
  warnings: z.array(AssemblyWarningSchema),
  evidence: z.array(AssemblyEvidenceSchema),
  audit_log: z.array(AuditLogEntrySchema),
  wizard_snapshot: WizardSnapshotSchema,
});

// Type exports for assembly schemas
export type AgentType = z.infer<typeof AgentTypeSchema>;
export type AssembleAgentRequest = z.infer<typeof AssembleAgentRequestSchema>;
export type AssemblyPhase = z.infer<typeof AssemblyPhaseSchema>;
export type AssemblyState = z.infer<typeof AssemblyStateSchema>;
export type AssemblyEvidence = z.infer<typeof AssemblyEvidenceSchema>;
export type AssemblyGap = z.infer<typeof AssemblyGapSchema>;
export type AssemblyWarning = z.infer<typeof AssemblyWarningSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
export type WizardSnapshot = z.infer<typeof WizardSnapshotSchema>;
export type AssemblyResult = z.infer<typeof AssemblyResultSchema>;

// ============================================
// NEXT-STEP EXPLAIN SCHEMAS
// ============================================

export * from "./next-step";

// ============================================
// AUTO-FILL NEXT-STEP SCHEMAS
// ============================================

export * from "./auto-fill-next-step";

// ============================================
// QUESTION FORMAT V1 SCHEMAS
// ============================================

export * from "./questions";

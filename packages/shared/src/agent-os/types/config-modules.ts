/**
 * Agent OS Configuration Module Types
 *
 * These types define the 10 configuration blobs that make up an Agent's brain.
 * Each module can be patched independently via PATCH /agents/:id/{module}
 *
 * @module agent-os/types/config-modules
 */

// ============================================
// 1. ROLE CARD - Who the agent is
// ============================================

export interface RoleCard {
  /** Agent's display name */
  name: string;
  /** Job title or role (e.g., "Sales Representative") */
  title: string;
  /** Company the agent represents */
  company: string;
  /** Agent's mission statement */
  mission?: string;
  /** What the agent is NOT allowed to do */
  boundaries: string[];
  /** When and how to escalate to humans */
  escalation_rules: EscalationRule[];
  /** Additional context about the role */
  context?: string;
}

export interface EscalationRule {
  trigger: string;
  action: "transfer" | "notify" | "pause" | "end";
  target?: string; // Phone number, email, or department
  message?: string;
}

// ============================================
// 2. BRAIN CONFIG - How the agent thinks
// ============================================

export interface BrainConfig {
  /** Decision-making policies */
  decision_policies: DecisionPolicy[];
  /** Rules for generating responses */
  response_rules: ResponseRule[];
  /** How to handle context and conversation state */
  context_handling: ContextHandling;
  /** Reasoning strategy preferences */
  reasoning_strategy: ReasoningStrategy;
  /** Fallback behaviors when uncertain */
  fallback_behavior: FallbackBehavior;
}

export interface DecisionPolicy {
  name: string;
  description: string;
  conditions: string[];
  action: string;
  priority: number;
}

export interface ResponseRule {
  name: string;
  when: string;
  do: string;
  examples?: string[];
}

export interface ContextHandling {
  /** How many turns to keep in short-term memory */
  conversation_window: number;
  /** Whether to summarize long conversations */
  summarize_long_conversations: boolean;
  /** Key information to always track */
  track_entities: string[];
}

export interface ReasoningStrategy {
  /** Primary reasoning approach */
  approach: "chain_of_thought" | "direct" | "deliberative";
  /** Whether to explain reasoning to user */
  show_reasoning: boolean;
  /** Maximum reasoning steps before answering */
  max_reasoning_steps: number;
}

export interface FallbackBehavior {
  /** What to do when uncertain */
  on_uncertainty: "ask_clarification" | "best_guess" | "escalate";
  /** Default response when completely stuck */
  default_response: string;
  /** Maximum clarification attempts before escalating */
  max_clarifications: number;
}

// ============================================
// 3. PERSONALITY CONFIG - How the agent communicates
// ============================================

export interface PersonalityConfig {
  /** Overall voice tone */
  voice_tone: VoiceTone;
  /** Formality level (1-5, 1=very casual, 5=very formal) */
  formality: number;
  /** Humor level (0-5, 0=none, 5=very playful) */
  humor_level: number;
  /** Empathy level (1-5) */
  empathy_level: number;
  /** Speaking pace */
  pace: "slow" | "moderate" | "fast";
  /** Language style preferences */
  language_style: LanguageStyle;
  /** Words/phrases to use often */
  preferred_phrases: string[];
  /** Words/phrases to avoid */
  avoided_phrases: string[];
  /** Whether to use emojis (for text channels) */
  use_emojis: boolean;
  /** Greeting style */
  greeting_style: string;
  /** Sign-off style */
  signoff_style: string;
}

export type VoiceTone =
  | "professional"
  | "friendly"
  | "enthusiastic"
  | "empathetic"
  | "authoritative"
  | "casual"
  | "warm"
  | "formal";

export interface LanguageStyle {
  /** Vocabulary complexity */
  complexity: "simple" | "moderate" | "sophisticated";
  /** Sentence length preference */
  sentence_length: "short" | "medium" | "varied";
  /** Whether to use contractions */
  use_contractions: boolean;
  /** Whether to use industry jargon */
  use_jargon: boolean;
  /** Regional language variant */
  locale?: string;
}

// ============================================
// 4. TOOL CONFIG - What the agent can do
// ============================================

export interface ToolConfig {
  /** List of enabled tools */
  enabled_tools: EnabledTool[];
  /** Global tool policies */
  tool_policies: ToolPolicies;
  /** Tool usage preferences */
  tool_preferences: ToolPreferences;
}

export interface EnabledTool {
  /** Tool ID */
  id: string;
  /** Tool name */
  name: string;
  /** Whether tool is active */
  enabled: boolean;
  /** Permissions for this tool */
  permissions: ToolPermissions;
  /** Rate limits for this tool */
  rate_limits?: ToolRateLimits;
  /** Custom configuration */
  config?: Record<string, unknown>;
}

export interface ToolPermissions {
  /** Can read data */
  read: boolean;
  /** Can write/modify data */
  write: boolean;
  /** Can delete data */
  delete: boolean;
  /** Requires confirmation before use */
  requires_confirmation: boolean;
}

export interface ToolRateLimits {
  /** Max calls per minute */
  calls_per_minute?: number;
  /** Max calls per conversation */
  calls_per_conversation?: number;
  /** Max calls per day */
  calls_per_day?: number;
}

export interface ToolPolicies {
  /** Whether to confirm sensitive actions */
  confirm_sensitive_actions: boolean;
  /** Maximum tools to use in single turn */
  max_tools_per_turn: number;
  /** Whether to log all tool usage */
  log_all_usage: boolean;
}

export interface ToolPreferences {
  /** Preferred tool when multiple can accomplish task */
  preferred_tools: string[];
  /** Tool usage strategy */
  strategy: "minimal" | "proactive" | "balanced";
}

// ============================================
// 5. KNOWLEDGE CONFIG - What the agent knows
// ============================================

export interface KnowledgeConfig {
  /** Connected knowledge base IDs */
  knowledge_bases: string[];
  /** Retrieval settings */
  retrieval_settings: RetrievalSettings;
  /** Context window management */
  context_window: ContextWindowConfig;
  /** Additional knowledge sources */
  sources: KnowledgeSource[];
  /** FAQ/quick answers */
  quick_answers: QuickAnswer[];
}

export interface RetrievalSettings {
  /** Number of chunks to retrieve */
  top_k: number;
  /** Minimum similarity threshold */
  similarity_threshold: number;
  /** Whether to rerank results */
  rerank: boolean;
  /** Reranking model if enabled */
  rerank_model?: string;
}

export interface ContextWindowConfig {
  /** Max tokens for knowledge context */
  max_knowledge_tokens: number;
  /** How to handle overflow */
  overflow_strategy: "truncate" | "summarize" | "prioritize";
}

export interface KnowledgeSource {
  id: string;
  type: "knowledge_base" | "website" | "document" | "api";
  name: string;
  priority: number;
}

export interface QuickAnswer {
  /** Question patterns that trigger this answer */
  triggers: string[];
  /** The answer to provide */
  answer: string;
  /** Confidence threshold to use this answer */
  confidence_threshold: number;
}

// ============================================
// 6. MEMORY CONFIG - What the agent remembers
// ============================================

export interface MemoryConfig {
  /** Short-term (conversation) memory settings */
  short_term: ShortTermMemory;
  /** Long-term memory settings */
  long_term: LongTermMemory;
  /** Episodic memory settings */
  episodic: EpisodicMemory;
  /** Memory persistence settings */
  persistence: MemoryPersistence;
}

export interface ShortTermMemory {
  /** Enabled */
  enabled: boolean;
  /** Number of turns to keep */
  window_size: number;
  /** Whether to include system messages */
  include_system: boolean;
}

export interface LongTermMemory {
  /** Enabled */
  enabled: boolean;
  /** Summarization strategy */
  summary_strategy: "daily" | "per_conversation" | "rolling";
  /** Max stored summaries */
  max_summaries: number;
  /** What to extract for long-term storage */
  extract_entities: string[];
}

export interface EpisodicMemory {
  /** Enabled */
  enabled: boolean;
  /** Store individual interactions */
  store_interactions: boolean;
  /** Store outcomes/results */
  store_outcomes: boolean;
  /** Retention period in days */
  retention_days: number;
}

export interface MemoryPersistence {
  /** Where to store memories */
  storage: "database" | "vector_store" | "both";
  /** Whether to encrypt stored memories */
  encrypt: boolean;
  /** Auto-cleanup old memories */
  auto_cleanup: boolean;
}

// ============================================
// 7. LEARNING CONFIG - How the agent improves
// ============================================

export interface LearningConfig {
  /** Whether learning is enabled */
  learning_enabled: boolean;
  /** Feedback loop settings */
  feedback_loops: FeedbackLoopConfig;
  /** Safe learning boundaries */
  safe_boundaries: SafeLearningBoundaries;
  /** Whether changes require approval */
  approval_required: boolean;
  /** Who can approve changes */
  approvers: string[];
}

export interface FeedbackLoopConfig {
  /** Learn from explicit feedback */
  explicit_feedback: boolean;
  /** Learn from implicit signals (engagement, etc.) */
  implicit_signals: boolean;
  /** Learn from conversation outcomes */
  outcome_learning: boolean;
  /** Minimum samples before updating */
  min_samples: number;
}

export interface SafeLearningBoundaries {
  /** Maximum confidence change per update */
  max_confidence_delta: number;
  /** Categories that cannot be modified by learning */
  protected_categories: string[];
  /** Require human review for significant changes */
  review_threshold: number;
  /** Rollback if performance drops */
  auto_rollback: boolean;
}

// ============================================
// 8. GOVERNANCE CONFIG - Rules & Compliance
// ============================================

export interface HandoffTarget {
  /** Unique identifier for this target */
  id: string;
  /** Display label */
  label: string;
  /** Optional description */
  description?: string;
  /** Asterisk context */
  context: string;
  /** Asterisk extension */
  exten: string;
  /** Asterisk priority */
  priority: number;
  /** Whether this target is active */
  enabled: boolean;
  /** Optional tags for organization */
  tags: string[];
}

export interface HandoffConfig {
  /** Whether handoff is enabled */
  enabled: boolean;
  /** Default target ID when node doesn't specify one */
  default_handoff_target_id?: string;
  /** Available handoff targets */
  handoff_targets: HandoffTarget[];
}

export interface GovernanceConfig {
  /** Compliance rules */
  compliance_rules: ComplianceRule[];
  /** Risk detection thresholds */
  risk_thresholds: RiskThresholds;
  /** Audit settings */
  audit_settings: AuditSettings;
  /** Escalation paths */
  escalation_paths: EscalationPath[];
  /** PII handling rules */
  pii_handling: PIIHandling;
  /** Content moderation settings */
  content_moderation: ContentModeration;
  /** Handoff configuration for transferring calls to humans */
  handoff?: HandoffConfig;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  type: "block" | "warn" | "log";
  pattern?: string;
  action: string;
}

export interface RiskThresholds {
  /** Confidence below this triggers review */
  low_confidence: number;
  /** Sensitivity score above this triggers review */
  high_sensitivity: number;
  /** Topics that always require review */
  sensitive_topics: string[];
}

export interface AuditSettings {
  /** Log all conversations */
  log_conversations: boolean;
  /** Log all tool usage */
  log_tool_usage: boolean;
  /** Log all decisions */
  log_decisions: boolean;
  /** Retention period in days */
  retention_days: number;
}

export interface EscalationPath {
  trigger: string;
  severity: "low" | "medium" | "high" | "critical";
  notify: string[];
  action: "continue" | "pause" | "stop";
}

export interface PIIHandling {
  /** Auto-detect PII */
  auto_detect: boolean;
  /** What to do with detected PII */
  action: "mask" | "remove" | "flag" | "allow";
  /** PII types to handle */
  types: string[];
  /** Log PII detection events */
  log_detections: boolean;
}

export interface ContentModeration {
  /** Enable content moderation */
  enabled: boolean;
  /** Categories to moderate */
  categories: string[];
  /** Action on violation */
  action: "block" | "warn" | "log";
}

// ============================================
// 9. ECONOMICS CONFIG - Cost & Usage
// ============================================

export interface EconomicsConfig {
  /** Budget limits */
  budget_limits: BudgetLimits;
  /** Cost tracking settings */
  cost_tracking: CostTracking;
  /** Usage caps */
  usage_caps: UsageCaps;
  /** Billing rules */
  billing_rules: BillingRules;
  /** Tier-specific overrides */
  tier_overrides: TierOverrides;
}

export interface BudgetLimits {
  /** Daily budget in cents */
  daily_cents?: number;
  /** Monthly budget in cents */
  monthly_cents?: number;
  /** Per-conversation budget in cents */
  per_conversation_cents?: number;
  /** Action when budget exceeded */
  on_exceed: "block" | "warn" | "notify";
}

export interface CostTracking {
  /** Track LLM token costs */
  track_tokens: boolean;
  /** Track tool usage costs */
  track_tools: boolean;
  /** Track voice minutes costs */
  track_voice: boolean;
  /** Track knowledge retrieval costs */
  track_retrieval: boolean;
}

export interface UsageCaps {
  /** Max conversations per day */
  conversations_per_day?: number;
  /** Max messages per conversation */
  messages_per_conversation?: number;
  /** Max tokens per conversation */
  tokens_per_conversation?: number;
  /** Max voice minutes per day */
  voice_minutes_per_day?: number;
}

export interface BillingRules {
  /** Who pays for usage */
  payer: "organization" | "end_user" | "split";
  /** Rate multiplier */
  rate_multiplier: number;
  /** Minimum charge */
  minimum_charge_cents: number;
}

export interface TierOverrides {
  /** Override settings by plan tier */
  by_plan: Record<string, Partial<EconomicsConfig>>;
}

// ============================================
// COMBINED AGENT CONFIG (all 10 modules)
// ============================================

export interface AgentConfig {
  role_card: RoleCard;
  brain_config: BrainConfig;
  personality_config: PersonalityConfig;
  tool_config: ToolConfig;
  knowledge_config: KnowledgeConfig;
  memory_config: MemoryConfig;
  learning_config: LearningConfig;
  governance_config: GovernanceConfig;
  economics_config: EconomicsConfig;
  flow_config: FlowConfig;
}

/** Flow Config type - imported from schemas */
export interface FlowConfig {
  version?: "v1";
  templateKey?: string;
  entry_node_id?: string;
  exit_node_ids?: string[];
  nodes?: FlowNode[];
  edges?: FlowEdge[];
  variables?: Record<string, unknown>;
  guardrails?: FlowGuardrails;
  fallback?: FlowFallback;
}

export interface FlowNode {
  id: string;
  type: string;
  label?: string;
  prompt?: string;
  tool?: string;
  next?: string;
  branches?: FlowBranch[];
}

export interface FlowEdge {
  from: string;
  to: string;
  condition?: string;
}

export interface FlowBranch {
  condition: string;
  next: string;
}

export interface FlowGuardrails {
  max_turns?: number;
  max_duration_seconds?: number;
  forbidden_topics?: string[];
  escalation?: {
    on_user_requests_human?: boolean;
    on_high_stakes_topics?: boolean;
    escalation_message?: string;
  };
}

export interface FlowFallback {
  message?: string;
  action?: string;
}

/** Keys for the 10 config modules */
export type AgentConfigModule = keyof AgentConfig;

/** Map of module keys to their types */
export type AgentConfigModuleType<K extends AgentConfigModule> = AgentConfig[K];

/**
 * Runtime Layer Types
 *
 * Core types for the agent runtime execution layer.
 * This layer transforms agent configs into live conversation behavior.
 *
 * @module runtime/types
 */

import type { z } from "zod";
import type {
  RoleCardSchemaStrict,
  BrainConfigSchemaStrict,
  PersonalityConfigSchemaStrict,
  FlowConfigSchemaStrict,
  ToolConfigSchemaStrict,
  KnowledgeConfigSchemaStrict,
  MemoryConfigSchemaStrict,
  LearningConfigSchemaStrict,
  GovernanceConfigSchemaStrict,
  EconomicsConfigSchemaStrict,
  PromptEnvelopeSchema,
  PromptResponseEnvelopeSchema,
} from "@epic-ai/shared";

// ============================================================================
// Agent Configuration Types
// ============================================================================

export type RoleCard = z.infer<typeof RoleCardSchemaStrict>;
export type BrainConfig = z.infer<typeof BrainConfigSchemaStrict>;
export type PersonalityConfig = z.infer<typeof PersonalityConfigSchemaStrict>;
export type FlowConfig = z.infer<typeof FlowConfigSchemaStrict>;
export type ToolConfig = z.infer<typeof ToolConfigSchemaStrict>;
export type KnowledgeConfig = z.infer<typeof KnowledgeConfigSchemaStrict>;
export type MemoryConfig = z.infer<typeof MemoryConfigSchemaStrict>;
export type LearningConfig = z.infer<typeof LearningConfigSchemaStrict>;
export type GovernanceConfig = z.infer<typeof GovernanceConfigSchemaStrict>;
export type EconomicsConfig = z.infer<typeof EconomicsConfigSchemaStrict>;

export type PromptEnvelope = z.infer<typeof PromptEnvelopeSchema>;
export type PromptResponseEnvelope = z.infer<typeof PromptResponseEnvelopeSchema>;

/**
 * Full agent configuration loaded from database.
 */
export interface AgentFullConfig {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "active" | "paused" | "archived";
  templateKey: string | null;
  companyId: string | null;
  role_card: RoleCard;
  brain_config: BrainConfig;
  personality_config: PersonalityConfig;
  flow_config: FlowConfig;
  tool_config: ToolConfig;
  knowledge_config: KnowledgeConfig;
  memory_config: MemoryConfig;
  learning_config: LearningConfig;
  governance_config: GovernanceConfig;
  economics_config: EconomicsConfig;
}

// ============================================================================
// Runtime Input Types
// ============================================================================

/**
 * Channel through which the conversation is happening.
 */
export type RuntimeChannel =
  | "web"
  | "voice"
  | "sms"
  | "email"
  | "whatsapp"
  | "facebook"
  | "instagram"
  | "api";

/**
 * Input for a single agent turn.
 */
export interface AgentTurnInput {
  /** The agent ID */
  agentId: string;
  /** User's message or input */
  userInput: string;
  /** The communication channel */
  channel: RuntimeChannel;
  /** Session identifier for conversation continuity */
  sessionId: string;
  /** Optional: conversation ID for multi-session conversations */
  conversationId?: string;
  /** Optional: user ID if authenticated */
  userId?: string;
  /** Optional: metadata from the channel (e.g., caller ID for voice) */
  channelMetadata?: Record<string, unknown>;
  /** Optional: timestamp of the user input */
  timestamp?: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * A single message in the conversation history.
 */
export interface ConversationMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  metadata?: {
    tool_call?: string;
    tool_result?: unknown;
    flow_node?: string;
    confidence?: number;
  };
}

/**
 * Entity extracted from conversation (for memory).
 */
export interface ExtractedEntity {
  type: "person" | "company" | "email" | "phone" | "date" | "location" | "custom";
  value: string;
  confidence: number;
  source: "user" | "assistant" | "system";
  timestamp: string;
}

/**
 * Runtime context built for each turn.
 */
export interface RuntimeContext {
  /** Session identifier */
  sessionId: string;
  /** Conversation ID */
  conversationId: string;
  /** Current flow stage */
  flowStage: string;
  /** Turn number in this session */
  turnNumber: number;
  /** Recent conversation messages */
  messages: ConversationMessage[];
  /** Extracted entities from conversation */
  entities: ExtractedEntity[];
  /** User profile data if available */
  userProfile?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    tags?: string[];
    customFields?: Record<string, unknown>;
  };
  /** Channel-specific context */
  channelContext: {
    channel: RuntimeChannel;
    metadata?: Record<string, unknown>;
  };
  /** Start time of this session */
  sessionStartedAt: string;
  /** Last activity timestamp */
  lastActivityAt: string;
}

// ============================================================================
// Decision Types
// ============================================================================

/**
 * Decision made by the brain engine.
 */
export interface BrainDecision {
  /** Primary action to take */
  action:
    | "respond"
    | "ask_clarification"
    | "use_tool"
    | "escalate"
    | "handoff"
    | "end";
  /** Confidence in this decision (0-1) */
  confidence: number;
  /** Reasoning for the decision */
  reasoning: string;
  /** If action=use_tool, which tool */
  tool?: string;
  /** If action=escalate, escalation details */
  escalation?: {
    reason: string;
    target: "human" | "supervisor" | "manager";
    urgency: "low" | "medium" | "high";
  };
  /** Intent detected from user input */
  detectedIntent?: string;
  /** Suggested response approach */
  responseApproach?: "direct" | "empathetic" | "informative" | "persuasive";
  /** Policy that triggered this decision (if any) */
  triggeredPolicy?: string;
}

// ============================================================================
// Flow Types
// ============================================================================

/**
 * Current state in the conversation flow.
 */
export interface FlowState {
  /** Current node ID */
  currentNode: string;
  /** Previous node ID */
  previousNode?: string;
  /** Turn count in current node */
  turnsInNode: number;
  /** Fields collected in current node */
  collectedFields: Record<string, unknown>;
  /** Whether we're at an exit node */
  isExit: boolean;
  /** Next suggested node (if transition detected) */
  suggestedNext?: string;
  /** Intent that triggered the transition */
  transitionIntent?: string;
}

// ============================================================================
// Knowledge Types
// ============================================================================

/**
 * A retrieved knowledge chunk.
 */
export interface KnowledgeChunk {
  /** Unique identifier */
  id: string;
  /** The content */
  content: string;
  /** Source of this knowledge */
  source: {
    type: "document" | "faq" | "website" | "manual";
    name: string;
    url?: string;
  };
  /** Relevance score (0-1) */
  relevance: number;
  /** Token count */
  tokens?: number;
}

/**
 * Knowledge retrieval result.
 */
export interface KnowledgeResult {
  /** Retrieved chunks */
  chunks: KnowledgeChunk[];
  /** Total chunks found (before limiting) */
  totalFound: number;
  /** Query used for retrieval */
  query: string;
  /** Total tokens used */
  totalTokens: number;
}

// ============================================================================
// Tool Types
// ============================================================================

/**
 * Result from executing a tool.
 */
export interface ToolExecutionResult {
  /** The tool that was executed */
  toolId: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Result data */
  data?: unknown;
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  durationMs: number;
  /** Whether user confirmation was required */
  requiredConfirmation: boolean;
  /** Human-readable summary */
  summary: string;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Result of a single agent turn.
 */
export interface AgentTurnResult {
  /** Whether the turn completed successfully */
  ok: boolean;
  /** The agent's response text */
  response: string;
  /** Updated flow state */
  flowState: FlowState;
  /** Decision that was made */
  decision: BrainDecision;
  /** Tool execution result if any */
  toolResult?: ToolExecutionResult;
  /** Knowledge chunks used */
  knowledgeUsed: KnowledgeChunk[];
  /** Confidence in the response */
  confidence: number;
  /** Warnings generated */
  warnings: string[];
  /** Whether the conversation should end */
  shouldEnd: boolean;
  /** Error info if !ok */
  error?: {
    code: string;
    message: string;
  };
  /** Performance metadata */
  metadata: {
    turnNumber: number;
    durationMs: number;
    tokensUsed?: number;
    model: string;
  };
}

// ============================================================================
// Learning Types
// ============================================================================

/**
 * Learning event to record.
 */
export interface LearningEvent {
  /** Event type */
  type:
    | "conversation_outcome"
    | "tool_usage"
    | "escalation"
    | "user_feedback"
    | "correction";
  /** The agent ID */
  agentId: string;
  /** Session ID */
  sessionId: string;
  /** Event data */
  data: {
    decision?: BrainDecision;
    toolResult?: ToolExecutionResult;
    userFeedback?: {
      rating?: number;
      comment?: string;
    };
    outcome?: "positive" | "negative" | "neutral" | "unknown";
    correctedResponse?: string;
  };
  /** Timestamp */
  timestamp: string;
}

// ============================================================================
// Memory Types
// ============================================================================

/**
 * Memory entry to save.
 */
export interface MemoryEntry {
  /** Session ID */
  sessionId: string;
  /** Conversation ID */
  conversationId: string;
  /** Type of memory */
  type: "message" | "entity" | "summary" | "outcome";
  /** The content */
  content: {
    role?: "user" | "assistant";
    text?: string;
    entity?: ExtractedEntity;
    summary?: string;
    outcome?: string;
  };
  /** Timestamp */
  timestamp: string;
  /** TTL in seconds (for auto-cleanup) */
  ttlSeconds?: number;
}

/**
 * Agent Runtime Layer
 *
 * Main exports for the runtime execution engine.
 * This module transforms agent configurations into live conversation behavior.
 *
 * @module runtime
 */

// ============================================================================
// Main Orchestrator
// ============================================================================

export {
  runAgentTurn,
  runConversation,
  checkRuntimeHealth,
} from "./run-agent";

// ============================================================================
// Core Types
// ============================================================================

export type {
  // Config types (inferred from Zod schemas)
  AgentFullConfig,
  RoleCard,
  BrainConfig,
  PersonalityConfig,
  FlowConfig,
  ToolConfig,
  KnowledgeConfig,
  MemoryConfig,
  LearningConfig,
  GovernanceConfig,
  EconomicsConfig,

  // Runtime types
  AgentTurnInput,
  AgentTurnResult,
  RuntimeContext,
  RuntimeChannel,
  ConversationMessage,
  ExtractedEntity,

  // Decision types
  BrainDecision,

  // Flow types
  FlowState,

  // Knowledge types
  KnowledgeChunk,
  KnowledgeResult,

  // Tool types
  ToolExecutionResult,

  // Memory types
  MemoryEntry,

  // Learning types
  LearningEvent,

  // Prompt types
  PromptEnvelope,
  PromptResponseEnvelope,
} from "./types";

// ============================================================================
// Context Building
// ============================================================================

export {
  buildContext,
  formatContextForPrompt,
  extractContextSignals,
} from "./context-builder";

export type { BuildContextParams } from "./context-builder";

// ============================================================================
// Brain Engine
// ============================================================================

export { brainDecide } from "./brain-engine";

export type { BrainDecideParams } from "./brain-engine";

// ============================================================================
// Flow Controller
// ============================================================================

export {
  updateFlow,
  getNodeInstructions,
  hasRequiredFields,
  getMissingFields,
  initializeFlowState,
} from "./flow-controller";

export type { UpdateFlowParams } from "./flow-controller";

// ============================================================================
// Knowledge Retriever
// ============================================================================

export {
  retrieveKnowledge,
  formatKnowledgeForPrompt,
  hasRelevantKnowledge,
} from "./knowledge-retriever";

export type { RetrieveKnowledgeParams } from "./knowledge-retriever";

// ============================================================================
// Tool Router
// ============================================================================

export {
  maybeRunTool,
  getAvailableTools,
  getPreferredTools,
  isToolAvailable,
} from "./tool-router";

export type { MaybeRunToolParams } from "./tool-router";

// ============================================================================
// Prompt Builder
// ============================================================================

export {
  buildPromptEnvelope,
  estimatePromptTokens,
  truncatePromptIfNeeded,
} from "./prompt-builder";

export type { BuildPromptEnvelopeParams } from "./prompt-builder";

// ============================================================================
// Personality Renderer
// ============================================================================

export {
  applyPersonality,
  adjustToneForEmotion,
  formatForChannel,
  generateSignature,
} from "./personality-renderer";

export type { ApplyPersonalityParams } from "./personality-renderer";

// ============================================================================
// LLM Caller
// ============================================================================

export {
  callLLM,
  streamLLM,
  estimateCost,
  LLMError,
} from "./llm-caller";

export type { LLMResponse, LLMCallOptions, StreamingCallbacks } from "./llm-caller";

// ============================================================================
// Memory Layer
// ============================================================================

export {
  saveMemory,
  loadMemory,
  cleanupMemory,
  summarizeMemory,
  getOrCreateSession,
  endSession,
} from "./memory-layer";

export type { SaveMemoryParams, LoadMemoryParams } from "./memory-layer";

// ============================================================================
// Learning Layer
// ============================================================================

export {
  recordLearning,
  recordFeedback,
  getLearningAnalytics,
} from "./learning-layer";

export type { RecordLearningParams, RecordFeedbackParams } from "./learning-layer";

// ============================================================================
// Observability
// ============================================================================

export {
  createRequestContext,
  logTurnStart,
  logPromptEnvelope,
  logLLMResponse,
  logToolCall,
  logFlowTransition,
  logTurnComplete,
  logError,
  buildTurnLog,
  debugDumpPrompt,
  createTimer,
} from "./observability";

export type { RequestContext, TurnLog } from "./observability";

// ============================================================================
// Channel Adapters
// ============================================================================

export {
  // Voice Adapter
  handleVoiceTurn,
  handleStreamingTranscript,
  resolveAgentFromDid,
  getOrCreateVoiceSession,
  endVoiceSession,
  initiateTransfer,
  checkVoiceAdapterHealth,
} from "./adapters";

export type {
  VoiceTurnInput,
  VoiceTurnResult,
  VoiceSessionInfo,
  StreamingVoiceInput,
  TransferRequest,
} from "./adapters";

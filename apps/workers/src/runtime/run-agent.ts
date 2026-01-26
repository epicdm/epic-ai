/**
 * Agent Runtime Orchestrator
 *
 * Main entry point for running agent conversations.
 * Coordinates all runtime components: memory, brain, knowledge,
 * flow, tools, personality, and LLM calls.
 *
 * @module runtime/run-agent
 */

import { prisma } from "@epic-ai/database";
import type {
  AgentFullConfig,
  AgentTurnInput,
  AgentTurnResult,
  RuntimeContext,
  BrainDecision,
  FlowState,
  KnowledgeResult,
  ToolExecutionResult,
  PromptEnvelope,
} from "./types";
import { buildContext } from "./context-builder";
import { brainDecide } from "./brain-engine";
import { retrieveKnowledge } from "./knowledge-retriever";
import { updateFlow, initializeFlowState } from "./flow-controller";
import { maybeRunTool, getAvailableTools } from "./tool-router";
import { buildPromptEnvelope, estimatePromptTokens, truncatePromptIfNeeded } from "./prompt-builder";
import { applyPersonality, formatForChannel } from "./personality-renderer";
import { callLLM, LLMResponse, estimateCost } from "./llm-caller";
import { saveMemory, getOrCreateSession } from "./memory-layer";
import { recordLearning } from "./learning-layer";
import { runHandoffNode, type HandoffNodeResult } from "./flow/nodes/handoff";
import { writeSessionEvent } from "../lib/session-events";

// ============================================================================
// Main Orchestrator
// ============================================================================

/**
 * Run a single turn of an agent conversation.
 * This is the main entry point for the runtime.
 */
export async function runAgentTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
  const startTime = Date.now();

  try {
    // 1. Load agent configuration
    const agent = await loadAgentFullConfig(input.agentId);

    // 2. Ensure session exists
    await getOrCreateSession(
      input.agentId,
      input.sessionId,
      input.channel,
      input.userId
    );

    // 3. Build context from memory and session
    const context = await buildContext({
      agent,
      sessionId: input.sessionId,
      channel: input.channel,
      channelMetadata: input.channelMetadata,
      userId: input.userId,
    });

    // 4. Initialize or load flow state
    const currentFlowState = loadFlowStateFromContext(context, agent.flow_config);

    // 5. Make brain decision
    const decision = await brainDecide({
      brainConfig: agent.brain_config,
      userInput: input.userInput,
      context,
      flowState: currentFlowState,
      availableTools: getAvailableTools(agent.tool_config),
    });

    // 6. Retrieve relevant knowledge
    const knowledge = await retrieveKnowledge({
      knowledgeConfig: agent.knowledge_config,
      userInput: input.userInput,
      context,
    });

    // 7. Update flow state
    const flowState = updateFlow({
      flowConfig: agent.flow_config,
      decision,
      context,
      currentFlowState,
    });

    // 7a. Check if current node is a handoff node - if so, execute it and return
    const currentNode = agent.flow_config.nodes.find(
      (n) => n.id === flowState.currentNode
    );

    if (currentNode?.type === "handoff") {
      // Extract handoff configuration from node
      const handoffConfig = (currentNode as any).config ?? {};
      const handoffNode = {
        id: currentNode.id,
        type: "handoff" as const,
        target: handoffConfig.target || {
          context: process.env.HANDOFF_DEFAULT_TARGET || "sales_queue",
          exten: "1",
          priority: 1,
        },
        message: handoffConfig.message,
        reason: decision.reasoning || "Escalation requested",
      };

      const handoffResult = await runHandoffNode({
        node: handoffNode,
        session: {
          channel: input.channel,
          sessionId: input.sessionId,
          agentId: input.agentId,
        },
        writeSessionEvent,
      });

      // Return escalation result - handoff has already executed
      return buildHandoffResult({
        handoffResult,
        flowState: { ...flowState, isExit: true },
        decision,
        startTime,
      });
    }

    // 8. Execute tool if needed
    const toolResult = await maybeRunTool({
      toolConfig: agent.tool_config,
      decision,
      context,
      agentId: input.agentId,
    });

    // 9. Build prompt envelope
    const prompt = buildPromptEnvelope({
      agent,
      context,
      knowledge,
      flowState,
      toolResult,
      decision,
      userInput: input.userInput,
    });

    // 10. Apply token limits
    // Max tokens is determined by the retrieval settings context window or a default
    const maxTokens = agent.knowledge_config?.context_window?.max_knowledge_tokens ?? 8000;
    const limitedPrompt = truncatePromptIfNeeded(prompt, maxTokens);

    // 11. Call LLM
    const llmResponse = await callLLM(limitedPrompt, {
      timeout: 30000, // Default timeout
      maxRetries: 3,
    });

    // 12. Apply personality to response
    const personalizedResponse = applyPersonality({
      personalityConfig: agent.personality_config,
      rawContent: llmResponse.content,
      context: {
        isFirstTurn: context.turnNumber === 0,
        isClosing: flowState.isExit || decision.action === "end",
      },
    });

    // 13. Format for channel
    const channelMaxLength = getChannelMaxLength(input.channel);
    const finalResponse = formatForChannel(
      personalizedResponse,
      input.channel,
      channelMaxLength
    );

    // 14. Save memory
    await saveMemory({
      memoryConfig: agent.memory_config,
      sessionId: input.sessionId,
      agentId: input.agentId,
      userInput: input.userInput,
      agentResponse: finalResponse,
      entities: context.entities,
      turnNumber: context.turnNumber,
    });

    // 15. Record learning signals
    const responseTimeMs = Date.now() - startTime;
    await recordLearning({
      learningConfig: agent.learning_config,
      agentId: input.agentId,
      sessionId: input.sessionId,
      decision,
      toolResult,
      flowState,
      userInput: input.userInput,
      agentResponse: finalResponse,
      responseTimeMs,
    });

    // 16. Track economics
    await trackTurnEconomics(agent, llmResponse, responseTimeMs);

    // 17. Build result
    return buildSuccessResult({
      response: finalResponse,
      decision,
      flowState,
      knowledge,
      toolResult,
      llmResponse,
      prompt: limitedPrompt,
      startTime,
    });

  } catch (error) {
    return buildErrorResult(error, Date.now() - startTime);
  }
}

// ============================================================================
// Config Loading
// ============================================================================

async function loadAgentFullConfig(agentId: string): Promise<AgentFullConfig> {
  // All configs are stored as JSON blobs directly on the Agent model
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  // Transform Prisma result to AgentFullConfig type
  return transformToFullConfig(agent);
}

function transformToFullConfig(agent: any): AgentFullConfig {
  // Parse JSON blobs - they may already be parsed objects or JSON strings
  const parseJson = (value: any) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value ?? {};
  };

  const roleCard = parseJson(agent.roleCard);
  const brainConfig = parseJson(agent.brainConfig);
  const personalityConfig = parseJson(agent.personalityConfig);
  const flowConfig = parseJson(agent.flowConfig);
  const toolConfig = parseJson(agent.toolConfig);
  const knowledgeConfig = parseJson(agent.knowledgeConfig);
  const memoryConfig = parseJson(agent.memoryConfig);
  const learningConfig = parseJson(agent.learningConfig);
  const governanceConfig = parseJson(agent.governanceConfig);
  const economicsConfig = parseJson(agent.economicsConfig);

  return {
    id: agent.id,
    companyId: agent.organizationId,
    name: agent.name,
    slug: agent.slug ?? agent.id,
    status: agent.status,
    templateKey: agent.templateKey ?? null,
    role_card: {
      title: roleCard.title ?? "AI Assistant",
      name: roleCard.name,
      company: roleCard.company ?? "Company",
      mission: roleCard.mission ?? "Help users with their questions",
      context: roleCard.context,
      boundaries: roleCard.boundaries ?? [],
      escalation_rules: roleCard.escalation_rules ?? [],
    },
    brain_config: {
      decision_policies: brainConfig.decision_policies ?? [],
      response_rules: brainConfig.response_rules ?? [],
      context_handling: brainConfig.context_handling ?? {
        history_strategy: "recent",
        max_history_turns: 10,
        summarize_after: 20,
      },
      reasoning_strategy: brainConfig.reasoning_strategy ?? { approach: "direct" },
      fallback_behavior: brainConfig.fallback_behavior ?? {
        default_response: "I'm not sure how to help with that. Can you provide more details?",
        on_uncertainty: "ask_clarification",
        max_clarifications: 3,
      },
    },
    personality_config: {
      voice_tone: personalityConfig.voice_tone ?? "friendly",
      formality: personalityConfig.formality ?? 3,
      humor_level: personalityConfig.humor_level ?? 1,
      empathy_level: personalityConfig.empathy_level ?? 4,
      pace: personalityConfig.pace ?? "moderate",
      language_style: personalityConfig.language_style ?? {},
      preferred_phrases: personalityConfig.preferred_phrases ?? [],
      avoided_phrases: personalityConfig.avoided_phrases ?? [],
      use_emojis: personalityConfig.use_emojis ?? false,
      greeting_style: personalityConfig.greeting_style ?? "Hi! How can I help you today?",
      signoff_style: personalityConfig.signoff_style ?? "Is there anything else I can help you with?",
    },
    flow_config: {
      version: "v1" as const,
      entry_node_id: flowConfig.entry_node_id ?? "greeting",
      exit_node_ids: flowConfig.exit_node_ids ?? ["close"],
      nodes: (flowConfig.nodes ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        instructions: n.instructions,
        required_fields: n.required_fields ?? [],
        max_turns: n.max_turns,
      })),
      edges: (flowConfig.edges ?? []).map((e: any) => ({
        from: e.from,
        to: e.to,
        when: e.when,
        priority: e.priority,
      })),
      intents: (flowConfig.intents ?? []).map((i: any) => ({
        id: i.id,
        name: i.name,
        examples: i.examples ?? [],
      })),
      tool_hooks: flowConfig.tool_hooks ?? [],
      guardrails: flowConfig.guardrails ?? {},
    },
    tool_config: {
      enabled_tools: (toolConfig.enabled_tools ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        enabled: t.enabled,
        permissions: t.permissions,
        rate_limits: t.rate_limits,
      })),
      tool_preferences: toolConfig.tool_preferences,
      tool_policies: toolConfig.tool_policies,
    },
    knowledge_config: {
      knowledge_bases: knowledgeConfig.knowledge_bases ?? [],
      sources: (knowledgeConfig.sources ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        type: s.type,
        priority: s.priority,
      })),
      quick_answers: (knowledgeConfig.quick_answers ?? []).map((qa: any) => ({
        triggers: qa.triggers ?? [],
        answer: qa.answer,
        confidence_threshold: qa.confidence_threshold,
      })),
      retrieval_settings: knowledgeConfig.retrieval_settings ?? {},
      context_window: knowledgeConfig.context_window ?? {},
    },
    memory_config: {
      short_term: memoryConfig.short_term ?? { enabled: true, window_size: 10 },
      long_term: memoryConfig.long_term ?? {
        enabled: false,
        summary_strategy: "per_conversation",
        max_summaries: 100,
        extract_entities: ["name", "email", "phone"],
      },
      episodic: memoryConfig.episodic ?? { enabled: false, retention_days: 30 },
      persistence: memoryConfig.persistence ?? {
        storage: "database",
        encryption: false,
      },
    },
    learning_config: {
      learning_enabled: learningConfig.learning_enabled ?? false,
      feedback_loops: learningConfig.feedback_loops ?? {
        explicit_feedback: true,
        implicit_signals: true,
        outcome_learning: false,
        min_samples: 50,
      },
      safe_boundaries: learningConfig.safe_boundaries ?? {
        max_deviation: 0.1,
        review_threshold: 0.7,
        require_approval: true,
      },
      approval_required: learningConfig.approval_required ?? true,
      approvers: learningConfig.approvers ?? [],
    },
    governance_config: {
      template_key: governanceConfig.template_key,
      compliance_rules: governanceConfig.compliance_rules ?? [],
      risk_thresholds: governanceConfig.risk_thresholds ?? {},
      audit_settings: governanceConfig.audit_settings ?? {},
      escalation_paths: governanceConfig.escalation_paths ?? [],
      pii_handling: governanceConfig.pii_handling ?? {},
      content_moderation: governanceConfig.content_moderation ?? {},
    },
    economics_config: {
      budget_limits: economicsConfig.budget_limits ?? {},
      cost_tracking: economicsConfig.cost_tracking ?? {
        track_tokens: true,
        track_tools: true,
        track_voice: true,
        track_retrieval: false,
      },
      usage_caps: economicsConfig.usage_caps ?? {},
      billing_rules: economicsConfig.billing_rules ?? [],
      tier_overrides: economicsConfig.tier_overrides ?? {},
    },
  };
}

// ============================================================================
// Flow State
// ============================================================================

function loadFlowStateFromContext(
  context: RuntimeContext,
  flowConfig: AgentFullConfig["flow_config"]
): FlowState {
  // Try to load from context (previous turn state)
  if (context.flowStage) {
    return {
      currentNode: context.flowStage,
      turnsInNode: 0, // Will be updated by updateFlow
      collectedFields: {},
      isExit: flowConfig.exit_node_ids?.includes(context.flowStage) ?? false,
    };
  }

  // Initialize fresh
  return initializeFlowState(flowConfig, context);
}

// ============================================================================
// Channel Handling
// ============================================================================

function getChannelMaxLength(channel: string): number | undefined {
  const limits: Record<string, number> = {
    sms: 160,
    twitter: 280,
    whatsapp: 4096,
    webchat: undefined as any,
    voice: undefined as any,
  };

  return limits[channel];
}

// ============================================================================
// Economics Tracking
// ============================================================================

async function trackTurnEconomics(
  agent: AgentFullConfig,
  llmResponse: LLMResponse,
  responseTimeMs: number
): Promise<void> {
  // Check if token tracking is enabled
  if (!agent.economics_config?.cost_tracking?.track_tokens) {
    return;
  }

  const cost = estimateCost(llmResponse.usage, llmResponse.model);

  // Log usage for now - a dedicated usage model can be added later
  console.log(`[Economics] Agent ${agent.id} turn: ${llmResponse.usage.totalTokens} tokens, $${cost.toFixed(6)}, ${responseTimeMs}ms`);

  // Check budget limits if configured
  if (agent.economics_config.budget_limits?.daily_cents) {
    await checkBudgetLimits(agent.id, agent.economics_config.budget_limits, cost);
  }
}

async function checkBudgetLimits(
  agentId: string,
  limits: NonNullable<AgentFullConfig["economics_config"]["budget_limits"]>,
  currentTurnCost: number
): Promise<void> {
  // Budget limits are in cents, so convert
  const dailyLimitDollars = (limits.daily_cents ?? 0) / 100;

  if (dailyLimitDollars > 0 && currentTurnCost > dailyLimitDollars) {
    // Warn about potential budget exceedance
    // Full budget tracking requires aggregating usage over time
    const action = limits.on_exceed ?? "warn";
    if (action === "warn" || action === "notify") {
      console.warn(`[Budget] Agent ${agentId} turn cost $${currentTurnCost.toFixed(4)} - budget limit is $${dailyLimitDollars.toFixed(2)}/day`);
    }
    // TODO: Implement "block" action when full usage tracking is available
  }
}

// ============================================================================
// Result Building
// ============================================================================

interface SuccessResultParams {
  response: string;
  decision: BrainDecision;
  flowState: FlowState;
  knowledge: KnowledgeResult;
  toolResult: ToolExecutionResult | null;
  llmResponse: LLMResponse;
  prompt: PromptEnvelope;
  startTime: number;
}

function buildSuccessResult(params: SuccessResultParams): AgentTurnResult {
  const {
    response,
    decision,
    flowState,
    knowledge,
    toolResult,
    llmResponse,
    prompt,
    startTime,
  } = params;

  return {
    ok: true,
    response,
    flowState,
    decision,
    toolResult: toolResult ?? undefined,
    knowledgeUsed: knowledge.chunks,
    confidence: decision.confidence,
    warnings: [],
    shouldEnd: flowState.isExit || decision.action === "end",
    metadata: {
      turnNumber: 0, // Will be set by caller if needed
      durationMs: Date.now() - startTime,
      tokensUsed: llmResponse.usage.totalTokens,
      model: llmResponse.model,
    },
  };
}

/**
 * Build result from handoff node execution
 */
interface HandoffResultParams {
  handoffResult: HandoffNodeResult;
  flowState: FlowState;
  decision: BrainDecision;
  startTime: number;
}

function buildHandoffResult(params: HandoffResultParams): AgentTurnResult {
  const { handoffResult, flowState, decision, startTime } = params;

  return {
    ok: true,
    response: handoffResult.result.message,
    flowState: {
      ...flowState,
      isExit: true,
      currentNode: "escalated",
    },
    decision,
    toolResult: {
      toolId: "voice.transfer",
      success: handoffResult.result.ok,
      data: handoffResult.result,
      durationMs: Date.now() - startTime,
      requiredConfirmation: false,
      summary: handoffResult.result.message,
    },
    knowledgeUsed: [],
    confidence: 1.0,
    warnings: handoffResult.result.ok ? [] : ["Transfer completed but encountered issues"],
    shouldEnd: true,
    metadata: {
      turnNumber: 0,
      durationMs: Date.now() - startTime,
      tokensUsed: 0,
      model: "handoff-executor",
    },
  };
}

function buildErrorResult(error: unknown, durationMs: number): AgentTurnResult {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  console.error("[AgentRuntime] Turn failed:", error);

  return {
    ok: false,
    response: "I apologize, but I encountered an issue processing your request. Please try again.",
    flowState: {
      currentNode: "error",
      turnsInNode: 0,
      collectedFields: {},
      isExit: false,
    },
    decision: {
      action: "respond",
      confidence: 0,
      reasoning: "Error occurred during processing",
    },
    knowledgeUsed: [],
    confidence: 0,
    warnings: [errorMessage],
    shouldEnd: false,
    error: {
      code: "RUNTIME_ERROR",
      message: errorMessage,
    },
    metadata: {
      turnNumber: 0,
      durationMs,
      model: "unknown",
    },
  };
}

// ============================================================================
// Batch Processing
// ============================================================================

/**
 * Process multiple turns in sequence (for testing/simulation).
 */
export async function runConversation(
  agentId: string,
  sessionId: string,
  channel: string,
  messages: string[]
): Promise<AgentTurnResult[]> {
  const results: AgentTurnResult[] = [];

  for (const message of messages) {
    const result = await runAgentTurn({
      agentId,
      userInput: message,
      channel: channel as any,
      sessionId,
    });

    results.push(result);

    // Stop on error or conversation end
    if (!result.ok || result.shouldEnd) {
      break;
    }
  }

  return results;
}

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if the runtime is healthy.
 */
export async function checkRuntimeHealth(): Promise<{
  healthy: boolean;
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {};

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  // OpenAI API check
  checks.openai = !!process.env.OPENAI_API_KEY;

  return {
    healthy: Object.values(checks).every((v) => v),
    checks,
  };
}

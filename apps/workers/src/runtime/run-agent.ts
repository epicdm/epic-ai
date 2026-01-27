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
        governance: agent.governance_config,
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

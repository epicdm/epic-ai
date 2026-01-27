/**
 * Minimal Observability Layer
 *
 * Just enough to debug - not full production hardening.
 * Logs request lifecycle, prompts, responses, and errors.
 *
 * @module runtime/observability
 */

import { randomUUID } from "crypto";

// ============================================================================
// Types
// ============================================================================

export interface RequestContext {
  requestId: string;
  agentId: string;
  sessionId: string;
  channel: string;
  startTime: number;
}

export interface TurnLog {
  requestId: string;
  agentId: string;
  sessionId: string;
  channel: string;
  userInput: string;
  promptEnvelope?: {
    systemPromptLength: number;
    userPromptLength: number;
    knowledgeChunks: number;
    flowStage: string;
  };
  response?: {
    text: string;
    tokensUsed: number;
    latencyMs: number;
  };
  toolCalls?: Array<{
    toolId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }>;
  flowTransition?: {
    from: string;
    to: string;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  durationMs: number;
  timestamp: string;
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Create a new request context for tracking a turn.
 */
export function createRequestContext(params: {
  agentId: string;
  sessionId: string;
  channel: string;
}): RequestContext {
  return {
    requestId: randomUUID(),
    agentId: params.agentId,
    sessionId: params.sessionId,
    channel: params.channel,
    startTime: Date.now(),
  };
}

// ============================================================================
// Logging
// ============================================================================

const LOG_PREFIX = "[AgentRuntime]";

/**
 * Log turn start.
 */
export function logTurnStart(ctx: RequestContext, userInput: string): void {
  console.log(
    `${LOG_PREFIX} [${ctx.requestId}] Turn started`,
    JSON.stringify({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      channel: ctx.channel,
      inputLength: userInput.length,
      timestamp: new Date().toISOString(),
    })
  );
}

/**
 * Log prompt envelope (without full content for brevity).
 */
export function logPromptEnvelope(
  ctx: RequestContext,
  envelope: {
    system_prompt: string;
    user_prompt: string;
    knowledge?: { chunks: unknown[] };
    flowStage?: string;
  }
): void {
  console.log(
    `${LOG_PREFIX} [${ctx.requestId}] Prompt built`,
    JSON.stringify({
      systemPromptLength: envelope.system_prompt.length,
      userPromptLength: envelope.user_prompt.length,
      knowledgeChunks: envelope.knowledge?.chunks?.length ?? 0,
      flowStage: envelope.flowStage ?? "unknown",
    })
  );
}

/**
 * Log LLM response.
 */
export function logLLMResponse(
  ctx: RequestContext,
  response: {
    content: string;
    tokensUsed: number;
    latencyMs: number;
    model: string;
  }
): void {
  console.log(
    `${LOG_PREFIX} [${ctx.requestId}] LLM response`,
    JSON.stringify({
      responseLength: response.content.length,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
      model: response.model,
    })
  );
}

/**
 * Log tool execution.
 */
export function logToolCall(
  ctx: RequestContext,
  tool: {
    toolId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }
): void {
  const level = tool.success ? "log" : "warn";
  console[level](
    `${LOG_PREFIX} [${ctx.requestId}] Tool ${tool.success ? "succeeded" : "failed"}`,
    JSON.stringify({
      toolId: tool.toolId,
      success: tool.success,
      durationMs: tool.durationMs,
      error: tool.error,
    })
  );
}

/**
 * Log flow transition.
 */
export function logFlowTransition(
  ctx: RequestContext,
  from: string,
  to: string
): void {
  console.log(
    `${LOG_PREFIX} [${ctx.requestId}] Flow transition`,
    JSON.stringify({ from, to })
  );
}

/**
 * Log turn completion.
 */
export function logTurnComplete(
  ctx: RequestContext,
  result: {
    success: boolean;
    responseLength: number;
    flowStage: string;
  }
): void {
  const durationMs = Date.now() - ctx.startTime;
  console.log(
    `${LOG_PREFIX} [${ctx.requestId}] Turn completed`,
    JSON.stringify({
      success: result.success,
      responseLength: result.responseLength,
      flowStage: result.flowStage,
      durationMs,
    })
  );
}

/**
 * Log error with full context.
 */
export function logError(
  ctx: RequestContext,
  error: Error,
  phase: string
): void {
  console.error(
    `${LOG_PREFIX} [${ctx.requestId}] Error in ${phase}`,
    JSON.stringify({
      agentId: ctx.agentId,
      sessionId: ctx.sessionId,
      channel: ctx.channel,
      phase,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 5).join("\n"),
      },
      durationMs: Date.now() - ctx.startTime,
      timestamp: new Date().toISOString(),
    })
  );
}

// ============================================================================
// Structured Log Builder
// ============================================================================

/**
 * Build a complete turn log for persistence.
 */
export function buildTurnLog(params: {
  ctx: RequestContext;
  userInput: string;
  promptEnvelope?: {
    system_prompt: string;
    user_prompt: string;
    knowledge?: { chunks: unknown[] };
    flowStage?: string;
  };
  response?: {
    text: string;
    tokensUsed: number;
    latencyMs: number;
  };
  toolCalls?: Array<{
    toolId: string;
    success: boolean;
    durationMs: number;
    error?: string;
  }>;
  flowTransition?: {
    from: string;
    to: string;
  };
  error?: Error;
}): TurnLog {
  const { ctx, userInput, promptEnvelope, response, toolCalls, flowTransition, error } = params;

  return {
    requestId: ctx.requestId,
    agentId: ctx.agentId,
    sessionId: ctx.sessionId,
    channel: ctx.channel,
    userInput,
    promptEnvelope: promptEnvelope
      ? {
          systemPromptLength: promptEnvelope.system_prompt.length,
          userPromptLength: promptEnvelope.user_prompt.length,
          knowledgeChunks: promptEnvelope.knowledge?.chunks?.length ?? 0,
          flowStage: promptEnvelope.flowStage ?? "unknown",
        }
      : undefined,
    response,
    toolCalls,
    flowTransition,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          code: (error as any).code,
        }
      : undefined,
    durationMs: Date.now() - ctx.startTime,
    timestamp: new Date().toISOString(),
  };
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Dump full prompt envelope for debugging (use sparingly).
 */
export function debugDumpPrompt(
  ctx: RequestContext,
  envelope: {
    system_prompt: string;
    user_prompt: string;
  }
): void {
  if (process.env.DEBUG_PROMPTS === "true") {
    console.debug(
      `${LOG_PREFIX} [${ctx.requestId}] PROMPT DUMP\n`,
      "=== SYSTEM ===\n",
      envelope.system_prompt.slice(0, 2000),
      "\n=== USER ===\n",
      envelope.user_prompt.slice(0, 1000)
    );
  }
}

/**
 * Performance marker for timing specific phases.
 */
export function createTimer(): { elapsed: () => number } {
  const start = Date.now();
  return {
    elapsed: () => Date.now() - start,
  };
}

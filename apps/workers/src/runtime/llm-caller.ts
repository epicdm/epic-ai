/**
 * LLM Caller
 *
 * Handles LLM API calls with retries, rate limiting,
 * and response parsing.
 *
 * @module runtime/llm-caller
 */

import type { PromptEnvelope } from "./types";

// ============================================================================
// Types
// ============================================================================

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "error";
  latencyMs: number;
}

export interface LLMCallOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// ============================================================================
// LLM Caller
// ============================================================================

/**
 * Call the LLM with the prompt envelope.
 */
export async function callLLM(
  prompt: PromptEnvelope,
  options: LLMCallOptions = {}
): Promise<LLMResponse> {
  const { timeout = 30000, maxRetries = 3, retryDelay = 1000 } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await callLLMWithTimeout(prompt, timeout);
      return {
        ...response,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on non-retryable errors
      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await sleep(retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("LLM call failed after retries");
}

// ============================================================================
// Internal Implementation
// ============================================================================

async function callLLMWithTimeout(
  prompt: PromptEnvelope,
  timeout: number
): Promise<Omit<LLMResponse, "latencyMs">> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await callOpenAI(prompt, controller.signal);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callOpenAI(
  prompt: PromptEnvelope,
  signal: AbortSignal
): Promise<Omit<LLMResponse, "latencyMs">> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = prompt.governance?.model ?? "gpt-4o";
  const maxTokens = prompt.governance?.max_tokens ?? 1024;
  const temperature = prompt.governance?.temperature ?? 0.7;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: prompt.system_prompt },
        { role: "user", content: prompt.user_prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new LLMError(
      `OpenAI API error: ${response.status}`,
      response.status,
      errorBody
    );
  }

  const data = await response.json() as OpenAIResponse;

  return {
    content: data.choices[0]?.message?.content ?? "",
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
    finishReason: mapFinishReason(data.choices[0]?.finish_reason),
  };
}

// ============================================================================
// OpenAI Types
// ============================================================================

interface OpenAIResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

function mapFinishReason(reason?: string): LLMResponse["finishReason"] {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "content_filter";
    default:
      return "stop";
  }
}

// ============================================================================
// Error Handling
// ============================================================================

export class LLMError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = "LLMError";
  }
}

function isNonRetryableError(error: Error): boolean {
  if (error instanceof LLMError) {
    // Don't retry client errors (except rate limiting)
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return error.statusCode !== 429; // 429 is rate limit, should retry
    }
  }

  // Content filter errors
  if (error.message.includes("content_filter")) {
    return true;
  }

  // Invalid API key
  if (error.message.includes("invalid_api_key")) {
    return true;
  }

  return false;
}

// ============================================================================
// Streaming Support (for future use)
// ============================================================================

export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onComplete: (response: LLMResponse) => void;
  onError: (error: Error) => void;
}

/**
 * Stream LLM response token by token.
 */
export async function streamLLM(
  prompt: PromptEnvelope,
  callbacks: StreamingCallbacks,
  options: LLMCallOptions = {}
): Promise<void> {
  const { timeout = 60000 } = options;
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    callbacks.onError(new Error("OPENAI_API_KEY is not configured"));
    return;
  }

  const model = prompt.governance?.model ?? "gpt-4o";
  const maxTokens = prompt.governance?.max_tokens ?? 1024;
  const temperature = prompt.governance?.temperature ?? 0.7;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const startTime = Date.now();

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt.system_prompt },
          { role: "user", content: prompt.user_prompt },
        ],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LLMError(`OpenAI API error: ${response.status}`, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

      for (const line of lines) {
        const data = line.replace("data: ", "");
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as {
            choices: Array<{ delta: { content?: string } }>;
          };
          const token = parsed.choices[0]?.delta?.content;
          if (token) {
            fullContent += token;
            callbacks.onToken(token);
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }

    callbacks.onComplete({
      content: fullContent,
      model,
      usage: {
        promptTokens: 0, // Not available in streaming
        completionTokens: 0,
        totalTokens: 0,
      },
      finishReason: "stop",
      latencyMs: Date.now() - startTime,
    });
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Estimate the cost of an LLM call.
 */
export function estimateCost(usage: LLMResponse["usage"], model: string): number {
  // Prices per 1M tokens (as of late 2024)
  const prices: Record<string, { input: number; output: number }> = {
    "gpt-4o": { input: 2.5, output: 10 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10, output: 30 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  };

  const price = prices[model] ?? prices["gpt-4o"];
  const inputCost = (usage.promptTokens / 1_000_000) * price.input;
  const outputCost = (usage.completionTokens / 1_000_000) * price.output;

  return inputCost + outputCost;
}

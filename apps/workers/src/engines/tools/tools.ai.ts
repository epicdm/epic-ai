/**
 * Tools Engine v1 - AI Assist (Optional)
 *
 * Provides optional AI enhancement for tool selection.
 * NOT required - deterministic scoring works without this.
 *
 * This module is isolated so the engine works even when AI is down.
 *
 * @module engines/tools/ai
 */

import type { AgentType } from "@epic-ai/shared";
import type { ToolsEvidence } from "./tools.types";

// ============================================
// TYPES
// ============================================

export interface AIToolCandidate {
  toolId: string;
  name: string;
  description: string;
  category: string;
}

export interface AIToolSuggestion {
  /** Tools to enable */
  enableTools: string[];
  /** Tools to disable */
  disableTools: string[];
  /** Reasons for suggestions */
  reasons: string[];
  /** Evidence for the suggestion */
  evidence: ToolsEvidence[];
  /** Confidence in suggestion */
  confidence: number;
}

export interface AIToolSuggestParams {
  templateKey: AgentType;
  company: {
    name?: string;
    description?: string;
    industry?: string;
    services?: { name: string }[];
  };
  currentTools: string[];
  candidates: AIToolCandidate[];
}

// ============================================
// AI SUGGESTION (v1: STUB)
// ============================================

/**
 * Get AI-powered tool suggestions
 *
 * v1: Returns null by default (safe, deterministic-first).
 * Future: Wire to LLM with structured output.
 *
 * When implementing AI:
 * - Prompt includes company context and current tool selection
 * - Asks for tools to add/remove
 * - Requires JSON output with enableTools+disableTools+reasons+confidence
 * - Apply governance (no fabrication, must provide evidence)
 *
 * @param params Suggestion parameters
 * @returns AI suggestion or null if not available
 */
export async function aiSuggestTools(
  params: AIToolSuggestParams
): Promise<AIToolSuggestion | null> {
  // v1: Return null by default
  // This keeps the engine deterministic and testable
  // AI enhancement can be added later without breaking existing behavior

  // Future implementation would look like:
  // const openai = getOpenAIClient();
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o-mini",
  //   messages: [
  //     { role: "system", content: AI_TOOLS_PROMPT },
  //     { role: "user", content: JSON.stringify({
  //       templateKey: params.templateKey,
  //       company: params.company,
  //       currentTools: params.currentTools,
  //       candidates: params.candidates,
  //     })},
  //   ],
  //   response_format: { type: "json_object" },
  //   temperature: 0.3,
  // });

  return null;
}

// ============================================
// AI PROMPT (for future use)
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const AI_TOOLS_PROMPT = `You are selecting tools for an AI agent based on company needs.

GOVERNANCE RULES:
1. Base selections on actual company characteristics
2. Only recommend tools that match the company's services
3. Err on the side of fewer tools (agents should be focused)
4. Always include human handoff capability

Given the company profile and current tool selection, suggest improvements.

Respond with JSON:
{
  "enableTools": ["tool_id_1", "tool_id_2"],
  "disableTools": ["tool_id_3"],
  "reasons": ["reason1", "reason2"],
  "evidence": [
    { "field_path": "tool_config", "reasoning": "why these tools", "confidence": 0.8 }
  ],
  "confidence": 0.8
}`;

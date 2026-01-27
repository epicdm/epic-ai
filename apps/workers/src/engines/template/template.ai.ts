/**
 * Template Engine v1 - AI Assist (Optional)
 *
 * Provides optional AI enhancement for template selection.
 * NOT required - deterministic scoring works without this.
 *
 * This module is isolated so the engine works even when AI is down.
 *
 * @module engines/template/ai
 */

import type { AgentType } from "@epic-ai/shared";
import type {
  CompanyProfileLite,
  BrandVoiceProfileLite,
  EvidenceItemLite,
} from "./template.types";

// ============================================
// TYPES
// ============================================

export interface AITemplateCandidate {
  templateKey: AgentType;
  name: string;
  description: string;
}

export interface AITemplateSuggestion {
  suggested: AgentType;
  reasons: string[];
  evidence: EvidenceItemLite[];
  confidence: number;
}

export interface AISuggestParams {
  company: CompanyProfileLite;
  brand: BrandVoiceProfileLite;
  candidates: AITemplateCandidate[];
}

// ============================================
// AI SUGGESTION (v1: STUB)
// ============================================

/**
 * Get AI-powered template suggestion
 *
 * v1: Returns null by default (safe, deterministic-first).
 * Future: Wire to LLM with structured output.
 *
 * When implementing AI:
 * - Prompt includes company description/services
 * - Asks for best template among candidates
 * - Requires JSON output with suggested+reasons+confidence
 * - Apply governance (no fabrication, must provide evidence)
 *
 * @param params Suggestion parameters
 * @returns AI suggestion or null if not available
 */
export async function aiSuggestTemplate(
  params: AISuggestParams
): Promise<AITemplateSuggestion | null> {
  // v1: Return null by default
  // This keeps the engine deterministic and testable
  // AI enhancement can be added later without breaking existing behavior

  // Future implementation would look like:
  // const openai = getOpenAIClient();
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4o-mini",
  //   messages: [
  //     { role: "system", content: AI_TEMPLATE_PROMPT },
  //     { role: "user", content: JSON.stringify({
  //       company: params.company,
  //       brand: params.brand,
  //       candidates: params.candidates.map(c => ({
  //         key: c.templateKey,
  //         name: c.name,
  //         description: c.description,
  //       })),
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
const AI_TEMPLATE_PROMPT = `You are selecting the best AI agent template for a company.

GOVERNANCE RULES:
1. Base your selection on the company's actual characteristics
2. Provide confidence scores (0-1)
3. Support your choice with evidence from the input
4. If uncertain, prefer the safer/more general template

Given the company profile and brand voice, select the best template from the candidates list.

Respond with JSON:
{
  "suggested": "<template_key>",
  "reasons": ["reason1", "reason2"],
  "evidence": [
    { "field_path": "template.selection", "reasoning": "why this template fits", "confidence": 0.8 }
  ],
  "confidence": 0.8
}`;

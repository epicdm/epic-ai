/**
 * Tools Engine v1 - Deterministic Rules
 *
 * Scores tools against template and company context using keyword matching.
 * No AI required - fully deterministic and testable.
 *
 * @module engines/tools/rules
 */

import { TOOL_CATALOG } from "./tools.catalog";
import type { ToolRecommendationInput, ToolMatch } from "./tools.types";

// ============================================
// TEXT PROCESSING
// ============================================

/**
 * Normalize text for matching
 */
function normalizeText(s?: string): string {
  return (s || "").toLowerCase();
}

/**
 * Tokenize text into words
 */
function tokenize(s: string): string[] {
  return normalizeText(s)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Count keyword phrase hits in tokens
 */
function countHits(textTokens: string[], keywords: string[]): number {
  const tokenSet = new Set(textTokens);
  let hits = 0;

  for (const keyword of keywords) {
    const keywordTokens = tokenize(keyword);
    if (
      keywordTokens.length > 0 &&
      keywordTokens.every((t) => tokenSet.has(t))
    ) {
      hits++;
    }
  }

  return hits;
}

// ============================================
// SCORING WEIGHTS
// ============================================

const WEIGHTS = {
  /** Template affinity (strongest signal) */
  templateAffinity: 0.4,
  /** Purpose keyword match */
  purposeKeywords: 0.3,
  /** Channel compatibility */
  channelMatch: 0.15,
  /** Hint signals */
  hints: 0.15,
};

// ============================================
// SCORING
// ============================================

/**
 * Score all tools against the input context
 *
 * Scoring weights:
 * - Template affinity: 40% (strongest signal)
 * - Purpose keywords: 30%
 * - Channel compatibility: 15%
 * - Hints: 15%
 *
 * @param input Scoring input
 * @returns Sorted matches (highest score first)
 */
export function scoreTools(input: ToolRecommendationInput): ToolMatch[] {
  // Build combined text from company context
  const companyText = [
    input.company.industry,
    input.company.pricing_model,
    input.company.service_area,
    ...(input.company.services || []).map(
      (s) => `${s.name} ${s.description || ""} ${s.category || ""}`
    ),
    ...(input.company.products || []).map(
      (p) => `${p.name} ${p.description || ""} ${p.category || ""}`
    ),
  ]
    .filter(Boolean)
    .join(" ");

  const tokens = tokenize(companyText);

  // Score each tool
  const matches: ToolMatch[] = TOOL_CATALOG.map((tool) => {
    const featureHits: Record<string, number> = {};
    let score = 0;
    const reasons: string[] = [];

    // 1. Template affinity (strongest signal)
    if (tool.templateAffinity.includes(input.templateKey)) {
      score += WEIGHTS.templateAffinity;
      featureHits.templateAffinity = 1;
      reasons.push(`High affinity for ${input.templateKey} template`);
    }

    // 2. Purpose keyword matching
    const purposeHits = countHits(tokens, tool.purposeKeywords);
    if (purposeHits > 0) {
      const purposeScore =
        Math.min(1, purposeHits / Math.max(2, tool.purposeKeywords.length / 3)) *
        WEIGHTS.purposeKeywords;
      score += purposeScore;
      featureHits.purposeKeywords = purposeHits;
      reasons.push(`Matched ${purposeHits} purpose keyword(s)`);
    }

    // 3. Channel compatibility
    if (input.channels?.length) {
      const supportedChannels = input.channels.filter((c) =>
        tool.channels.includes(c)
      );
      if (supportedChannels.length > 0) {
        const channelScore =
          (supportedChannels.length / input.channels.length) *
          WEIGHTS.channelMatch;
        score += channelScore;
        featureHits.channelMatch = supportedChannels.length;
        reasons.push(`Supports ${supportedChannels.join(", ")} channel(s)`);
      } else {
        // Channel incompatibility penalty
        score *= 0.5;
        featureHits.channelPenalty = 1;
        reasons.push("Channel compatibility penalty applied");
      }
    }

    // 4. Hint-based scoring
    if (input.hints) {
      let hintScore = 0;
      let hintCount = 0;

      if (input.hints.needsBooking && tool.category === "calendar") {
        hintScore += WEIGHTS.hints;
        hintCount++;
        reasons.push("Booking hint matched");
      }
      if (input.hints.needsSupport && tool.category === "support") {
        hintScore += WEIGHTS.hints;
        hintCount++;
        reasons.push("Support hint matched");
      }
      if (input.hints.needsCRM && tool.category === "crm") {
        hintScore += WEIGHTS.hints;
        hintCount++;
        reasons.push("CRM hint matched");
      }
      if (input.hints.needsKnowledge && tool.category === "knowledge") {
        hintScore += WEIGHTS.hints;
        hintCount++;
        reasons.push("Knowledge hint matched");
      }
      if (input.hints.needsMessaging && tool.category === "messaging") {
        hintScore += WEIGHTS.hints;
        hintCount++;
        reasons.push("Messaging hint matched");
      }

      if (hintCount > 0) {
        score += hintScore / hintCount; // Average hint score
        featureHits.hints = hintCount;
      }
    }

    // Ensure human handoff is always available with minimum score
    if (tool.id === "handoff.human") {
      score = Math.max(score, 0.35);
      if (!reasons.some((r) => r.includes("affinity"))) {
        reasons.push("Human handoff always available");
      }
    }

    return {
      id: tool.id,
      score: clamp01(score),
      reasons: reasons.length > 0 ? reasons : ["Low signal match"],
      featureHits,
    };
  });

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Clamp value between 0 and 1
 */
function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export { clamp01 };

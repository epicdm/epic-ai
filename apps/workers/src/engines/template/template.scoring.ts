/**
 * Template Engine v1 - Deterministic Scoring
 *
 * Scores templates against company profile using keyword matching.
 * No AI required - fully deterministic and testable.
 *
 * @module engines/template/scoring
 */

import { TEMPLATE_CATALOG, type ChannelType } from "./template.catalog";
import type {
  BrandVoiceProfileLite,
  CompanyProfileLite,
  TemplateMatch,
} from "./template.types";
import type { AgentType } from "@epic-ai/shared";

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
 * A phrase hits if all its tokens are present
 */
function countHits(textTokens: string[], keywords: string[]): number {
  const tokenSet = new Set(textTokens);
  let hits = 0;

  for (const keyword of keywords) {
    const keywordTokens = tokenize(keyword);
    // Phrase hit if all tokens exist in text
    if (keywordTokens.length > 0 && keywordTokens.every((t) => tokenSet.has(t))) {
      hits++;
    }
  }

  return hits;
}

/**
 * Check for negative keyword matches
 */
function countNegativeHits(textTokens: string[], negativeKeywords?: string[]): number {
  if (!negativeKeywords || negativeKeywords.length === 0) return 0;
  return countHits(textTokens, negativeKeywords);
}

// ============================================
// SCORING
// ============================================

export interface ScoreTemplatesInput {
  company: CompanyProfileLite;
  brand: BrandVoiceProfileLite;
  channels?: string[];
  desiredTemplateKey?: AgentType | null;
}

/**
 * Score all templates against the company profile
 *
 * Scoring weights:
 * - Intent keywords: 50% (strongest signal)
 * - Service keywords: 30%
 * - Industry keywords: 20%
 *
 * Penalties:
 * - Channel incompatibility: -15%
 * - Negative keyword match: -10% per hit
 *
 * Bonuses:
 * - User requested template: +25%
 *
 * @param input Scoring input
 * @returns Sorted matches (highest score first)
 */
export function scoreTemplates(input: ScoreTemplatesInput): TemplateMatch[] {
  // Build combined text from company profile
  const companyText = [
    input.company.name,
    input.company.description,
    input.company.industry,
    input.company.target_audience,
    input.company.business_model,
    input.company.value_proposition,
    ...(input.company.products || []).map(
      (p) => `${p.name} ${p.description || ""} ${p.category || ""}`
    ),
    ...(input.company.services || []).map(
      (s) => `${s.name} ${s.description || ""} ${s.category || ""}`
    ),
    input.company.pricing_model,
    input.company.price_range,
  ]
    .filter(Boolean)
    .join(" ");

  // Build combined text from brand voice
  const brandText = [
    input.brand.detected_tone,
    ...(input.brand.sample_phrases || []),
    ...(input.brand.avoided_words || []),
  ]
    .filter(Boolean)
    .join(" ");

  // Tokenize all text
  const tokens = [...tokenize(companyText), ...tokenize(brandText)];

  // Score each template
  const matches: TemplateMatch[] = TEMPLATE_CATALOG.map((template) => {
    const featureHits: Record<string, number> = {};

    // Count signal hits
    const intentHits = countHits(tokens, template.signals.intentKeywords);
    const serviceHits = countHits(tokens, template.signals.serviceKeywords);
    const industryHits = template.signals.industryKeywords.includes("all")
      ? 1
      : countHits(tokens, template.signals.industryKeywords);
    const negativeHits = countNegativeHits(
      tokens,
      template.signals.negativeKeywords
    );

    featureHits.intent = intentHits;
    featureHits.service = serviceHits;
    featureHits.industry = industryHits;
    featureHits.negative = negativeHits;

    // Calculate base score with weights
    // Normalize by keyword list length to avoid bias toward templates with more keywords
    const intentScore =
      Math.min(
        1,
        intentHits / Math.max(3, template.signals.intentKeywords.length / 2)
      ) * 0.5;
    const serviceScore =
      Math.min(
        1,
        serviceHits / Math.max(3, template.signals.serviceKeywords.length / 2)
      ) * 0.3;
    const industryScore =
      Math.min(
        1,
        industryHits / Math.max(2, template.signals.industryKeywords.length / 3)
      ) * 0.2;

    let score = intentScore + serviceScore + industryScore;

    // Apply negative keyword penalty
    if (negativeHits > 0) {
      score *= Math.max(0.5, 1 - negativeHits * 0.1);
      featureHits.negativePenalty = negativeHits;
    }

    // Channel compatibility penalty
    if (input.channels?.length) {
      const unsupported = input.channels.filter(
        (c) => !template.channels_supported.includes(c as ChannelType)
      );
      if (unsupported.length > 0) {
        score *= 0.85;
        featureHits.channelPenalty = unsupported.length;
      }
    }

    // User preference bonus (not automatic selection)
    if (
      input.desiredTemplateKey &&
      input.desiredTemplateKey === template.key
    ) {
      score = Math.min(1, score + 0.25);
      featureHits.userBias = 1;
    }

    // Build human-readable reasons
    const reasons: string[] = [];
    if (intentHits > 0) {
      reasons.push(`Matched ${intentHits} intent signal(s)`);
    }
    if (serviceHits > 0) {
      reasons.push(`Matched ${serviceHits} service signal(s)`);
    }
    if (industryHits > 0) {
      reasons.push(`Matched ${industryHits} industry signal(s)`);
    }
    if (featureHits.channelPenalty) {
      reasons.push(`Channel compatibility penalty applied`);
    }
    if (featureHits.negativePenalty) {
      reasons.push(`Negative signal penalty applied`);
    }
    if (featureHits.userBias) {
      reasons.push(`User requested this template`);
    }

    return {
      templateKey: template.key,
      score: clamp01(score),
      reasons:
        reasons.length > 0
          ? reasons
          : ["Low signal match (fallback candidate)"],
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

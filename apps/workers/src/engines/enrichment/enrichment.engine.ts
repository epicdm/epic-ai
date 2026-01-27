/**
 * Enrichment Engine v1 - Orchestrator
 *
 * Turns a company website (+ optional manual answers) into structured
 * business intelligence the Agent OS can use.
 *
 * This engine feeds:
 * - role card context
 * - personality tone
 * - knowledge base seeds
 * - tool selection hints
 * - gap reduction
 *
 * @module engines/enrichment
 */

import { scrapeWebsiteText, type ScrapeResult } from "./enrichment.scraper";
import { extractCompanyIntel, type AIExtractionResult } from "./enrichment.ai";
import { mapToCompanyProfile, type MappedProfile } from "./enrichment.mapper";
import { detectEnrichmentGaps, type EnrichmentGap } from "./enrichment.gaps";

// ============================================
// TYPES
// ============================================

export interface EnrichmentEngineParams {
  /** The company website URL to enrich from */
  websiteUrl: string;
  /** Optional manual answers to supplement AI extraction */
  manualAnswers?: Record<string, string>;
  /** Optional job ID for tracking */
  jobId?: string;
  /** Skip AI extraction (deterministic only) */
  skipAI?: boolean;
}

export interface EnrichmentEngineResult {
  /** Structured company profile */
  company_profile: MappedProfile["company_profile"];
  /** Detected brand voice profile */
  brand_voice_profile: MappedProfile["brand_voice_profile"];
  /** Evidence supporting extracted data */
  evidence: AIExtractionResult["evidence"];
  /** Confidence scores per field */
  confidence: AIExtractionResult["confidence"];
  /** Detected gaps requiring manual input */
  gaps: EnrichmentGap[];
  /** Raw text excerpt from website */
  raw_excerpt: string;
  /** Processing metadata */
  metadata: {
    source_url: string;
    scraped_at: string;
    processing_time_ms: number;
    ai_tokens_used?: number;
  };
}

// ============================================
// ORCHESTRATOR
// ============================================

/**
 * Run the enrichment engine pipeline
 *
 * Pipeline:
 * 1. Scrape → Clean website text
 * 2. Extract → AI extraction with evidence
 * 3. Map → Transform to schema-compliant profile
 * 4. Gaps → Detect missing required fields
 *
 * @param params Engine parameters
 * @returns Enrichment result with profile, evidence, confidence, and gaps
 */
export async function runEnrichmentEngine(
  params: EnrichmentEngineParams
): Promise<EnrichmentEngineResult> {
  const startTime = Date.now();

  console.log(`[EnrichmentEngine] Starting for ${params.websiteUrl}`);

  // Step 1: Scrape website
  console.log(`[EnrichmentEngine] Step 1: Scraping website`);
  const scraped = await scrapeWebsiteText(params.websiteUrl);

  if (!scraped.success) {
    throw new Error(`Failed to scrape website: ${scraped.error}`);
  }

  // Step 2: AI extraction (unless skipped)
  let ai: AIExtractionResult;
  if (params.skipAI) {
    console.log(`[EnrichmentEngine] Step 2: Skipping AI extraction`);
    ai = {
      data: {},
      evidence: [],
      confidence: {},
      tokens_used: 0,
    };
  } else {
    console.log(`[EnrichmentEngine] Step 2: Extracting company intel with AI`);
    ai = await extractCompanyIntel({
      rawText: scraped.cleanedText,
      url: params.websiteUrl,
      title: scraped.title,
      metaDescription: scraped.metaDescription,
    });
  }

  // Step 3: Map to schema-compliant profile
  console.log(`[EnrichmentEngine] Step 3: Mapping to company profile`);
  const mapped = mapToCompanyProfile(ai.data, params.manualAnswers);

  // Step 4: Detect gaps
  console.log(`[EnrichmentEngine] Step 4: Detecting enrichment gaps`);
  const gaps = detectEnrichmentGaps(mapped);

  const processingTime = Date.now() - startTime;
  console.log(`[EnrichmentEngine] Complete in ${processingTime}ms`);

  return {
    company_profile: mapped.company_profile,
    brand_voice_profile: mapped.brand_voice_profile,
    evidence: ai.evidence,
    confidence: ai.confidence,
    gaps,
    raw_excerpt: scraped.excerpt,
    metadata: {
      source_url: params.websiteUrl,
      scraped_at: new Date().toISOString(),
      processing_time_ms: processingTime,
      ai_tokens_used: ai.tokens_used,
    },
  };
}

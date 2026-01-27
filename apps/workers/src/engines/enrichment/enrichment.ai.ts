/**
 * Enrichment Engine - AI Extraction
 *
 * Uses LLM to extract structured company intelligence from website text.
 * Includes evidence tracking and confidence scoring.
 *
 * @module engines/enrichment/ai
 */

import OpenAI from "openai";
import { z } from "zod";

// ============================================
// TYPES
// ============================================

export interface AIExtractionParams {
  /** Cleaned website text */
  rawText: string;
  /** Source URL */
  url: string;
  /** Page title */
  title?: string;
  /** Meta description */
  metaDescription?: string;
}

export interface EvidenceItem {
  /** Field this evidence supports */
  field_path: string;
  /** Type of evidence */
  source_type: "extraction" | "inference" | "manual";
  /** Supporting quote from source */
  quote?: string;
  /** Reasoning for inference */
  reasoning?: string;
  /** Confidence in this evidence */
  confidence: number;
}

export interface AIExtractionResult {
  /** Extracted company data */
  data: ExtractedCompanyData;
  /** Evidence supporting extractions */
  evidence: EvidenceItem[];
  /** Confidence scores per field */
  confidence: Record<string, number>;
  /** Tokens used for extraction */
  tokens_used: number;
}

export interface ExtractedCompanyData {
  company_name?: string;
  description?: string;
  industry?: string;
  services?: string[];
  products?: string[];
  email?: string;
  phone?: string;
  address?: string;
  tone?: string;
  formality_level?: number;
  sample_phrases?: string[];
  tone_confidence?: number;
  target_audience?: string;
  business_model?: string;
  value_proposition?: string;
}

// ============================================
// SCHEMAS
// ============================================

const ExtractionResponseSchema = z.object({
  company_name: z.string().optional(),
  description: z.string().max(500).optional(),
  industry: z.string().optional(),
  services: z.array(z.string()).optional(),
  products: z.array(z.string()).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional(),
  address: z.string().optional(),
  tone: z
    .enum([
      "professional",
      "friendly",
      "casual",
      "formal",
      "playful",
      "authoritative",
    ])
    .optional(),
  formality_level: z.number().min(1).max(5).optional(),
  sample_phrases: z.array(z.string().max(100)).max(5).optional(),
  target_audience: z.string().optional(),
  business_model: z
    .enum(["b2b", "b2c", "b2b2c", "marketplace", "saas", "consulting", "other"])
    .optional(),
  value_proposition: z.string().max(300).optional(),
  confidence: z.record(z.string(), z.number().min(0).max(1)),
  evidence: z.array(
    z.object({
      field: z.string(),
      quote: z.string().max(200).optional(),
      reasoning: z.string().max(200).optional(),
    })
  ),
});

// ============================================
// GOVERNANCE PROMPT
// ============================================

const GOVERNANCE_RULES = `
GOVERNANCE RULES (non-negotiable):
1. NEVER fabricate PII (email, phone, address) - only extract if explicitly present
2. NEVER invent pricing information
3. Provide confidence scores (0-1) for each extracted field
4. Support claims with evidence (quotes or reasoning)
5. Mark uncertain fields with confidence < 0.5
6. Prefer "null" over guessing for contact details
`;

const EXTRACTION_PROMPT = `You are extracting structured company information from website text.

${GOVERNANCE_RULES}

Extract the following fields from the provided text:
- company_name: The official company name
- description: Brief company description (max 500 chars)
- industry: Primary industry category
- services: List of services offered
- products: List of products offered
- email: Contact email (only if explicitly stated)
- phone: Contact phone (only if explicitly stated)
- address: Physical address (only if explicitly stated)
- tone: Writing tone (professional/friendly/casual/formal/playful/authoritative)
- formality_level: 1-5 scale (1=very casual, 5=very formal)
- sample_phrases: Up to 5 characteristic phrases that show their voice
- target_audience: Who they serve
- business_model: b2b/b2c/b2b2c/marketplace/saas/consulting/other
- value_proposition: Their main value prop (max 300 chars)

Also provide:
- confidence: Object with confidence scores (0-1) for each extracted field
- evidence: Array of {field, quote?, reasoning?} supporting each extraction

Respond in JSON format only.`;

// ============================================
// CLIENT
// ============================================

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for AI extraction"
      );
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// ============================================
// EXTRACTION
// ============================================

/**
 * Extract company intelligence using AI
 *
 * @param params Extraction parameters
 * @returns Extracted data with evidence and confidence
 */
export async function extractCompanyIntel(
  params: AIExtractionParams
): Promise<AIExtractionResult> {
  const openai = getOpenAIClient();

  // Build user message with context
  const userMessage = `
URL: ${params.url}
${params.title ? `Title: ${params.title}` : ""}
${params.metaDescription ? `Description: ${params.metaDescription}` : ""}

Website Text:
${params.rawText}
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from AI");
    }

    const parsed = JSON.parse(content);
    const validated = ExtractionResponseSchema.safeParse(parsed);

    if (!validated.success) {
      console.warn(
        "[EnrichmentAI] Schema validation failed:",
        validated.error.message
      );
      // Return partial data even if validation fails
    }

    const data = validated.success ? validated.data : parsed;

    // Transform evidence to standard format
    const evidence: EvidenceItem[] = (data.evidence || []).map(
      (e: { field: string; quote?: string; reasoning?: string }) => ({
        field_path: e.field,
        source_type: e.quote ? "extraction" : "inference",
        quote: e.quote,
        reasoning: e.reasoning,
        confidence: data.confidence?.[e.field] || 0.5,
      })
    );

    return {
      data: {
        company_name: data.company_name,
        description: data.description,
        industry: data.industry,
        services: data.services,
        products: data.products,
        email: data.email || undefined,
        phone: data.phone,
        address: data.address,
        tone: data.tone,
        formality_level: data.formality_level,
        sample_phrases: data.sample_phrases,
        tone_confidence: data.confidence?.tone,
        target_audience: data.target_audience,
        business_model: data.business_model,
        value_proposition: data.value_proposition,
      },
      evidence,
      confidence: data.confidence || {},
      tokens_used: response.usage?.total_tokens || 0,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI extraction failed";
    console.error("[EnrichmentAI] Extraction error:", message);

    // Return empty result on failure (deterministic extraction can still work)
    return {
      data: {},
      evidence: [],
      confidence: {},
      tokens_used: 0,
    };
  }
}

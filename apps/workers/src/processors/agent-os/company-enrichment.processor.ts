/**
 * Company Enrichment Job Processor
 *
 * Agent OS - Background job for enriching company profiles from website URLs.
 *
 * Pipeline (4 steps):
 *   Step A: Crawl - Multi-page website scraping (homepage + about/services/pricing/contact)
 *   Step B: Deterministic Extraction - Extract structured data with regex/patterns
 *   Step C: LLM Refinement - Optional AI enhancement for better accuracy
 *   Step D: Persist - Save to CompanyProfile with evidence and gaps
 *
 * @module processors/agent-os/company-enrichment
 */

import { prisma, Prisma } from '@epic-ai/database';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  type CompanyEnrichmentPayload,
  type CompanyEnrichmentResult,
  type BrandVoiceResult,
  type OfferingResult,
  type AudienceResult,
  CompanyEnrichmentPayloadSchema,
} from '../../types/payloads';
import { PROMPT_KEYS } from '@epic-ai/shared';
import {
  getTemplateRecommendations as getTemplateRecommendationsTREv1,
  buildRecommendationInput,
  DEFAULT_TEMPLATE_LIBRARY,
  type AgentTemplate,
} from './template-recommendation.engine';

// ============================================
// OPENAI CLIENT (LAZY INITIALIZATION)
// ============================================

let _openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for LLM refinement');
    }
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return _openai;
}

// ============================================
// LLM REFINEMENT TYPES & SCHEMAS
// ============================================

/**
 * Governance constraints for LLM refinement
 * These rules are non-negotiable and enforced at the prompt level
 */
interface LLMGovernance {
  no_pii_fabrication: boolean;      // Never invent contact details
  no_pricing_invention: boolean;    // Never fabricate pricing info
  confidence_required: boolean;     // Must provide confidence scores
  evidence_alignment_required: boolean; // Claims must align with evidence
}

/**
 * User payload sent to the LLM (structured extraction, not raw HTML)
 */
interface LLMUserPayload {
  source_url: string;
  pages_analyzed: number;
  title?: string;
  meta_description?: string;
  sections: Array<{ heading: string | null; text: string }>;
  deterministic_extraction: {
    name?: string;
    tagline?: string;
    industry?: string;
    email?: string;
    phone?: string;
    services: Array<{ name: string }>;
    products: Array<{ name: string }>;
    social_links: Record<string, string | undefined>;
  };
  brand_voice: {
    tone?: string;
    formality?: number;
    uses_first_person?: boolean;
    uses_emojis?: boolean;
  };
  existing_evidence: EvidenceItem[];
}

/**
 * Schema for LLM output validation
 * Matches the company_enrichment_v1 prompt contract
 */
const LLMRefinementOutputSchema = z.object({
  data: z.object({
    // LLM-inferred fields (not duplicating deterministic extraction)
    sub_industry: z.string().optional(),
    target_audience: z.string().optional(),
    business_model: z.enum(['b2b', 'b2c', 'b2b2c', 'marketplace', 'saas', 'consulting', 'unknown']).optional(),
    sales_complexity: z.enum(['simple', 'moderate', 'complex', 'enterprise']).optional(),
    service_category_tags: z.array(z.string()).optional(),
    refined_description: z.string().max(500).optional(),
    value_proposition: z.string().max(300).optional(),
    competitive_differentiators: z.array(z.string()).max(5).optional(),
    // Agent template recommendations - key for auto-scoring
    recommended_agent_types: z.array(z.enum([
      'sales_qualifier',
      'appointment_setter',
      'customer_support',
      'lead_capture',
      'booking_assistant',
      'faq_bot',
      'onboarding_guide',
      'product_recommender',
    ])).optional(),
  }),
  confidence: z.record(z.string(), z.number().min(0).max(1)),
  evidence: z.array(z.object({
    field_path: z.string(),
    source_type: z.literal('inference'),
    reasoning: z.string().max(200),
    confidence: z.number().min(0).max(1),
    quote: z.string().max(300).optional(),
  })),
  gaps: z.array(z.object({
    gap_type: z.string(),
    field_path: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    impact: z.string(),
    recommended_fix: z.string(),
  })),
  warnings: z.array(z.object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(['info', 'warning', 'error']),
  })).optional().default([]),
});

type LLMRefinementOutput = z.infer<typeof LLMRefinementOutputSchema>;

// ============================================
// MAIN PROCESSOR
// ============================================

/**
 * Process a company enrichment job
 * @param payload - Job payload with website URL and options
 * @returns Enrichment result with company data, brand voice, gaps
 */
export async function processCompanyEnrichmentJob(
  payload: unknown
): Promise<CompanyEnrichmentResult> {
  const startTime = Date.now();

  // Validate payload
  const parsed = CompanyEnrichmentPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid payload: ${parsed.error.message}`);
  }

  const {
    organizationId,
    websiteUrl,
    companyProfileId,
    manualAnswers,
    maxPages,
    skipLlmRefinement,
  } = parsed.data;

  console.log(`[EnrichCompany] Starting enrichment for ${websiteUrl}`);

  // Step A: Crawl - Multi-page website scraping
  console.log(`[EnrichCompany] Step A: Crawling website (max ${maxPages} pages)`);
  const crawlResult = await crawlWebsite(websiteUrl, maxPages);

  if (!crawlResult.success && crawlResult.pages.length === 0) {
    throw new Error(`Failed to crawl website: ${crawlResult.error}`);
  }

  // Step B: Deterministic Extraction
  console.log(`[EnrichCompany] Step B: Extracting data from ${crawlResult.pagesAnalyzed} pages`);
  const extraction = extractCompanyDataWithEvidence(crawlResult);

  // Analyze brand voice
  const brandVoice = analyzeBrandVoice(crawlResult.combinedText);

  // Extract offerings (products + services)
  const offerings = extractOfferings(extraction.data);

  // Infer audience from content
  const audience = inferAudience(crawlResult.combinedText, extraction.data.industry);

  // Step C: LLM Refinement (optional)
  let llmTokensUsed: number | undefined;
  let llmRefinedData: LLMRefinementOutput['data'] = {};
  let llmEvidence: EvidenceItem[] = [];
  let llmGaps: LLMRefinementOutput['gaps'] = [];
  let llmWarnings: LLMRefinementOutput['warnings'] = [];
  let llmConfidence: Record<string, number> = {};

  if (!skipLlmRefinement) {
    console.log(`[EnrichCompany] Step C: LLM refinement`);
    try {
      const llmResult = await executeLLMRefinement(crawlResult, extraction, brandVoice);
      llmRefinedData = llmResult.refinedData;
      llmEvidence = llmResult.evidence;
      llmGaps = llmResult.gaps;
      llmWarnings = llmResult.warnings;
      llmTokensUsed = llmResult.tokensUsed;
      llmConfidence = llmResult.confidence;
      console.log(`[EnrichCompany] LLM refinement complete (${llmTokensUsed} tokens)`);
    } catch (error) {
      console.error(`[EnrichCompany] LLM refinement failed:`, error);
      llmGaps.push({
        gap_type: 'llm_failure',
        field_path: 'enrichment.llm_refinement',
        severity: 'medium',
        impact: 'Advanced business intelligence not available',
        recommended_fix: 'Retry enrichment or provide manual answers',
      });
    }
  } else {
    console.log(`[EnrichCompany] Step C: LLM refinement skipped`);
  }

  // Calculate gaps (merge deterministic + LLM gaps)
  const deterministicGaps = calculateEnrichmentGaps(extraction.data, manualAnswers);
  const gaps = [...deterministicGaps, ...llmGaps];

  // Build confidence map (merge deterministic + LLM confidence)
  const deterministicConfidence = calculateConfidence(extraction, brandVoice, crawlResult);
  const confidence = { ...deterministicConfidence, ...llmConfidence };

  // Merge evidence (deterministic + LLM)
  const allEvidence = [...extraction.evidence, ...llmEvidence];

  // Merge manual answers
  const companyData = mergeManualAnswers(extraction.data, manualAnswers);

  // Get template recommendations using TRE v1 scoring algorithm
  const recommendedTemplates = await getTemplateRecommendationsWithDB({
    industry: companyData.industry,
    sub_industry: llmRefinedData.sub_industry,
    business_model: llmRefinedData.business_model,
    sales_complexity: llmRefinedData.sales_complexity,
    service_category_tags: llmRefinedData.service_category_tags,
    recommended_agent_types: llmRefinedData.recommended_agent_types,
    offerings,
  });

  // Build result
  const result: CompanyEnrichmentResult = {
    company: {
      name: companyData.name,
      tagline: companyData.tagline,
      description: llmRefinedData.refined_description || companyData.description,
      industry: companyData.industry,
      sub_industry: llmRefinedData.sub_industry,
      founded_year: companyData.founded_year,
      headquarters: companyData.headquarters,
      email: companyData.email,
      phone: companyData.phone,
      address: companyData.address,
      social_links: companyData.social_links || {},
      hours_of_operation: companyData.hours_of_operation,
      service_area: companyData.service_area,
      pricing_model: companyData.pricing_model,
      price_range: companyData.price_range,
      // LLM-refined fields
      business_model: llmRefinedData.business_model,
      sales_complexity: llmRefinedData.sales_complexity,
      target_audience: llmRefinedData.target_audience,
      value_proposition: llmRefinedData.value_proposition,
      competitive_differentiators: llmRefinedData.competitive_differentiators,
      service_category_tags: llmRefinedData.service_category_tags,
      recommended_agent_types: llmRefinedData.recommended_agent_types,
    },
    offerings,
    audience,
    brand_voice: brandVoice,
    recommended_agent_templates: recommendedTemplates,
    source_url: websiteUrl,
    pages_analyzed: crawlResult.pagesAnalyzed,
    scraped_at: new Date().toISOString(),
    gaps,
    confidence,
    evidence: allEvidence,
    processing_time_ms: Date.now() - startTime,
    llm_tokens_used: llmTokensUsed,
  };

  // Step D: Persist - Save to database
  console.log(`[EnrichCompany] Step D: Persisting results`);
  await persistEnrichmentResult(organizationId, companyProfileId, result, websiteUrl);

  console.log(`[EnrichCompany] Complete in ${result.processing_time_ms}ms`);
  return result;
}

// ============================================
// STEP A: CRAWL
// ============================================

interface PageSection {
  heading: string | null;
  text: string;
}

interface ScrapeResult {
  success: boolean;
  text: string;
  html: string;
  url: string;
  pageType: 'homepage' | 'about' | 'services' | 'pricing' | 'contact' | 'other';
  error?: string;
  // Structured extraction fields
  title?: string;
  metaDescription?: string;
  sections?: PageSection[];
}

interface CrawlResult {
  success: boolean;
  pages: ScrapeResult[];
  combinedText: string;
  combinedHtml: string;
  pagesAnalyzed: number;
  error?: string;
}

/**
 * Crawl website with controlled multi-page scraping
 */
async function crawlWebsite(baseUrl: string, maxPages: number): Promise<CrawlResult> {
  const pages: ScrapeResult[] = [];

  // Parse base URL
  let origin: string;
  try {
    const urlObj = new URL(baseUrl);
    origin = urlObj.origin;
  } catch {
    return {
      success: false,
      pages: [],
      combinedText: '',
      combinedHtml: '',
      pagesAnalyzed: 0,
      error: 'Invalid URL',
    };
  }

  // Scrape homepage first
  const homepage = await scrapePage(baseUrl);
  homepage.pageType = 'homepage';
  pages.push(homepage);

  if (!homepage.success) {
    return {
      success: false,
      pages,
      combinedText: '',
      combinedHtml: '',
      pagesAnalyzed: 1,
      error: homepage.error,
    };
  }

  // Discover additional pages using scoring heuristic
  const discoveredLinks = discoverRelatedLinks(homepage.html, origin, maxPages);

  // Scrape additional pages in parallel
  const additionalLimit = discoveredLinks.length;
  const additionalPages = await Promise.allSettled(
    discoveredLinks.slice(0, additionalLimit).map(async (link) => {
      const result = await scrapePage(link.url);
      result.pageType = link.pageType;
      return result;
    })
  );

  for (const result of additionalPages) {
    if (result.status === 'fulfilled' && result.value.success) {
      pages.push(result.value);
    }
  }

  // Combine text and HTML
  const combinedText = pages
    .map((p) => `[${p.pageType.toUpperCase()}]\n${p.text}`)
    .join('\n\n');
  const combinedHtml = pages.map((p) => p.html).join('\n');

  return {
    success: true,
    pages,
    combinedText,
    combinedHtml,
    pagesAnalyzed: pages.length,
  };
}

/**
 * Scrape a single page
 */
async function scrapePage(url: string): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        text: '',
        html: '',
        url,
        pageType: 'other',
        error: `HTTP ${response.status}`,
      };
    }

    const html = await response.text();
    
    // Use structured extraction
    const structured = extractStructuredText(html, url);
    const text = structured.rawText || extractTextFromHtml(html);

    return {
      success: true,
      text,
      html,
      url,
      pageType: 'other',
      title: structured.title,
      metaDescription: structured.metaDescription,
      sections: structured.sections,
    };
  } catch (error) {
    return {
      success: false,
      text: '',
      html: '',
      url,
      pageType: 'other',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract readable text from HTML
 */
function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');

  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');

  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  text = text
    .replace(/\s+/g, ' ')
    .replace(/\n\s+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}


/**
 * Extract structured text with sections from HTML
 * Converts messy HTML into structured sections with headings
 */
function extractStructuredText(
  html: string,
  url: string
): { title?: string; metaDescription?: string; sections: PageSection[]; rawText: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch?.[1]?.trim();

  // Extract meta description
  const metaMatch = html.match(/name=["']description["']\s+content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["']\s+name=["']description["']/i);
  const metaDescription = metaMatch?.[1]?.trim();

  // Remove noise elements
  let cleanHtml = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<img[^>]*>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<form[^>]*>[\s\S]*?<\/form>[\s\S]*?<\/footer>/gi, '');

  const sections: PageSection[] = [];

  // Find headings and their content
  const headingRegex = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match;

  while ((match = headingRegex.exec(cleanHtml)) !== null) {
    const heading = extractTextFromHtml(match[2]).trim();
    if (!heading) continue;

    // Find content between this heading and the next heading or end
    const startIdx = match.index + match[0].length;
    const nextHeadingMatch = cleanHtml.slice(startIdx).match(/<h[1-3][^>]*>/i);
    const endIdx = nextHeadingMatch ? startIdx + nextHeadingMatch.index! : startIdx + 2000;
    
    const contentHtml = cleanHtml.slice(startIdx, Math.min(endIdx, startIdx + 2000));
    const contentText = extractTextFromHtml(contentHtml).trim();

    if (contentText.length > 40) {
      sections.push({ heading, text: contentText });
    }
  }

  // Fallback if no headings found
  if (sections.length === 0) {
    const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || cleanHtml;
    const bodyText = extractTextFromHtml(bodyHtml).trim();
    
    if (bodyText.length > 200) {
      sections.push({ heading: null, text: bodyText.slice(0, 2000) });
    }
  }

  const rawText = sections.map(s => `${s.heading ?? ''}\n${s.text}`).join('\n\n');

  return { title, metaDescription, sections, rawText };
}

/**
 * Extract contact information with evidence tracking
 */
function extractContactsWithEvidence(
  text: string,
  url: string
): { contacts: { phone?: string; email?: string; whatsapp?: string }; evidence: EvidenceItem[] } {
  const evidence: EvidenceItem[] = [];
  const contacts: { phone?: string; email?: string; whatsapp?: string } = {};

  // Email extraction
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (emailMatch) {
    contacts.email = emailMatch[0];
    evidence.push({
      field_path: 'company.email',
      source_id: url,
      source_type: 'website_scrape',
      source_url: url,
      quote: emailMatch[0],
      confidence: 0.95,
      reasoning: 'Regex email match',
    });
  }

  // Phone extraction
  const phoneMatch = text.match(/(\+?\d[\d\s\-()]{7,})/);
  if (phoneMatch) {
    const cleanPhone = phoneMatch[0].replace(/\s+/g, ' ').trim();
    // Validate it looks like a real phone number (at least 10 digits)
    const digitCount = (cleanPhone.match(/\d/g) || []).length;
    if (digitCount >= 10) {
      contacts.phone = cleanPhone;
      evidence.push({
        field_path: 'company.phone',
        source_id: url,
        source_type: 'website_scrape',
        source_url: url,
        quote: cleanPhone,
        confidence: 0.95,
        reasoning: 'Regex phone pattern',
      });
    }
  }

  // WhatsApp detection
  if (/whatsapp/i.test(text)) {
    contacts.whatsapp = 'mentioned';
    evidence.push({
      field_path: 'company.whatsapp',
      source_id: url,
      source_type: 'website_scrape',
      source_url: url,
      quote: 'WhatsApp mentioned',
      confidence: 0.8,
      reasoning: 'Keyword detection',
    });
  }

  return { contacts, evidence };
}

/**
 * Detect pricing information with evidence tracking
 */
function detectPricingWithEvidence(
  text: string,
  url: string
): {
  pricing: { has_pricing: boolean; model?: string; notes?: string };
  evidence: EvidenceItem[];
} {
  const evidence: EvidenceItem[] = [];
  const pricingSignals = /(pricing|plans?|packages|rates|fees|per month|per year|\$|€|£)/i;

  const hasPricing = pricingSignals.test(text);

  if (hasPricing) {
    const snippet = text.match(/.{0,50}(pricing|plans?|packages|rates|fees).{0,50}/i)?.[0] || 'pricing-related text';
    evidence.push({
      field_path: 'offerings.pricing',
      source_id: url,
      source_type: 'website_scrape',
      source_url: url,
      quote: snippet.trim(),
      confidence: 0.75,
      reasoning: 'Pricing keyword context',
    });
  }

  return {
    pricing: {
      has_pricing: hasPricing,
      model: hasPricing ? 'unknown' : undefined,
      notes: hasPricing ? 'Pricing-related content detected' : 'No pricing info found',
    },
    evidence,
  };
}

/**
 * Extract services from structured sections with evidence tracking
 */
function extractServicesFromSections(
  sections: PageSection[],
  url: string
): { services: Array<{ name: string }>; evidence: EvidenceItem[] } {
  const services: Array<{ name: string }> = [];
  const evidence: EvidenceItem[] = [];

  for (const section of sections) {
    if (!section.heading) continue;

    // Check if this is a services-related section
    if (/services|solutions|what we do|products|offerings/i.test(section.heading)) {
      // Split on common list delimiters
      const lines = section.text
        .split(/[•\-–\n|]/)
        .map(l => l.trim())
        .filter(l => l.length > 4 && l.length < 120);

      for (const line of lines.slice(0, 6)) {
        // Skip lines that look like sentences rather than service names
        if (line.split(' ').length > 8) continue;

        services.push({ name: line });
        evidence.push({
          field_path: 'offerings.services',
          source_id: url,
          source_type: 'website_scrape',
          source_url: url,
          quote: line,
          confidence: 0.8,
          reasoning: `Service candidate under "${section.heading}" section`,
        });
      }
    }
  }

  return { services, evidence };
}

// ============================================
// LINK SCORING HEURISTIC
// ============================================

type LinkCategory = 'pricing' | 'services' | 'about' | 'contact' | 'other';

type LinkCandidate = {
  url: string;
  path: string;
  anchorText: string;
  isNavLink?: boolean;
  isFooterLink?: boolean;
  isMainContent?: boolean;
};

type ScoredLink = LinkCandidate & {
  score: number;
  category: LinkCategory;
};

/** Substrings that indicate pages to exclude */
const BAD_SUBSTRINGS = [
  'privacy', 'terms', 'legal', 'policy', 'cookies', 'gdpr',
  'careers', 'jobs', 'apply', 'press', 'newsroom', 'investors',
  'blog', 'article', 'post', 'category', 'tag', 'author',
];

/** File extensions to exclude */
const FILE_EXT_RE = /\.(pdf|jpg|jpeg|png|gif|svg|zip|doc|docx|xls|xlsx|css|js)$/i;

/**
 * Classify a link into a category based on URL/anchor text
 */
function classifyCategory(s: string): LinkCategory {
  const t = s.toLowerCase();
  if (/(pricing|plans?|packages|fees|rates)/.test(t)) return 'pricing';
  if (/(contact|support|help|book|schedule|demo)/.test(t)) return 'contact';
  if (/(services|solutions|products|offerings|what-we-do)/.test(t)) return 'services';
  if (/(about|company|who-we-are|team|our-story)/.test(t)) return 'about';
  return 'other';
}

/**
 * Map link category to page type for scraping
 */
function categoryToPageType(category: LinkCategory): ScrapeResult['pageType'] {
  switch (category) {
    case 'pricing':
      return 'pricing';
    case 'services':
      return 'services';
    case 'about':
      return 'about';
    case 'contact':
      return 'contact';
    default:
      return 'other';
  }
}

/**
 * Score a link candidate based on path, anchor text, and position
 *
 * Scoring components:
 * - KeywordScore (path-based): +6 to +30 based on signal strength
 * - AnchorScore (text-based): +6 to +18 based on signal strength
 * - PositionBoost: +8 nav, +10 main content, -8 footer
 * - Penalties: query params, deep paths, blog-like URLs, login pages
 */
function scoreLink(c: LinkCandidate): ScoredLink {
  const path = (c.path || '').toLowerCase();
  const text = (c.anchorText || '').toLowerCase();
  const combo = `${path} ${text}`;

  // Keyword score from path (cap at 35)
  let keyword = 0;
  const addPath = (re: RegExp, pts: number) => {
    if (re.test(path)) keyword += pts;
  };

  // High signal keywords
  addPath(/(pricing|plans?|packages|fees|rates)/, 30);
  addPath(/(contact|support|help|book|schedule|demo)/, 28);
  addPath(/(services|solutions|products|offerings|what-we-do)/, 26);
  addPath(/(about|company|who-we-are|team|our-story)/, 24);

  // Medium signal keywords
  addPath(/(industries|use-cases|case-studies|customers)/, 14);
  addPath(/(features|how-it-works|platform)/, 12);
  addPath(/(faq|knowledge|docs)/, 10);

  // Low signal keywords
  addPath(/(testimonials|reviews)/, 6);

  keyword = Math.min(keyword, 35);

  // Anchor score from link text (cap at 20)
  let anchor = 0;
  const addAnchor = (re: RegExp, pts: number) => {
    if (re.test(text)) anchor += pts;
  };

  addAnchor(/(pricing|plans?)/, 18);
  addAnchor(/(contact|book|schedule|demo|support)/, 16);
  addAnchor(/(services|solutions|products|offerings)/, 14);
  addAnchor(/(about|team|company)/, 12);
  addAnchor(/faq/, 6);

  anchor = Math.min(anchor, 20);

  // Position boost
  let pos = 0;
  if (c.isNavLink) pos += 8;
  if (c.isMainContent) pos += 10;
  if (c.isFooterLink) pos -= 8;

  // Penalties
  let penalties = 0;

  // Query params penalty (unless pricing/contact related)
  const hasQuery = c.url.includes('?');
  if (hasQuery && !/(pricing|contact|plans?)/.test(combo)) penalties -= 6;

  // Deep path penalty
  const depth = path.split('/').filter(Boolean).length;
  if (depth > 3) penalties -= 8;

  // Blog-like URL patterns
  const looksLikeYearPost = /\/(19|20)\d{2}\//.test(path);
  if (looksLikeYearPost) penalties -= 12;

  // Very long slugs (many hyphenated words)
  const hyphenWords = path.split('/').join('-').split('-').filter(Boolean).length;
  if (hyphenWords > 12) penalties -= 12;

  // Login/portal pages
  if (/(login|signup|register|portal|app)/.test(combo)) penalties -= 10;

  const score = keyword + anchor + pos + penalties;
  const category = classifyCategory(combo);

  return { ...c, score, category };
}

/**
 * Extract link candidates from HTML with context about position
 */
function extractLinkCandidates(html: string, origin: string): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const seenUrls = new Set<string>();

  // Parse sections to determine link context
  const navSection = html.match(/<nav[^>]*>[\s\S]*?<\/nav>/gi) || [];
  const headerSection = html.match(/<header[^>]*>[\s\S]*?<\/header>/gi) || [];
  const footerSection = html.match(/<footer[^>]*>[\s\S]*?<\/footer>/gi) || [];

  const navHtml = [...navSection, ...headerSection].join(' ');
  const footerHtml = footerSection.join(' ');

  // Extract all anchor tags with their text
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorRegex.exec(html)) !== null) {
    const href = match[1];
    const anchorHtml = match[2];

    // Clean anchor text (remove tags, trim)
    const anchorText = anchorHtml
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    try {
      const fullUrl = new URL(href, origin);

      // Skip if already seen
      if (seenUrls.has(fullUrl.href)) continue;
      seenUrls.add(fullUrl.href);

      // Determine position context
      const isNavLink = navHtml.includes(href);
      const isFooterLink = footerHtml.includes(href) && !isNavLink;
      const isMainContent = !isNavLink && !isFooterLink;

      candidates.push({
        url: fullUrl.href,
        path: fullUrl.pathname,
        anchorText,
        isNavLink,
        isFooterLink,
        isMainContent,
      });
    } catch {
      // Invalid URL, skip
    }
  }

  return candidates;
}

/**
 * Filter links that should be excluded
 */
function filterExcludedLinks(candidates: LinkCandidate[], homeDomain: string): LinkCandidate[] {
  return candidates.filter((c) => {
    try {
      const u = new URL(c.url);

      // Must be same domain
      if (u.host !== homeDomain) return false;

      // Skip special protocols
      if (c.url.startsWith('mailto:') || c.url.startsWith('tel:') || c.url.startsWith('javascript:')) {
        return false;
      }

      // Skip anchor-only links
      if (c.url.includes('#') && !c.url.includes('/#')) return false;

      // Skip file downloads
      if (FILE_EXT_RE.test(u.pathname)) return false;

      // Check for bad substrings
      const hay = `${u.pathname} ${c.anchorText}`.toLowerCase();
      if (BAD_SUBSTRINGS.some((s) => hay.includes(s))) return false;

      // Skip very long URLs unless they contain high-value keywords
      if (c.url.length > 160 && !/(pricing|contact|about|services|plans?)/.test(hay)) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  });
}

/**
 * Select top links with coverage across categories
 *
 * Algorithm:
 * 1. Score and classify all links
 * 2. Pick best link from each category (pricing, services, about, contact)
 * 3. Fill remaining slots with highest scoring links
 */
function selectTopLinksWithCoverage(
  candidates: LinkCandidate[],
  maxPages: number
): ScoredLink[] {
  // Score all candidates
  const scored = candidates.map(scoreLink).sort((a, b) => b.score - a.score);

  const picked: ScoredLink[] = [];
  const usedCategories = new Set<LinkCategory>();
  const usedUrls = new Set<string>();

  // Priority order for categories
  const categoryOrder: LinkCategory[] = ['pricing', 'services', 'about', 'contact'];

  // Pick best from each category first
  for (const cat of categoryOrder) {
    if (picked.length >= maxPages) break;

    const best = scored.find((s) => s.category === cat && !usedUrls.has(s.url));
    if (best) {
      picked.push(best);
      usedCategories.add(cat);
      usedUrls.add(best.url);
    }
  }

  // Fill remaining slots with highest scoring links
  for (const s of scored) {
    if (picked.length >= maxPages) break;
    if (usedUrls.has(s.url)) continue;

    picked.push(s);
    usedUrls.add(s.url);
  }

  return picked;
}

/**
 * Discover related links using scoring heuristic
 *
 * Uses a multi-factor scoring system to identify the most valuable pages:
 * - Path keywords (pricing, services, about, contact)
 * - Anchor text signals
 * - Position in page (nav, main content, footer)
 * - Penalties for blog posts, deep URLs, login pages
 *
 * Returns up to maxPages-1 links (homepage is page 0)
 */
function discoverRelatedLinks(
  html: string,
  origin: string,
  maxPages = 4
): Array<{ url: string; pageType: ScrapeResult['pageType'] }> {
  const homeDomain = new URL(origin).host;

  // Extract all link candidates with context
  const candidates = extractLinkCandidates(html, origin);

  // Filter out excluded links
  const filtered = filterExcludedLinks(candidates, homeDomain);

  // Select top links with category coverage
  const selected = selectTopLinksWithCoverage(filtered, maxPages - 1);

  // Map to expected output format
  return selected.map((link) => ({
    url: link.url,
    pageType: categoryToPageType(link.category),
  }));
}

// ============================================
// STEP B: DETERMINISTIC EXTRACTION
// ============================================

interface ExtractedData {
  name?: string;
  tagline?: string;
  description?: string;
  industry?: string;
  founded_year?: number;
  headquarters?: string;
  email?: string;
  phone?: string;
  address?: string;
  products: Array<{ name: string; description?: string; category?: string }>;
  services: Array<{ name: string; description?: string; category?: string }>;
  social_links: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
    youtube?: string;
  };
  hours_of_operation?: string;
  service_area?: string;
  pricing_model?: string;
  price_range?: string;
}

interface EvidenceItem {
  source_type: string;
  source_url?: string;
  source_id?: string;
  field_path: string;
  confidence: number;
  reasoning?: string;
  quote?: string;
}

interface ExtractionResult {
  data: ExtractedData;
  evidence: EvidenceItem[];
}

/**
 * Extract company data with evidence tracking
 */
function extractCompanyDataWithEvidence(crawlResult: CrawlResult): ExtractionResult {
  const evidence: EvidenceItem[] = [];
  const { combinedText, combinedHtml, pages } = crawlResult;

  // Extract basic data first (name, tagline, industry, social links)
  const data = extractCompanyData(combinedText, combinedHtml);

  // Use deterministic extractors for contacts across all pages
  for (const page of pages) {
    if (!page.success) continue;

    // Extract contacts with evidence
    const { contacts, evidence: contactEvidence } = extractContactsWithEvidence(page.text, page.url);
    
    // Only use first found email/phone (don't overwrite)
    if (contacts.email && !data.email) {
      data.email = contacts.email;
    }
    if (contacts.phone && !data.phone) {
      data.phone = contacts.phone;
    }
    
    // Add contact evidence (deduplicated)
    for (const ev of contactEvidence) {
      if (!evidence.some(e => e.field_path === ev.field_path)) {
        evidence.push(ev);
      }
    }

    // Extract services from sections if available
    if (page.sections && page.sections.length > 0) {
      const { services: sectionServices, evidence: serviceEvidence } = extractServicesFromSections(
        page.sections,
        page.url
      );
      
      // Merge services (avoid duplicates) - data.services contains { name: string } objects
      for (const svc of sectionServices) {
        if (!data.services.some(s => s.name.toLowerCase() === svc.name.toLowerCase())) {
          data.services.push({ name: svc.name });
        }
      }
      
      // Add service evidence
      evidence.push(...serviceEvidence);
    }

    // Detect pricing on each page
    const { pricing, evidence: pricingEvidence } = detectPricingWithEvidence(page.text, page.url);
    if (pricing.has_pricing) {
      evidence.push(...pricingEvidence);
    }

    // Name evidence from homepage
    if (data.name && page.pageType === 'homepage') {
      const titleMatch = page.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        evidence.push({
          source_type: 'website_scrape',
          source_url: page.url,
          field_path: 'company.name',
          confidence: 0.9,
          quote: data.name,
          reasoning: 'Extracted from page title',
        });
      }
    }

    // Services evidence from page type
    if (page.pageType === 'services' && data.services.length > 0) {
      if (!evidence.some(e => e.field_path === 'offerings' && e.source_url === page.url)) {
        evidence.push({
          source_type: 'website_scrape',
          source_url: page.url,
          field_path: 'offerings',
          confidence: 0.8,
          reasoning: 'Extracted from services page',
        });
      }
    }

    // Industry evidence
    if (data.industry) {
      if (!evidence.some(e => e.field_path === 'company.industry')) {
        evidence.push({
          source_type: 'inference',
          source_url: page.url,
          field_path: 'company.industry',
          confidence: 0.7,
          reasoning: 'Inferred from website content keywords',
        });
      }
    }
  }

  // Social links evidence
  for (const [platform, url] of Object.entries(data.social_links)) {
    if (url) {
      evidence.push({
        source_type: 'website_scrape',
        source_url: pages[0]?.url,
        field_path: `company.social_links.${platform}`,
        confidence: 0.95,
        quote: url as string,
        reasoning: 'Social link found in page HTML',
      });
    }
  }

  return { data, evidence };
}

/**
 * Extract company data from text and HTML
 */
function extractCompanyData(text: string, html: string): ExtractedData {
  // Extract name from title
  const nameMatch =
    html.match(/<title[^>]*>([^<]+)<\/title>/i) ||
    html.match(/property="og:site_name"\s+content="([^"]+)"/i);
  const rawName = nameMatch?.[1]?.trim();
  const name = rawName ? cleanCompanyName(rawName) : undefined;

  // Extract tagline from meta description
  const descMatch =
    html.match(/name="description"\s+content="([^"]+)"/i) ||
    html.match(/property="og:description"\s+content="([^"]+)"/i);
  const tagline = descMatch?.[1]?.trim();

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0];

  // Extract phone
  const phoneMatch = text.match(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch?.[0];

  // Detect industry
  const industry = detectIndustry(text.toLowerCase());

  // Extract social links
  const social_links = extractSocialLinks(html);

  // Extract products/services
  const { products, services } = extractProductsAndServices(text);

  return {
    name,
    tagline,
    description: tagline,
    industry,
    email,
    phone,
    products,
    services,
    social_links,
  };
}

/**
 * Clean company name
 */
function cleanCompanyName(raw: string): string {
  return raw
    .split(/\s*[\|–—-]\s*/)[0]
    .replace(/\s*(Home|Welcome|Official Site|Homepage)$/i, '')
    .trim();
}

/**
 * Detect industry from text
 */
function detectIndustry(text: string): string | undefined {
  const industryKeywords: Record<string, string[]> = {
    Technology: ['software', 'saas', 'tech', 'digital', 'app', 'platform', 'cloud'],
    Healthcare: ['health', 'medical', 'clinic', 'hospital', 'doctor', 'care'],
    Finance: ['finance', 'bank', 'investment', 'insurance', 'loan', 'credit'],
    'Real Estate': ['real estate', 'property', 'realty', 'homes', 'apartment'],
    Legal: ['law', 'attorney', 'lawyer', 'legal', 'litigation'],
    Marketing: ['marketing', 'advertising', 'agency', 'brand', 'creative'],
    'E-commerce': ['shop', 'store', 'buy', 'cart', 'ecommerce', 'retail'],
    Education: ['education', 'school', 'learning', 'course', 'training'],
    Restaurant: ['restaurant', 'food', 'menu', 'dining', 'cuisine'],
    Construction: ['construction', 'contractor', 'building', 'renovation'],
    Automotive: ['auto', 'car', 'vehicle', 'dealer', 'automotive'],
    'Professional Services': ['consulting', 'consultant', 'services', 'solutions'],
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const matchCount = keywords.filter((kw) => text.includes(kw)).length;
    if (matchCount >= 2) {
      return industry;
    }
  }

  return undefined;
}

/**
 * Extract social media links
 */
function extractSocialLinks(html: string): ExtractedData['social_links'] {
  const links: ExtractedData['social_links'] = {};

  const linkedinMatch = html.match(/href="(https?:\/\/(?:www\.)?linkedin\.com\/[^"]+)"/i);
  if (linkedinMatch) links.linkedin = linkedinMatch[1];

  const twitterMatch = html.match(/href="(https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^"]+)"/i);
  if (twitterMatch) links.twitter = twitterMatch[1];

  const facebookMatch = html.match(/href="(https?:\/\/(?:www\.)?facebook\.com\/[^"]+)"/i);
  if (facebookMatch) links.facebook = facebookMatch[1];

  const instagramMatch = html.match(/href="(https?:\/\/(?:www\.)?instagram\.com\/[^"]+)"/i);
  if (instagramMatch) links.instagram = instagramMatch[1];

  const youtubeMatch = html.match(/href="(https?:\/\/(?:www\.)?youtube\.com\/[^"]+)"/i);
  if (youtubeMatch) links.youtube = youtubeMatch[1];

  return links;
}

/**
 * Extract products and services
 */
function extractProductsAndServices(text: string): {
  products: ExtractedData['products'];
  services: ExtractedData['services'];
} {
  const products: ExtractedData['products'] = [];
  const services: ExtractedData['services'] = [];

  // Service patterns
  const servicePatterns = [
    /(?:our|we offer|providing|services include)[:\s]+([^.]+)/gi,
    /(?:services?):\s*([^.]+)/gi,
  ];

  for (const pattern of servicePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const items = match[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3 && s.length < 100);
      for (const item of items.slice(0, 5)) {
        if (!services.some((s) => s.name.toLowerCase() === item.toLowerCase())) {
          services.push({ name: item });
        }
      }
    }
  }

  // Product patterns
  const productPatterns = [/(?:products?|solutions?):\s*([^.]+)/gi];

  for (const pattern of productPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const items = match[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3 && s.length < 100);
      for (const item of items.slice(0, 5)) {
        if (!products.some((p) => p.name.toLowerCase() === item.toLowerCase())) {
          products.push({ name: item });
        }
      }
    }
  }

  return { products, services };
}

// ============================================
// BRAND VOICE ANALYSIS
// ============================================

/**
 * Analyze brand voice from text content
 */
function analyzeBrandVoice(text: string): BrandVoiceResult {
  if (!text || text.length < 100) {
    return {
      tone: 'professional',
      formality: 3,
      energy: 'moderate',
      vocabulary_style: 'moderate',
      uses_emojis: false,
      uses_first_person: false,
      sample_phrases: [],
      confidence: 0,
    };
  }

  const lowerText = text.toLowerCase();

  // Tone detection
  const toneScores = {
    professional: countKeywords(lowerText, ['professional', 'expertise', 'industry', 'solutions']),
    friendly: countKeywords(lowerText, ['welcome', 'happy', 'glad', 'help', 'friendly']),
    enthusiastic: countKeywords(lowerText, ['exciting', 'amazing', 'incredible', 'love', '!']),
    empathetic: countKeywords(lowerText, ['understand', 'care', 'support', 'help', 'together']),
    authoritative: countKeywords(lowerText, ['leading', 'expert', 'trusted', 'proven', 'best']),
    casual: countKeywords(lowerText, ['hey', 'cool', 'awesome', 'check out', 'easy']),
    warm: countKeywords(lowerText, ['family', 'community', 'care', 'heart', 'home']),
    formal: countKeywords(lowerText, ['hereby', 'therefore', 'pursuant', 'accordance']),
  };

  const maxScore = Math.max(...Object.values(toneScores));
  const detectedTone =
    maxScore > 0
      ? (Object.entries(toneScores).find(([, score]) => score === maxScore)?.[0] as BrandVoiceResult['tone'])
      : 'professional';

  // First person usage
  const usesFirstPerson = /\b(we|our|us)\b/i.test(text);

  // Emoji usage
  const usesEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(text);

  // Formality level
  let formality = 3;
  if (toneScores.formal > 3) formality = 5;
  else if (toneScores.professional > 3) formality = 4;
  else if (toneScores.casual > 3) formality = 2;
  else if (toneScores.friendly > 3) formality = 3;

  // Energy level
  const energy: BrandVoiceResult['energy'] =
    toneScores.enthusiastic > 3 ? 'energetic' : toneScores.formal > 3 ? 'calm' : 'moderate';

  // Vocabulary style
  const vocabularyStyle: BrandVoiceResult['vocabulary_style'] =
    formality >= 4 ? 'sophisticated' : formality <= 2 ? 'simple' : 'moderate';

  // Sample phrases
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 100);
  const samplePhrases = sentences.slice(0, 5);

  // Confidence
  const totalScore = Object.values(toneScores).reduce((a, b) => a + b, 0);
  const confidence = Math.min(0.9, (text.length / 5000) * 0.5 + (totalScore / 20) * 0.5);

  return {
    tone: detectedTone || 'professional',
    formality,
    energy,
    vocabulary_style: vocabularyStyle,
    uses_emojis: usesEmojis,
    uses_first_person: usesFirstPerson,
    sample_phrases: samplePhrases,
    confidence: Math.round(confidence * 100) / 100,
  };
}

/**
 * Count keyword occurrences
 */
function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches?.length || 0);
  }, 0);
}

// ============================================
// OFFERINGS & AUDIENCE EXTRACTION
// ============================================

/**
 * Extract offerings from extracted data
 */
function extractOfferings(data: ExtractedData): OfferingResult[] {
  const offerings: OfferingResult[] = [];

  for (const product of data.products) {
    offerings.push({
      name: product.name,
      description: product.description,
      category: product.category,
      is_service: false,
    });
  }

  for (const service of data.services) {
    offerings.push({
      name: service.name,
      description: service.description,
      category: service.category,
      is_service: true,
    });
  }

  return offerings;
}

/**
 * Infer audience personas from content
 */
function inferAudience(text: string, industry?: string): AudienceResult[] {
  const audiences: AudienceResult[] = [];
  const lowerText = text.toLowerCase();

  // Industry-specific audience inference
  const industryAudiences: Record<string, AudienceResult> = {
    Technology: {
      name: 'Business Decision Makers',
      description: 'CTOs, IT managers, and technical leads seeking software solutions',
      pain_points: ['Integration complexity', 'Scalability concerns'],
      goals: ['Improve efficiency', 'Reduce costs'],
    },
    Healthcare: {
      name: 'Healthcare Administrators',
      description: 'Hospital admins and practice managers',
      pain_points: ['Compliance requirements', 'Patient experience'],
      goals: ['Streamline operations', 'Improve patient care'],
    },
    'Real Estate': {
      name: 'Property Buyers/Sellers',
      description: 'Individuals looking to buy or sell property',
      pain_points: ['Market uncertainty', 'Finding the right property'],
      goals: ['Get best value', 'Quick transactions'],
    },
    'Professional Services': {
      name: 'Business Owners',
      description: 'SMB owners seeking professional expertise',
      pain_points: ['Time constraints', 'Expertise gaps'],
      goals: ['Grow business', 'Focus on core competencies'],
    },
  };

  if (industry && industryAudiences[industry]) {
    audiences.push(industryAudiences[industry]);
  }

  // Generic audience detection from content
  if (lowerText.includes('small business') || lowerText.includes('entrepreneur')) {
    audiences.push({
      name: 'Small Business Owners',
      description: 'Entrepreneurs and small business operators',
      pain_points: ['Limited resources', 'Wearing many hats'],
      goals: ['Grow revenue', 'Save time'],
    });
  }

  if (lowerText.includes('enterprise') || lowerText.includes('corporation')) {
    audiences.push({
      name: 'Enterprise Clients',
      description: 'Large organizations with complex needs',
      pain_points: ['Coordination across teams', 'Security requirements'],
      goals: ['Standardize processes', 'Enterprise-grade solutions'],
    });
  }

  return audiences;
}

// ============================================
// STEP C: LLM REFINEMENT
// ============================================

/**
 * Build the prompt envelope with governance constraints
 * Follows the company_enrichment_v1 prompt contract
 */
function buildPromptEnvelope(
  userPayload: LLMUserPayload,
  governance: LLMGovernance
): { system_prompt: string; user_prompt: string } {
  // System prompt with governance rules and output schema
  const systemPrompt = `You are an AI system that structures business intelligence into a strict schema.
You are given structured website content and deterministic signals.

## PROMPT ENVELOPE
{
  "task": "${PROMPT_KEYS.COMPANY_ENRICHMENT_V1}",
  "version": "1.0",
  "governance": {
    "no_pii_fabrication": ${governance.no_pii_fabrication},
    "no_pricing_invention": ${governance.no_pricing_invention},
    "confidence_required": ${governance.confidence_required},
    "evidence_alignment_required": ${governance.evidence_alignment_required}
  },
  "output_schema": "CompanyEnrichmentSchema"
}

## STRICT RULES (NON-NEGOTIABLE)
${governance.no_pii_fabrication ? '- Do NOT invent phone numbers, emails, or addresses' : ''}
${governance.no_pricing_invention ? '- Do NOT fabricate pricing information' : ''}
${governance.confidence_required ? '- If evidence is weak, mark LOW confidence (<0.6)' : ''}
${governance.evidence_alignment_required ? '- Every inferred field MUST include reasoning' : ''}
- If a field cannot be determined, leave null and add a gap
- Only infer when supported by context
- Use industry knowledge carefully — label as inferred

## YOUR TASK
1. Identify:
   - sub_industry: More specific than base industry (e.g., "Residential Solar Installation" not just "Energy")
   - target_audience: Who the company primarily serves
   - business_model: b2b, b2c, b2b2c, marketplace, saas, consulting, unknown
   - sales_complexity: simple (self-serve), moderate (some sales touch), complex (consultative), enterprise (long cycles)
   - service_category_tags: Normalized service categories

2. Normalize services into categories

3. Identify likely use cases for AI agents:
   - sales_qualifier: Qualifies inbound leads
   - appointment_setter: Books meetings/consultations
   - customer_support: Handles support queries
   - lead_capture: Captures visitor information
   - booking_assistant: Manages scheduling
   - faq_bot: Answers common questions
   - onboarding_guide: Helps new customers
   - product_recommender: Suggests products/services

4. Flag missing data as gaps

## OUTPUT FORMAT
Return valid JSON matching this structure:
{
  "data": {
    "sub_industry": "string or null",
    "target_audience": "string or null",
    "business_model": "b2b|b2c|b2b2c|marketplace|saas|consulting|unknown",
    "sales_complexity": "simple|moderate|complex|enterprise",
    "service_category_tags": ["category1", "category2"],
    "refined_description": "1-2 sentence description (max 500 chars)",
    "value_proposition": "core value prop (max 300 chars)",
    "competitive_differentiators": ["unique point 1", ...],
    "recommended_agent_types": ["sales_qualifier", "appointment_setter", ...]
  },
  "confidence": { "field_path": 0.0-1.0, ... },
  "evidence": [{ "field_path": "...", "source_type": "inference", "reasoning": "...", "confidence": 0.0-1.0, "quote": "..." }],
  "gaps": [{ "gap_type": "missing_data|missing_pricing|missing_contact|...", "field_path": "...", "severity": "low|medium|high", "impact": "...", "recommended_fix": "..." }],
  "warnings": []
}

## CONFIDENCE GUIDELINES
- 0.9+: Direct explicit statement found
- 0.7-0.9: Strong implication from multiple signals
- 0.5-0.7: Reasonable inference from context
- <0.6: Weak inference - add a gap for user confirmation`;

  // User prompt with structured data
  const userPrompt = `## COMPANY DATA FOR ANALYSIS

Website: ${userPayload.source_url}
Pages analyzed: ${userPayload.pages_analyzed}

### EXTRACTED METADATA
${userPayload.title ? `Title: ${userPayload.title}` : 'Title: Not found'}
${userPayload.meta_description ? `Meta Description: ${userPayload.meta_description}` : 'Meta Description: Not found'}

### STRUCTURED SECTIONS
${userPayload.sections.slice(0, 8).map((s, i) => `
[Section ${i + 1}]${s.heading ? ` ${s.heading}` : ''}
${s.text.slice(0, 400)}${s.text.length > 400 ? '...' : ''}
`).join('\n')}

### DETERMINISTIC FINDINGS (already extracted - do not re-extract these)
Company Name: ${userPayload.deterministic_extraction.name || 'Not found'}
Industry: ${userPayload.deterministic_extraction.industry || 'Not detected'}
Tagline: ${userPayload.deterministic_extraction.tagline || 'Not found'}
Email: ${userPayload.deterministic_extraction.email || 'Not found'}
Phone: ${userPayload.deterministic_extraction.phone || 'Not found'}
Services: ${userPayload.deterministic_extraction.services.map(s => s.name).join(', ') || 'None extracted'}
Products: ${userPayload.deterministic_extraction.products.map(p => p.name).join(', ') || 'None extracted'}
Social Links: ${Object.entries(userPayload.deterministic_extraction.social_links || {}).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'None found'}

### BRAND VOICE SIGNALS
Tone: ${userPayload.brand_voice.tone || 'unknown'}
Formality: ${userPayload.brand_voice.formality || 'unknown'}/5
Uses First Person: ${userPayload.brand_voice.uses_first_person ? 'Yes' : 'No'}
Uses Emojis: ${userPayload.brand_voice.uses_emojis ? 'Yes' : 'No'}

---
Analyze this data and return JSON only. Remember:
- Infer sub_industry, target_audience, business_model, sales_complexity
- Normalize services into category tags
- Recommend appropriate AI agent types
- Provide confidence scores and evidence for inferences
- Flag gaps where more information is needed`;

  return { system_prompt: systemPrompt, user_prompt: userPrompt };
}

/**
 * Prepare LLM user payload from extraction results
 */
function prepareLLMPayload(
  crawlResult: CrawlResult,
  extraction: ExtractionResult,
  brandVoice: BrandVoiceResult
): LLMUserPayload {
  // Collect sections from all pages
  const allSections: PageSection[] = [];
  for (const page of crawlResult.pages) {
    if (page.sections) {
      allSections.push(...page.sections);
    }
  }

  // Get homepage for title/description
  const homepage = crawlResult.pages.find(p => p.pageType === 'homepage');

  return {
    source_url: homepage?.url || crawlResult.pages[0]?.url || '',
    pages_analyzed: crawlResult.pagesAnalyzed,
    title: homepage?.title,
    meta_description: homepage?.metaDescription,
    sections: allSections.slice(0, 10), // Limit to 10 most relevant sections
    deterministic_extraction: {
      name: extraction.data.name,
      tagline: extraction.data.tagline,
      industry: extraction.data.industry,
      email: extraction.data.email,
      phone: extraction.data.phone,
      services: extraction.data.services,
      products: extraction.data.products,
      social_links: extraction.data.social_links,
    },
    brand_voice: {
      tone: brandVoice.tone,
      formality: brandVoice.formality,
      uses_first_person: brandVoice.uses_first_person,
      uses_emojis: brandVoice.uses_emojis,
    },
    existing_evidence: extraction.evidence,
  };
}

/**
 * Call LLM with validation and retry logic
 */
async function callLLMWithValidation(
  envelope: { system_prompt: string; user_prompt: string },
  maxRetries = 2
): Promise<{ output: LLMRefinementOutput; tokensUsed: number }> {
  let lastError: Error | null = null;
  let tokensUsed = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: envelope.system_prompt },
          { role: 'user', content: envelope.user_prompt },
          // Add repair prompt on retry
          ...(attempt > 0 && lastError ? [{
            role: 'user' as const,
            content: `Previous response failed validation: ${lastError.message}\n\nPlease fix the JSON structure and try again. Ensure all required fields are present and values are within bounds.`,
          }] : []),
        ],
        temperature: 0.3, // Low temperature for more consistent outputs
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      tokensUsed += response.usage?.total_tokens || 0;

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM');
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        throw new Error(`Invalid JSON: ${e instanceof Error ? e.message : 'Parse failed'}`);
      }

      // Validate with Zod schema
      const validated = LLMRefinementOutputSchema.parse(parsed);

      return { output: validated, tokensUsed };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[EnrichCompany] LLM attempt ${attempt + 1} failed: ${lastError.message}`);

      if (attempt === maxRetries) {
        // Return safe fallback on final failure
        console.error('[EnrichCompany] LLM refinement failed after retries, using fallback');
        return {
          output: {
            data: {},
            confidence: {},
            evidence: [],
            gaps: [{
              gap_type: 'llm_failure',
              field_path: 'enrichment.llm_refinement',
              severity: 'medium',
              impact: 'Advanced business intelligence not available',
              recommended_fix: 'Retry enrichment or provide manual answers',
            }],
            warnings: [{
              code: 'LLM_REFINEMENT_FAILED',
              message: lastError.message,
              severity: 'warning',
            }],
          },
          tokensUsed,
        };
      }
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('LLM refinement failed');
}

/**
 * Execute LLM refinement step
 *
 * This is the main entry point for Step C.
 * It builds the prompt, calls the LLM, validates output, and merges results.
 */
async function executeLLMRefinement(
  crawlResult: CrawlResult,
  extraction: ExtractionResult,
  brandVoice: BrandVoiceResult
): Promise<{
  refinedData: LLMRefinementOutput['data'];
  evidence: EvidenceItem[];
  gaps: LLMRefinementOutput['gaps'];
  warnings: LLMRefinementOutput['warnings'];
  tokensUsed: number;
  confidence: Record<string, number>;
}> {
  // Prepare the user payload
  const userPayload = prepareLLMPayload(crawlResult, extraction, brandVoice);

  // Define governance constraints
  const governance: LLMGovernance = {
    no_pii_fabrication: true,
    no_pricing_invention: true,
    confidence_required: true,
    evidence_alignment_required: true,
  };

  // Build prompt envelope
  const envelope = buildPromptEnvelope(userPayload, governance);

  // Call LLM with validation
  const { output, tokensUsed } = await callLLMWithValidation(envelope);

  // Convert LLM evidence to our EvidenceItem format
  const llmEvidence: EvidenceItem[] = output.evidence.map(e => ({
    source_type: e.source_type,
    source_url: userPayload.source_url,
    field_path: e.field_path,
    confidence: e.confidence,
    reasoning: e.reasoning,
    quote: e.quote,
  }));

  return {
    refinedData: output.data,
    evidence: llmEvidence,
    gaps: output.gaps,
    warnings: output.warnings || [],
    tokensUsed,
    confidence: output.confidence,
  };
}

// ============================================
// GAPS & CONFIDENCE
// ============================================

/**
 * Calculate enrichment gaps
 */
function calculateEnrichmentGaps(
  data: ExtractedData,
  manualAnswers?: CompanyEnrichmentPayload['manualAnswers']
): CompanyEnrichmentResult['gaps'] {
  const gaps: CompanyEnrichmentResult['gaps'] = [];

  // Missing pricing
  if (!manualAnswers?.pricing_model && !manualAnswers?.price_range) {
    gaps.push({
      gap_type: 'missing_pricing',
      field_path: 'enrichment.pricing',
      severity: 'high',
      impact: 'Agent cannot answer pricing questions accurately',
      recommended_fix: 'Provide pricing model and/or price range',
    });
  }

  // Missing hours
  if (!manualAnswers?.hours_of_operation) {
    gaps.push({
      gap_type: 'missing_hours',
      field_path: 'enrichment.hours_of_operation',
      severity: 'medium',
      impact: 'Agent cannot inform customers about availability',
      recommended_fix: 'Provide business hours',
    });
  }

  // Missing service area
  if (!manualAnswers?.service_area && !manualAnswers?.serves_nationwide) {
    gaps.push({
      gap_type: 'missing_service_area',
      field_path: 'enrichment.service_area',
      severity: 'medium',
      impact: 'Agent cannot qualify leads by location',
      recommended_fix: 'Specify service area or indicate if you serve nationwide',
    });
  }

  // No products or services
  if (data.products.length === 0 && data.services.length === 0) {
    gaps.push({
      gap_type: 'missing_required',
      field_path: 'enrichment.products_services',
      severity: 'high',
      impact: "Agent doesn't know what you offer",
      recommended_fix: 'Add products or services manually',
    });
  }

  // No contact info
  if (!data.email && !data.phone) {
    gaps.push({
      gap_type: 'missing_contact',
      field_path: 'enrichment.contact_info',
      severity: 'low',
      impact: 'Agent cannot provide contact details',
      recommended_fix: 'Add email and/or phone number',
    });
  }

  return gaps;
}

/**
 * Calculate confidence scores
 */
function calculateConfidence(
  extraction: ExtractionResult,
  brandVoice: BrandVoiceResult,
  crawlResult: CrawlResult
): Record<string, number> {
  const { data } = extraction;

  return {
    overall: crawlResult.success ? 0.7 + crawlResult.pagesAnalyzed * 0.05 : 0.3,
    'company.name': data.name ? 0.9 : 0.2,
    'company.industry': data.industry ? 0.75 : 0.2,
    'company.email': data.email ? 0.95 : 0,
    'company.phone': data.phone ? 0.95 : 0,
    offerings: data.products.length + data.services.length > 0 ? 0.7 : 0.2,
    brand_voice: brandVoice.confidence,
  };
}

// ============================================
// TEMPLATE RECOMMENDATIONS (TRE v1)
// ============================================

/**
 * Map database template to TRE v1 AgentTemplate format
 */
function mapDbTemplateToAgentTemplate(dbTemplate: {
  id: string;
  name: string;
  description: string | null;
  category: string;
  industries: string[];
  featured: boolean;
  popularity: number;
  metadata?: unknown;
}): AgentTemplate {
  // Parse metadata for additional fields
  const metadata = (dbTemplate.metadata || {}) as {
    business_models?: string[];
    sales_complexity_fit?: string[];
    service_categories?: string[];
    conversation_type?: string;
    market_effectiveness?: number;
    agent_type?: string;
  };

  // Map category to agent_type
  const categoryToAgentType: Record<string, AgentTemplate['agent_type']> = {
    SALES: 'sales_qualifier',
    SUPPORT: 'customer_support',
    BOOKING: 'appointment_setter',
    LEAD_GEN: 'lead_capture',
    FAQ: 'faq_bot',
    ONBOARDING: 'onboarding_guide',
    RECOMMENDER: 'product_recommender',
  };

  // Map category to conversation_type
  const categoryToConversationType: Record<string, AgentTemplate['conversation_type']> = {
    SALES: 'lead_gen',
    SUPPORT: 'support',
    BOOKING: 'booking',
    LEAD_GEN: 'lead_gen',
    FAQ: 'education',
    ONBOARDING: 'education',
    RECOMMENDER: 'sales',
  };

  return {
    id: dbTemplate.id,
    name: dbTemplate.name,
    description: dbTemplate.description || '',
    agent_type: (metadata.agent_type as AgentTemplate['agent_type']) || categoryToAgentType[dbTemplate.category] || 'lead_capture',
    industries: dbTemplate.industries,
    business_models: (metadata.business_models as AgentTemplate['business_models']) || ['b2b', 'b2c'],
    sales_complexity_fit: (metadata.sales_complexity_fit as AgentTemplate['sales_complexity_fit']) || ['simple', 'moderate'],
    service_categories: metadata.service_categories || [],
    conversation_type: (metadata.conversation_type as AgentTemplate['conversation_type']) || categoryToConversationType[dbTemplate.category] || 'lead_gen',
    market_effectiveness: metadata.market_effectiveness || (dbTemplate.featured ? 75 : 60),
    featured: dbTemplate.featured,
    popularity: dbTemplate.popularity,
  };
}

/**
 * Get template recommendations using TRE v1 algorithm
 * Fetches templates from database and applies multi-factor scoring
 */
async function getTemplateRecommendationsWithDB(input: {
  industry?: string;
  sub_industry?: string;
  business_model?: 'b2b' | 'b2c' | 'b2b2c' | 'marketplace' | 'saas' | 'consulting' | 'unknown';
  sales_complexity?: 'simple' | 'moderate' | 'complex' | 'enterprise';
  service_category_tags?: string[];
  recommended_agent_types?: Array<
    | 'sales_qualifier'
    | 'appointment_setter'
    | 'customer_support'
    | 'lead_capture'
    | 'booking_assistant'
    | 'faq_bot'
    | 'onboarding_guide'
    | 'product_recommender'
  >;
  offerings?: OfferingResult[];
}): Promise<CompanyEnrichmentResult['recommended_agent_templates']> {
  try {
    // Fetch templates from database
    const dbTemplates = await prisma.agentTemplate.findMany({
      where: { isActive: true },
      take: 20, // Fetch more for better scoring pool
      orderBy: [{ featured: 'desc' }, { popularity: 'desc' }],
    });

    // Convert to TRE v1 format
    let templates: AgentTemplate[];
    if (dbTemplates.length > 0) {
      templates = dbTemplates.map(mapDbTemplateToAgentTemplate);
    } else {
      // Fall back to default template library if DB is empty
      templates = DEFAULT_TEMPLATE_LIBRARY;
    }

    // Apply TRE v1 scoring algorithm
    const recommendations = getTemplateRecommendationsTREv1(input, templates, 5);

    // Map to result format (strip score_breakdown for cleaner API response)
    return recommendations.map(({ template_id, match_score, reasons }) => ({
      template_id,
      match_score,
      reasons,
    }));
  } catch (error) {
    console.error('[EnrichCompany] Template recommendation failed:', error);
    // Fall back to default library with TRE v1
    const recommendations = getTemplateRecommendationsTREv1(input, DEFAULT_TEMPLATE_LIBRARY, 5);
    return recommendations.map(({ template_id, match_score, reasons }) => ({
      template_id,
      match_score,
      reasons,
    }));
  }
}

// ============================================
// STEP D: PERSIST
// ============================================

/**
 * Merge manual answers into extracted data
 */
function mergeManualAnswers(
  data: ExtractedData,
  manualAnswers?: CompanyEnrichmentPayload['manualAnswers']
): ExtractedData {
  if (!manualAnswers) return data;

  return {
    ...data,
    hours_of_operation: manualAnswers.hours_of_operation,
    service_area: manualAnswers.service_area || (manualAnswers.serves_nationwide ? 'Nationwide' : undefined),
    pricing_model: manualAnswers.pricing_model,
    price_range: manualAnswers.price_range,
  };
}

/**
 * Persist enrichment result to database
 */
async function persistEnrichmentResult(
  organizationId: string,
  companyProfileId: string | undefined,
  result: CompanyEnrichmentResult,
  websiteUrl: string
): Promise<void> {
  // Cast to Prisma.InputJsonValue to satisfy type requirements
  const enrichedDataForDb = {
    website_scrape: {
      url: websiteUrl,
      scraped_at: result.scraped_at,
      pages_analyzed: result.pages_analyzed,
    },
    extracted: result.company,
    brand_voice: result.brand_voice,
    offerings: result.offerings,
    audience: result.audience,
    gaps: result.gaps,
    confidence: result.confidence,
    evidence: result.evidence,
  } as unknown as Prisma.InputJsonValue;

  await prisma.companyProfile.upsert({
    where: { organizationId },
    create: {
      organizationId,
      name: result.company.name || 'Unknown Company',
      website: websiteUrl,
      industry: result.company.industry,
      tagline: result.company.tagline,
      email: result.company.email,
      phone: result.company.phone,
      products: result.offerings.filter((o) => !o.is_service).map((o) => ({ name: o.name, description: o.description })),
      services: result.offerings.filter((o) => o.is_service).map((o) => ({ name: o.name, description: o.description })),
      socialLinks: result.company.social_links,
      enrichedData: enrichedDataForDb,
      enrichedAt: new Date(),
    },
    update: {
      website: websiteUrl,
      industry: result.company.industry,
      tagline: result.company.tagline,
      email: result.company.email,
      phone: result.company.phone,
      products: result.offerings.filter((o) => !o.is_service).map((o) => ({ name: o.name, description: o.description })),
      services: result.offerings.filter((o) => o.is_service).map((o) => ({ name: o.name, description: o.description })),
      socialLinks: result.company.social_links,
      enrichedData: enrichedDataForDb,
      enrichedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

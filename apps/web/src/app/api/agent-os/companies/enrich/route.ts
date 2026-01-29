/**
 * Agent OS - Company Enrichment Job
 *
 * POST /api/agent-os/companies/enrich
 * Enrich company profile from website URL + manual answers
 *
 * FOUNDATION-2: Enrichment Job Pipeline
 *
 * Contract:
 * - Input: website_url + manual_answers
 * - Output: company_profile + brand_voice_profile envelope
 * - Save to company record + enrichedAt timestamp
 * - Produce gaps if missing pricing/hours/service_area
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import {
  EnrichCompanyRequestSchema,
  type ApiResponse,
  type GapItem,
  type EnrichmentResult,
  type BrandVoiceProfile,
  type EnrichedCompanyData,
  type EvidenceItem,
  type EnrichCompanyRequest,
} from "@epic-ai/shared";
import type { CompanyProfile } from "@prisma/client";

type EnrichResponse = ApiResponse<{
  companyProfile: CompanyProfile;
  enrichmentResult: EnrichmentResult;
}>;

/**
 * POST /api/agent-os/companies/enrich
 * Enrich company profile from website
 */
export async function POST(request: NextRequest): Promise<NextResponse<EnrichResponse>> {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json(
        { data: null, error: { code: "NO_ORG", message: "No organization found" } },
        { status: 404 }
      );
    }

    // Parse and validate request
    const body = await request.json();
    const parsed = EnrichCompanyRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { website_url, manual_answers } = parsed.data;

    // Check if company profile exists
    let existingProfile = await prisma.companyProfile.findUnique({
      where: { organizationId: org.id },
    });

    // Perform multi-page website scraping (V1: homepage + about + services/pricing/contact)
    const multiPageResult = await scrapeMultiplePages(website_url);

    // Extract company data from scraped content with evidence tracking
    const { data: extractedData, evidence } = extractCompanyDataWithEvidence(
      multiPageResult.pages,
      multiPageResult.combinedText,
      multiPageResult.combinedHtml
    );

    // Analyze brand voice from combined text
    const brandVoice = analyzeBrandVoice(multiPageResult.combinedText);

    // Merge extracted data with manual answers
    const enrichedCompanyData: EnrichedCompanyData = {
      ...extractedData,
      // Override with manual answers where provided
      hours_of_operation: manual_answers?.hours_of_operation,
      service_area: manual_answers?.service_area,
      pricing_model: manual_answers?.pricing_model,
      price_range: manual_answers?.price_range,
    };

    // Calculate gaps for missing critical fields
    const gaps = calculateEnrichmentGaps(enrichedCompanyData, manual_answers);

    // Build confidence map
    const confidence: Record<string, number> = {
      overall: multiPageResult.success ? 0.7 + (multiPageResult.pagesAnalyzed * 0.05) : 0.3,
      "company_profile.name": enrichedCompanyData.name ? 0.9 : 0.2,
      "company_profile.industry": enrichedCompanyData.industry ? 0.75 : 0.2,
      "company_profile.email": enrichedCompanyData.email ? 0.95 : 0,
      "company_profile.phone": enrichedCompanyData.phone ? 0.95 : 0,
      "company_profile.products": enrichedCompanyData.products.length > 0 ? 0.7 : 0.2,
      "company_profile.services": enrichedCompanyData.services.length > 0 ? 0.7 : 0.2,
      "brand_voice_profile": brandVoice.detection_confidence,
      "company_profile.pricing_model": manual_answers?.pricing_model ? 0.95 : 0,
      "company_profile.hours_of_operation": manual_answers?.hours_of_operation ? 0.95 : 0,
      "company_profile.service_area": manual_answers?.service_area ? 0.95 : 0,
    };

    // Build the enrichment result envelope with evidence tracking
    const enrichmentResult: EnrichmentResult = {
      company_profile: enrichedCompanyData,
      brand_voice_profile: brandVoice,
      evidence,
      confidence,
      gaps,
      source_url: website_url,
      scraped_at: new Date().toISOString(),
      scrape_success: multiPageResult.success,
      pages_analyzed: multiPageResult.pagesAnalyzed,
      raw_text_excerpt: multiPageResult.combinedText.slice(0, 2000),
    };

    // Prepare data for database update
    const enrichedDataForDb = {
      website_scrape: {
        url: website_url,
        scraped_at: new Date().toISOString(),
        success: multiPageResult.success,
        text_excerpt: multiPageResult.combinedText.slice(0, 5000),
      },
      extracted: enrichedCompanyData,
      brand_voice: brandVoice,
      manual_answers: manual_answers || {},
    };

    // Upsert company profile with enrichment data
    const companyProfile = await prisma.companyProfile.upsert({
      where: { organizationId: org.id },
      create: {
        organizationId: org.id,
        name: enrichedCompanyData.name || existingProfile?.name || "Unknown Company",
        website: website_url,
        industry: enrichedCompanyData.industry,
        tagline: enrichedCompanyData.tagline,
        email: enrichedCompanyData.email,
        phone: enrichedCompanyData.phone,
        products: enrichedCompanyData.products,
        services: enrichedCompanyData.services,
        socialLinks: enrichedCompanyData.social_links,
        enrichedData: enrichedDataForDb,
        enrichedAt: new Date(),
      },
      update: {
        website: website_url,
        industry: enrichedCompanyData.industry || existingProfile?.industry,
        tagline: enrichedCompanyData.tagline || existingProfile?.tagline,
        email: enrichedCompanyData.email || existingProfile?.email,
        phone: enrichedCompanyData.phone || existingProfile?.phone,
        products: enrichedCompanyData.products.length > 0
          ? enrichedCompanyData.products
          : (existingProfile?.products ?? []),
        services: enrichedCompanyData.services.length > 0
          ? enrichedCompanyData.services
          : (existingProfile?.services ?? []),
        socialLinks: {
          ...(existingProfile?.socialLinks as Record<string, unknown> || {}),
          ...enrichedCompanyData.social_links,
        },
        enrichedData: enrichedDataForDb,
        enrichedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Generate warnings
    const warnings = [];
    if (!multiPageResult.success) {
      warnings.push({
        code: "SCRAPE_PARTIAL",
        message: "Website scraping encountered issues; some data may be incomplete",
        severity: "warning" as const,
        suggestion: "Provide manual answers to fill gaps",
      });
    }

    if (multiPageResult.pagesAnalyzed > 1) {
      warnings.push({
        code: "MULTI_PAGE_SCAN",
        message: `Successfully analyzed ${multiPageResult.pagesAnalyzed} pages from website`,
        severity: "info" as const,
      });
    }

    if (brandVoice.detection_confidence < 0.5) {
      warnings.push({
        code: "LOW_VOICE_CONFIDENCE",
        message: "Brand voice detection had low confidence",
        severity: "info" as const,
        suggestion: "Review and adjust personality settings manually",
      });
    }

    return NextResponse.json({
      data: {
        companyProfile,
        enrichmentResult,
      },
      confidence,
      gaps,
      warnings,
    });
  } catch (error) {
    console.error("Error enriching company profile:", error);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to enrich company profile" } },
      { status: 500 }
    );
  }
}

// ============================================
// SCRAPING UTILITIES
// ============================================

interface ScrapeResult {
  success: boolean;
  text: string;
  html: string;
  url: string;
  pageType: "homepage" | "about" | "services" | "pricing" | "contact" | "other";
  error?: string;
}

interface MultiPageScrapeResult {
  success: boolean;
  pages: ScrapeResult[];
  combinedText: string;
  combinedHtml: string;
  pagesAnalyzed: number;
}

/**
 * Basic website scraping - fetches page and extracts text
 * Note: This is a basic implementation that can be enhanced later
 */
async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EpicAI/1.0; +https://epic.dm)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return {
        success: false,
        text: "",
        html: "",
        url,
        pageType: "other",
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const html = await response.text();
    const text = extractTextFromHtml(html);

    return {
      success: true,
      text,
      html,
      url,
      pageType: "other", // Will be set by caller
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      text: "",
      html: "",
      url,
      pageType: "other",
      error: errorMessage,
    };
  }
}

/**
 * Extract readable text from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Replace block elements with newlines
  text = text.replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

/**
 * Scrape multiple pages from a website for comprehensive enrichment
 * V1: homepage + about + services/pricing/contact pages
 */
async function scrapeMultiplePages(baseUrl: string): Promise<MultiPageScrapeResult> {
  const pages: ScrapeResult[] = [];

  // Parse base URL to get origin
  let origin: string;
  try {
    const urlObj = new URL(baseUrl);
    origin = urlObj.origin;
  } catch {
    return {
      success: false,
      pages: [],
      combinedText: "",
      combinedHtml: "",
      pagesAnalyzed: 0,
    };
  }

  // First, scrape the homepage
  const homepageResult = await scrapeWebsite(baseUrl);
  homepageResult.pageType = "homepage";
  homepageResult.url = baseUrl;
  pages.push(homepageResult);

  if (!homepageResult.success) {
    return {
      success: false,
      pages,
      combinedText: homepageResult.text,
      combinedHtml: homepageResult.html,
      pagesAnalyzed: 1,
    };
  }

  // Discover additional pages from homepage links
  const discoveredLinks = discoverRelatedLinks(homepageResult.html, origin);

  // Scrape discovered pages in parallel (limited to 4 additional pages)
  const additionalPages = await Promise.allSettled(
    discoveredLinks.slice(0, 4).map(async (link) => {
      const result = await scrapeWebsite(link.url);
      result.pageType = link.pageType;
      result.url = link.url;
      return result;
    })
  );

  for (const result of additionalPages) {
    if (result.status === "fulfilled" && result.value.success) {
      pages.push(result.value);
    }
  }

  // Combine all text and HTML
  const combinedText = pages.map(p => `[${p.pageType.toUpperCase()}]\n${p.text}`).join("\n\n");
  const combinedHtml = pages.map(p => p.html).join("\n");

  return {
    success: true,
    pages,
    combinedText,
    combinedHtml,
    pagesAnalyzed: pages.length,
  };
}

/**
 * Discover related links for about, services, pricing, contact pages
 */
function discoverRelatedLinks(html: string, origin: string): Array<{ url: string; pageType: ScrapeResult["pageType"] }> {
  const links: Array<{ url: string; pageType: ScrapeResult["pageType"] }> = [];
  const seenPaths = new Set<string>();

  // Page type patterns
  const pagePatterns: Array<{ type: ScrapeResult["pageType"]; patterns: RegExp[] }> = [
    {
      type: "about",
      patterns: [/\/about/i, /\/who-we-are/i, /\/our-story/i, /\/company/i, /\/team/i]
    },
    {
      type: "services",
      patterns: [/\/services/i, /\/what-we-do/i, /\/solutions/i, /\/offerings/i, /\/products/i]
    },
    {
      type: "pricing",
      patterns: [/\/pricing/i, /\/prices/i, /\/plans/i, /\/rates/i, /\/cost/i]
    },
    {
      type: "contact",
      patterns: [/\/contact/i, /\/get-in-touch/i, /\/reach-us/i, /\/location/i]
    },
  ];

  // Extract all href attributes
  const hrefRegex = /href=["']([^"']+)["']/gi;
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    let href = match[1];

    // Skip anchors, javascript, mailto, tel, etc.
    if (href.startsWith("#") || href.startsWith("javascript:") ||
        href.startsWith("mailto:") || href.startsWith("tel:") ||
        href.includes("cdn") || href.match(/\.(jpg|png|gif|css|js|pdf)/i)) {
      continue;
    }

    // Convert relative URLs to absolute
    try {
      const fullUrl = new URL(href, origin);

      // Only same-origin links
      if (fullUrl.origin !== origin) continue;

      const path = fullUrl.pathname.toLowerCase();

      // Skip if already seen
      if (seenPaths.has(path)) continue;

      // Check against page patterns
      for (const { type, patterns } of pagePatterns) {
        if (patterns.some(p => p.test(path))) {
          // Don't add duplicates of the same type
          if (!links.some(l => l.pageType === type)) {
            links.push({ url: fullUrl.href, pageType: type });
            seenPaths.add(path);
          }
          break;
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }

  return links;
}

// ============================================
// DATA EXTRACTION
// ============================================

interface ExtractionResult {
  data: EnrichedCompanyData;
  evidence: EvidenceItem[];
}

/**
 * Extract company data from scraped content with evidence tracking
 */
function extractCompanyDataWithEvidence(
  pages: ScrapeResult[],
  combinedText: string,
  combinedHtml: string
): ExtractionResult {
  const evidence: EvidenceItem[] = [];
  const now = new Date().toISOString();

  // Use the combined text and html for extraction
  const data = extractCompanyData(combinedText, combinedHtml);

  // Track evidence for each field found
  for (const page of pages) {
    if (!page.success) continue;

    // Track company name evidence
    if (data.name && page.pageType === "homepage") {
      const nameMatch = page.html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (nameMatch && nameMatch[1].includes(data.name.split(" ")[0])) {
        evidence.push({
          source_type: "website_scrape",
          source_url: page.url,
          field_path: "company_profile.name",
          confidence: 0.9,
          extracted_text: nameMatch[1].slice(0, 200),
          reasoning: "Extracted from page title",
          timestamp: now,
        });
      }
    }

    // Track tagline evidence
    if (data.tagline && page.pageType === "homepage") {
      evidence.push({
        source_type: "website_scrape",
        source_url: page.url,
        field_path: "company_profile.tagline",
        confidence: 0.8,
        extracted_text: data.tagline.slice(0, 200),
        reasoning: "Extracted from meta description",
        timestamp: now,
      });
    }

    // Track email evidence
    if (data.email && page.text.includes(data.email)) {
      if (!evidence.some(e => e.field_path === "company_profile.email")) {
        const context = extractTextContext(page.text, data.email, 50);
        evidence.push({
          source_type: "website_scrape",
          source_url: page.url,
          field_path: "company_profile.email",
          confidence: 0.95,
          extracted_text: context,
          reasoning: `Found on ${page.pageType} page`,
          timestamp: now,
        });
      }
    }

    // Track phone evidence
    if (data.phone && page.text.includes(data.phone)) {
      if (!evidence.some(e => e.field_path === "company_profile.phone")) {
        const context = extractTextContext(page.text, data.phone, 50);
        evidence.push({
          source_type: "website_scrape",
          source_url: page.url,
          field_path: "company_profile.phone",
          confidence: 0.95,
          extracted_text: context,
          reasoning: `Found on ${page.pageType} page`,
          timestamp: now,
        });
      }
    }

    // Track industry evidence
    if (data.industry && !evidence.some(e => e.field_path === "company_profile.industry")) {
      evidence.push({
        source_type: "inference",
        source_url: page.url,
        field_path: "company_profile.industry",
        confidence: 0.7,
        reasoning: "Inferred from website content keywords",
        timestamp: now,
      });
    }

    // Track services evidence from services page
    if (page.pageType === "services" && data.services.length > 0) {
      evidence.push({
        source_type: "website_scrape",
        source_url: page.url,
        field_path: "company_profile.services",
        confidence: 0.8,
        extracted_text: data.services.map(s => s.name).join(", ").slice(0, 200),
        reasoning: "Extracted from services page",
        timestamp: now,
      });
    }

    // Track pricing evidence from pricing page
    if (page.pageType === "pricing") {
      const hasPricingContent = /\$[\d,]+|\bprice|\bplan|\bmonth|\byear/i.test(page.text);
      if (hasPricingContent) {
        evidence.push({
          source_type: "website_scrape",
          source_url: page.url,
          field_path: "company_profile.pricing_model",
          confidence: 0.6,
          reasoning: "Pricing page found but specific model not yet extracted",
          timestamp: now,
        });
      }
    }
  }

  // Add social links evidence
  for (const [platform, url] of Object.entries(data.social_links || {})) {
    if (url) {
      evidence.push({
        source_type: "website_scrape",
        source_url: pages[0]?.url || "",
        field_path: `company_profile.social_links.${platform}`,
        confidence: 0.95,
        extracted_text: url,
        reasoning: "Social link found in page HTML",
        timestamp: now,
      });
    }
  }

  return { data, evidence };
}

/**
 * Extract text context around a match
 */
function extractTextContext(text: string, match: string, contextChars: number): string {
  const index = text.indexOf(match);
  if (index === -1) return match;

  const start = Math.max(0, index - contextChars);
  const end = Math.min(text.length, index + match.length + contextChars);
  let context = text.slice(start, end).trim();

  if (start > 0) context = "..." + context;
  if (end < text.length) context = context + "...";

  return context;
}

/**
 * Extract company data from scraped content (basic extraction)
 */
function extractCompanyData(text: string, html: string): EnrichedCompanyData {
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();

  // Extract company name from title or og:site_name
  const nameMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    || html.match(/property="og:site_name"\s+content="([^"]+)"/i)
    || html.match(/property="og:title"\s+content="([^"]+)"/i);
  const rawName = nameMatch?.[1]?.trim();
  const name = rawName ? cleanCompanyName(rawName) : undefined;

  // Extract tagline/description from meta
  const descMatch = html.match(/name="description"\s+content="([^"]+)"/i)
    || html.match(/property="og:description"\s+content="([^"]+)"/i);
  const tagline = descMatch?.[1]?.trim();

  // Extract email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0];

  // Extract phone
  const phoneMatch = text.match(/(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  const phone = phoneMatch?.[0];

  // Try to detect industry from common keywords
  const industry = detectIndustry(lowerText);

  // Extract social links from HTML
  const social_links = extractSocialLinks(html);

  // Extract products/services (basic keyword detection)
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
 * Clean up company name (remove suffix like " | Home")
 */
function cleanCompanyName(raw: string): string {
  return raw
    .split(/\s*[\|–—-]\s*/)[0]
    .replace(/\s*(Home|Welcome|Official Site|Homepage)$/i, "")
    .trim();
}

/**
 * Detect industry from text content
 */
function detectIndustry(text: string): string | undefined {
  const industryKeywords: Record<string, string[]> = {
    "Technology": ["software", "saas", "tech", "digital", "app", "platform", "cloud"],
    "Healthcare": ["health", "medical", "clinic", "hospital", "doctor", "patient", "care"],
    "Finance": ["finance", "bank", "investment", "insurance", "loan", "credit"],
    "Real Estate": ["real estate", "property", "realty", "homes", "apartment", "mortgage"],
    "Legal": ["law", "attorney", "lawyer", "legal", "litigation"],
    "Marketing": ["marketing", "advertising", "agency", "brand", "creative"],
    "E-commerce": ["shop", "store", "buy", "cart", "ecommerce", "retail"],
    "Education": ["education", "school", "learning", "course", "training", "academy"],
    "Restaurant": ["restaurant", "food", "menu", "dining", "cuisine", "chef"],
    "Construction": ["construction", "contractor", "building", "renovation", "remodel"],
    "Automotive": ["auto", "car", "vehicle", "dealer", "automotive", "repair"],
    "Professional Services": ["consulting", "consultant", "services", "solutions"],
  };

  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    const matchCount = keywords.filter(kw => text.includes(kw)).length;
    if (matchCount >= 2) {
      return industry;
    }
  }

  return undefined;
}

/**
 * Extract social media links from HTML
 */
function extractSocialLinks(html: string): EnrichedCompanyData["social_links"] {
  const links: EnrichedCompanyData["social_links"] = {};

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
 * Extract products and services from text (basic extraction)
 */
function extractProductsAndServices(text: string): {
  products: EnrichedCompanyData["products"];
  services: EnrichedCompanyData["services"];
} {
  const products: EnrichedCompanyData["products"] = [];
  const services: EnrichedCompanyData["services"] = [];

  // Look for common service-related phrases
  const servicePatterns = [
    /(?:our|we offer|providing|services include)[:\s]+([^.]+)/gi,
    /(?:services?):\s*([^.]+)/gi,
  ];

  for (const pattern of servicePatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 100);
      for (const item of items.slice(0, 5)) { // Limit to 5 items
        if (!services.some(s => s.name.toLowerCase() === item.toLowerCase())) {
          services.push({ name: item });
        }
      }
    }
  }

  // Look for common product-related phrases
  const productPatterns = [
    /(?:products?|solutions?):\s*([^.]+)/gi,
  ];

  for (const pattern of productPatterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const items = match[1].split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 100);
      for (const item of items.slice(0, 5)) {
        if (!products.some(p => p.name.toLowerCase() === item.toLowerCase())) {
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
 * Analyze text to detect brand voice characteristics
 */
function analyzeBrandVoice(text: string): BrandVoiceProfile {
  if (!text || text.length < 100) {
    return {
      detection_confidence: 0,
      sample_phrases: [],
      avoided_words: [],
    };
  }

  const lowerText = text.toLowerCase();

  // Detect tone based on keyword presence
  const toneScores = {
    professional: countKeywords(lowerText, ["professional", "expertise", "industry", "solutions", "enterprise"]),
    friendly: countKeywords(lowerText, ["welcome", "happy", "glad", "help", "friendly", "team"]),
    enthusiastic: countKeywords(lowerText, ["exciting", "amazing", "incredible", "love", "passion", "!"]),
    empathetic: countKeywords(lowerText, ["understand", "care", "support", "help", "listen", "together"]),
    authoritative: countKeywords(lowerText, ["leading", "expert", "trusted", "proven", "award", "best"]),
    casual: countKeywords(lowerText, ["hey", "cool", "awesome", "check out", "easy"]),
    warm: countKeywords(lowerText, ["family", "community", "care", "heart", "home"]),
    formal: countKeywords(lowerText, ["hereby", "therefore", "pursuant", "accordance", "shall"]),
  };

  // Find the dominant tone
  const maxScore = Math.max(...Object.values(toneScores));
  const detectedTone = maxScore > 0
    ? (Object.entries(toneScores).find(([, score]) => score === maxScore)?.[0] as BrandVoiceProfile["detected_tone"])
    : "professional";

  // Detect first person usage
  const usesFirstPerson = /\b(we|our|us)\b/i.test(text);

  // Detect technical jargon
  const usesJargon = countKeywords(lowerText, [
    "leverage", "synergy", "optimize", "scalable", "roi", "kpi", "api", "saas", "b2b", "b2c"
  ]) > 2;

  // Detect emoji usage
  const usesEmojis = /[\u{1F300}-\u{1F9FF}]/u.test(text);

  // Estimate formality (1-5)
  let formality = 3;
  if (toneScores.formal > 3) formality = 5;
  else if (toneScores.professional > 3) formality = 4;
  else if (toneScores.casual > 3) formality = 2;
  else if (toneScores.friendly > 3) formality = 3;

  // Extract sample phrases (sentences under 100 chars with brand-relevant content)
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20 && s.length < 100);
  const samplePhrases = sentences.slice(0, 5);

  // Calculate confidence based on text length and keyword matches
  const totalScore = Object.values(toneScores).reduce((a, b) => a + b, 0);
  const detectionConfidence = Math.min(0.9, (text.length / 5000) * 0.5 + (totalScore / 20) * 0.5);

  return {
    detected_tone: detectedTone,
    formality_level: formality,
    uses_first_person: usesFirstPerson,
    uses_technical_jargon: usesJargon,
    uses_emojis: usesEmojis,
    sentence_complexity: formality >= 4 ? "complex" : formality <= 2 ? "simple" : "moderate",
    sample_phrases: samplePhrases,
    avoided_words: [],
    detection_confidence: Math.round(detectionConfidence * 100) / 100,
  };
}

/**
 * Count occurrences of keywords in text
 */
function countKeywords(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = text.match(regex);
    return count + (matches?.length || 0);
  }, 0);
}

// ============================================
// GAP CALCULATION
// ============================================

/**
 * Calculate gaps for missing critical business information
 * Key gaps: pricing, hours, service_area
 */
function calculateEnrichmentGaps(
  data: EnrichedCompanyData,
  manualAnswers?: EnrichCompanyRequest["manual_answers"]
): GapItem[] {
  const gaps: GapItem[] = [];

  // GAP: Missing pricing information
  if (!manualAnswers?.pricing_model && !manualAnswers?.price_range) {
    gaps.push({
      gap_type: "missing_pricing" as const,
      field_path: "enrichment.pricing",
      severity: "high" as const,
      impact: "Agent cannot answer pricing questions accurately",
      recommended_fix: "Provide pricing model and/or price range",
      question_to_user: "What is your pricing model? (e.g., hourly, fixed, subscription)",
    });
  }

  // GAP: Missing hours of operation
  if (!manualAnswers?.hours_of_operation) {
    gaps.push({
      gap_type: "missing_hours" as const,
      field_path: "enrichment.hours_of_operation",
      severity: "medium" as const,
      impact: "Agent cannot inform customers about availability",
      recommended_fix: "Provide business hours",
      question_to_user: "What are your hours of operation?",
    });
  }

  // GAP: Missing service area
  if (!manualAnswers?.service_area && !manualAnswers?.serves_nationwide) {
    gaps.push({
      gap_type: "missing_service_area" as const,
      field_path: "enrichment.service_area",
      severity: "medium" as const,
      impact: "Agent cannot qualify leads by location",
      recommended_fix: "Specify service area or indicate if you serve nationwide",
      question_to_user: "What geographic area do you serve?",
    });
  }

  // GAP: No products or services detected
  if (data.products.length === 0 && data.services.length === 0) {
    gaps.push({
      gap_type: "missing_data" as const,
      field_path: "enrichment.products_services",
      severity: "high" as const,
      impact: "Agent doesn't know what you offer",
      recommended_fix: "Add products or services manually, or check website content",
      question_to_user: "What products or services does your company offer?",
    });
  }

  // GAP: No contact information
  if (!data.email && !data.phone) {
    gaps.push({
      gap_type: "missing_contact" as const,
      field_path: "enrichment.contact_info",
      severity: "low" as const,
      impact: "Agent cannot provide contact details to customers",
      recommended_fix: "Add email and/or phone number",
    });
  }

  return gaps;
}

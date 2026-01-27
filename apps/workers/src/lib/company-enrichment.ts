/**
 * Company Enrichment Helpers
 *
 * Ensures a CompanyProfile has enriched baseline data before AO assembly.
 * This is v1: deterministic normalization only, no web scraping yet.
 *
 * Future versions will integrate:
 * - Website scraping
 * - LLM-powered analysis
 * - Social profile extraction
 */

import { prisma, Prisma } from '@epic-ai/database';

// ============================================================================
// Types
// ============================================================================

export interface EnrichedData {
  company_name: string;
  website_url: string | null;
  industry: string;
  company_size: string;
  headquarters: string | null;
  mission: string | null;
  services: unknown[];
  products: unknown[];
  target_markets: string[];
  competitors: string[];
  // Enrichment signals for gap detection
  enrichment_signals: {
    has_website: boolean;
    has_services: boolean;
    has_products: boolean;
    has_mission: boolean;
    has_industry: boolean;
  };
}

export interface EnrichmentGap {
  field: string;
  severity: 'low' | 'medium' | 'high';
  impact: string;
  suggestion: string;
}

export interface EnsureEnrichedResult {
  companyProfile: Awaited<ReturnType<typeof prisma.companyProfile.findUnique>>;
  wasEnriched: boolean;
  gaps: EnrichmentGap[];
}

export interface EnsureEnrichedOptions {
  force?: boolean;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Ensures a CompanyProfile has enriched baseline data.
 *
 * Behavior:
 * - Loads company profile by ID
 * - Applies minimal deterministic normalization using existing stored fields
 * - If force=true OR enrichedAt missing OR website changed => run enrich step
 * - Enrich step (v1): normalize fields, detect gaps, stamp enrichedAt
 *
 * NOTE: This function does NOT scrape the web yet. It ensures the DB has
 * a consistent enrichedData baseline so AO can proceed.
 *
 * @throws Error with code 'COMPANY_NOT_FOUND' if companyProfileId doesn't exist
 */
export async function ensureCompanyEnriched(
  companyProfileId: string,
  websiteUrl?: string,
  opts?: EnsureEnrichedOptions
): Promise<EnsureEnrichedResult> {
  const force = Boolean(opts?.force);

  const companyProfile = await prisma.companyProfile.findUnique({
    where: { id: companyProfileId },
  });

  if (!companyProfile) {
    throw new Error('COMPANY_NOT_FOUND');
  }

  const existingUrl = (companyProfile.website || '').trim() || undefined;
  const incomingUrl = (websiteUrl || '').trim() || undefined;

  const urlChanged =
    Boolean(incomingUrl) && Boolean(existingUrl) && incomingUrl !== existingUrl;

  const shouldEnrich =
    force ||
    !companyProfile.enrichedAt ||
    (Boolean(incomingUrl) && !existingUrl) ||
    urlChanged;

  // Build baseline enriched data (always safe, no fabrication)
  const baselineData = normalizeEnrichedData(companyProfile);

  // Detect gaps in company data
  const gaps = detectEnrichmentGaps(companyProfile, baselineData);

  // If we don't need to enrich, ensure baseline data exists and return
  if (!shouldEnrich) {
    const existingEnrichedData = companyProfile.enrichedData as Record<string, unknown> | null;

    if (!existingEnrichedData || Object.keys(existingEnrichedData).length === 0) {
      const updated = await prisma.companyProfile.update({
        where: { id: companyProfileId },
        data: {
          enrichedData: baselineData as unknown as Prisma.InputJsonValue,
        },
      });
      return { companyProfile: updated, wasEnriched: false, gaps };
    }

    return { companyProfile, wasEnriched: false, gaps };
  }

  // "Enrichment v1" - deterministic normalization only
  // Future: integrate website scraping, LLM analysis here
  const existingEnrichedData = (companyProfile.enrichedData as Record<string, unknown>) || {};
  const mergedData = mergeShallow(baselineData as unknown as Record<string, unknown>, existingEnrichedData);

  const updated = await prisma.companyProfile.update({
    where: { id: companyProfileId },
    data: {
      website: incomingUrl ?? companyProfile.website,
      enrichedData: mergedData as unknown as Prisma.InputJsonValue,
      enrichedAt: new Date(),
    },
  });

  return { companyProfile: updated, wasEnriched: true, gaps };
}

// ============================================================================
// Normalization
// ============================================================================

/**
 * Normalize company profile fields into a stable enrichedData structure.
 * Intentionally conservative: never invents facts.
 */
function normalizeEnrichedData(
  companyProfile: NonNullable<Awaited<ReturnType<typeof prisma.companyProfile.findUnique>>>
): EnrichedData {
  const name = (companyProfile.name || '').trim() || 'Unknown Company';
  const industry = (companyProfile.industry || '').trim() || 'unknown';
  const companySize = (companyProfile.companySize || '').trim() || 'unknown';
  const headquarters = (companyProfile.headquarters || '').trim() || null;
  const mission = (companyProfile.mission || '').trim() || null;

  // Parse JSON fields safely
  const services = parseJsonArray(companyProfile.services);
  const products = parseJsonArray(companyProfile.products);
  const targetMarkets = Array.isArray(companyProfile.targetMarkets)
    ? companyProfile.targetMarkets
    : [];
  const competitors = Array.isArray(companyProfile.competitors)
    ? companyProfile.competitors
    : [];

  return {
    company_name: name,
    website_url: (companyProfile.website || '').trim() || null,
    industry,
    company_size: companySize,
    headquarters,
    mission,
    services,
    products,
    target_markets: targetMarkets,
    competitors,
    enrichment_signals: {
      has_website: Boolean(companyProfile.website),
      has_services: services.length > 0,
      has_products: products.length > 0,
      has_mission: Boolean(mission),
      has_industry: industry !== 'unknown',
    },
  };
}

/**
 * Safely parse a JSON field that should be an array
 */
function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// ============================================================================
// Gap Detection
// ============================================================================

/**
 * Detect gaps in company data that may affect AO quality.
 * Returns actionable suggestions for each gap.
 */
function detectEnrichmentGaps(
  companyProfile: NonNullable<Awaited<ReturnType<typeof prisma.companyProfile.findUnique>>>,
  enrichedData: EnrichedData
): EnrichmentGap[] {
  const gaps: EnrichmentGap[] = [];

  // Website is crucial for enrichment
  if (!enrichedData.enrichment_signals.has_website) {
    gaps.push({
      field: 'website',
      severity: 'high',
      impact: 'Cannot scrape website for automatic enrichment',
      suggestion: 'Add company website URL to enable automatic data extraction',
    });
  }

  // Industry affects template matching
  if (!enrichedData.enrichment_signals.has_industry) {
    gaps.push({
      field: 'industry',
      severity: 'medium',
      impact: 'Template matching may be less accurate',
      suggestion: 'Specify the company industry (e.g., SaaS, Healthcare, Retail)',
    });
  }

  // Mission helps with personality generation
  if (!enrichedData.enrichment_signals.has_mission) {
    gaps.push({
      field: 'mission',
      severity: 'low',
      impact: 'Agent personality may be more generic',
      suggestion: 'Add company mission statement for better brand alignment',
    });
  }

  // Services affect tool selection
  if (!enrichedData.enrichment_signals.has_services) {
    gaps.push({
      field: 'services',
      severity: 'medium',
      impact: 'Tool assignment may miss relevant integrations',
      suggestion: 'List the main services or products the company offers',
    });
  }

  // Products help with knowledge seeding
  if (!enrichedData.enrichment_signals.has_products) {
    gaps.push({
      field: 'products',
      severity: 'low',
      impact: 'Knowledge base will have fewer seed facts',
      suggestion: 'Add product information for richer agent knowledge',
    });
  }

  return gaps;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Shallow merge preserving existing values
 */
function mergeShallow(
  base: Record<string, unknown>,
  existing: Record<string, unknown>
): Record<string, unknown> {
  return { ...base, ...existing };
}

/**
 * Check if a company profile needs enrichment
 * Useful for UI to show enrichment prompts
 */
export function needsEnrichment(
  companyProfile: { enrichedAt: Date | null; website: string | null }
): boolean {
  // Never enriched
  if (!companyProfile.enrichedAt) return true;

  // Enriched but no website (limited data)
  if (!companyProfile.website) return true;

  // Could add: check if enrichedAt is stale (e.g., > 30 days)
  return false;
}

/**
 * Get enrichment status summary
 */
export function getEnrichmentStatus(
  companyProfile: {
    enrichedAt: Date | null;
    website: string | null;
    enrichedData: unknown;
  }
): {
  status: 'none' | 'partial' | 'complete';
  enrichedAt: Date | null;
  hasWebsite: boolean;
  fieldCount: number;
} {
  const enrichedData = (companyProfile.enrichedData as Record<string, unknown>) || {};
  const fieldCount = Object.keys(enrichedData).filter(
    (k) => k !== 'enrichment_signals' && enrichedData[k] !== null && enrichedData[k] !== 'unknown'
  ).length;

  let status: 'none' | 'partial' | 'complete' = 'none';
  if (companyProfile.enrichedAt) {
    status = fieldCount >= 5 ? 'complete' : 'partial';
  }

  return {
    status,
    enrichedAt: companyProfile.enrichedAt,
    hasWebsite: Boolean(companyProfile.website),
    fieldCount,
  };
}

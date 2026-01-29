/**
 * Save Helper for Company Enrichment
 *
 * Saves enrichment engine output to CompanyProfile model.
 * This is the only "write" part for company enrichment in the loop.
 */

import { prisma } from "@epic-ai/database";
import type { EnrichmentEngineResult } from "@epic-ai/workers/lib";

// ============================================================================
// Types
// ============================================================================

export interface SaveEnrichmentResult {
  companyId: string;
  enrichedAt: Date;
  hasBlockingGaps: boolean;
  gapCount: number;
}

// ============================================================================
// Main Function
// ============================================================================

/**
 * Save enrichment engine output to CompanyProfile
 *
 * Updates:
 * - enrichedData (full enrichment result)
 * - enrichedAt (timestamp)
 * - confidence (confidence scores)
 * - Core fields (name, industry, etc.) if available
 */
export async function saveCompanyEnrichment(
  companyId: string,
  enrichment: EnrichmentEngineResult
): Promise<SaveEnrichmentResult> {
  const profile = enrichment.company_profile;
  const brandVoice = enrichment.brand_voice_profile;

  // Build the full enriched data payload
  const enrichedData = {
    company_profile: profile,
    brand_voice_profile: brandVoice,
    evidence: enrichment.evidence,
    gaps: enrichment.gaps,
    raw_excerpt: enrichment.raw_excerpt,
    metadata: enrichment.metadata,
  };

  // Update CompanyProfile with enrichment data
  const updated = await prisma.companyProfile.update({
    where: { id: companyId },
    data: {
      // Core fields (if AI extracted them)
      ...(profile.name && { name: profile.name }),
      ...(profile.industry && { industry: profile.industry }),
      ...(profile.email && { email: profile.email }),
      ...(profile.phone && { phone: profile.phone }),

      // Map description to mission (semantically similar)
      ...(profile.description && { mission: profile.description }),

      // Map value_proposition to tagline (semantically similar)
      ...(profile.value_proposition && { tagline: profile.value_proposition }),

      // Website from enrichment source
      website: enrichment.metadata.source_url,

      // Products/Services (JSON arrays)
      ...(profile.products?.length && { products: profile.products }),
      ...(profile.services?.length && { services: profile.services }),

      // Full enrichment data blob (includes all extracted data)
      enrichedData: JSON.parse(JSON.stringify(enrichedData)),
      enrichedAt: new Date(enrichment.metadata.scraped_at),

      // Confidence scores
      confidence: JSON.parse(JSON.stringify(enrichment.confidence)),
    },
    select: {
      id: true,
      enrichedAt: true,
    },
  });

  // Check for blocking gaps
  const blockingGaps = enrichment.gaps.filter((g) => g.severity === "high");

  return {
    companyId: updated.id,
    enrichedAt: updated.enrichedAt!,
    hasBlockingGaps: blockingGaps.length > 0,
    gapCount: enrichment.gaps.length,
  };
}

/**
 * Check if company needs enrichment
 */
export async function companyNeedsEnrichment(companyId: string): Promise<boolean> {
  const company = await prisma.companyProfile.findUnique({
    where: { id: companyId },
    select: { enrichedAt: true },
  });

  return !company?.enrichedAt;
}

/**
 * Get company profile for enrichment context
 */
export async function getCompanyForEnrichment(companyId: string) {
  return prisma.companyProfile.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      website: true,
      enrichedAt: true,
      enrichedData: true,
    },
  });
}

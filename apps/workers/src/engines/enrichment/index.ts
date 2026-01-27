/**
 * Enrichment Engine v1
 *
 * Turns a company website (+ optional manual answers) into structured
 * business intelligence the Agent OS can use.
 *
 * @module engines/enrichment
 */

// Main engine
export {
  runEnrichmentEngine,
  type EnrichmentEngineParams,
  type EnrichmentEngineResult,
} from "./enrichment.engine";

// Scraper
export { scrapeWebsiteText, type ScrapeResult } from "./enrichment.scraper";

// AI extraction
export {
  extractCompanyIntel,
  type AIExtractionParams,
  type AIExtractionResult,
  type EvidenceItem,
  type ExtractedCompanyData,
} from "./enrichment.ai";

// Schema mapper
export {
  mapToCompanyProfile,
  mergeManualAnswers,
  type CompanyProfile,
  type BrandVoiceProfile,
  type MappedProfile,
} from "./enrichment.mapper";

// Gap detection
export {
  detectEnrichmentGaps,
  getGapsBySeverity,
  hasBlockingGaps,
  type EnrichmentGap,
} from "./enrichment.gaps";

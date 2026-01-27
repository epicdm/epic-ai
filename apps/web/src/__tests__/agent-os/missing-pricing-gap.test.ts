/**
 * Agent OS Golden Test: Missing Pricing Gap Detection
 *
 * TRACEABILITY TEST: Verifies gap detection for missing pricing data
 *
 * Contract:
 * - When no pricing info found → gap_type="missing_pricing"
 * - Confidence for pricing-related fields should be low when missing
 * - Gap item includes field_path, severity, and recommended_fix
 *
 * Tests both:
 * 1. Local analyzeKnowledgeConfig for knowledge source gap detection
 * 2. Actual worker processor for enrichment pricing gap detection
 */

// Mock fetch globally before imports
const mockFetchResponse = {
  ok: true,
  status: 200,
  statusText: "OK",
  text: jest.fn(),
  headers: new Headers({ "content-type": "text/html" }),
};

global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

// Mock prisma before imports
jest.mock("@epic-ai/database", () => ({
  prisma: {
    companyProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import type { GapItem, ConfidenceMap } from "@epic-ai/shared";
import { prisma } from "@epic-ai/database";
import { processCompanyEnrichmentJob } from "@epic-ai/workers/processors/agent-os";
import { assertGapItem } from "./test-utils";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFetch = fetch as jest.Mock;

// Type for knowledge config analysis result
interface KnowledgeAnalysisResult {
  confidence: ConfidenceMap;
  gaps: GapItem[];
}

/**
 * Analyze knowledge config for pricing gaps
 * This simulates the gap detection logic used in Agent OS endpoints
 */
function analyzeKnowledgeConfig(knowledgeConfig: {
  knowledge_sources?: Array<{ source_type: string; url?: string }>;
  pricing_sources?: Array<{ source_type: string; url?: string }>;
}): KnowledgeAnalysisResult {
  const gaps: GapItem[] = [];
  const confidence: ConfidenceMap = {};

  // Check for pricing sources
  const hasPricingSources =
    knowledgeConfig.pricing_sources &&
    Array.isArray(knowledgeConfig.pricing_sources) &&
    knowledgeConfig.pricing_sources.length > 0;

  if (!hasPricingSources) {
    gaps.push({
      gap_type: "missing_pricing",
      field_path: "knowledgeConfig.pricing_sources",
      severity: "medium",
      impact: "Agent cannot provide accurate pricing information to users",
      recommended_fix: "Add pricing sources via document upload or website URL",
    });
    confidence.pricing = 0.0;
  } else {
    // Calculate confidence based on number and quality of sources
    const sourceCount = knowledgeConfig.pricing_sources!.length;
    confidence.pricing = Math.min(sourceCount * 0.3, 1.0);
  }

  // Check for general knowledge sources
  const hasKnowledgeSources =
    knowledgeConfig.knowledge_sources &&
    Array.isArray(knowledgeConfig.knowledge_sources) &&
    knowledgeConfig.knowledge_sources.length > 0;

  if (!hasKnowledgeSources) {
    gaps.push({
      gap_type: "missing_data",
      field_path: "knowledgeConfig.knowledge_sources",
      severity: "high",
      impact: "Agent has no external knowledge to draw from",
      recommended_fix: "Add knowledge sources such as website URLs, documents, or RSS feeds",
    });
    confidence.knowledge = 0.0;
  } else {
    const sourceCount = knowledgeConfig.knowledge_sources!.length;
    confidence.knowledge = Math.min(sourceCount * 0.25, 1.0);
  }

  // Overall knowledge confidence
  confidence.knowledgeConfig =
    (confidence.pricing || 0) * 0.4 + (confidence.knowledge || 0) * 0.6;

  return { confidence, gaps };
}

// ============================================
// HTML Fixtures
// ============================================

/**
 * HTML page with absolutely no pricing information
 */
const htmlWithoutAnyPricing = `
<!DOCTYPE html>
<html>
<head>
  <title>Generic Services Company</title>
</head>
<body>
  <h1>Welcome to Our Company</h1>
  <p>We provide excellent services to our valued customers.</p>
  <h2>Our Services</h2>
  <ul>
    <li>Consulting Services</li>
    <li>Technical Support</li>
    <li>Training Programs</li>
  </ul>
  <h2>About Us</h2>
  <p>We have been in business for over 10 years.</p>
  <footer>
    <p>Contact: info@company.com | Phone: (555) 123-4567</p>
  </footer>
</body>
</html>
`;

/**
 * Creates a valid payload for the processor
 * Note: CUIDs must be valid format (25 chars starting with 'c')
 */
function createValidPayload(overrides?: Record<string, unknown>) {
  return {
    type: "ENRICH_COMPANY" as const,
    organizationId: "clu00000000000000000org01",
    userId: "test-user-123",
    websiteUrl: "https://nopricingcompany.com",
    companyProfileId: "clu000000000000000profile1",
    maxPages: 1,
    skipLlmRefinement: true,
    ...overrides,
  };
}

describe("Agent OS Missing Pricing Gap - Golden Tests", () => {
  // ============================================
  // TEST 1: Empty Pricing Sources
  // ============================================
  describe("Empty Pricing Sources", () => {
    it("detects missing_pricing gap when pricing_sources is empty", () => {
      const knowledgeConfig = {
        knowledge_sources: [
          { source_type: "website", url: "https://example.com" },
        ],
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      // Should have a pricing gap
      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");
      expect(pricingGap).toBeDefined();
      expect(pricingGap?.field_path).toContain("pricing_sources");
    });

    it("detects missing_pricing gap when pricing_sources is undefined", () => {
      const knowledgeConfig = {
        knowledge_sources: [
          { source_type: "website", url: "https://example.com" },
        ],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");
      expect(pricingGap).toBeDefined();
    });

    it("pricing confidence is < 0.4 when missing", () => {
      const knowledgeConfig = {
        knowledge_sources: [
          { source_type: "website", url: "https://example.com" },
        ],
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      expect(result.confidence.pricing).toBeLessThan(0.4);
      expect(result.confidence.pricing).toBe(0);
    });
  });

  // ============================================
  // TEST 2: Gap Item Structure
  // ============================================
  describe("Gap Item Structure", () => {
    it("missing_pricing gap has correct structure", () => {
      const knowledgeConfig = {
        knowledge_sources: [],
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);
      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");

      expect(pricingGap).toBeDefined();
      if (pricingGap) {
        assertGapItem(pricingGap);
        expect(pricingGap.gap_type).toBe("missing_pricing");
        expect(pricingGap.severity).toMatch(/low|medium|high/);
        expect(pricingGap.recommended_fix).toBeTruthy();
      }
    });

    it("gap includes meaningful impact description", () => {
      const knowledgeConfig = {
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);
      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");

      expect(pricingGap?.impact).toContain("pricing");
    });
  });

  // ============================================
  // TEST 3: With Pricing Sources
  // ============================================
  describe("With Pricing Sources", () => {
    it("no pricing gap when pricing_sources exists", () => {
      const knowledgeConfig = {
        knowledge_sources: [
          { source_type: "website", url: "https://example.com" },
        ],
        pricing_sources: [
          { source_type: "document", url: "https://example.com/pricing.pdf" },
        ],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");
      expect(pricingGap).toBeUndefined();
    });

    it("pricing confidence increases with more sources", () => {
      const configWith1Source = {
        pricing_sources: [{ source_type: "document" }],
      };

      const configWith3Sources = {
        pricing_sources: [
          { source_type: "document" },
          { source_type: "website" },
          { source_type: "manual" },
        ],
      };

      const result1 = analyzeKnowledgeConfig(configWith1Source);
      const result3 = analyzeKnowledgeConfig(configWith3Sources);

      expect(result3.confidence.pricing).toBeGreaterThan(result1.confidence.pricing!);
    });

    it("pricing confidence is >= 0.4 with at least 2 sources", () => {
      const knowledgeConfig = {
        pricing_sources: [
          { source_type: "document" },
          { source_type: "website" },
        ],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      expect(result.confidence.pricing).toBeGreaterThanOrEqual(0.4);
    });
  });

  // ============================================
  // TEST 4: Combined Gaps
  // ============================================
  describe("Combined Gaps", () => {
    it("detects both pricing and knowledge gaps when both missing", () => {
      const knowledgeConfig = {
        knowledge_sources: [],
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      expect(result.gaps.length).toBeGreaterThanOrEqual(2);
      expect(result.gaps.some((g) => g.gap_type === "missing_pricing")).toBe(true);
      expect(result.gaps.some((g) => g.gap_type === "missing_data")).toBe(true);
    });

    it("overall confidence is low when both are missing", () => {
      const knowledgeConfig = {
        knowledge_sources: [],
        pricing_sources: [],
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      expect(result.confidence.knowledgeConfig).toBeLessThan(0.1);
    });

    it("overall confidence improves with partial data", () => {
      const configEmpty = {
        knowledge_sources: [],
        pricing_sources: [],
      };

      const configPartial = {
        knowledge_sources: [{ source_type: "website" }],
        pricing_sources: [],
      };

      const resultEmpty = analyzeKnowledgeConfig(configEmpty);
      const resultPartial = analyzeKnowledgeConfig(configPartial);

      expect(resultPartial.confidence.knowledgeConfig).toBeGreaterThan(
        resultEmpty.confidence.knowledgeConfig!
      );
    });
  });

  // ============================================
  // TEST 5: Confidence Boundaries
  // ============================================
  describe("Confidence Boundaries", () => {
    it("confidence values are between 0 and 1", () => {
      const configs = [
        { knowledge_sources: [], pricing_sources: [] },
        { knowledge_sources: [{ source_type: "website" }], pricing_sources: [] },
        {
          knowledge_sources: [{ source_type: "website" }],
          pricing_sources: [{ source_type: "document" }],
        },
        {
          knowledge_sources: Array(10).fill({ source_type: "website" }),
          pricing_sources: Array(10).fill({ source_type: "document" }),
        },
      ];

      for (const config of configs) {
        const result = analyzeKnowledgeConfig(config);

        for (const [key, value] of Object.entries(result.confidence)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(1);
        }
      }
    });

    it("confidence is capped at 1.0 even with many sources", () => {
      const knowledgeConfig = {
        knowledge_sources: Array(20).fill({ source_type: "website" }),
        pricing_sources: Array(20).fill({ source_type: "document" }),
      };

      const result = analyzeKnowledgeConfig(knowledgeConfig);

      expect(result.confidence.pricing).toBeLessThanOrEqual(1.0);
      expect(result.confidence.knowledge).toBeLessThanOrEqual(1.0);
      expect(result.confidence.knowledgeConfig).toBeLessThanOrEqual(1.0);
    });
  });

  // ============================================
  // TEST 6: Actual Processor - Missing Pricing Gap
  // ============================================
  describe("Processor Missing Pricing Detection", () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup default fetch mock for HTML without pricing
      mockFetchResponse.text.mockResolvedValue(htmlWithoutAnyPricing);

      // Setup prisma mock
      mockPrisma.companyProfile.findUnique.mockResolvedValue(null);
      mockPrisma.companyProfile.upsert.mockResolvedValue({
        id: "clu000000000000000profile1",
        organizationId: "clu00000000000000000org01",
        name: "Generic Services Company",
        enrichmentData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
    });

    it("detects missing_pricing gap when no pricing found in HTML", async () => {
      const payload = createValidPayload();

      const result = await processCompanyEnrichmentJob(payload);

      // Should have gaps array
      expect(result.gaps).toBeDefined();
      expect(Array.isArray(result.gaps)).toBe(true);

      // Should detect missing pricing gap
      const pricingGap = result.gaps.find(
        (g: GapItem) => g.gap_type === "missing_pricing"
      );
      expect(pricingGap).toBeDefined();
      expect(pricingGap?.gap_type).toBe("missing_pricing");
    });

    it("pricing gap has correct structure from processor", async () => {
      const payload = createValidPayload();

      const result = await processCompanyEnrichmentJob(payload);

      const pricingGap = result.gaps.find(
        (g: GapItem) => g.gap_type === "missing_pricing"
      );

      if (pricingGap) {
        assertGapItem(pricingGap);
        expect(pricingGap.severity).toMatch(/low|medium|high/);
        expect(pricingGap.recommended_fix).toBeTruthy();
      }
    });

    it("confidence values are valid when no pricing in HTML", async () => {
      const payload = createValidPayload();

      const result = await processCompanyEnrichmentJob(payload);

      // Check confidence map exists
      expect(result.confidence).toBeDefined();

      // Overall confidence should be less than perfect (1.0) since pricing is missing
      const overallConfidence = result.confidence.overall;
      expect(overallConfidence).toBeDefined();
      expect(overallConfidence).toBeLessThan(1.0);
      expect(overallConfidence).toBeGreaterThan(0);

      // All confidence values should be valid 0-1 range
      for (const [, value] of Object.entries(result.confidence)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it("extracts other data even when pricing is missing", async () => {
      const payload = createValidPayload();

      const result = await processCompanyEnrichmentJob(payload);

      // Should still extract company name from title
      expect(result.company?.name).toBeDefined();

      // Should extract offerings from HTML
      expect(result.offerings).toBeDefined();
      expect(Array.isArray(result.offerings)).toBe(true);

      // Should extract contact info
      expect(result.company?.email || result.company?.phone).toBeDefined();
    });

    it("evidence array does not contain pricing evidence", async () => {
      const payload = createValidPayload();

      const result = await processCompanyEnrichmentJob(payload);

      // Should have evidence array
      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence)).toBe(true);

      // Should NOT have evidence for pricing fields
      const pricingEvidence = result.evidence.filter(
        (e: { field_path: string }) =>
          e.field_path.includes("pricing") || e.field_path.includes("price")
      );

      // Pricing evidence should be empty or have very low confidence
      if (pricingEvidence.length > 0) {
        pricingEvidence.forEach((e: { confidence: number }) => {
          expect(e.confidence).toBeLessThan(0.3);
        });
      }
    });
  });

  // ============================================
  // TEST 7: Processor with Manual Pricing Answers
  // ============================================
  describe("Processor With Manual Pricing Answers", () => {
    const htmlWithPricing = `
<!DOCTYPE html>
<html>
<head>
  <title>Priced Services Company</title>
</head>
<body>
  <h1>Our Pricing</h1>
  <div class="pricing">
    <h2>Basic Plan - $29/month</h2>
    <p>Perfect for individuals</p>
    <h2>Pro Plan - $99/month</h2>
    <p>Best for small teams</p>
    <h2>Enterprise - Contact for pricing</h2>
    <p>Custom solutions for large organizations</p>
  </div>
  <footer>
    <p>Contact: sales@pricing.com</p>
  </footer>
</body>
</html>
`;

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup fetch mock with pricing HTML
      mockFetchResponse.text.mockResolvedValue(htmlWithPricing);

      mockPrisma.companyProfile.findUnique.mockResolvedValue(null);
      mockPrisma.companyProfile.upsert.mockResolvedValue({
        id: "clu000000000000000profile1",
        organizationId: "clu00000000000000000org01",
        name: "Priced Services Company",
        enrichmentData: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);
    });

    it("no missing_pricing gap when manualAnswers includes pricing", async () => {
      // The processor's gap detection checks manualAnswers, not HTML
      const payload = createValidPayload({
        websiteUrl: "https://pricedcompany.com",
        manualAnswers: {
          pricing_model: "subscription",
          price_range: "$29-$99/month",
        },
      });

      const result = await processCompanyEnrichmentJob(payload);

      // Should NOT have missing_pricing gap when manual answers provided
      const pricingGap = result.gaps.find(
        (g: GapItem) => g.gap_type === "missing_pricing"
      );
      expect(pricingGap).toBeUndefined();
    });

    it("company data includes pricing from manualAnswers", async () => {
      const payload = createValidPayload({
        websiteUrl: "https://pricedcompany.com",
        manualAnswers: {
          pricing_model: "subscription",
          price_range: "$29-$99/month",
        },
      });

      const result = await processCompanyEnrichmentJob(payload);

      // Company should have pricing info from manual answers
      expect(result.company.pricing_model).toBe("subscription");
      expect(result.company.price_range).toBe("$29-$99/month");
    });

    it("fewer gaps when manual answers provided", async () => {
      // Without manual answers
      const payloadWithout = createValidPayload({
        websiteUrl: "https://pricedcompany.com",
      });
      const resultWithout = await processCompanyEnrichmentJob(payloadWithout);

      // With manual answers
      const payloadWith = createValidPayload({
        websiteUrl: "https://pricedcompany.com",
        manualAnswers: {
          pricing_model: "subscription",
          hours_of_operation: "9am-5pm Mon-Fri",
          service_area: "Nationwide",
        },
      });
      const resultWith = await processCompanyEnrichmentJob(payloadWith);

      // Should have fewer gaps with manual answers
      expect(resultWith.gaps.length).toBeLessThan(resultWithout.gaps.length);
    });
  });
});

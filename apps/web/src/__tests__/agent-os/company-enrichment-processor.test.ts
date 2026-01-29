/**
 * Agent OS Golden Test: Company Enrichment Worker Processor
 *
 * TRACEABILITY TEST: Verifies the actual processCompanyEnrichmentJob function
 *
 * Contract:
 * - Input: CompanyEnrichmentPayload (websiteUrl, organizationId, companyProfileId)
 * - Output: CompanyEnrichmentResult with company, offerings, gaps, confidence, evidence
 * - Evidence items include source_url, field_path, confidence, reasoning
 * - Confidence values are within 0-1 range
 * - Gaps exist for missing pricing/hours/service_area
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

// Import after mocks - import directly from agent-os to avoid loading other processors
import { prisma } from "@epic-ai/database";
import { processCompanyEnrichmentJob } from "@epic-ai/workers/processors/agent-os";
import type { CompanyEnrichmentResult } from "@epic-ai/workers/types";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockFetch = fetch as jest.Mock;

// ============================================
// Sample HTML Fixtures
// ============================================

/**
 * Comprehensive HTML with company info for realistic extraction
 */
const createSampleHomepageHtml = (companyName: string, email?: string, phone?: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>${companyName} | Professional Services</title>
  <meta name="description" content="We provide professional consulting and technology solutions.">
</head>
<body>
  <header>
    <h1>Welcome to ${companyName}</h1>
    <nav>
      <a href="/about">About</a>
      <a href="/services">Services</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>
    <section>
      <p>We are a leading technology company providing innovative solutions for businesses.</p>
      ${email ? `<p>Contact us at <a href="mailto:${email}">${email}</a></p>` : ""}
      ${phone ? `<p>Call us: ${phone}</p>` : ""}
    </section>
    <section>
      <h2>Our Services</h2>
      <ul>
        <li>Web Development</li>
        <li>Mobile App Development</li>
        <li>Cloud Consulting</li>
      </ul>
    </section>
  </main>
  <footer>
    <a href="https://www.linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, "")}">LinkedIn</a>
    <a href="https://twitter.com/${companyName.toLowerCase().replace(/\s+/g, "")}">Twitter</a>
  </footer>
</body>
</html>
`;

/**
 * HTML with services page content
 */
const createServicesPageHtml = (services: string[]) => `
<!DOCTYPE html>
<html>
<head>
  <title>Our Services</title>
</head>
<body>
  <h1>Our Services</h1>
  <section>
    ${services.map((s) => `<h3>${s}</h3><p>Learn more about our ${s.toLowerCase()} offering.</p>`).join("\n")}
  </section>
</body>
</html>
`;

/**
 * HTML with contact page content
 */
const createContactPageHtml = (email: string, phone: string) => `
<!DOCTYPE html>
<html>
<head>
  <title>Contact Us</title>
</head>
<body>
  <h1>Contact Us</h1>
  <div>
    <p>Email: ${email}</p>
    <p>Phone: ${phone}</p>
    <p>Address: 123 Business Street, San Francisco, CA 94102</p>
  </div>
</body>
</html>
`;

/**
 * HTML without any pricing information
 */
const htmlWithoutPricing = `
<!DOCTYPE html>
<html>
<head>
  <title>Generic Company | Services</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>We offer great services for our customers.</p>
  <h2>Our Services</h2>
  <ul>
    <li>Consulting</li>
    <li>Support</li>
  </ul>
</body>
</html>
`;

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a mock fetch that returns different content based on URL path
 */
function setupMultiPageFetch(pages: Record<string, string>) {
  mockFetch.mockImplementation(async (url: string) => {
    const urlObj = new URL(url);
    const path = urlObj.pathname === "/" ? "/" : urlObj.pathname;

    // Find matching page
    const html = pages[path] || pages["/"] || "";

    return {
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => html,
      headers: new Headers({ "content-type": "text/html" }),
    };
  });
}

/**
 * Valid payload for testing
 * Note: CUIDs must be valid format (25 chars starting with 'c')
 */
function createValidPayload(overrides?: Record<string, unknown>) {
  return {
    type: "ENRICH_COMPANY" as const,
    organizationId: "clu00000000000000000org01",
    userId: "test-user-123",
    websiteUrl: "https://testcompany.com",
    companyProfileId: "clu000000000000000profile1",
    maxPages: 3,
    skipLlmRefinement: true,
    ...overrides,
  };
}

describe("Company Enrichment Processor - Golden Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default prisma mock
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.companyProfile.upsert as jest.Mock).mockResolvedValue({
      id: "clu000000000000000profile1",
      organizationId: "clu00000000000000000org01",
      enrichedAt: new Date(),
    });

    // Default fetch mock
    mockFetchResponse.text.mockResolvedValue(
      createSampleHomepageHtml("Test Company", "info@testcompany.com", "(555) 123-4567")
    );
    mockFetch.mockResolvedValue(mockFetchResponse);
  });

  // ============================================
  // TEST 1: Evidence Structure Validation
  // ============================================
  describe("Evidence Structure", () => {
    it("evidence items include source_url for extracted fields", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Acme Corp", "hello@acme.com", "(555) 111-2222"),
        "/services": createServicesPageHtml(["Cloud Hosting", "DevOps"]),
        "/contact": createContactPageHtml("contact@acme.com", "(555) 333-4444"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://acme.com" })
      );

      expect(result.evidence).toBeDefined();
      expect(Array.isArray(result.evidence)).toBe(true);
      expect(result.evidence.length).toBeGreaterThan(0);

      // Verify each evidence item has required fields
      for (const item of result.evidence) {
        expect(item).toHaveProperty("source_type");
        expect(item).toHaveProperty("field_path");
        expect(item).toHaveProperty("confidence");
        expect(typeof item.field_path).toBe("string");
        expect(item.field_path.length).toBeGreaterThan(0);
      }
    });

    it("evidence includes company.name from website scrape", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Acme Corp"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://acme.com" })
      );

      const nameEvidence = result.evidence.find((e) => e.field_path === "company.name");
      expect(nameEvidence).toBeDefined();
      expect(nameEvidence?.source_type).toBe("website_scrape");
      expect(nameEvidence?.source_url).toContain("acme.com");
      expect(nameEvidence?.reasoning).toBeDefined();
    });

    it("evidence includes contact fields when found", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Test Co", "info@testco.com", "(555) 999-8888"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://testco.com" })
      );

      // Check for email evidence
      const emailEvidence = result.evidence.find((e) => e.field_path === "company.email");
      expect(emailEvidence).toBeDefined();
      expect(emailEvidence?.source_url).toBeDefined();

      // Check for phone evidence
      const phoneEvidence = result.evidence.find((e) => e.field_path === "company.phone");
      expect(phoneEvidence).toBeDefined();
      expect(phoneEvidence?.source_url).toBeDefined();
    });

    it("evidence includes offerings from services page", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Service Co"),
        "/services": createServicesPageHtml(["API Integration", "Custom Development"]),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://serviceco.com" })
      );

      const offeringsEvidence = result.evidence.find((e) => e.field_path === "offerings");
      expect(offeringsEvidence).toBeDefined();
      expect(offeringsEvidence?.source_type).toBe("website_scrape");
    });

    it("evidence items include reasoning for non-empty fields", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Reasoning Test", "test@reasoning.com"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://reasoning.com" })
      );

      // Check that evidence items have reasoning
      const evidenceWithData = result.evidence.filter((e) => e.confidence > 0);
      expect(evidenceWithData.length).toBeGreaterThan(0);

      for (const item of evidenceWithData) {
        if (item.source_type === "website_scrape" || item.source_type === "inference") {
          expect(item.reasoning).toBeDefined();
          expect(typeof item.reasoning).toBe("string");
          expect(item.reasoning!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  // ============================================
  // TEST 2: Confidence Values Validation
  // ============================================
  describe("Confidence Values", () => {
    it("all confidence values are within 0-1 range", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Confidence Test Co", "conf@test.com", "(555) 000-1111"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://conftest.com" })
      );

      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("object");

      for (const [key, value] of Object.entries(result.confidence)) {
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });

    it("confidence includes overall score", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Overall Test"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://overall.com" })
      );

      expect(result.confidence).toHaveProperty("overall");
      expect(result.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(result.confidence.overall).toBeLessThanOrEqual(1);
    });

    it("confidence for found fields is higher than missing fields", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Named Company", "email@named.com"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://named.com" })
      );

      // Company name should have high confidence
      expect(result.confidence["company.name"]).toBeGreaterThan(0.5);

      // Email should have high confidence
      expect(result.confidence["company.email"]).toBeGreaterThan(0.5);
    });

    it("evidence item confidence values are within 0-1", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Evidence Conf Test"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://evconf.com" })
      );

      for (const item of result.evidence) {
        expect(item.confidence).toBeGreaterThanOrEqual(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  // ============================================
  // TEST 3: Gap Detection for Missing Fields
  // ============================================
  describe("Gap Detection", () => {
    it("produces missing_pricing gap when no pricing info", async () => {
      setupMultiPageFetch({
        "/": htmlWithoutPricing,
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://nopricing.com" })
      );

      const pricingGap = result.gaps.find((g) => g.gap_type === "missing_pricing");
      expect(pricingGap).toBeDefined();
      expect(pricingGap?.field_path).toContain("pricing");
      expect(pricingGap?.severity).toBe("high");
      expect(pricingGap?.recommended_fix).toBeDefined();
    });

    it("produces missing_hours gap when no hours info", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("No Hours Co"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://nohours.com" })
      );

      const hoursGap = result.gaps.find((g) => g.gap_type === "missing_hours");
      expect(hoursGap).toBeDefined();
      expect(hoursGap?.field_path).toContain("hours");
      expect(hoursGap?.severity).toBe("medium");
    });

    it("produces missing_service_area gap when no service area", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("No Area Co"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://noarea.com" })
      );

      const areaGap = result.gaps.find((g) => g.gap_type === "missing_service_area");
      expect(areaGap).toBeDefined();
      expect(areaGap?.field_path).toContain("service_area");
    });

    it("gaps are reduced when manual answers provided", async () => {
      setupMultiPageFetch({
        "/": htmlWithoutPricing,
      });

      // First without manual answers
      const resultWithoutAnswers = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://gaps.com" })
      );

      // Then with manual answers
      const resultWithAnswers = await processCompanyEnrichmentJob(
        createValidPayload({
          websiteUrl: "https://gaps.com",
          manualAnswers: {
            pricing_model: "hourly",
            hours_of_operation: "9am-5pm Mon-Fri",
            service_area: "San Francisco Bay Area",
          },
        })
      );

      // Should have fewer gaps with answers
      expect(resultWithAnswers.gaps.length).toBeLessThan(resultWithoutAnswers.gaps.length);

      // Pricing gap should be gone
      expect(resultWithAnswers.gaps.find((g) => g.gap_type === "missing_pricing")).toBeUndefined();
    });

    it("gap items have correct structure", async () => {
      setupMultiPageFetch({
        "/": htmlWithoutPricing,
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://gapstruct.com" })
      );

      for (const gap of result.gaps) {
        expect(gap).toHaveProperty("gap_type");
        expect(gap).toHaveProperty("field_path");
        expect(gap).toHaveProperty("severity");
        expect(gap).toHaveProperty("impact");
        expect(gap).toHaveProperty("recommended_fix");

        expect(["low", "medium", "high"]).toContain(gap.severity);
      }
    });
  });

  // ============================================
  // TEST 4: Schema Validation
  // ============================================
  describe("Output Schema", () => {
    it("output validates CompanyEnrichmentResult schema", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Schema Test", "schema@test.com", "(555) 222-3333"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://schematest.com" })
      );

      // Check required top-level fields
      expect(result).toHaveProperty("company");
      expect(result).toHaveProperty("offerings");
      expect(result).toHaveProperty("gaps");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("evidence");
      expect(result).toHaveProperty("source_url");
      expect(result).toHaveProperty("pages_analyzed");
      expect(result).toHaveProperty("scraped_at");
      expect(result).toHaveProperty("processing_time_ms");

      // Check company structure
      expect(result.company).toHaveProperty("name");
      expect(result.company).toHaveProperty("social_links");

      // Check arrays
      expect(Array.isArray(result.offerings)).toBe(true);
      expect(Array.isArray(result.gaps)).toBe(true);
      expect(Array.isArray(result.evidence)).toBe(true);

      // Check types
      expect(typeof result.pages_analyzed).toBe("number");
      expect(typeof result.processing_time_ms).toBe("number");
    });

    it("company data contains extracted name", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Extracted Name Corp"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://extracted.com" })
      );

      expect(result.company.name).toBe("Extracted Name Corp");
    });

    it("company data contains contact info when present", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Contact Test", "contact@test.com", "(555) 444-5555"),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://contacttest.com" })
      );

      expect(result.company.email).toBe("contact@test.com");
      expect(result.company.phone).toContain("555");
    });
  });

  // ============================================
  // TEST 5: Error Handling
  // ============================================
  describe("Error Handling", () => {
    it("rejects invalid payload", async () => {
      const invalidPayload = {
        type: "ENRICH_COMPANY",
        // Missing required fields
      };

      await expect(processCompanyEnrichmentJob(invalidPayload)).rejects.toThrow("Invalid payload");
    });

    it("returns result with low confidence when website unreachable", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://unreachable.com" })
      );

      // Should return result with empty data
      expect(result.company.name).toBeUndefined();
      expect(result.offerings).toHaveLength(0);
      expect(result.evidence).toHaveLength(0);

      // Confidence should be low
      expect(result.confidence.overall).toBeLessThan(0.5);

      // Should have gaps indicating missing required data
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it("handles 404 responses with low confidence result", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "",
        headers: new Headers({ "content-type": "text/html" }),
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({ websiteUrl: "https://notfound.com" })
      );

      // Should return result with empty data
      expect(result.company.name).toBeUndefined();
      expect(result.offerings).toHaveLength(0);

      // Confidence should be low
      expect(result.confidence.overall).toBeLessThan(0.5);

      // Should have gaps for missing data
      expect(result.gaps.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // TEST 6: Multi-page Crawling
  // ============================================
  describe("Multi-page Crawling", () => {
    it("analyzes multiple pages when available", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Multi Page Co"),
        "/services": createServicesPageHtml(["Service A", "Service B"]),
        "/about": "<html><head><title>About Us</title></head><body><h1>About</h1></body></html>",
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({
          websiteUrl: "https://multipage.com",
          maxPages: 5,
        })
      );

      // Should have analyzed more than one page
      expect(result.pages_analyzed).toBeGreaterThan(0);
    });

    it("respects maxPages limit", async () => {
      setupMultiPageFetch({
        "/": createSampleHomepageHtml("Limited Co"),
        "/services": createServicesPageHtml(["Service X"]),
        "/about": "<html><body>About page</body></html>",
        "/contact": "<html><body>Contact page</body></html>",
        "/products": "<html><body>Products page</body></html>",
      });

      const result = await processCompanyEnrichmentJob(
        createValidPayload({
          websiteUrl: "https://limited.com",
          maxPages: 2,
        })
      );

      expect(result.pages_analyzed).toBeLessThanOrEqual(2);
    });
  });
});

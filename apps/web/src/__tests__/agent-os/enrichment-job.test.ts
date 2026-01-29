/**
 * Agent OS Golden Test: Enrichment Job Pipeline
 *
 * TRACEABILITY TEST: Verifies Foundation-2 enrichment job behavior
 *
 * Contract:
 * - Input: website_url + manual_answers
 * - Output: company_profile + brand_voice_profile envelope
 * - Save to company record + enrichedAt timestamp
 * - Produce gaps if missing pricing/hours/service_area
 */

// Mock fetch globally before imports
const mockFetchResponse = {
  ok: true,
  status: 200,
  statusText: "OK",
  text: jest.fn(),
};

global.fetch = jest.fn().mockResolvedValue(mockFetchResponse);

// Mock NextResponse before any imports that use it
class MockNextResponse {
  private body: unknown;
  readonly status: number;

  constructor(body: unknown, options?: { status?: number }) {
    this.body = body;
    this.status = options?.status || 200;
  }

  async json() {
    return this.body;
  }

  static json(body: unknown, options?: { status?: number }) {
    return new MockNextResponse(body, options);
  }
}

jest.mock("next/server", () => ({
  NextResponse: MockNextResponse,
  NextRequest: jest.fn(),
}));

// Mock prisma
jest.mock("@epic-ai/database", () => ({
  prisma: {
    companyProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// Mock auth
jest.mock("@/lib/auth", () => ({
  getAuthWithBypass: jest.fn(),
}));

// Mock sync-user
jest.mock("@/lib/sync-user", () => ({
  getUserOrganization: jest.fn(),
}));

// Import after mocks
import { prisma } from "@epic-ai/database";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetAuth = getAuthWithBypass as jest.Mock;
const mockGetUserOrg = getUserOrganization as jest.Mock;
const mockFetch = fetch as jest.Mock;

// Sample HTML for testing
const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Acme Corp | Professional Services</title>
  <meta name="description" content="We provide professional consulting solutions for businesses.">
</head>
<body>
  <h1>Welcome to Acme Corp</h1>
  <p>We are a leading technology company providing innovative solutions.</p>
  <p>Our services include: consulting, implementation, and support.</p>
  <p>Contact us at info@acmecorp.com or call (555) 123-4567.</p>
  <a href="https://www.linkedin.com/company/acmecorp">LinkedIn</a>
  <a href="https://twitter.com/acmecorp">Twitter</a>
</body>
</html>
`;

describe("Agent OS Enrichment Job - Golden Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default auth setup
    mockGetAuth.mockResolvedValue({ userId: "test-user-id" });
    mockGetUserOrg.mockResolvedValue({ id: "test-org-id", name: "Test Org" });

    // Default fetch mock returns sample HTML
    mockFetchResponse.text.mockResolvedValue(sampleHtml);
    mockFetch.mockResolvedValue(mockFetchResponse);

    // Default prisma mock
    (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.companyProfile.upsert as jest.Mock).mockImplementation(async (args) => ({
      id: "profile-1",
      organizationId: "test-org-id",
      name: args.create?.name || args.update?.name || "Test Company",
      website: args.create?.website || args.update?.website,
      industry: args.create?.industry || args.update?.industry,
      enrichedAt: new Date(),
      enrichedData: args.create?.enrichedData || args.update?.enrichedData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  });

  // ============================================
  // TEST 1: Basic enrichment from website URL
  // ============================================
  describe("Website Scraping", () => {
    it("extracts company name from page title", async () => {
      // Dynamic import to get fresh module with mocks
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.data).not.toBeNull();
      expect(data.data.enrichmentResult.company_profile.name).toBe("Acme Corp");
    });

    it("extracts contact information from page content", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.data.enrichmentResult.company_profile.email).toBe("info@acmecorp.com");
      expect(data.data.enrichmentResult.company_profile.phone).toContain("555");
    });

    it("extracts social links from HTML", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.data.enrichmentResult.company_profile.social_links.linkedin).toContain("linkedin.com");
      expect(data.data.enrichmentResult.company_profile.social_links.twitter).toContain("twitter.com");
    });
  });

  // ============================================
  // TEST 2: Brand voice analysis
  // ============================================
  describe("Brand Voice Analysis", () => {
    it("detects professional tone from content", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const brandVoice = data.data.enrichmentResult.brand_voice_profile;
      expect(brandVoice).toBeDefined();
      expect(brandVoice.detection_confidence).toBeGreaterThan(0);
    });

    it("detects first person usage", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // "We are a leading..." uses first person
      expect(data.data.enrichmentResult.brand_voice_profile.uses_first_person).toBe(true);
    });
  });

  // ============================================
  // TEST 3: Manual answers integration
  // ============================================
  describe("Manual Answers", () => {
    it("merges manual answers with scraped data", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
          manual_answers: {
            hours_of_operation: "Mon-Fri 9am-5pm",
            pricing_model: "hourly",
            price_range: "$100-200/hr",
            service_area: "San Francisco Bay Area",
          },
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const profile = data.data.enrichmentResult.company_profile;
      expect(profile.hours_of_operation).toBe("Mon-Fri 9am-5pm");
      expect(profile.pricing_model).toBe("hourly");
      expect(profile.price_range).toBe("$100-200/hr");
      expect(profile.service_area).toBe("San Francisco Bay Area");
    });

    it("reduces gaps when manual answers are provided", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      // First request without manual answers
      const requestWithoutAnswers = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const responseWithoutAnswers = await POST(requestWithoutAnswers as any);
      const dataWithoutAnswers = await responseWithoutAnswers.json();

      // Then request with manual answers
      const requestWithAnswers = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
          manual_answers: {
            hours_of_operation: "Mon-Fri 9am-5pm",
            pricing_model: "hourly",
            service_area: "Nationwide",
          },
        }),
      };

      const responseWithAnswers = await POST(requestWithAnswers as any);
      const dataWithAnswers = await responseWithAnswers.json();

      // Should have fewer gaps with manual answers
      expect(dataWithAnswers.gaps.length).toBeLessThan(dataWithoutAnswers.gaps.length);
    });
  });

  // ============================================
  // TEST 4: Gap detection for critical fields
  // ============================================
  describe("Gap Detection", () => {
    it("produces gap for missing pricing", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
          // No pricing info provided
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const pricingGap = data.gaps.find((g: { field_path: string }) => g.field_path === "enrichment.pricing");
      expect(pricingGap).toBeDefined();
      expect(pricingGap.gap_type).toBe("missing_pricing");
      expect(pricingGap.severity).toBe("high");
    });

    it("produces gap for missing hours of operation", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const hoursGap = data.gaps.find((g: { field_path: string }) => g.field_path === "enrichment.hours_of_operation");
      expect(hoursGap).toBeDefined();
      expect(hoursGap.severity).toBe("medium");
    });

    it("produces gap for missing service area", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const areaGap = data.gaps.find((g: { field_path: string }) => g.field_path === "enrichment.service_area");
      expect(areaGap).toBeDefined();
      expect(areaGap.question_to_user).toContain("geographic");
    });
  });

  // ============================================
  // TEST 5: Database persistence
  // ============================================
  describe("Database Persistence", () => {
    it("saves enrichment result to company profile with enrichedAt", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
          manual_answers: {
            pricing_model: "fixed",
          },
        }),
      };

      await POST(mockRequest as any);

      expect(mockPrisma.companyProfile.upsert).toHaveBeenCalled();
      const upsertCall = (mockPrisma.companyProfile.upsert as jest.Mock).mock.calls[0][0];

      // Check that enrichedAt is set
      expect(upsertCall.create.enrichedAt).toBeInstanceOf(Date);
      expect(upsertCall.update.enrichedAt).toBeInstanceOf(Date);

      // Check that enrichedData contains the result
      expect(upsertCall.create.enrichedData).toBeDefined();
      expect(upsertCall.create.enrichedData.website_scrape).toBeDefined();
      expect(upsertCall.create.enrichedData.brand_voice).toBeDefined();
    });

    it("preserves existing profile data when enriching", async () => {
      // Set up existing profile
      (mockPrisma.companyProfile.findUnique as jest.Mock).mockResolvedValue({
        id: "existing-profile",
        organizationId: "test-org-id",
        name: "Existing Company Name",
        industry: "Existing Industry",
        products: [{ name: "Existing Product" }],
      });

      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      await POST(mockRequest as any);

      const upsertCall = (mockPrisma.companyProfile.upsert as jest.Mock).mock.calls[0][0];

      // Should use existing values as fallback in update
      expect(upsertCall.update.industry).toBeDefined();
    });
  });

  // ============================================
  // TEST 6: Enrichment result envelope structure
  // ============================================
  describe("Response Envelope", () => {
    it("returns complete enrichment result envelope", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // Check envelope structure
      expect(data.data).toHaveProperty("companyProfile");
      expect(data.data).toHaveProperty("enrichmentResult");
      expect(data).toHaveProperty("confidence");
      expect(data).toHaveProperty("gaps");
      expect(data).toHaveProperty("warnings");

      // Check enrichment result structure
      const result = data.data.enrichmentResult;
      expect(result).toHaveProperty("company_profile");
      expect(result).toHaveProperty("brand_voice_profile");
      expect(result).toHaveProperty("source_url", "https://acmecorp.com");
      expect(result).toHaveProperty("scraped_at");
      expect(result).toHaveProperty("scrape_success");
    });

    it("includes confidence scores for all critical fields", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(data.confidence).toHaveProperty("overall");
      expect("company_profile.name" in data.confidence).toBe(true);
      expect("brand_voice_profile" in data.confidence).toBe(true);
      expect("company_profile.pricing_model" in data.confidence).toBe(true);
      expect("company_profile.hours_of_operation" in data.confidence).toBe(true);
      expect("company_profile.service_area" in data.confidence).toBe(true);
    });
  });

  // ============================================
  // TEST 7: Error handling
  // ============================================
  describe("Error Handling", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetAuth.mockResolvedValue({ userId: null });

      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      expect(response.status).toBe(401);
    });

    it("returns 400 for invalid URL", async () => {
      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "not-a-valid-url",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("VALIDATION_ERROR");
    });

    it("handles fetch errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      // Should still return a response, but with scrape_success: false
      expect(response.status).toBe(200);
      expect(data.data.enrichmentResult.scrape_success).toBe(false);
    });

    it("includes warning when scrape fails", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: jest.fn().mockResolvedValue(""),
      });

      const { POST } = await import("../../app/api/agent-os/companies/enrich/route");

      const mockRequest = {
        json: jest.fn().mockResolvedValue({
          website_url: "https://acmecorp.com",
        }),
      };

      const response = await POST(mockRequest as any);
      const data = await response.json();

      const scrapeWarning = data.warnings.find((w: { code: string }) => w.code === "SCRAPE_PARTIAL");
      expect(scrapeWarning).toBeDefined();
    });
  });
});

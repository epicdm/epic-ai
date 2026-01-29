/**
 * Agent OS Golden Test: Prompt Envelope Validation
 *
 * TRACEABILITY TEST: Verifies prompt envelope schemas for AI requests/responses
 *
 * Contract:
 * - EvidenceItemSchema validates source_type, field_path, confidence
 * - PromptEnvelopeSchema validates AI request structure with governance
 * - PromptResponseEnvelopeSchema validates AI response with confidence tracking
 * - All schemas use .strict() mode (reject unknown keys)
 */

import { z } from "zod";
import {
  EvidenceItemSchema,
  EvidenceSchema,
  PromptEnvelopeSchema,
  PromptResponseEnvelopeSchema,
  GapItemSchema,
  WarningItemSchema,
  ConfidenceMapSchema,
} from "@epic-ai/shared";

describe("Prompt Envelope Schemas - Golden Tests", () => {
  // ============================================
  // TEST 1: EvidenceItemSchema validation
  // ============================================
  describe("EvidenceItemSchema", () => {
    it("accepts valid evidence item with all fields", () => {
      const validEvidence = {
        source_type: "website_scrape",
        source_url: "https://example.com",
        extracted_text: "Sample text from website",
        field_path: "company.name",
        confidence: 0.85,
        reasoning: "Extracted from homepage header",
        timestamp: "2024-01-15T10:30:00Z",
      };

      const result = EvidenceItemSchema.safeParse(validEvidence);
      expect(result.success).toBe(true);
    });

    it("accepts minimal evidence item with required fields only", () => {
      const minimalEvidence = {
        source_type: "manual_input",
        field_path: "pricing.model",
        confidence: 0.95,
      };

      const result = EvidenceItemSchema.safeParse(minimalEvidence);
      expect(result.success).toBe(true);
    });

    it("validates source_type enum values", () => {
      const validTypes = [
        "website_scrape",
        "manual_input",
        "api_response",
        "document",
        "inference",
        "default_value",
      ];

      for (const sourceType of validTypes) {
        const evidence = {
          source_type: sourceType,
          field_path: "test.field",
          confidence: 0.5,
        };
        const result = EvidenceItemSchema.safeParse(evidence);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid source_type", () => {
      const invalidEvidence = {
        source_type: "unknown_source",
        field_path: "test.field",
        confidence: 0.5,
      };

      const result = EvidenceItemSchema.safeParse(invalidEvidence);
      expect(result.success).toBe(false);
    });

    it("validates confidence range 0-1", () => {
      const lowConfidence = {
        source_type: "inference",
        field_path: "test.field",
        confidence: 0,
      };
      expect(EvidenceItemSchema.safeParse(lowConfidence).success).toBe(true);

      const highConfidence = {
        source_type: "manual_input",
        field_path: "test.field",
        confidence: 1,
      };
      expect(EvidenceItemSchema.safeParse(highConfidence).success).toBe(true);

      const tooHigh = {
        source_type: "inference",
        field_path: "test.field",
        confidence: 1.5,
      };
      expect(EvidenceItemSchema.safeParse(tooHigh).success).toBe(false);

      const negative = {
        source_type: "inference",
        field_path: "test.field",
        confidence: -0.1,
      };
      expect(EvidenceItemSchema.safeParse(negative).success).toBe(false);
    });

    it("requires field_path to be non-empty", () => {
      const emptyPath = {
        source_type: "manual_input",
        field_path: "",
        confidence: 0.5,
      };

      const result = EvidenceItemSchema.safeParse(emptyPath);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // TEST 2: EvidenceSchema (array) validation
  // ============================================
  describe("EvidenceSchema", () => {
    it("accepts array of valid evidence items", () => {
      const evidenceArray = [
        {
          source_type: "website_scrape",
          field_path: "company.name",
          confidence: 0.9,
        },
        {
          source_type: "manual_input",
          field_path: "pricing.model",
          confidence: 1.0,
        },
      ];

      const result = EvidenceSchema.safeParse(evidenceArray);
      expect(result.success).toBe(true);
    });

    it("accepts empty array", () => {
      const result = EvidenceSchema.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("rejects array with invalid item", () => {
      const invalidArray = [
        {
          source_type: "website_scrape",
          field_path: "valid.path",
          confidence: 0.9,
        },
        {
          source_type: "invalid_type",
          field_path: "test.path",
          confidence: 0.5,
        },
      ];

      const result = EvidenceSchema.safeParse(invalidArray);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // TEST 3: PromptEnvelopeSchema validation
  // ============================================
  describe("PromptEnvelopeSchema", () => {
    it("accepts valid prompt envelope with all fields", () => {
      const validEnvelope = {
        system_prompt: "You are a helpful assistant.",
        user_prompt: "Extract company information from this text.",
        context: {
          agent_id: "agent-123",
          company_profile_id: "profile-456",
          job_id: "job-789",
          session_id: "session-abc",
        },
        input_evidence: [
          {
            source_type: "website_scrape",
            field_path: "raw_text",
            confidence: 1.0,
            extracted_text: "Sample website content",
          },
        ],
        expected_output_schema: '{"type":"object","properties":{}}',
        governance: {
          pii_allowed: false,
          max_tokens: 4000,
          temperature: 0.7,
          model: "gpt-4o",
        },
        created_at: "2024-01-15T10:30:00Z",
        request_id: "req-xyz-123",
      };

      const result = PromptEnvelopeSchema.safeParse(validEnvelope);
      expect(result.success).toBe(true);
    });

    it("accepts minimal prompt envelope with required fields only", () => {
      const minimalEnvelope = {
        system_prompt: "System instructions here.",
        user_prompt: "User task here.",
        context: {},
      };

      const result = PromptEnvelopeSchema.safeParse(minimalEnvelope);
      expect(result.success).toBe(true);
    });

    it("requires system_prompt to be non-empty", () => {
      const emptySystem = {
        system_prompt: "",
        user_prompt: "Valid user prompt",
        context: {},
      };

      const result = PromptEnvelopeSchema.safeParse(emptySystem);
      expect(result.success).toBe(false);
    });

    it("requires user_prompt to be non-empty", () => {
      const emptyUser = {
        system_prompt: "Valid system prompt",
        user_prompt: "",
        context: {},
      };

      const result = PromptEnvelopeSchema.safeParse(emptyUser);
      expect(result.success).toBe(false);
    });

    it("uses strict mode - rejects unknown keys in context", () => {
      const unknownContext = {
        system_prompt: "System prompt",
        user_prompt: "User prompt",
        context: {
          agent_id: "agent-123",
          unknown_field: "should fail",
        },
      };

      const result = PromptEnvelopeSchema.safeParse(unknownContext);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("unrecognized_keys");
      }
    });

    it("validates governance temperature range 0-2", () => {
      const validTemp = {
        system_prompt: "System prompt",
        user_prompt: "User prompt",
        context: {},
        governance: {
          pii_allowed: false,
          temperature: 1.5,
          model: "gpt-4o",
        },
      };
      expect(PromptEnvelopeSchema.safeParse(validTemp).success).toBe(true);

      const invalidTemp = {
        system_prompt: "System prompt",
        user_prompt: "User prompt",
        context: {},
        governance: {
          pii_allowed: false,
          temperature: 2.5,
          model: "gpt-4o",
        },
      };
      expect(PromptEnvelopeSchema.safeParse(invalidTemp).success).toBe(false);
    });

    it("defaults governance values when not provided", () => {
      const envelope = {
        system_prompt: "System prompt",
        user_prompt: "User prompt",
        context: {},
      };

      const result = PromptEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.governance.pii_allowed).toBe(false);
        expect(result.data.governance.temperature).toBe(0.7);
        expect(result.data.governance.model).toBe("gpt-4o");
      }
    });

    it("defaults input_evidence to empty array", () => {
      const envelope = {
        system_prompt: "System prompt",
        user_prompt: "User prompt",
        context: {},
      };

      const result = PromptEnvelopeSchema.safeParse(envelope);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.input_evidence).toEqual([]);
      }
    });
  });

  // ============================================
  // TEST 4: PromptResponseEnvelopeSchema validation
  // ============================================
  describe("PromptResponseEnvelopeSchema", () => {
    it("accepts valid response envelope with all fields", () => {
      const validResponse = {
        content: { company: { name: "Acme Corp" } },
        confidence: {
          "company.name": 0.95,
          "company.industry": 0.7,
        },
        evidence: [
          {
            source_type: "website_scrape",
            field_path: "company.name",
            confidence: 0.95,
          },
        ],
        gaps: [
          {
            gap_type: "missing_pricing",
            field_path: "pricing.model",
            severity: "medium",
            impact: "Cannot quote prices to customers",
            recommended_fix: "Add pricing information",
          },
        ],
        warnings: [
          {
            code: "LOW_CONFIDENCE",
            message: "Industry detection has low confidence",
            severity: "warning",
          },
        ],
        metadata: {
          model: "gpt-4o",
          tokens_used: 1500,
          processing_time_ms: 2500,
          request_id: "req-123",
        },
      };

      const result = PromptResponseEnvelopeSchema.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it("requires confidence map", () => {
      const missingConfidence = {
        content: { test: "data" },
        evidence: [],
        gaps: [],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(missingConfidence);
      expect(result.success).toBe(false);
    });

    it("validates confidence map values are 0-1", () => {
      const invalidConfidence = {
        content: { test: "data" },
        confidence: {
          "field.a": 0.5,
          "field.b": 1.5, // Invalid - over 1
        },
        evidence: [],
        gaps: [],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(invalidConfidence);
      expect(result.success).toBe(false);
    });

    it("uses strict mode - rejects unknown top-level keys", () => {
      const unknownKey = {
        content: { test: "data" },
        confidence: { "test.field": 0.9 },
        evidence: [],
        gaps: [],
        warnings: [],
        unknown_field: "should fail",
      };

      const result = PromptResponseEnvelopeSchema.safeParse(unknownKey);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].code).toBe("unrecognized_keys");
      }
    });

    it("defaults arrays to empty when not provided", () => {
      const minimal = {
        content: { result: "test" },
        confidence: { "result": 1.0 },
      };

      const result = PromptResponseEnvelopeSchema.safeParse(minimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.evidence).toEqual([]);
        expect(result.data.gaps).toEqual([]);
        expect(result.data.warnings).toEqual([]);
      }
    });

    it("validates metadata structure when provided", () => {
      const validMetadata = {
        content: { test: "data" },
        confidence: { "test": 1.0 },
        metadata: {
          model: "gpt-4o",
          tokens_used: 500,
          processing_time_ms: 1000,
        },
      };
      expect(PromptResponseEnvelopeSchema.safeParse(validMetadata).success).toBe(true);

      const invalidMetadata = {
        content: { test: "data" },
        confidence: { "test": 1.0 },
        metadata: {
          model: "gpt-4o",
          tokens_used: -100, // Invalid - must be positive
        },
      };
      expect(PromptResponseEnvelopeSchema.safeParse(invalidMetadata).success).toBe(false);
    });
  });

  // ============================================
  // TEST 5: Integration with Gap and Warning schemas
  // ============================================
  describe("Integration with Gap and Warning schemas", () => {
    it("validates gaps array in response envelope", () => {
      const responseWithGaps = {
        content: {},
        confidence: {},
        evidence: [],
        gaps: [
          {
            gap_type: "missing_required",
            field_path: "required.field",
            severity: "high",
            impact: "Agent cannot function without this",
            recommended_fix: "Provide the required information",
          },
          {
            gap_type: "missing_pricing",
            field_path: "economics.pricing",
            severity: "medium",
            impact: "Cannot provide quotes",
            recommended_fix: "Add pricing model",
            question_to_user: "What is your pricing model?",
            suggestions: ["hourly", "fixed", "subscription"],
          },
        ],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(responseWithGaps);
      expect(result.success).toBe(true);
    });

    it("validates warnings array in response envelope", () => {
      const responseWithWarnings = {
        content: {},
        confidence: {},
        evidence: [],
        gaps: [],
        warnings: [
          {
            code: "INFERENCE_UNCERTAIN",
            message: "Some fields were inferred with low confidence",
            severity: "warning",
            suggestion: "Review the inferred values",
          },
          {
            code: "PII_DETECTED",
            message: "PII was detected and redacted",
            severity: "info",
            field_path: "contact.email",
          },
        ],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(responseWithWarnings);
      expect(result.success).toBe(true);
    });

    it("rejects invalid gap_type in response", () => {
      const invalidGap = {
        content: {},
        confidence: {},
        evidence: [],
        gaps: [
          {
            gap_type: "invalid_gap_type",
            field_path: "test.field",
            severity: "high",
            impact: "Test impact",
            recommended_fix: "Test fix",
          },
        ],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(invalidGap);
      expect(result.success).toBe(false);
    });

    it("rejects invalid warning severity in response", () => {
      const invalidWarning = {
        content: {},
        confidence: {},
        evidence: [],
        gaps: [],
        warnings: [
          {
            code: "TEST",
            message: "Test message",
            severity: "critical", // Invalid - only info, warning, error allowed
          },
        ],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(invalidWarning);
      expect(result.success).toBe(false);
    });
  });

  // ============================================
  // TEST 6: Evidence Item Completeness
  // ============================================
  describe("Evidence Item Completeness", () => {
    it("evidence with source_url, extracted_text, and reasoning is valid", () => {
      const completeEvidence = {
        source_type: "website_scrape",
        source_url: "https://example.com/about",
        extracted_text: "We are Acme Corporation, founded in 1990.",
        field_path: "company.name",
        confidence: 0.92,
        reasoning: "Extracted from About Us page header which typically contains company name",
        timestamp: "2024-01-15T10:30:00Z",
      };

      const result = EvidenceItemSchema.safeParse(completeEvidence);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.source_url).toBe("https://example.com/about");
        expect(result.data.extracted_text).toBe("We are Acme Corporation, founded in 1990.");
        expect(result.data.reasoning).toBe(
          "Extracted from About Us page header which typically contains company name"
        );
      }
    });

    it("evidence can optionally omit source_url for non-web sources", () => {
      const manualEvidence = {
        source_type: "manual_input",
        field_path: "company.tagline",
        confidence: 1.0,
        reasoning: "Provided directly by user during onboarding",
      };

      const result = EvidenceItemSchema.safeParse(manualEvidence);
      expect(result.success).toBe(true);
    });

    it("evidence can optionally omit extracted_text for inferred fields", () => {
      const inferredEvidence = {
        source_type: "inference",
        field_path: "company.industry",
        confidence: 0.7,
        reasoning: "Inferred from services listed: web development, cloud consulting",
      };

      const result = EvidenceItemSchema.safeParse(inferredEvidence);
      expect(result.success).toBe(true);
    });

    it("evidence can optionally omit reasoning (but recommended)", () => {
      const minimalEvidence = {
        source_type: "website_scrape",
        source_url: "https://example.com",
        field_path: "contact.email",
        confidence: 0.99,
      };

      const result = EvidenceItemSchema.safeParse(minimalEvidence);
      expect(result.success).toBe(true);
    });

    it("validates source_url format when provided", () => {
      const validUrl = {
        source_type: "website_scrape",
        source_url: "https://example.com/pricing",
        field_path: "pricing.model",
        confidence: 0.8,
      };
      expect(EvidenceItemSchema.safeParse(validUrl).success).toBe(true);

      // Note: Zod doesn't strictly validate URL format by default
      // This test documents the current behavior
      const relativeUrl = {
        source_type: "website_scrape",
        source_url: "/pricing",
        field_path: "pricing.model",
        confidence: 0.8,
      };
      // Current schema allows this - may want to tighten in future
      const relResult = EvidenceItemSchema.safeParse(relativeUrl);
      expect(relResult.success).toBe(true);
    });

    it("extracted_text can be long multi-line content", () => {
      const longQuote = {
        source_type: "website_scrape",
        source_url: "https://example.com/services",
        extracted_text: `Our Services:
- Web Development
- Mobile Apps
- Cloud Consulting
- DevOps Solutions

We've been serving clients worldwide since 2005.`,
        field_path: "offerings.services",
        confidence: 0.88,
        reasoning: "Full services section extracted from dedicated page",
      };

      const result = EvidenceItemSchema.safeParse(longQuote);
      expect(result.success).toBe(true);
    });

    it("reasoning should explain how the data was derived", () => {
      const evidenceWithGoodReasoning = {
        source_type: "website_scrape",
        source_url: "https://example.com/contact",
        extracted_text: "contact@example.com",
        field_path: "contact.email",
        confidence: 0.95,
        reasoning:
          "Email found in contact page footer with mailto: link, high confidence as it's explicitly labeled",
      };

      const result = EvidenceItemSchema.safeParse(evidenceWithGoodReasoning);
      expect(result.success).toBe(true);

      // Verify reasoning is preserved
      if (result.success) {
        expect(result.data.reasoning).toContain("mailto:");
        expect(result.data.reasoning?.length).toBeGreaterThan(20);
      }
    });
  });

  // ============================================
  // TEST 7: Evidence Array in Response Envelope
  // ============================================
  describe("Evidence Array in Response Envelope", () => {
    it("response with complete evidence items is valid", () => {
      const response = {
        content: {
          company: {
            name: "Acme Corp",
            industry: "Technology",
          },
          contact: {
            email: "info@acme.com",
          },
        },
        confidence: {
          "company.name": 0.95,
          "company.industry": 0.7,
          "contact.email": 0.99,
        },
        evidence: [
          {
            source_type: "website_scrape",
            source_url: "https://acme.com",
            extracted_text: "Acme Corp - Technology Solutions",
            field_path: "company.name",
            confidence: 0.95,
            reasoning: "Extracted from page title",
          },
          {
            source_type: "inference",
            field_path: "company.industry",
            confidence: 0.7,
            reasoning: "Inferred from services: software development, cloud hosting",
          },
          {
            source_type: "website_scrape",
            source_url: "https://acme.com/contact",
            extracted_text: "info@acme.com",
            field_path: "contact.email",
            confidence: 0.99,
            reasoning: "Found in mailto: link on contact page",
          },
        ],
        gaps: [],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(response);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.evidence.length).toBe(3);

        // Verify each evidence item
        const nameEvidence = result.data.evidence.find(
          (e) => e.field_path === "company.name"
        );
        expect(nameEvidence?.source_url).toBe("https://acme.com");
        expect(nameEvidence?.extracted_text).toContain("Acme Corp");
        expect(nameEvidence?.reasoning).toBeTruthy();

        const industryEvidence = result.data.evidence.find(
          (e) => e.field_path === "company.industry"
        );
        expect(industryEvidence?.source_type).toBe("inference");
        expect(industryEvidence?.reasoning).toContain("Inferred");
      }
    });

    it("evidence field_path should correspond to content fields", () => {
      const response = {
        content: {
          company: { name: "Test Co" },
        },
        confidence: {
          "company.name": 0.9,
        },
        evidence: [
          {
            source_type: "website_scrape",
            field_path: "company.name", // Matches content structure
            confidence: 0.9,
            source_url: "https://test.com",
            extracted_text: "Test Co",
            reasoning: "From homepage",
          },
        ],
        gaps: [],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(response);
      expect(result.success).toBe(true);

      if (result.success) {
        // Evidence field_path should match confidence keys
        const evidenceFieldPaths = result.data.evidence.map((e) => e.field_path);
        const confidenceKeys = Object.keys(result.data.confidence);

        // All evidence field_paths should have corresponding confidence entries
        for (const fieldPath of evidenceFieldPaths) {
          expect(confidenceKeys).toContain(fieldPath);
        }
      }
    });

    it("multiple evidence items can reference the same field_path", () => {
      const response = {
        content: {
          company: { name: "Multi-Source Corp" },
        },
        confidence: {
          "company.name": 0.98,
        },
        evidence: [
          {
            source_type: "website_scrape",
            source_url: "https://example.com",
            extracted_text: "Multi-Source Corp",
            field_path: "company.name",
            confidence: 0.95,
            reasoning: "From homepage title",
          },
          {
            source_type: "website_scrape",
            source_url: "https://example.com/about",
            extracted_text: "About Multi-Source Corp",
            field_path: "company.name",
            confidence: 0.92,
            reasoning: "From about page header - confirms name",
          },
          {
            source_type: "website_scrape",
            source_url: "https://example.com/contact",
            extracted_text: "Contact Multi-Source Corp",
            field_path: "company.name",
            confidence: 0.88,
            reasoning: "From contact page - third confirmation",
          },
        ],
        gaps: [],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(response);
      expect(result.success).toBe(true);

      if (result.success) {
        const nameEvidence = result.data.evidence.filter(
          (e) => e.field_path === "company.name"
        );
        expect(nameEvidence.length).toBe(3);

        // Different source_urls for same field
        const urls = nameEvidence.map((e) => e.source_url);
        expect(new Set(urls).size).toBe(3); // All unique URLs
      }
    });

    it("evidence for missing fields should have low confidence", () => {
      const response = {
        content: {
          company: { name: "Test" },
          pricing: null, // Missing
        },
        confidence: {
          "company.name": 0.9,
          "pricing": 0.1,
        },
        evidence: [
          {
            source_type: "website_scrape",
            field_path: "company.name",
            confidence: 0.9,
          },
          {
            source_type: "inference",
            field_path: "pricing",
            confidence: 0.1,
            reasoning: "No pricing information found on any crawled pages",
          },
        ],
        gaps: [
          {
            gap_type: "missing_pricing",
            field_path: "pricing",
            severity: "medium",
            impact: "Cannot provide pricing info",
            recommended_fix: "Add pricing page or documentation",
          },
        ],
        warnings: [],
      };

      const result = PromptResponseEnvelopeSchema.safeParse(response);
      expect(result.success).toBe(true);

      if (result.success) {
        const pricingEvidence = result.data.evidence.find(
          (e) => e.field_path === "pricing"
        );
        expect(pricingEvidence?.confidence).toBeLessThan(0.3);

        // Should have corresponding gap
        const pricingGap = result.data.gaps.find(
          (g) => g.gap_type === "missing_pricing"
        );
        expect(pricingGap).toBeDefined();
      }
    });
  });
});

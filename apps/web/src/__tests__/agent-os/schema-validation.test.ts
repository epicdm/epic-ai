/**
 * Agent OS Golden Test: Schema Validation
 *
 * TRACEABILITY TEST: Verifies that all PATCH endpoints enforce strict schema validation
 *
 * Contract:
 * - Invalid payload → 400 + structured error with VALIDATION_ERROR code
 * - Valid payload → 200 + data in response envelope
 * - Unknown keys → 400 (strict mode rejects extra fields)
 */

import {
  validateRoleCard,
  validateBrainConfig,
  validatePersonalityConfig,
  validateToolConfig,
  validateKnowledgeConfig,
  validateMemoryConfig,
  validateLearningConfig,
  validateGovernanceConfig,
  validateEconomicsConfig,
  isValidationFailure,
  isValidationSuccess,
} from "@epic-ai/shared";

describe("Agent OS Schema Validation - Golden Tests", () => {
  // ============================================
  // TEST 1: Role Card Validation
  // ============================================
  describe("RoleCard Schema", () => {
    it("accepts valid role card data", () => {
      const validData = {
        name: "Marketing Assistant",
        title: "AI Marketing Specialist",
        company: "Acme Corp",
        mission: "Help create engaging content",
      };

      const result = validateRoleCard(validData);
      expect(isValidationSuccess(result)).toBe(true);
      if (isValidationSuccess(result)) {
        expect(result.data.name).toBe("Marketing Assistant");
      }
    });

    it("accepts partial role card data (PATCH)", () => {
      const partialData = {
        name: "Updated Name",
      };

      const result = validateRoleCard(partialData);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it("rejects unknown keys in strict mode", () => {
      const dataWithUnknownKey = {
        name: "Valid Name",
        unknownField: "should fail",
      };

      const result = validateRoleCard(dataWithUnknownKey);
      expect(isValidationFailure(result)).toBe(true);
      if (isValidationFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("unknownField");
      }
    });

    it("rejects invalid data types", () => {
      const invalidData = {
        name: 12345, // should be string
      };

      const result = validateRoleCard(invalidData as unknown);
      expect(isValidationFailure(result)).toBe(true);
      if (isValidationFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
      }
    });
  });

  // ============================================
  // TEST 2: Brain Config Validation
  // ============================================
  describe("BrainConfig Schema", () => {
    it("accepts valid brain config", () => {
      const validData = {
        reasoning_strategy: {
          approach: "chain_of_thought",
          show_reasoning: false,
          max_reasoning_steps: 3,
        },
        context_handling: {
          conversation_window: 10,
          summarize_long_conversations: true,
          track_entities: [],
        },
      };

      const result = validateBrainConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it("rejects unknown keys at root level", () => {
      const invalidData = {
        decision_policies: [],
        unknownRootKey: "should fail",
      };

      const result = validateBrainConfig(invalidData);
      expect(isValidationFailure(result)).toBe(true);
      if (isValidationFailure(result)) {
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(result.error.message).toContain("unknownRootKey");
      }
    });
  });

  // ============================================
  // TEST 3: Personality Config Validation
  // ============================================
  describe("PersonalityConfig Schema", () => {
    it("accepts valid personality config", () => {
      const validData = {
        voice_tone: "friendly",
        formality: 3,
        humor_level: 2,
        use_emojis: false,
      };

      const result = validatePersonalityConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it("rejects invalid enum values", () => {
      const invalidData = {
        voice_tone: "invalid_tone", // not in enum
      };

      const result = validatePersonalityConfig(invalidData);
      expect(isValidationFailure(result)).toBe(true);
    });

    it("rejects out-of-range numbers", () => {
      const invalidData = {
        formality: 10, // should be 1-5
      };

      const result = validatePersonalityConfig(invalidData);
      expect(isValidationFailure(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 4: Tool Config Validation
  // ============================================
  describe("ToolConfig Schema", () => {
    it("accepts valid tool config", () => {
      const validData = {
        enabled_tools: [
          { id: "web_search", name: "Web Search", enabled: true },
        ],
        tool_policies: {
          confirm_sensitive_actions: true,
          max_tools_per_turn: 3,
          log_all_usage: true,
        },
      };

      const result = validateToolConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it("rejects unknown keys at root level", () => {
      const invalidData = {
        enabled_tools: [],
        randomField: "nope",
      };

      const result = validateToolConfig(invalidData);
      expect(isValidationFailure(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 5: Knowledge Config Validation
  // ============================================
  describe("KnowledgeConfig Schema", () => {
    it("accepts valid knowledge config", () => {
      const validData = {
        knowledge_bases: ["kb-1", "kb-2"],
        retrieval_settings: {
          top_k: 5,
          similarity_threshold: 0.7,
        },
        sources: [
          { id: "source-1", type: "website", name: "Company Website", priority: 50 },
        ],
      };

      const result = validateKnowledgeConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });

    it("accepts empty knowledge config", () => {
      const result = validateKnowledgeConfig({});
      expect(isValidationSuccess(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 6: Memory Config Validation
  // ============================================
  describe("MemoryConfig Schema", () => {
    it("accepts valid memory config", () => {
      const validData = {
        short_term: {
          enabled: true,
          window_size: 10,
        },
        long_term: {
          enabled: true,
          summary_strategy: "per_conversation",
          max_summaries: 100,
        },
        persistence: {
          storage: "database",
          encrypt: true,
        },
      };

      const result = validateMemoryConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 7: Learning Config Validation
  // ============================================
  describe("LearningConfig Schema", () => {
    it("accepts valid learning config", () => {
      const validData = {
        learning_enabled: false,
        feedback_loops: {
          explicit_feedback: true,
          implicit_signals: false,
        },
        approval_required: true,
        approvers: ["admin@example.com"],
      };

      const result = validateLearningConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 8: Governance Config Validation
  // ============================================
  describe("GovernanceConfig Schema", () => {
    it("accepts valid governance config", () => {
      const validData = {
        compliance_rules: [],
        risk_thresholds: {
          low_confidence: 0.6,
          high_sensitivity: 0.8,
          sensitive_topics: ["legal", "medical"],
        },
        audit_settings: {
          log_conversations: true,
          log_tool_usage: true,
          retention_days: 90,
        },
        pii_handling: {
          auto_detect: true,
          action: "mask",
        },
      };

      const result = validateGovernanceConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 9: Economics Config Validation
  // ============================================
  describe("EconomicsConfig Schema", () => {
    it("accepts valid economics config", () => {
      const validData = {
        budget_limits: {
          daily_cents: 1000,
          monthly_cents: 20000,
          on_exceed: "warn",
        },
        cost_tracking: {
          track_tokens: true,
          track_tools: true,
          track_voice: false,
        },
        billing_rules: {
          payer: "organization",
          rate_multiplier: 1,
        },
      };

      const result = validateEconomicsConfig(validData);
      expect(isValidationSuccess(result)).toBe(true);
    });
  });

  // ============================================
  // TEST 10: Error Response Structure
  // ============================================
  describe("Validation Error Structure", () => {
    it("returns structured error with code, message, and details", () => {
      const invalidData = {
        invalidKey: "invalid",
      };

      const result = validateRoleCard(invalidData);

      expect(isValidationFailure(result)).toBe(true);
      if (isValidationFailure(result)) {
        expect(result.error).toHaveProperty("code");
        expect(result.error).toHaveProperty("message");
        expect(result.error).toHaveProperty("details");
        expect(result.error.code).toBe("VALIDATION_ERROR");
        expect(typeof result.error.message).toBe("string");
      }
    });

    it("includes field path in error message", () => {
      const invalidData = {
        boundaries: "not an array", // should be array
      };

      const result = validateRoleCard(invalidData as unknown);

      expect(isValidationFailure(result)).toBe(true);
      if (isValidationFailure(result)) {
        // Error message should mention the field
        expect(
          result.error.message.includes("boundaries") ||
            JSON.stringify(result.error.details).includes("boundaries")
        ).toBe(true);
      }
    });
  });
});

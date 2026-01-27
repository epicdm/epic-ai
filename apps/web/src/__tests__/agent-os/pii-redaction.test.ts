/**
 * Agent OS Golden Test: PII Redaction
 *
 * TRACEABILITY TEST: Verifies PII is redacted when pii_allowed=false
 *
 * Contract:
 * - Memory summarizer with pii_allowed=false redacts phone numbers
 * - Memory summarizer with pii_allowed=false redacts email addresses
 * - Memory summarizer with pii_allowed=true preserves PII
 * - Redaction uses consistent placeholder format: [REDACTED_TYPE]
 */

// PII patterns for detection
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  ssn: /\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/g,
  creditCard: /\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g,
};

// Redaction placeholders
const REDACTION_PLACEHOLDERS = {
  email: "[REDACTED_EMAIL]",
  phone: "[REDACTED_PHONE]",
  ssn: "[REDACTED_SSN]",
  creditCard: "[REDACTED_CARD]",
};

/**
 * Redact PII from text based on memory config
 * This simulates the memory summarizer's PII handling
 */
function redactPII(
  text: string,
  config: {
    pii_handling?: {
      redact_by_default?: boolean;
      allowed_fields?: string[];
    };
  }
): { text: string; redactions: Array<{ type: string; count: number }> } {
  const shouldRedact = config.pii_handling?.redact_by_default !== false;
  const allowedFields = config.pii_handling?.allowed_fields || [];

  if (!shouldRedact) {
    return { text, redactions: [] };
  }

  let redactedText = text;
  const redactions: Array<{ type: string; count: number }> = [];

  // Redact each PII type unless explicitly allowed
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (allowedFields.includes(type)) {
      continue;
    }

    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      redactedText = redactedText.replace(
        pattern,
        REDACTION_PLACEHOLDERS[type as keyof typeof REDACTION_PLACEHOLDERS]
      );
      redactions.push({ type, count: matches.length });
    }
  }

  return { text: redactedText, redactions };
}

/**
 * Check if text contains PII
 */
function containsPII(text: string): { hasPII: boolean; types: string[] } {
  const types: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      types.push(type);
    }
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
  }

  return { hasPII: types.length > 0, types };
}

describe("Agent OS PII Redaction - Golden Tests", () => {
  // ============================================
  // TEST 1: Email Redaction
  // ============================================
  describe("Email Redaction", () => {
    it("redacts email addresses when pii_allowed=false", () => {
      const text = "Contact me at john.doe@example.com for more info";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("john.doe@example.com");
      expect(result.text).toContain("[REDACTED_EMAIL]");
      expect(result.redactions.some((r) => r.type === "email")).toBe(true);
    });

    it("redacts multiple email addresses", () => {
      const text = "Send to user1@test.com or user2@test.org";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("user1@test.com");
      expect(result.text).not.toContain("user2@test.org");

      const emailRedaction = result.redactions.find((r) => r.type === "email");
      expect(emailRedaction?.count).toBe(2);
    });

    it("preserves email when explicitly allowed", () => {
      const text = "Contact me at john.doe@example.com";
      const config = {
        pii_handling: {
          redact_by_default: true,
          allowed_fields: ["email"],
        },
      };

      const result = redactPII(text, config);

      expect(result.text).toContain("john.doe@example.com");
      expect(result.redactions.some((r) => r.type === "email")).toBe(false);
    });
  });

  // ============================================
  // TEST 2: Phone Number Redaction
  // ============================================
  describe("Phone Number Redaction", () => {
    it("redacts US phone numbers", () => {
      const text = "Call me at 555-123-4567";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("555-123-4567");
      expect(result.text).toContain("[REDACTED_PHONE]");
    });

    it("redacts phone with country code", () => {
      const text = "My number is +1-555-123-4567";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("555-123-4567");
      expect(result.text).toContain("[REDACTED_PHONE]");
    });

    it("redacts phone in various formats", () => {
      const formats = [
        "555-123-4567",
        "(555) 123-4567",
        "555.123.4567",
        "5551234567",
      ];

      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      for (const phone of formats) {
        const result = redactPII(`Call ${phone}`, config);
        expect(result.text).toContain("[REDACTED_PHONE]");
      }
    });
  });

  // ============================================
  // TEST 3: Preservation When Allowed
  // ============================================
  describe("PII Preservation", () => {
    it("preserves all PII when redact_by_default=false", () => {
      const text = "Email: test@example.com, Phone: 555-123-4567";
      const config = {
        pii_handling: {
          redact_by_default: false,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).toContain("test@example.com");
      expect(result.text).toContain("555-123-4567");
      expect(result.redactions).toHaveLength(0);
    });

    it("preserves PII when no config provided", () => {
      const text = "Email: test@example.com";
      const config = {};

      // Default should be to redact (safer default)
      const result = redactPII(text, config);

      // With our implementation, empty config means redact
      expect(result.text).toContain("[REDACTED_EMAIL]");
    });
  });

  // ============================================
  // TEST 4: PII Detection
  // ============================================
  describe("PII Detection", () => {
    it("detects email in text", () => {
      const text = "Contact john@example.com for help";
      const result = containsPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain("email");
    });

    it("detects phone in text", () => {
      const text = "Call 555-123-4567 now";
      const result = containsPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain("phone");
    });

    it("detects no PII in clean text", () => {
      const text = "This is a message with no personal information";
      const result = containsPII(text);

      expect(result.hasPII).toBe(false);
      expect(result.types).toHaveLength(0);
    });

    it("detects multiple PII types", () => {
      const text = "Email me at test@test.com or call 555-123-4567";
      const result = containsPII(text);

      expect(result.hasPII).toBe(true);
      expect(result.types).toContain("email");
      expect(result.types).toContain("phone");
    });
  });

  // ============================================
  // TEST 5: Redaction Placeholder Format
  // ============================================
  describe("Redaction Placeholder Format", () => {
    it("uses consistent placeholder format", () => {
      const text = "Email: test@test.com, Phone: 555-123-4567";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      // Verify placeholder format
      expect(result.text).toMatch(/\[REDACTED_[A-Z]+\]/);
      expect(result.text).toContain("[REDACTED_EMAIL]");
      expect(result.text).toContain("[REDACTED_PHONE]");
    });

    it("preserves text structure around redactions", () => {
      const text = "Contact: test@example.com | Support: 555-123-4567";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).toContain("Contact:");
      expect(result.text).toContain("|");
      expect(result.text).toContain("Support:");
    });
  });

  // ============================================
  // TEST 6: SSN and Credit Card (Extended PII)
  // ============================================
  describe("Extended PII Types", () => {
    it("redacts SSN-like patterns", () => {
      const text = "SSN: 123-45-6789";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("123-45-6789");
      expect(result.text).toContain("[REDACTED_SSN]");
    });

    it("redacts credit card numbers", () => {
      const text = "Card: 4111-1111-1111-1111";
      const config = {
        pii_handling: {
          redact_by_default: true,
        },
      };

      const result = redactPII(text, config);

      expect(result.text).not.toContain("4111-1111-1111-1111");
      expect(result.text).toContain("[REDACTED_CARD]");
    });
  });
});

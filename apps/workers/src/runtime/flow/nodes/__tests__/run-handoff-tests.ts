/**
 * Handoff Policy Resolver Test Runner
 * Manual test execution without Jest dependency
 */

import { resolveHandoffTargetPolicyFirst } from "../handoff";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: (error as Error).message });
    console.error(`✗ ${name}: ${(error as Error).message}`);
  }
}

const mockGovernance = {
  handoff: {
    enabled: true,
    handoff_targets: [
      { id: "target-1", context: "queue", exten: "1", priority: 1, enabled: true },
      { id: "target-2", context: "manager", exten: "2", priority: 1, enabled: true },
      { id: "target-3", context: "support", exten: "3", priority: 1, enabled: true },
      { id: "target-4", context: "sales", exten: "4", priority: 1, enabled: false },
    ],
    default_handoff_target_id: "target-1",
  },
};

// ============================================================================
// Test Suite 1: Policy Rule Matching with Reason
// ============================================================================

console.log("\n=== Test Suite 1: Policy Rule Matching with Reason ===\n");

test("should match exact reason and return correct target", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager", got "${result!.context}"`);
  assert(result!.exten === "2", `Expected exten "2", got "${result!.exten}"`);
});

test("should not match if reason does not match", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "billing_inquiry",
            priority: 50,
            target_id: "target-2",
            enabled: true,
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

test("should skip disabled rules", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: false,
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

// ============================================================================
// Test Suite 2: Priority-Based Sorting
// ============================================================================

console.log("\n=== Test Suite 2: Priority-Based Sorting ===\n");

test("should select highest priority rule when multiple match", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 10,
            target_id: "target-1",
            enabled: true,
          },
          {
            id: "rule-2",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
          },
          {
            id: "rule-3",
            reason: "escalation_requested",
            priority: 30,
            target_id: "target-3",
            enabled: true,
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Should pick rule-2 with priority 50
  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager" (priority 50), got "${result!.context}"`);
});

// ============================================================================
// Test Suite 3: Channel Filtering
// ============================================================================

console.log("\n=== Test Suite 3: Channel Filtering ===\n");

test("should match when channel is in rule's channel list", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              channel: ["VOICE", "CHAT"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    channel: "VOICE",
  });

  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager", got "${result!.context}"`);
});

test("should not match when channel is not in rule's channel list", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              channel: ["VOICE"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    channel: "CHAT",
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

// ============================================================================
// Test Suite 4: Severity Filtering
// ============================================================================

console.log("\n=== Test Suite 4: Severity Filtering ===\n");

test("should match when severity meets minimum requirement", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              min_severity: "high",
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    severity: "high",
  });

  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager", got "${result!.context}"`);
});

test("should not match when severity is below minimum requirement", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              min_severity: "high",
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    severity: "medium",
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

// ============================================================================
// Test Suite 5: Tag Filtering (tags_any)
// ============================================================================

console.log("\n=== Test Suite 5: Tag Filtering (tags_any) ===\n");

test("should match when session has at least one rule tag (any semantic)", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              tags_any: ["vip", "priority"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    tags: ["vip"],
  });

  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager", got "${result!.context}"`);
});

test("should not match when session has no rule tags (tags_any)", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              tags_any: ["vip", "priority"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    tags: ["regular"],
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

// ============================================================================
// Test Suite 6: Tag Filtering (tags_all)
// ============================================================================

console.log("\n=== Test Suite 6: Tag Filtering (tags_all) ===\n");

test("should match when session has all rule tags (all semantic)", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              tags_all: ["vip", "priority"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    tags: ["vip", "priority"],
  });

  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager", got "${result!.context}"`);
});

test("should not match when session missing one required tag (tags_all)", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
            when: {
              tags_all: ["vip", "priority"],
            },
          },
        ],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
    tags: ["vip"],
  });

  // Should fall back to default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected default context "queue", got "${result!.context}"`);
});

// ============================================================================
// Test Suite 7: Fallback Chain
// ============================================================================

console.log("\n=== Test Suite 7: Fallback Chain ===\n");

test("should use policy rule if it matches", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "escalation_requested",
            priority: 50,
            target_id: "target-2",
            enabled: true,
          },
        ],
        fallback_target_id: "target-3",
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Step 1: policy rule matches
  assert(result !== null, "Result should not be null");
  assert(result!.context === "manager", `Expected context "manager" (policy rule), got "${result!.context}"`);
});

test("should use policy fallback when no rule matches", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: true,
        reason_rules: [
          {
            id: "rule-1",
            reason: "different_reason",
            priority: 50,
            target_id: "target-2",
            enabled: true,
          },
        ],
        fallback_target_id: "target-3",
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Step 2: no rule matches, use policy fallback
  assert(result !== null, "Result should not be null");
  assert(result!.context === "support", `Expected context "support" (policy fallback), got "${result!.context}"`);
});

test("should use governance default when policy disabled", () => {
  const governance = {
    ...mockGovernance,
    handoff: {
      ...mockGovernance.handoff,
      policy: {
        enabled: false,
        reason_rules: [],
      },
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  // Step 3: policy disabled, use governance default
  assert(result !== null, "Result should not be null");
  assert(result!.context === "queue", `Expected context "queue" (governance default), got "${result!.context}"`);
});

test("should return null when no targets available", () => {
  const governance = {
    handoff: {
      enabled: true,
      handoff_targets: [
        { id: "target-1", context: "queue", exten: "1", priority: 1, enabled: false },
      ],
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  assert(result === null, "Result should be null when no targets available");
});

test("should return null when handoff disabled", () => {
  const governance = {
    handoff: {
      enabled: false,
      handoff_targets: [
        { id: "target-1", context: "queue", exten: "1", priority: 1, enabled: true },
      ],
    },
  };

  const result = resolveHandoffTargetPolicyFirst({
    governance,
    reason: "escalation_requested",
  });

  assert(result === null, "Result should be null when handoff disabled");
});

// ============================================================================
// Test Results Summary
// ============================================================================

console.log("\n" + "=".repeat(80));
console.log("TEST RESULTS SUMMARY");
console.log("=".repeat(80));

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;

console.log(`\nTotal Tests: ${results.length}`);
console.log(`Passed: ${passed} ✓`);
console.log(`Failed: ${failed} ✗`);

if (failed > 0) {
  console.log("\nFailed Tests:");
  results.filter((r) => !r.passed).forEach((r) => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
}

console.log("\n" + "=".repeat(80));
console.log(passed === results.length ? "ALL TESTS PASSED ✓" : "SOME TESTS FAILED ✗");
console.log("=".repeat(80) + "\n");

process.exit(failed > 0 ? 1 : 0);

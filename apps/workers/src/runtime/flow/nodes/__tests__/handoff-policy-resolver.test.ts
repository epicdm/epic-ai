/**
 * Handoff Policy Resolver Tests
 *
 * Comprehensive test suite for resolveHandoffTargetPolicyFirst function
 * covering:
 * - Policy rule matching with reason + constraints
 * - Priority-based sorting when multiple rules match
 * - Fallback chain (policy rules → policy fallback → governance default → first enabled)
 * - Severity/tag/channel filtering
 */

import { resolveHandoffTargetPolicyFirst } from "../handoff";

describe("resolveHandoffTargetPolicyFirst", () => {
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
  // Test 1: Policy Rule Matching with Reason
  // ============================================================================

  describe("Policy rule matching with reason", () => {
    it("should match exact reason and return correct target", () => {
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should not match if reason does not match", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should skip disabled rules", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });

  // ============================================================================
  // Test 2: Priority-Based Sorting
  // ============================================================================

  describe("Priority-based sorting when multiple rules match", () => {
    it("should select highest priority rule when multiple match", () => {
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
      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should handle tie-breaking by using first in sorted order", () => {
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
            ],
          },
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Should pick first in list after sorting
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });

  // ============================================================================
  // Test 3: Channel Filtering
  // ============================================================================

  describe("Channel constraint filtering", () => {
    it("should match when channel is in rule's channel list", () => {
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should not match when channel is not in rule's channel list", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should match when rule has no channel constraint", () => {
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
                when: {},
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });
  });

  // ============================================================================
  // Test 4: Severity Filtering
  // ============================================================================

  describe("Severity constraint filtering", () => {
    it("should match when severity meets minimum requirement", () => {
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should match when severity exceeds minimum requirement", () => {
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
        severity: "critical",
      });

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should not match when severity is below minimum requirement", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should handle all severity levels correctly", () => {
      const severityLevels = ["low", "medium", "high", "critical"] as const;

      for (let i = 0; i < severityLevels.length; i++) {
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
                    min_severity: severityLevels[i],
                  },
                },
              ],
            },
          },
        };

        // Test that same or higher severity matches
        for (let j = i; j < severityLevels.length; j++) {
          const result = resolveHandoffTargetPolicyFirst({
            governance,
            reason: "escalation_requested",
            severity: severityLevels[j],
          });

          expect(result).toEqual(
            { context: "manager", exten: "2", priority: 1 },
            `Should match: min_severity=${severityLevels[i]}, actual=${severityLevels[j]}`
          );
        }

        // Test that lower severity doesn't match
        if (i > 0) {
          const result = resolveHandoffTargetPolicyFirst({
            governance,
            reason: "escalation_requested",
            severity: severityLevels[i - 1],
          });

          expect(result).toEqual(
            { context: "queue", exten: "1", priority: 1 },
            `Should not match: min_severity=${severityLevels[i]}, actual=${severityLevels[i - 1]}`
          );
        }
      }
    });
  });

  // ============================================================================
  // Test 5: Tag Filtering (tags_any)
  // ============================================================================

  describe("Tag constraint filtering (tags_any)", () => {
    it("should match when session has at least one rule tag (any semantic)", () => {
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should match when session has multiple tags and rule needs any", () => {
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
        tags: ["regular", "priority", "new"],
      });

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should not match when session has no rule tags (tags_any)", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });

  // ============================================================================
  // Test 6: Tag Filtering (tags_all)
  // ============================================================================

  describe("Tag constraint filtering (tags_all)", () => {
    it("should match when session has all rule tags (all semantic)", () => {
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

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should match when session has all required tags plus extra", () => {
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
        tags: ["vip", "priority", "enterprise"],
      });

      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should not match when session missing one required tag (tags_all)", () => {
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
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });

  // ============================================================================
  // Test 7: Fallback Chain
  // ============================================================================

  describe("Fallback chain (policy rules → policy fallback → governance default → first enabled)", () => {
    it("should use policy rule if it matches", () => {
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
          default_handoff_target_id: "target-1",
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Step 1: policy rule matches
      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should use policy fallback when no rule matches", () => {
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
          default_handoff_target_id: "target-1",
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Step 2: no rule matches, use policy fallback
      expect(result).toEqual({ context: "support", exten: "3", priority: 1 });
    });

    it("should use governance default when policy disabled", () => {
      const governance = {
        ...mockGovernance,
        handoff: {
          ...mockGovernance.handoff,
          policy: {
            enabled: false,
            reason_rules: [],
          },
          default_handoff_target_id: "target-1",
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Step 3: policy disabled, use governance default
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should use first enabled target when nothing else configured", () => {
      const governance = {
        handoff: {
          enabled: true,
          handoff_targets: [
            { id: "target-1", context: "queue", exten: "1", priority: 1, enabled: false },
            { id: "target-2", context: "manager", exten: "2", priority: 1, enabled: true },
            { id: "target-3", context: "support", exten: "3", priority: 1, enabled: true },
          ],
          // No default_handoff_target_id
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Step 4: first enabled target
      expect(result).toEqual({ context: "manager", exten: "2", priority: 1 });
    });

    it("should return null when no targets available", () => {
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

      expect(result).toBeNull();
    });

    it("should return null when handoff disabled", () => {
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

      expect(result).toBeNull();
    });

    it("should return null when governance null or undefined", () => {
      const result1 = resolveHandoffTargetPolicyFirst({
        governance: null,
        reason: "escalation_requested",
      });

      const result2 = resolveHandoffTargetPolicyFirst({
        governance: undefined,
        reason: "escalation_requested",
      });

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  // ============================================================================
  // Test 8: Complex Constraint Combinations
  // ============================================================================

  describe("Complex constraint combinations", () => {
    it("should match only when all constraints are satisfied", () => {
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
                  tags_any: ["vip"],
                  min_severity: "high",
                },
              },
            ],
          },
          default_handoff_target_id: "target-1",
        },
      };

      // Should match: all constraints satisfied
      const result1 = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
        channel: "VOICE",
        tags: ["vip"],
        severity: "critical",
      });
      expect(result1).toEqual({ context: "manager", exten: "2", priority: 1 });

      // Should not match: wrong channel
      const result2 = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
        channel: "CHAT",
        tags: ["vip"],
        severity: "critical",
      });
      expect(result2).toEqual({ context: "queue", exten: "1", priority: 1 });

      // Should not match: missing tag
      const result3 = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
        channel: "VOICE",
        tags: ["regular"],
        severity: "critical",
      });
      expect(result3).toEqual({ context: "queue", exten: "1", priority: 1 });

      // Should not match: low severity
      const result4 = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
        channel: "VOICE",
        tags: ["vip"],
        severity: "low",
      });
      expect(result4).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });

  // ============================================================================
  // Test 9: Target Resolution Edge Cases
  // ============================================================================

  describe("Target resolution edge cases", () => {
    it("should handle default exten and priority values", () => {
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
                target_id: "target-with-defaults",
                enabled: true,
              },
            ],
          },
          handoff_targets: [
            { id: "target-with-defaults", context: "queue" }, // No exten/priority
          ],
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should skip disabled target and move to fallback", () => {
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
                target_id: "target-4", // This is disabled
                enabled: true,
              },
            ],
            fallback_target_id: "target-1",
          },
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Rule matched but target is disabled, use policy fallback
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });

    it("should handle missing target reference gracefully", () => {
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
                target_id: "nonexistent-target",
                enabled: true,
              },
            ],
            fallback_target_id: "target-1",
          },
        },
      };

      const result = resolveHandoffTargetPolicyFirst({
        governance,
        reason: "escalation_requested",
      });

      // Rule matched but target not found, use policy fallback
      expect(result).toEqual({ context: "queue", exten: "1", priority: 1 });
    });
  });
});

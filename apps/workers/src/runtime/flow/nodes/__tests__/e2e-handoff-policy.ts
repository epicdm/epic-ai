/**
 * End-to-End Handoff Policy Resolver Test
 * Simulates live call escalation with policy-based target resolution
 */

import { resolveHandoffTargetPolicyFirst } from "../handoff";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function test(name: string, fn: () => void, details?: string) {
  try {
    fn();
    results.push({ name, passed: true, details });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: (error as Error).message, details });
    console.error(`✗ ${name}: ${(error as Error).message}`);
  }
}

// Scenario 1: VIP Customer Support Escalation
console.log("\n=== Scenario 1: VIP Customer Support Escalation ===\n");

test(
  "should route VIP escalation to premium support with high priority",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-basic", context: "support", exten: "1", priority: 1, enabled: true },
          { id: "target-premium", context: "premium_support", exten: "2", priority: 1, enabled: true },
          { id: "target-vip", context: "vip_support", exten: "3", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-basic",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "vip-rule",
              reason: "customer_requested_human",
              priority: 100,
              target_id: "target-vip",
              enabled: true,
              when: {
                tags_any: ["vip"],
              },
            },
          ],
        },
      },
    };

    const result = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "customer_requested_human",
      tags: ["vip"],
    });

    assert(result !== null, "Result should not be null");
    assert(result!.context === "vip_support", "VIP customer should route to vip_support context");
    assert(result!.exten === "3", "Should use extension 3");
  },
  "VIP customers with tags_any=['vip'] should route to highest priority target"
);

// Scenario 2: Channel-Specific Escalation
console.log("\n=== Scenario 2: Channel-Specific Escalation ===\n");

test(
  "should use different target for voice escalation vs chat",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-voice", context: "voice_support", exten: "1", priority: 1, enabled: true },
          { id: "target-chat", context: "chat_support", exten: "2", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-voice",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "voice-rule",
              reason: "billing_issue",
              priority: 50,
              target_id: "target-voice",
              enabled: true,
              when: {
                channel: ["VOICE"],
              },
            },
            {
              id: "chat-rule",
              reason: "billing_issue",
              priority: 50,
              target_id: "target-chat",
              enabled: true,
              when: {
                channel: ["CHAT"],
              },
            },
          ],
        },
      },
    };

    const voiceResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "billing_issue",
      channel: "VOICE",
    });
    assert(voiceResult?.context === "voice_support", "Voice should route to voice_support");

    const chatResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "billing_issue",
      channel: "CHAT",
    });
    assert(chatResult?.context === "chat_support", "Chat should route to chat_support");
  },
  "Different channels should route to appropriate targets based on policy rules"
);

// Scenario 3: Severity-Based Escalation
console.log("\n=== Scenario 3: Severity-Based Escalation Chain ===\n");

test(
  "should escalate high severity issues to specialized team",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-tier1", context: "tier1_support", exten: "1", priority: 1, enabled: true },
          { id: "target-tier2", context: "tier2_support", exten: "2", priority: 1, enabled: true },
          { id: "target-tier3", context: "tier3_specialist", exten: "3", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-tier1",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "high-severity-rule",
              reason: "technical_issue",
              priority: 100,
              target_id: "target-tier3",
              enabled: true,
              when: {
                min_severity: "high",
              },
            },
            {
              id: "medium-severity-rule",
              reason: "technical_issue",
              priority: 50,
              target_id: "target-tier2",
              enabled: true,
              when: {
                min_severity: "medium",
              },
            },
          ],
        },
      },
    };

    const criticalResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "technical_issue",
      severity: "critical",
    });
    assert(criticalResult?.context === "tier3_specialist", "Critical issue should go to tier3_specialist");

    const highResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "technical_issue",
      severity: "high",
    });
    assert(highResult?.context === "tier3_specialist", "High issue should go to tier3_specialist");

    const mediumResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "technical_issue",
      severity: "medium",
    });
    assert(mediumResult?.context === "tier2_support", "Medium issue should go to tier2_support");

    const lowResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "technical_issue",
      severity: "low",
    });
    assert(lowResult?.context === "tier1_support", "Low issue should fall back to default tier1_support");
  },
  "Issues with different severity levels should route to appropriate specialist tiers"
);

// Scenario 4: Multi-Constraint Rule Matching
console.log("\n=== Scenario 4: Multi-Constraint Rule Matching ===\n");

test(
  "should require all constraints to match for complex routing",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-general", context: "general", exten: "1", priority: 1, enabled: true },
          { id: "target-vip-voice", context: "vip_voice_support", exten: "2", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-general",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "vip-voice-rule",
              reason: "sales_escalation",
              priority: 100,
              target_id: "target-vip-voice",
              enabled: true,
              when: {
                tags_any: ["vip"],
                channel: ["VOICE"],
                min_severity: "high",
              },
            },
          ],
        },
      },
    };

    const fullMatchResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "sales_escalation",
      tags: ["vip"],
      channel: "VOICE",
      severity: "high",
    });
    assert(fullMatchResult?.context === "vip_voice_support", "All constraints met should route to vip_voice_support");

    const noTagResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "sales_escalation",
      tags: ["regular"],
      channel: "VOICE",
      severity: "high",
    });
    assert(noTagResult?.context === "general", "Missing VIP tag should fall back to general");

    const wrongChannelResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "sales_escalation",
      tags: ["vip"],
      channel: "CHAT",
      severity: "high",
    });
    assert(wrongChannelResult?.context === "general", "Wrong channel should fall back to general");

    const lowSeverityResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "sales_escalation",
      tags: ["vip"],
      channel: "VOICE",
      severity: "low",
    });
    assert(lowSeverityResult?.context === "general", "Low severity should fall back to general");
  },
  "Multi-constraint rules require ALL constraints to match (AND logic)"
);

// Scenario 5: Policy Fallback Chain
console.log("\n=== Scenario 5: Policy Fallback Chain ===\n");

test(
  "should use complete fallback chain: rule -> policy fallback -> governance default",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-default", context: "default_queue", exten: "1", priority: 1, enabled: true },
          { id: "target-fallback", context: "policy_fallback_queue", exten: "2", priority: 1, enabled: true },
          { id: "target-matched", context: "specific_queue", exten: "3", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-default",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "specific-rule",
              reason: "high_risk_topic",
              priority: 50,
              target_id: "target-matched",
              enabled: true,
            },
          ],
          fallback_target_id: "target-fallback",
        },
      },
    };

    const matchedResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "high_risk_topic",
    });
    assert(matchedResult?.context === "specific_queue", "Step 1: Matched rule should return specific_queue");

    const fallbackResult = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "unknown_reason",
    });
    assert(fallbackResult?.context === "policy_fallback_queue", "Step 2: No rule match should use policy fallback");

    const govDefaultResult = resolveHandoffTargetPolicyFirst({
      governance: {
        ...governance,
        handoff: {
          ...governance.handoff,
          policy: { enabled: false, reason_rules: [] },
        },
      },
      reason: "high_risk_topic",
    });
    assert(govDefaultResult?.context === "default_queue", "Step 3: Disabled policy should use governance default");
  },
  "Fallback chain properly cascades: policy rule -> policy fallback -> governance default"
);

// Scenario 6: Priority-Based Rule Selection
console.log("\n=== Scenario 6: Priority-Based Rule Selection ===\n");

test(
  "should select highest priority rule when multiple match same reason",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-low", context: "low_priority_queue", exten: "1", priority: 1, enabled: true },
          { id: "target-med", context: "med_priority_queue", exten: "2", priority: 1, enabled: true },
          { id: "target-high", context: "high_priority_queue", exten: "3", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-low",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "rule-low",
              reason: "customer_requested_human",
              priority: 10,
              target_id: "target-low",
              enabled: true,
            },
            {
              id: "rule-high",
              reason: "customer_requested_human",
              priority: 90,
              target_id: "target-high",
              enabled: true,
            },
            {
              id: "rule-med",
              reason: "customer_requested_human",
              priority: 50,
              target_id: "target-med",
              enabled: true,
            },
          ],
        },
      },
    };

    const result = resolveHandoffTargetPolicyFirst({
      governance,
      reason: "customer_requested_human",
    });
    assert(result?.context === "high_priority_queue", "Highest priority (90) should be selected");
  },
  "When multiple rules match the same reason, the highest priority rule is selected"
);

// Scenario 7: Disabled Rule Filtering
console.log("\n=== Scenario 7: Disabled Rule Filtering ===\n");

test(
  "should skip disabled rules during matching",
  () => {
    const governance = {
      handoff: {
        enabled: true,
        handoff_targets: [
          { id: "target-default", context: "default", exten: "1", priority: 1, enabled: true },
          { id: "target-active", context: "active_rule", exten: "2", priority: 1, enabled: true },
        ],
        default_handoff_target_id: "target-default",
        policy: {
          enabled: true,
          reason_rules: [
            {
              id: "disabled-rule",
              reason: "escalation_requested",
              priority: 100,
              target_id: "target-active",
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
    assert(result?.context === "default", "Disabled rule should be skipped, fallback to default");
  },
  "Disabled rules are ignored during policy evaluation"
);

// Results Summary
console.log("\n" + "=".repeat(80));
console.log("E2E HANDOFF POLICY TEST RESULTS");
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
} else {
  console.log("\n🎉 All E2E scenarios passed successfully!");
  console.log("\nVerified Scenarios:");
  results.forEach((r) => {
    if (r.details) {
      console.log(`  ✓ ${r.details}`);
    }
  });
}

console.log("\n" + "=".repeat(80));
console.log(passed === results.length ? "ALL E2E TESTS PASSED ✓" : "SOME E2E TESTS FAILED ✗");
console.log("=".repeat(80) + "\n");

process.exit(failed > 0 ? 1 : 0);

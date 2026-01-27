/**
 * Handoff Node Unit Tests
 * Tests critical scenarios for transfer tool integration
 */

import { runHandoffNode, HandoffNodeArgs, HandoffNode } from "../handoff";

// Test scenarios
async function runTests() {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
  }

  async function test(
    name: string,
    fn: () => Promise<void>
  ) {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({
        name,
        passed: false,
        error: (error as Error).message,
      });
      console.error(`✗ ${name}: ${(error as Error).message}`);
    }
  }

  // Test 1: Missing Asterisk channel
  console.log("\n=== Test Suite 1: Error Handling ===\n");

  await test("should fail safely when asterisk_channel is missing", async () => {
    const node: HandoffNode = {
      id: "handoff-1",
      type: "handoff",
      reason: "escalation_requested",
      target: {
        context: "support",
        exten: "1",
      },
    };

    const args: HandoffNodeArgs = {
      node,
      session: {
        sessionId: "session-123",
        agentId: "agent-1",
        channel: "VOICE",
        // asterisk_channel is intentionally missing
      },
      governance: null,
    };

    const result = await runHandoffNode(args);

    assert(result.stop === true, "Should return stop signal");
    assert(
      result.sessionState === "ESCALATION_FAILED",
      "Should mark session as ESCALATION_FAILED"
    );
    assert(
      result.result.ok === false,
      "Should return failed result"
    );
  });

  // Test 2: Missing handoff target
  await test("should fail safely when no handoff target is configured", async () => {
    const node: HandoffNode = {
      id: "handoff-2",
      type: "handoff",
      reason: "unknown_reason",
      // No target specified
    };

    const args: HandoffNodeArgs = {
      node,
      session: {
        sessionId: "session-124",
        agentId: "agent-1",
        asterisk_channel: "PJSIP/alice-00000001",
        channel: "VOICE",
      },
      governance: {
        handoff: {
          enabled: false, // Disabled, so no fallback
        },
      },
    };

    const result = await runHandoffNode(args);

    assert(result.stop === true, "Should return stop signal");
    assert(
      result.sessionState === "ESCALATION_FAILED",
      "Should mark session as ESCALATION_FAILED"
    );
    assert(
      result.result.ok === false,
      "Should return failed result"
    );
  });

  // Test 3: Valid target resolution via policy
  console.log("\n=== Test Suite 2: Target Resolution ===\n");

  await test("should resolve target via policy when node.target is not specified", async () => {
    const node: HandoffNode = {
      id: "handoff-3",
      type: "handoff",
      reason: "escalation_requested",
      // No target - should use policy resolution
    };

    const args: HandoffNodeArgs = {
      node,
      session: {
        sessionId: "session-125",
        agentId: "agent-1",
        asterisk_channel: "PJSIP/alice-00000001",
        asterisk_other_channel: "PJSIP/bob-00000002",
        channel: "VOICE",
        tags: ["vip"],
      },
      governance: {
        handoff: {
          enabled: true,
          handoff_targets: [
            {
              id: "target-vip",
              context: "vip_support",
              exten: "1",
              priority: 1,
              enabled: true,
            },
          ],
          default_handoff_target_id: "target-vip",
          policy: {
            enabled: true,
            reason_rules: [
              {
                id: "vip-rule",
                reason: "escalation_requested",
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
      },
    };

    // Mock the transfer tool to avoid actual network calls
    const originalFetch = global.fetch;
    let transferCalled = false;
    let transferTarget = "";

    (global.fetch as any) = async (url: string, options: any) => {
      if (url.includes("/telephony/transfer")) {
        transferCalled = true;
        const body = JSON.parse(options.body);
        transferTarget = `${body.context}/${body.exten}`;

        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              ok: true,
              response: "Success",
              duration_ms: 50,
            },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const result = await runHandoffNode(args);

      assert(result.stop === true, "Should return stop signal");
      assert(
        result.sessionState === "ESCALATED",
        "Should mark session as ESCALATED"
      );
      assert(result.result.ok === true, "Should return success result");
      assert(
        transferCalled,
        "Should call transfer endpoint"
      );
      assert(
        transferTarget === "vip_support/1",
        `Should resolve to vip_support/1, got ${transferTarget}`
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 4: Explicit target in node
  await test("should use explicit node.target when specified", async () => {
    const node: HandoffNode = {
      id: "handoff-4",
      type: "handoff",
      reason: "manual_escalation",
      target: {
        context: "manager_queue",
        exten: "5",
        priority: 2,
      },
    };

    const args: HandoffNodeArgs = {
      node,
      session: {
        sessionId: "session-126",
        agentId: "agent-1",
        asterisk_channel: "PJSIP/alice-00000001",
        channel: "VOICE",
      },
      governance: null,
    };

    const originalFetch = global.fetch;
    let capturedTarget = "";

    (global.fetch as any) = async (url: string, options: any) => {
      if (url.includes("/telephony/transfer")) {
        const body = JSON.parse(options.body);
        capturedTarget = `${body.context}/${body.exten}`;

        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              ok: true,
              response: "Success",
              duration_ms: 50,
            },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const result = await runHandoffNode(args);

      assert(result.stop === true, "Should return stop signal");
      assert(
        result.sessionState === "ESCALATED",
        "Should mark session as ESCALATED"
      );
      assert(
        capturedTarget === "manager_queue/5",
        `Should use explicit target manager_queue/5, got ${capturedTarget}`
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Test 5: Session event tracking
  console.log("\n=== Test Suite 3: Session Event Tracking ===\n");

  await test("should write escalation event to session on success", async () => {
    const node: HandoffNode = {
      id: "handoff-5",
      type: "handoff",
      reason: "customer_requested_human",
      target: {
        context: "support",
        exten: "1",
      },
    };

    let eventWritten = false;
    let eventState = "";

    const args: HandoffNodeArgs = {
      node,
      session: {
        sessionId: "session-127",
        agentId: "agent-1",
        asterisk_channel: "PJSIP/alice-00000001",
      },
      writeSessionEvent: async (sessionId, patch) => {
        eventWritten = true;
        eventState = patch.state;
      },
      governance: null,
    };

    const originalFetch = global.fetch;
    (global.fetch as any) = async (url: string, options: any) => {
      if (url.includes("/telephony/transfer")) {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            data: {
              ok: true,
              response: "Success",
              duration_ms: 50,
            },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const result = await runHandoffNode(args);

      assert(eventWritten, "Should write session event");
      assert(eventState === "ESCALATED", "Should write ESCALATED state");
    } finally {
      global.fetch = originalFetch;
    }
  });

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("HANDOFF NODE TEST RESULTS");
  console.log("=".repeat(80));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
  } else {
    console.log("\n🎉 All handoff node tests passed!");
  }

  console.log("\n" + "=".repeat(80));
  console.log(
    passed === results.length ? "ALL TESTS PASSED ✓" : "SOME TESTS FAILED ✗"
  );
  console.log("=".repeat(80) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

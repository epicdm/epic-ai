/**
 * Live Session State Machine Tests
 *
 * Verify state transition rules, handoff states, and validation.
 */

import {
  SessionStateEnum,
  HandoffStateEnum,
  isValidStateTransition,
  validateStateTransition,
  isValidHandoffTransition,
  validateHandoffTransition,
  validateLiveSession,
} from "../state";

describe("SessionStateEnum", () => {
  it("should define all session states", () => {
    const states = [
      "INIT",
      "ACTIVE",
      "ESCALATING",
      "ESCALATED",
      "ENDING",
      "ENDED",
      "FAILED",
    ];
    states.forEach((state) => {
      expect(() => SessionStateEnum.parse(state)).not.toThrow();
    });
  });

  it("should reject invalid states", () => {
    expect(() => SessionStateEnum.parse("INVALID")).toThrow();
    expect(() => SessionStateEnum.parse("ACTIVE_UNKNOWN")).toThrow();
  });
});

describe("HandoffStateEnum", () => {
  it("should define all handoff states", () => {
    const states = ["NONE", "REQUESTED", "IN_PROGRESS", "SUCCESS", "FAILED"];
    states.forEach((state) => {
      expect(() => HandoffStateEnum.parse(state)).not.toThrow();
    });
  });

  it("should reject invalid handoff states", () => {
    expect(() => HandoffStateEnum.parse("INVALID")).toThrow();
    expect(() => HandoffStateEnum.parse("PENDING")).toThrow();
  });
});

describe("isValidStateTransition", () => {
  it("should allow INIT → ACTIVE", () => {
    expect(isValidStateTransition("INIT", "ACTIVE")).toBe(true);
  });

  it("should allow ACTIVE → ESCALATING", () => {
    expect(isValidStateTransition("ACTIVE", "ESCALATING")).toBe(true);
  });

  it("should allow ACTIVE → ENDING", () => {
    expect(isValidStateTransition("ACTIVE", "ENDING")).toBe(true);
  });

  it("should allow ACTIVE → FAILED", () => {
    expect(isValidStateTransition("ACTIVE", "FAILED")).toBe(true);
  });

  it("should allow ESCALATING → ESCALATED", () => {
    expect(isValidStateTransition("ESCALATING", "ESCALATED")).toBe(true);
  });

  it("should allow ESCALATED → ENDING", () => {
    expect(isValidStateTransition("ESCALATED", "ENDING")).toBe(true);
  });

  it("should allow ENDING → ENDED", () => {
    expect(isValidStateTransition("ENDING", "ENDED")).toBe(true);
  });

  it("should block INIT → ESCALATING (skip steps)", () => {
    expect(isValidStateTransition("INIT", "ESCALATING")).toBe(false);
  });

  it("should block ACTIVE → ACTIVE (no self-loop)", () => {
    expect(isValidStateTransition("ACTIVE", "ACTIVE")).toBe(false);
  });

  it("should block transition from terminal ENDED", () => {
    expect(isValidStateTransition("ENDED", "ACTIVE")).toBe(false);
  });

  it("should block transition from terminal FAILED", () => {
    expect(isValidStateTransition("FAILED", "ACTIVE")).toBe(false);
  });

  it("should block return to INIT", () => {
    expect(isValidStateTransition("ACTIVE", "INIT")).toBe(false);
  });

  it("should block ESCALATED → ESCALATING", () => {
    expect(isValidStateTransition("ESCALATED", "ESCALATING")).toBe(false);
  });
});

describe("validateStateTransition", () => {
  it("should validate valid transition", () => {
    const result = validateStateTransition({
      fromState: "ACTIVE",
      toState: "ESCALATING",
      reason: "Customer requested",
    });
    expect(result.valid).toBe(true);
  });

  it("should require reason for ESCALATING transition", () => {
    const result = validateStateTransition({
      fromState: "ACTIVE",
      toState: "ESCALATING",
      enforceRules: true,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("reason");
  });

  it("should require reason for FAILED transition", () => {
    const result = validateStateTransition({
      fromState: "ACTIVE",
      toState: "FAILED",
      enforceRules: true,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("reason");
  });

  it("should allow transition without rules check", () => {
    const result = validateStateTransition({
      fromState: "ACTIVE",
      toState: "ESCALATING",
      enforceRules: false,
    });
    expect(result.valid).toBe(true);
  });
});

describe("isValidHandoffTransition", () => {
  it("should allow NONE → REQUESTED", () => {
    expect(isValidHandoffTransition("NONE", "REQUESTED")).toBe(true);
  });

  it("should allow REQUESTED → IN_PROGRESS", () => {
    expect(isValidHandoffTransition("REQUESTED", "IN_PROGRESS")).toBe(true);
  });

  it("should allow REQUESTED → FAILED", () => {
    expect(isValidHandoffTransition("REQUESTED", "FAILED")).toBe(true);
  });

  it("should allow IN_PROGRESS → SUCCESS", () => {
    expect(isValidHandoffTransition("IN_PROGRESS", "SUCCESS")).toBe(true);
  });

  it("should allow IN_PROGRESS → FAILED", () => {
    expect(isValidHandoffTransition("IN_PROGRESS", "FAILED")).toBe(true);
  });

  it("should block NONE → FAILED (skip steps)", () => {
    expect(isValidHandoffTransition("NONE", "FAILED")).toBe(false);
  });

  it("should block transition from terminal SUCCESS", () => {
    expect(isValidHandoffTransition("SUCCESS", "IN_PROGRESS")).toBe(false);
  });

  it("should block return to NONE", () => {
    expect(isValidHandoffTransition("REQUESTED", "NONE")).toBe(false);
  });
});

describe("validateHandoffTransition", () => {
  it("should validate transition in ESCALATING state", () => {
    const result = validateHandoffTransition({
      fromState: "NONE",
      toState: "REQUESTED",
      sessionState: "ESCALATING",
    });
    expect(result.valid).toBe(true);
  });

  it("should validate transition in ESCALATED state", () => {
    const result = validateHandoffTransition({
      fromState: "IN_PROGRESS",
      toState: "SUCCESS",
      sessionState: "ESCALATED",
    });
    expect(result.valid).toBe(true);
  });

  it("should block transition outside ESCALATING/ESCALATED", () => {
    const result = validateHandoffTransition({
      fromState: "NONE",
      toState: "REQUESTED",
      sessionState: "ACTIVE",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("ESCALATING");
  });

  it("should require reason for FAILED transition", () => {
    const result = validateHandoffTransition({
      fromState: "IN_PROGRESS",
      toState: "FAILED",
      sessionState: "ESCALATING",
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("reason");
  });

  it("should allow FAILED with reason", () => {
    const result = validateHandoffTransition({
      fromState: "IN_PROGRESS",
      toState: "FAILED",
      sessionState: "ESCALATING",
      reason: "Channel not found",
    });
    expect(result.valid).toBe(true);
  });
});

describe("validateLiveSession", () => {
  it("should validate minimal session", () => {
    const session = {
      sessionId: "sess-123",
      state: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = validateLiveSession(session);
    expect(result.valid).toBe(true);
    expect(result.session).toBeDefined();
  });

  it("should validate session with handoff fields", () => {
    const session = {
      sessionId: "sess-123",
      state: "ESCALATING",
      handoff_state: "IN_PROGRESS",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      agentId: "agent-456",
      escalation_attempt_count: 1,
      escalation_reason: "Customer requested",
      asterisk_channel: "PJSIP/6001-00000001",
    };

    const result = validateLiveSession(session);
    expect(result.valid).toBe(true);
  });

  it("should reject missing required fields", () => {
    const session = {
      state: "ACTIVE",
      created_at: new Date().toISOString(),
      // Missing sessionId and updated_at
    };

    const result = validateLiveSession(session);
    expect(result.valid).toBe(false);
  });

  it("should reject invalid session state", () => {
    const session = {
      sessionId: "sess-123",
      state: "INVALID_STATE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = validateLiveSession(session);
    expect(result.valid).toBe(false);
  });

  it("should allow extra fields", () => {
    const session = {
      sessionId: "sess-123",
      state: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      customField: "custom-value",
      tags: ["tag1", "tag2"],
    };

    const result = validateLiveSession(session);
    expect(result.valid).toBe(true);
  });
});

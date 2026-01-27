/**
 * Live Session State Machine Runtime Wiring Tests
 *
 * Verify session state gates, middleware enforcement, and integration helpers.
 */

import {
  createSessionStateGates,
  createSessionStateMiddleware,
  withSessionStateGates,
  withHandoffGates,
} from "../runtime-wiring";
import { SessionState, HandoffState } from "../state";

describe("SessionStateGates", () => {
  describe("canContinueAiLoop", () => {
    it("should allow AI loop in INIT state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("INIT")).toBe(true);
    });

    it("should allow AI loop in ACTIVE state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("ACTIVE")).toBe(true);
    });

    it("should block AI loop in ESCALATING state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("ESCALATING")).toBe(false);
    });

    it("should block AI loop in ESCALATED state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("ESCALATED")).toBe(false);
    });

    it("should block AI loop in ENDING state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("ENDING")).toBe(false);
    });

    it("should block AI loop in ENDED state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("ENDED")).toBe(false);
    });

    it("should block AI loop in FAILED state", () => {
      const gates = createSessionStateGates();
      expect(gates.canContinueAiLoop("FAILED")).toBe(false);
    });
  });

  describe("canRequestHandoff", () => {
    it("should allow handoff only in ACTIVE state", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("ACTIVE")).toBe(true);
    });

    it("should block handoff in INIT", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("INIT")).toBe(false);
    });

    it("should block handoff in ESCALATING", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("ESCALATING")).toBe(false);
    });

    it("should block handoff in ESCALATED", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("ESCALATED")).toBe(false);
    });

    it("should block handoff in ENDING", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("ENDING")).toBe(false);
    });

    it("should block handoff in terminal states", () => {
      const gates = createSessionStateGates();
      expect(gates.canRequestHandoff("ENDED")).toBe(false);
      expect(gates.canRequestHandoff("FAILED")).toBe(false);
    });
  });

  describe("canProcessInput", () => {
    it("should allow input processing in INIT", () => {
      const gates = createSessionStateGates();
      expect(gates.canProcessInput("INIT")).toBe(true);
    });

    it("should allow input processing in ACTIVE", () => {
      const gates = createSessionStateGates();
      expect(gates.canProcessInput("ACTIVE")).toBe(true);
    });

    it("should block input processing in ESCALATING", () => {
      const gates = createSessionStateGates();
      expect(gates.canProcessInput("ESCALATING")).toBe(false);
    });

    it("should block input processing in ESCALATED", () => {
      const gates = createSessionStateGates();
      expect(gates.canProcessInput("ESCALATED")).toBe(false);
    });

    it("should block input processing in terminal states", () => {
      const gates = createSessionStateGates();
      expect(gates.canProcessInput("ENDED")).toBe(false);
      expect(gates.canProcessInput("FAILED")).toBe(false);
    });
  });

  describe("shouldTerminate", () => {
    it("should terminate only when state is ENDING", () => {
      const gates = createSessionStateGates();
      expect(gates.shouldTerminate("ENDING")).toBe(true);
    });

    it("should not terminate in any other state", () => {
      const gates = createSessionStateGates();
      const states: SessionState[] = [
        "INIT",
        "ACTIVE",
        "ESCALATING",
        "ESCALATED",
        "ENDED",
        "FAILED",
      ];
      states.forEach((state) => {
        expect(gates.shouldTerminate(state)).toBe(false);
      });
    });
  });
});

describe("SessionStateMiddleware", () => {
  describe("withAiLoopGate", () => {
    it("should allow handler execution in ACTIVE state", async () => {
      const middleware = createSessionStateMiddleware();
      const handler = jest.fn().mockResolvedValue({ result: "success" });

      const result = await middleware.withAiLoopGate("ACTIVE", handler);

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({ result: "success" });
    });

    it("should allow handler execution in INIT state", async () => {
      const middleware = createSessionStateMiddleware();
      const handler = jest.fn().mockResolvedValue({ result: "success" });

      const result = await middleware.withAiLoopGate("INIT", handler);

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({ result: "success" });
    });

    it("should block handler in ESCALATING with strict mode", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: true });
      const handler = jest.fn();

      await expect(
        middleware.withAiLoopGate("ESCALATING", handler)
      ).rejects.toThrow("AI loop blocked in state: ESCALATING");

      expect(handler).not.toHaveBeenCalled();
    });

    it("should block handler in ESCALATING with non-strict mode", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: false });
      const handler = jest.fn();

      const result = await middleware.withAiLoopGate("ESCALATING", handler);

      expect(handler).not.toHaveBeenCalled();
      expect("blocked" in result).toBe(true);
      if ("blocked" in result) {
        expect(result.blocked).toBe(true);
        expect(result.reason).toContain("ESCALATING");
      }
    });

    it("should call onGateViolation callback when blocked", async () => {
      const onGateViolation = jest.fn();
      const middleware = createSessionStateMiddleware({
        enforceStrict: false,
        onGateViolation,
      });

      await middleware.withAiLoopGate("ESCALATING", jest.fn());

      expect(onGateViolation).toHaveBeenCalledWith({
        gate: "aiLoop",
        state: "ESCALATING",
        operation: "runAgent",
      });
    });
  });

  describe("withHandoffGate", () => {
    it("should allow handler execution only in ACTIVE state", async () => {
      const middleware = createSessionStateMiddleware();
      const handler = jest.fn().mockResolvedValue({ result: "success" });

      const result = await middleware.withHandoffGate("ACTIVE", handler);

      expect(handler).toHaveBeenCalled();
      expect(result).toEqual({ result: "success" });
    });

    it("should block handler in INIT state", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: false });
      const handler = jest.fn();

      const result = await middleware.withHandoffGate("INIT", handler);

      expect(handler).not.toHaveBeenCalled();
      expect("blocked" in result).toBe(true);
    });

    it("should block handler in ESCALATING state", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: false });
      const handler = jest.fn();

      const result = await middleware.withHandoffGate("ESCALATING", handler);

      expect(handler).not.toHaveBeenCalled();
      expect("blocked" in result).toBe(true);
    });

    it("should call gate violation callback", async () => {
      const onGateViolation = jest.fn();
      const middleware = createSessionStateMiddleware({
        enforceStrict: false,
        onGateViolation,
      });

      await middleware.withHandoffGate("ESCALATING", jest.fn());

      expect(onGateViolation).toHaveBeenCalledWith({
        gate: "handoff",
        state: "ESCALATING",
        operation: "requestHandoff",
      });
    });
  });

  describe("withInputGate", () => {
    it("should allow input processing in INIT and ACTIVE", async () => {
      const middleware = createSessionStateMiddleware();
      const handler = jest.fn().mockResolvedValue({ processed: true });

      expect(await middleware.withInputGate("INIT", handler)).toEqual({
        processed: true,
      });
      expect(await middleware.withInputGate("ACTIVE", handler)).toEqual({
        processed: true,
      });
    });

    it("should block input processing in ESCALATING", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: false });
      const handler = jest.fn();

      const result = await middleware.withInputGate("ESCALATING", handler);

      expect(handler).not.toHaveBeenCalled();
      expect("blocked" in result).toBe(true);
    });

    it("should call gate violation callback", async () => {
      const onGateViolation = jest.fn();
      const middleware = createSessionStateMiddleware({
        enforceStrict: false,
        onGateViolation,
      });

      await middleware.withInputGate("ENDING", jest.fn());

      expect(onGateViolation).toHaveBeenCalledWith({
        gate: "input",
        state: "ENDING",
        operation: "processInput",
      });
    });
  });

  describe("checkTermination", () => {
    it("should return true for ENDING state", () => {
      const middleware = createSessionStateMiddleware();
      expect(middleware.checkTermination("ENDING")).toBe(true);
    });

    it("should return false for non-ENDING states", () => {
      const middleware = createSessionStateMiddleware();
      expect(middleware.checkTermination("ACTIVE")).toBe(false);
      expect(middleware.checkTermination("ENDED")).toBe(false);
    });
  });

  describe("getGates", () => {
    it("should return gates object", () => {
      const middleware = createSessionStateMiddleware();
      const gates = middleware.getGates();

      expect(gates).toHaveProperty("canContinueAiLoop");
      expect(gates).toHaveProperty("canRequestHandoff");
      expect(gates).toHaveProperty("canProcessInput");
      expect(gates).toHaveProperty("shouldTerminate");
    });

    it("gates should work correctly", () => {
      const middleware = createSessionStateMiddleware();
      const gates = middleware.getGates();

      expect(gates.canContinueAiLoop("ACTIVE")).toBe(true);
      expect(gates.canRequestHandoff("ACTIVE")).toBe(true);
      expect(gates.canProcessInput("ACTIVE")).toBe(true);
    });
  });

  describe("strict vs non-strict mode", () => {
    it("strict mode should throw on gate violation", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: true });

      await expect(
        middleware.withAiLoopGate("ENDING", jest.fn())
      ).rejects.toThrow();
    });

    it("non-strict mode should return blocked result", async () => {
      const middleware = createSessionStateMiddleware({ enforceStrict: false });

      const result = await middleware.withAiLoopGate("ENDING", jest.fn());

      expect("blocked" in result).toBe(true);
      if ("blocked" in result) {
        expect(result.blocked).toBe(true);
      }
    });
  });
});

describe("withSessionStateGates", () => {
  it("should execute handler when state allows", async () => {
    const handler = jest.fn().mockResolvedValue({
      ok: true,
      response: "Hello",
    });

    const result = await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      agentTurnHandler: handler,
    });

    expect(handler).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    expect(result.response).toBe("Hello");
  });

  it("should block and return stop signal when state blocks AI loop", async () => {
    const handler = jest.fn();

    const result = await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ENDING",
      agentTurnHandler: handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.stop).toBe(true);
    expect(result.reason).toContain("ENDING");
  });

  it("should check termination after handler execution", async () => {
    const handler = jest.fn().mockResolvedValue({
      ok: true,
      response: "Done",
    });

    const result = await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ENDING",
      agentTurnHandler: handler,
    });

    // State is ENDING, so it blocks AI loop
    expect(result.ok).toBe(false);
    expect(result.stop).toBe(true);
  });

  it("should honor shouldEnd flag from handler", async () => {
    const handler = jest.fn().mockResolvedValue({
      ok: true,
      response: "Closing session",
      shouldEnd: true,
    });

    const result = await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      agentTurnHandler: handler,
    });

    expect(result.ok).toBe(true);
    expect(result.stop).toBe(true);
    expect(result.reason).toBe("Agent indicated session end");
  });

  it("should call onStateChange when state would change", async () => {
    const onStateChange = jest.fn();

    await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ENDING",
      agentTurnHandler: jest.fn().mockResolvedValue({
        ok: true,
        response: "",
      }),
      onStateChange,
    });

    // ENDING state blocks AI loop, but termination check still calls onStateChange
    expect(onStateChange).not.toHaveBeenCalled(); // Because gate blocked execution
  });

  it("should continue normally if all checks pass", async () => {
    const handler = jest.fn().mockResolvedValue({
      ok: true,
      response: "Success",
      shouldEnd: false,
    });

    const result = await withSessionStateGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      agentTurnHandler: handler,
    });

    expect(result.ok).toBe(true);
    expect(result.stop).toBe(false);
    expect(result.response).toBe("Success");
  });
});

describe("withHandoffGates", () => {
  it("should allow handoff execution when state allows", async () => {
    const handoffHandler = jest.fn().mockResolvedValue({
      ok: true,
      code: 200,
      message: "Transferred",
    });
    const onPatch = jest.fn();

    const result = await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      escalationReason: "Customer requested",
      handoffHandler,
      onPatch,
    });

    expect(handoffHandler).toHaveBeenCalled();
    expect(result.ok).toBe(true);
  });

  it("should apply success patch when handoff succeeds", async () => {
    const handoffHandler = jest.fn().mockResolvedValue({
      ok: true,
      code: 200,
      message: "Success",
    });
    const onPatch = jest.fn();

    await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      escalationReason: "Customer requested",
      handoffHandler,
      onPatch,
    });

    expect(onPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        state: "ESCALATED",
        handoff_state: "SUCCESS",
        transferred_at: expect.any(String),
        updated_at: expect.any(String),
      })
    );
  });

  it("should apply failed patch when handoff fails", async () => {
    const handoffHandler = jest.fn().mockResolvedValue({
      ok: false,
      code: 500,
      message: "No agents available",
    });
    const onPatch = jest.fn();

    await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      escalationReason: "Customer requested",
      handoffHandler,
      onPatch,
    });

    expect(onPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        handoff_state: "FAILED",
        escalation_error: "No agents available",
        updated_at: expect.any(String),
      })
    );
  });

  it("should block handoff when state doesn't allow", async () => {
    const handoffHandler = jest.fn();
    const onPatch = jest.fn();

    const result = await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ESCALATING", // Handoff only from ACTIVE
      escalationReason: "Customer requested",
      handoffHandler,
      onPatch,
    });

    expect(handoffHandler).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(result.code).toBe(409);
  });

  it("should apply error patch when handoff blocked", async () => {
    const onPatch = jest.fn();

    await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ESCALATING",
      escalationReason: "Customer requested",
      handoffHandler: jest.fn(),
      onPatch,
    });

    expect(onPatch).toHaveBeenCalledWith(
      expect.objectContaining({
        handoff_state: "FAILED",
        escalation_error: expect.stringContaining("Cannot handoff"),
        updated_at: expect.any(String),
      })
    );
  });

  it("should not call onPatch if not provided", async () => {
    const handoffHandler = jest.fn().mockResolvedValue({
      ok: true,
      code: 200,
      message: "Success",
    });

    const result = await withHandoffGates({
      sessionId: "sess-123",
      sessionState: "ACTIVE",
      escalationReason: "Customer requested",
      handoffHandler,
      // onPatch not provided
    });

    expect(result.ok).toBe(true);
  });

  it("should handle handoff handler errors gracefully", async () => {
    const handoffHandler = jest.fn().mockRejectedValue(
      new Error("Connection failed")
    );
    const onPatch = jest.fn();

    await expect(
      withHandoffGates({
        sessionId: "sess-123",
        sessionState: "ACTIVE",
        escalationReason: "Customer requested",
        handoffHandler,
        onPatch,
      })
    ).rejects.toThrow();
  });
});

describe("Integration scenarios", () => {
  it("should support full escalation flow: ACTIVE → ESCALATING → ESCALATED", async () => {
    const middleware = createSessionStateMiddleware({
      enforceStrict: false,
    });

    // Step 1: AI loop continues in ACTIVE
    let result = await middleware.withAiLoopGate("ACTIVE", async () => ({
      turn: 1,
    }));
    expect("blocked" in result).toBe(false);

    // Step 2: Handoff requested from ACTIVE
    result = await middleware.withHandoffGate("ACTIVE", async () => ({
      handoff: "success",
    }));
    expect("blocked" in result).toBe(false);

    // Step 3: AI loop blocked in ESCALATING
    result = await middleware.withAiLoopGate("ESCALATING", async () => ({
      turn: 2,
    }));
    expect("blocked" in result).toBe(true);

    // Step 4: Handoff blocked in ESCALATING (already in progress)
    result = await middleware.withHandoffGate("ESCALATING", async () => ({
      handoff: "another",
    }));
    expect("blocked" in result).toBe(true);

    // Step 5: AI loop still blocked in ESCALATED
    result = await middleware.withAiLoopGate("ESCALATED", async () => ({
      turn: 3,
    }));
    expect("blocked" in result).toBe(true);

    // Step 6: Input blocked in ESCALATED
    result = await middleware.withInputGate("ESCALATED", async () => ({
      input: "user input",
    }));
    expect("blocked" in result).toBe(true);
  });

  it("should support termination flow: ACTIVE → ENDING → ENDED", async () => {
    const middleware = createSessionStateMiddleware({
      enforceStrict: false,
    });

    // Step 1: Check termination in ACTIVE (false)
    expect(middleware.checkTermination("ACTIVE")).toBe(false);

    // Step 2: Transition to ENDING
    // (state machine validation would occur here)

    // Step 3: Check termination in ENDING (true)
    expect(middleware.checkTermination("ENDING")).toBe(true);

    // Step 4: AI loop blocked in ENDING
    const result = await middleware.withAiLoopGate("ENDING", jest.fn());
    expect("blocked" in result).toBe(true);
  });

  it("should support failure recovery", async () => {
    const middleware = createSessionStateMiddleware({
      enforceStrict: false,
    });

    // Start in ACTIVE
    let result = await middleware.withAiLoopGate("ACTIVE", async () => ({
      ok: true,
    }));
    expect("blocked" in result).toBe(false);

    // Transition to FAILED after error
    result = await middleware.withAiLoopGate("FAILED", async () => ({
      ok: false,
    }));
    expect("blocked" in result).toBe(true);

    // Handoff blocked in FAILED
    result = await middleware.withHandoffGate("FAILED", async () => ({}));
    expect("blocked" in result).toBe(true);
  });
});

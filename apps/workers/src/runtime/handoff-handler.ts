/**
 * Handoff Handler
 *
 * Manages AI → Human escalation for voice agents.
 * Handles transfer execution, session state updates, and logging.
 *
 * @module runtime/handoff-handler
 */

import type { BrainDecision, RuntimeContext, FlowState } from "./types";
import { runTransferTool } from "./tools/transfer-to-human";
import Redis from "ioredis";

export interface HandoffConfig {
  /** Default transfer target (dialplan context or queue) */
  defaultTarget: string;
  /** Dialplan context for human endpoints */
  context: string;
  /** Priority in dialplan */
  priority: number;
  /** Whether to play transfer message */
  playMessage: boolean;
  /** Transfer method (cli or ami) */
  method: "cli" | "ami";
}

export interface HandoffParams {
  /** Active channel identifier */
  channel: string;
  /** Session/call identifier */
  sessionId: string;
  /** Transfer target (extension/queue) */
  target?: string;
  /** Reason for escalation */
  reason: string;
  /** Current flow state */
  flowState?: FlowState;
  /** Runtime context */
  context?: RuntimeContext;
}

export interface HandoffResult {
  /** Whether transfer was successful */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Transfer target used */
  target: string;
  /** Timestamp of transfer */
  timestamp: string;
  /** Session state after handoff */
  sessionState: "ESCALATED" | "TRANSFER_FAILED";
}

/**
 * Default handoff configuration
 */
const DEFAULT_CONFIG: HandoffConfig = {
  defaultTarget: "sales_queue",
  context: "sales_queue",
  priority: 1,
  playMessage: true,
  method: "cli",
};

/**
 * Get handoff configuration from environment or defaults
 */
function getHandoffConfig(): HandoffConfig {
  return {
    defaultTarget: process.env.HANDOFF_DEFAULT_TARGET || DEFAULT_CONFIG.defaultTarget,
    context: process.env.HANDOFF_CONTEXT || DEFAULT_CONFIG.context,
    priority: Number(process.env.HANDOFF_PRIORITY) || DEFAULT_CONFIG.priority,
    playMessage: process.env.HANDOFF_PLAY_MESSAGE !== "false",
    method: (process.env.HANDOFF_METHOD as "cli" | "ami") || DEFAULT_CONFIG.method,
  };
}

/**
 * Determine transfer target based on decision and config
 */
function resolveTransferTarget(
  decision: BrainDecision,
  flowState?: FlowState,
  config?: HandoffConfig
): string {
  const cfg = config || getHandoffConfig();

  // Priority 1: Decision specifies target
  if (decision.escalation?.target) {
    return decision.escalation.target;
  }

  // Priority 2: Flow node specifies target
  if (flowState?.currentNode) {
    // Check if current node is a handoff node with target metadata
    // This would require extending FlowNode with optional handoff_target field
    // For now, use naming convention: handoff_sales -> sales_queue
    if (flowState.currentNode.startsWith("handoff_")) {
      const target = flowState.currentNode.replace("handoff_", "") + "_queue";
      return target;
    }
  }

  // Priority 3: Default target
  return cfg.defaultTarget;
}

/**
 * Determine escalation reason from decision
 */
function resolveEscalationReason(decision: BrainDecision, flowState?: FlowState): string {
  // Priority 1: Explicit escalation reason
  if (decision.escalation?.reason) {
    return decision.escalation.reason;
  }

  // Priority 2: Decision reasoning
  if (decision.reasoning) {
    return decision.reasoning;
  }

  // Priority 3: Flow-based reason
  if (flowState?.currentNode === "handoff") {
    return "flow_triggered_handoff";
  }

  // Priority 4: Generic reason
  if (decision.action === "escalate") {
    return "agent_escalation";
  }

  return "customer_requested_human";
}

/**
 * Execute handoff/escalation
 *
 * This is the main entry point called by the runtime when
 * decision.action === "handoff" or "escalate"
 */
export async function executeHandoff(params: HandoffParams): Promise<HandoffResult> {
  const { channel, sessionId, reason } = params;
  const config = getHandoffConfig();

  const target = params.target || config.defaultTarget;

  console.log("[handoff-handler] Executing AI → Human escalation", {
    sessionId,
    channel,
    target,
    reason,
    method: config.method,
  });

  try {
    // Execute the transfer
    const transferResult = await runTransferTool(
      {
        channel,
        target,
        reason,
        sessionId,
        context: config.context,
        priority: config.priority,
      },
      config.method
    );

    if (!transferResult.success) {
      console.error("[handoff-handler] Transfer failed", {
        sessionId,
        error: transferResult.message,
      });

      return {
        success: false,
        message: transferResult.message,
        target,
        timestamp: transferResult.timestamp,
        sessionState: "TRANSFER_FAILED",
      };
    }

    // Update session state to ESCALATED
    await updateSessionState(sessionId, "ESCALATED", reason, target);

    console.log("[handoff-handler] Escalation successful", {
      sessionId,
      target,
      timestamp: transferResult.timestamp,
    });

    return {
      success: true,
      message: "Call transferred to human agent",
      target,
      timestamp: transferResult.timestamp,
      sessionState: "ESCALATED",
    };
  } catch (err: any) {
    console.error("[handoff-handler] Handoff execution failed", {
      sessionId,
      error: err?.message,
    });

    return {
      success: false,
      message: `Handoff failed: ${err?.message}`,
      target,
      timestamp: new Date().toISOString(),
      sessionState: "TRANSFER_FAILED",
    };
  }
}

/**
 * Update session state in Redis after handoff
 */
async function updateSessionState(
  sessionId: string,
  state: string,
  reason: string,
  target: string
): Promise<void> {
  try {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    const sessionKey = `agent:session:${sessionId}`;
    await redis.hset(sessionKey, {
      state,
      escalated: "true",
      escalation_reason: reason,
      escalation_target: target,
      escalation_at: new Date().toISOString(),
    });

    await redis.expire(sessionKey, 60 * 60 * 24 * 7); // 7 days
    await redis.quit();

    console.log("[handoff-handler] Updated session state", {
      sessionId,
      state,
      target,
    });
  } catch (err) {
    console.error("[handoff-handler] Failed to update session state", {
      sessionId,
      error: err,
    });
    // Non-critical, don't fail the handoff
  }
}

/**
 * Check if decision requires handoff
 */
export function shouldHandoff(decision: BrainDecision): boolean {
  return decision.action === "handoff" || decision.action === "escalate";
}

/**
 * Build handoff message for TTS before transfer
 */
export function getHandoffMessage(target: string, config?: HandoffConfig): string {
  const cfg = config || getHandoffConfig();

  if (!cfg.playMessage) {
    return "";
  }

  // Customize message based on target
  if (target.includes("sales")) {
    return "Let me connect you to a sales specialist who can help you further.";
  }

  if (target.includes("support")) {
    return "I'm connecting you to our support team now.";
  }

  if (target.includes("technical")) {
    return "Let me transfer you to our technical team.";
  }

  // Default message
  return "Let me connect you to someone who can better assist you.";
}

/**
 * Log handoff attempt for analytics
 */
export async function logHandoffAttempt(
  sessionId: string,
  result: HandoffResult,
  context?: RuntimeContext
): Promise<void> {
  try {
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

    const logKey = `handoff:log:${sessionId}`;
    await redis.hset(logKey, {
      success: result.success ? "true" : "false",
      target: result.target,
      reason: result.message,
      timestamp: result.timestamp,
      session_state: result.sessionState,
      // Optional context data
      flow_node: context?.flowState?.currentNode || "",
      turns_in_node: String(context?.flowState?.turnsInNode || 0),
    });

    await redis.expire(logKey, 60 * 60 * 24 * 30); // 30 days for analytics
    await redis.quit();

    console.log("[handoff-handler] Logged handoff attempt", { sessionId });
  } catch (err) {
    console.error("[handoff-handler] Failed to log handoff", err);
    // Non-critical
  }
}

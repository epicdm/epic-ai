/**
 * Handoff Flow Node
 *
 * Executes complete handoff flow: optional TTS message → transfer → session tracking.
 * Returns stop signal to halt AI loop.
 *
 * Part of Transfer Tool Adapter Pack v1
 */

import { executeTransferTool, TransferResult } from "../../tools/transfer";
import { writeSessionEvent } from "../../../lib/session-events";

export interface HandoffNode {
  id: string;
  type: "handoff";
  // Target is now optional - can be resolved from governance default
  target?: {
    context: string;
    exten: string;
    priority?: number;
  };
  message?: string;
  reason: string;
}

export interface HandoffNodeArgs {
  node: HandoffNode;
  session: {
    id?: string;
    sessionId?: string;
    agentId?: string;
    channel?: string;  // Call type: VOICE, CHAT, SMS, EMAIL
    tags?: string[];
    // Live session data from Redis
    asterisk_channel?: string;
    asterisk_other_channel?: string;
    [key: string]: any;
  };
  writeSessionEvent?: (sessionId: string, patch: Record<string, string>) => Promise<void>;
  playTts?: (text: string) => Promise<void>;
  // Governance config for resolving default handoff target
  governance?: Record<string, any> | null;
}

export interface HandoffNodeResult {
  stop: true;
  result: TransferResult;
  sessionState: "ESCALATED" | "ESCALATION_FAILED";
}

/**
 * Execute handoff flow node
 *
 * Flow:
 * 1. Optionally play TTS message to customer
 * 2. Execute AMI Redirect to transfer channel
 * 3. Write escalation markers to session
 * 4. Return stop signal
 */
/**
 * Resolve handoff target from governance config if node doesn't specify one
 */
function resolveHandoffTarget(
  governance: Record<string, any> | null | undefined
): { context: string; exten: string; priority: number } | null {
  const h = governance?.handoff;
  if (!h?.enabled) return null;

  const targets = h.handoff_targets || [];
  const defaultId = h.default_handoff_target_id;

  // Try to find the default target by ID
  const byId = defaultId ? targets.find((t: any) => t.id === defaultId) : null;
  // Fall back to first enabled target
  const firstEnabled = targets.find((t: any) => t.enabled !== false) || null;

  const chosen = byId && byId.enabled !== false ? byId : firstEnabled;
  if (!chosen) return null;

  return {
    context: chosen.context,
    exten: chosen.exten ?? "1",
    priority: chosen.priority ?? 1,
  };
}

/**
 * Severity ranking for min_severity matching
 */
const severityRank: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

/**
 * Check if have array includes all items from need array
 */
function includesAll(have: string[], need: string[]): boolean {
  return need.every((n) => have.includes(n));
}

/**
 * Check if have array includes any item from need array
 */
function includesAny(have: string[], need: string[]): boolean {
  return have.some((h) => need.includes(h));
}

/**
 * Find and return a target by ID from governance config
 */
function pickTargetById(
  governance: Record<string, any> | null | undefined,
  targetId?: string
): { context: string; exten: string; priority: number } | null {
  if (!targetId) return null;

  const targets = governance?.handoff?.handoff_targets || [];
  const target = targets.find((t: any) => t.id === targetId);

  if (!target || target.enabled === false) return null;

  return {
    context: target.context,
    exten: target.exten ?? "1",
    priority: target.priority ?? 1,
  };
}

/**
 * Resolve handoff target using policy-first approach
 *
 * Priority chain:
 * 1. Policy rules matching reason + constraints (by priority)
 * 2. Policy fallback target
 * 3. Governance default target
 * 4. First enabled target
 */
export interface ResolveHandoffTargetPolicyFirstArgs {
  governance: Record<string, any> | null | undefined;
  reason: string;
  channel?: string;
  tags?: string[];
  severity?: "low" | "medium" | "high" | "critical";
}

export function resolveHandoffTargetPolicyFirst(
  args: ResolveHandoffTargetPolicyFirstArgs
): { context: string; exten: string; priority: number } | null {
  const { governance, reason, channel, tags = [], severity = "low" } = args;

  const h = governance?.handoff;
  if (!h?.enabled) return null;

  // Step 1: Check policy rules if policy is enabled
  if (h.policy?.enabled && h.policy.reason_rules && h.policy.reason_rules.length > 0) {
    // Filter rules by:
    // - matching reason
    // - enabled
    // - matching constraints (channel, tags, severity)
    const matchingRules = h.policy.reason_rules.filter((rule: any) => {
      if (!rule.enabled || rule.reason !== reason) return false;

      const when = rule.when;
      if (!when) return true; // No constraints, always match

      // Channel constraint: must match one of the specified channels
      if (when.channel && channel && !when.channel.includes(channel)) {
        return false;
      }

      // Tags constraint: tags_any (have any), tags_all (have all)
      if (when.tags_any && !includesAny(tags, when.tags_any)) {
        return false;
      }
      if (when.tags_all && !includesAll(tags, when.tags_all)) {
        return false;
      }

      // Severity constraint: min_severity must be met
      if (when.min_severity) {
        const severityValue = severityRank[severity] || severityRank.low;
        const minSeverityValue = severityRank[when.min_severity] || severityRank.low;
        if (severityValue < minSeverityValue) {
          return false;
        }
      }

      return true;
    });

    // Sort by priority (higher first) and pick the first match
    if (matchingRules.length > 0) {
      const topRule = matchingRules.sort((a: any, b: any) => b.priority - a.priority)[0];
      const resolved = pickTargetById(governance, topRule.target_id);
      if (resolved) return resolved;
    }

    // Step 2: If no rule matched, try policy fallback target
    if (h.policy.fallback_target_id) {
      const resolved = pickTargetById(governance, h.policy.fallback_target_id);
      if (resolved) return resolved;
    }
  }

  // Step 3: Fall back to governance default target
  if (h.default_handoff_target_id) {
    const resolved = pickTargetById(governance, h.default_handoff_target_id);
    if (resolved) return resolved;
  }

  // Step 4: Fall back to first enabled target
  const targets = h.handoff_targets || [];
  const firstEnabled = targets.find((t: any) => t.enabled !== false);
  if (!firstEnabled) return null;

  return {
    context: firstEnabled.context,
    exten: firstEnabled.exten ?? "1",
    priority: firstEnabled.priority ?? 1,
  };
}

/**
 * Safety Guards for Handoff Operations
 */

/**
 * Check if session has already attempted handoff (prevent redirect loops)
 */
function hasExceededHandoffAttempts(
  session: Record<string, any>,
  maxAttempts: number = 3
): boolean {
  const attempts = parseInt(session.escalation_attempt_count || "0", 10);
  return attempts >= maxAttempts;
}

/**
 * Check if session is already in escalated state
 */
function isAlreadyEscalated(session: Record<string, any>): boolean {
  return session.state === "ESCALATED" || session.state === "TRANSFER_FAILED";
}

/**
 * Validate that handoff target exists (context/exten pair)
 * In production, this would query Asterisk dialplan
 */
function validateTargetExists(
  target: { context: string; exten: string; priority: number },
  knownContexts?: string[]
): { valid: boolean; reason?: string } {
  // v1: Basic validation - check that context and exten are non-empty
  if (!target.context || target.context.trim() === "") {
    return { valid: false, reason: "context is empty" };
  }
  if (!target.exten || target.exten.trim() === "") {
    return { valid: false, reason: "exten is empty" };
  }

  // v2: Would query Asterisk dialplan to verify context/exten exists
  // For now, if known contexts provided, check against them
  if (knownContexts && !knownContexts.includes(target.context)) {
    console.warn(
      `[handoff-node] Target context "${target.context}" not in known contexts`,
      { knownContexts }
    );
    // Not blocking in v1, just warning
  }

  return { valid: true };
}

/**
 * Check agent eligibility for handoff
 * Agent must be PUBLISHED (has called into system)
 */
function isAgentEligibleForHandoff(session: Record<string, any>): {
  eligible: boolean;
  reason?: string;
} {
  // v1: Check agent ID exists
  if (!session.agentId) {
    return { eligible: false, reason: "no agent assigned" };
  }

  // v2: Would query agent status from registry
  // Agent must be PUBLISHED or READY, not IDLE or OFFLINE

  return { eligible: true };
}

export async function runHandoffNode(
  args: HandoffNodeArgs
): Promise<HandoffNodeResult> {
  const { node, session, writeSessionEvent: writeEvent, playTts, governance } = args;
  const { channel, sessionId, agentId, asterisk_channel } = session;
  const { message, reason } = node;

  console.log("[handoff-node] Starting handoff evaluation", {
    nodeId: node.id,
    sessionId,
    reason,
  });

  // SAFETY GUARD 1: Check if already escalated
  if (isAlreadyEscalated(session)) {
    console.warn("[handoff-node] Session already in escalated state, skipping", {
      sessionId,
      state: session.state,
    });

    return {
      stop: true,
      result: {
        ok: false,
        code: 409,
        message: `Session already in state: ${session.state}`,
        data: {
          ok: false,
          response: "Already escalated",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATED",
    };
  }

  // SAFETY GUARD 2: Check max handoff attempts
  if (hasExceededHandoffAttempts(session, 3)) {
    console.error("[handoff-node] Max handoff attempts exceeded", {
      sessionId,
      attempts: session.escalation_attempt_count,
    });

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "ESCALATION_BLOCKED",
          escalation_error: "Max handoff attempts exceeded (3)",
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write blocked event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 429,
        message: "Max handoff attempts exceeded",
        data: {
          ok: false,
          response: "Too many handoff attempts",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATED",
    };
  }

  // SAFETY GUARD 3: Check agent eligibility
  const agentCheck = isAgentEligibleForHandoff(session);
  if (!agentCheck.eligible) {
    console.warn("[handoff-node] Agent not eligible for handoff", {
      sessionId,
      reason: agentCheck.reason,
    });

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "ESCALATION_BLOCKED",
          escalation_error: `Agent not eligible: ${agentCheck.reason}`,
          escalation_node: node.id,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write eligibility event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 400,
        message: `Agent not eligible: ${agentCheck.reason}`,
        data: {
          ok: false,
          response: "Agent ineligible",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATED",
    };
  }

  // Resolve target: use explicit node.target, then policy-first resolution
  let resolved = node.target;

  if (!resolved) {
    resolved = resolveHandoffTargetPolicyFirst({
      governance,
      reason,
      channel: channel?.toUpperCase() as any,
      tags: [],
      severity: "low",
    });
  }

  const target = resolved;

  if (!target) {
    console.error(
      "[handoff-node] No handoff target configured",
      { node: node.id, sessionId, channel, reason }
    );

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "ESCALATION_FAILED",
          escalation_attempted: "true",
          escalation_reason: reason,
          escalation_error: "No handoff target configured",
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write failure event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 400,
        message: "No handoff target configured",
        data: {
          ok: false,
          response: "No target",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATION_FAILED",
    };
  }

  // SAFETY GUARD 4: Validate target exists
  const targetValidation = validateTargetExists(target);
  if (!targetValidation.valid) {
    console.error("[handoff-node] Invalid handoff target", {
      target,
      reason: targetValidation.reason,
    });

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "ESCALATION_FAILED",
          escalation_attempted: "true",
          escalation_error: `Invalid target: ${targetValidation.reason}`,
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write validation event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 400,
        message: `Invalid target: ${targetValidation.reason}`,
        data: {
          ok: false,
          response: "Invalid target",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATION_FAILED",
    };
  }

  // SAFETY GATE: Check for asterisk_channel (critical for AMI redirect)
  if (!asterisk_channel) {
    console.error("[handoff-node] No asterisk_channel in session", {
      sessionId,
      reason,
    });

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "ESCALATION_FAILED",
          escalation_attempted: "true",
          escalation_error: "No Asterisk channel available",
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write missing channel event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 400,
        message: "No Asterisk channel available for transfer",
        data: {
          ok: false,
          response: "Missing channel",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATION_FAILED",
    };
  }

  console.log("[handoff-node] Starting handoff execution", {
    node: node.id,
    sessionId,
    channel,
    target: `${target.context}/${target.exten}/${target.priority}`,
    reason,
  });

  try {
    // Step 1: Optional TTS message before transfer
    if (message && playTts) {
      console.log("[handoff-node] Playing transfer message", { message });
      try {
        await playTts(message);
      } catch (ttsErr) {
        console.warn("[handoff-node] TTS playback failed, continuing", ttsErr);
      }
    }

    // Step 2: Execute transfer via voice-service
    console.log("[handoff-node] Executing transfer", { channel: asterisk_channel, target });
    const transferResult = await executeTransferTool(session, {
      target: {
        context: target.context,
        exten: target.exten,
        priority: target.priority,
      },
    });

    if (!transferResult.ok) {
      throw new Error(transferResult.message);
    }

    // Step 3: Write escalation markers to session
    if (writeEvent) {
      console.log("[handoff-node] Writing session event", { sessionId });
      try {
        await writeEvent(sessionId, {
          state: "ESCALATED",
          escalated: "true",
          escalation_reason: reason,
          escalation_target: target.context,
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_at: new Date().toISOString(),
          escalation_attempt_count: String(
            (parseInt(session.escalation_attempt_count || "0", 10) + 1)
          ),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write session event", eventErr);
      }
    }

    console.log("[handoff-node] Handoff completed successfully", {
      sessionId,
      target: target.context,
      timestamp: new Date().toISOString(),
    });

    // Step 4: Return stop signal to halt AI loop
    return {
      stop: true,
      result: transferResult,
      sessionState: "ESCALATED",
    };
  } catch (err: any) {
    console.error("[handoff-node] Handoff execution failed", {
      sessionId,
      channel: asterisk_channel,
      error: err?.message,
    });

    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "TRANSFER_FAILED",
          escalation_attempted: "true",
          escalation_error: err?.message,
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
          escalation_attempt_count: String(
            (parseInt(session.escalation_attempt_count || "0", 10) + 1)
          ),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write failure event", eventErr);
      }
    }

    return {
      stop: true,
      result: {
        ok: false,
        code: 500,
        message: err?.message || "Unknown error",
        data: {
          ok: false,
          response: err?.message || "Transfer failed",
          duration_ms: 0,
        },
      },
      sessionState: "ESCALATED",
    };
  }
}

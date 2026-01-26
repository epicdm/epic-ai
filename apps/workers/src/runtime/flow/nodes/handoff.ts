/**
 * Handoff Flow Node
 *
 * Executes complete handoff flow: optional TTS message → transfer → session tracking.
 * Returns stop signal to halt AI loop.
 *
 * Part of Transfer Tool Adapter Pack v1
 */

import { transferToHuman, TransferToHumanResult } from "../../tools/transfer-to-human";
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
    channel: string;
    sessionId: string;
    agentId: string;
  };
  writeSessionEvent?: (sessionId: string, patch: Record<string, string>) => Promise<void>;
  playTts?: (text: string) => Promise<void>;
  // Governance config for resolving default handoff target
  governance?: Record<string, any> | null;
}

export interface HandoffNodeResult {
  stop: true;
  result: TransferToHumanResult;
  sessionState: "ESCALATED";
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

export async function runHandoffNode(
  args: HandoffNodeArgs
): Promise<HandoffNodeResult> {
  const { node, session, writeSessionEvent: writeEvent, playTts, governance } = args;
  const { channel, sessionId, agentId } = session;
  const { message, reason } = node;

  // Resolve target: use explicit or fallback to governance default
  const resolved = node.target ?? resolveHandoffTarget(governance);
  const target = resolved;

  if (!target) {
    console.error(
      "[handoff-node] No handoff target configured",
      { node: node.id, sessionId, channel, reason }
    );

    // v1 behavior: fail safe — stop AI and mark missing config
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
        message: "No handoff target configured",
        redirected_to: null,
        reason,
        timestamp: new Date().toISOString(),
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
        // Non-critical, continue with transfer
      }
    }

    // Step 2: Execute transfer
    console.log("[handoff-node] Executing transfer", { channel, target });
    const transferResult = await transferToHuman({
      channel,
      context: target.context,
      exten: target.exten,
      priority: target.priority,
      reason,
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
          escalation_at: transferResult.timestamp,
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write session event", eventErr);
        // Non-critical, transfer already executed
      }
    }

    console.log("[handoff-node] Handoff completed successfully", {
      sessionId,
      target: target.context,
      timestamp: transferResult.timestamp,
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
      channel,
      error: err?.message,
    });

    // Still mark as escalated attempt even if transfer failed
    if (writeEvent) {
      try {
        await writeEvent(sessionId, {
          state: "TRANSFER_FAILED",
          escalation_attempted: "true",
          escalation_error: err?.message,
          escalation_node: node.id,
          escalation_agent_id: agentId,
          escalation_attempted_at: new Date().toISOString(),
        });
      } catch (eventErr) {
        console.warn("[handoff-node] Failed to write failure event", eventErr);
      }
    }

    // Return stop signal anyway (don't continue AI loop on failed transfer)
    return {
      stop: true,
      result: {
        ok: false,
        message: err?.message || "Unknown error",
        redirected_to: {
          context: target.context,
          exten: target.exten,
          priority: target.priority,
        },
        reason,
        timestamp: new Date().toISOString(),
      },
      sessionState: "ESCALATED",
    };
  }
}

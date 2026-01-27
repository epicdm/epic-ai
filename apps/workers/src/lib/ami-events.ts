/**
 * AMI Event Listener
 *
 * Persistent AMI connection with Events: on to track callback outcomes.
 * Listens for OriginateResponse and Hangup events, correlates them to jobs,
 * and triggers retries when needed.
 *
 * @module lib/ami-events
 */

import net from "node:net";
import {
  linkUniqueIdToJob,
  lookupJobByUniqueId,
  saveCallbackOutcome,
  getCallbackOutcome,
} from "./callback-outcome-store";
import { callbackQueue } from "../queues/callback";

type AmiEvent = Record<string, string>;

/**
 * Parse AMI message into key-value pairs
 */
function parseAmiMessage(raw: string): AmiEvent {
  const msg: AmiEvent = {};
  for (const line of raw.split("\r\n")) {
    const i = line.indexOf(":");
    if (i > 0) {
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim();
      msg[k] = v;
    }
  }
  return msg;
}

/**
 * Check if ActionID is from callback system
 * Format: cb-<jobId>-<timestamp>
 */
function isCallbackActionId(actionId?: string): boolean {
  return !!actionId && actionId.startsWith("cb-");
}

/**
 * Extract job ID from callback ActionID
 * Format: cb-<jobId>-<timestamp>
 */
function extractJobId(actionId: string): string | null {
  const parts = actionId.split("-");
  return parts.length >= 2 ? parts[1] : null;
}

/**
 * Start persistent AMI event listener
 *
 * Connects to Asterisk AMI with Events: on and listens for:
 * - OriginateResponse - Tracks dial outcome
 * - Hangup - Tracks call completion and cause
 *
 * Automatically triggers retries for failed/no-answer/busy outcomes.
 */
export async function startAmiEventListener(): Promise<void> {
  const host = process.env.ASTERISK_AMI_HOST;
  const port = Number(process.env.ASTERISK_AMI_PORT || "5038");
  const user = process.env.ASTERISK_AMI_USER;
  const pass = process.env.ASTERISK_AMI_PASS;

  if (!host || !user || !pass) {
    console.warn("[ami-events] AMI not configured, skipping event listener");
    return;
  }

  console.log("[ami-events] Starting event listener", { host, port, user });

  const sock = net.createConnection({ host, port });
  sock.setKeepAlive(true);

  let buffer = "";

  sock.on("connect", () => {
    console.log("[ami-events] Connected to AMI");

    // Login with Events: on to receive all events
    sock.write(
      [
        "Action: Login",
        `Username: ${user}`,
        `Secret: ${pass}`,
        "Events: on",
        "",
        "",
      ].join("\r\n")
    );
  });

  sock.on("error", (e) => {
    console.error("[ami-events] Socket error", e);
  });

  sock.on("close", () => {
    console.warn("[ami-events] Socket closed, will need manual restart");
    // TODO: Implement auto-reconnect in v2
  });

  sock.on("data", async (chunk) => {
    buffer += chunk.toString("utf8");

    // Process complete AMI messages (separated by \r\n\r\n)
    while (buffer.includes("\r\n\r\n")) {
      const idx = buffer.indexOf("\r\n\r\n");
      const raw = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 4);

      const msg = parseAmiMessage(raw);

      // Only process Events (not Response messages)
      if (!msg.Event) continue;

      try {
        if (msg.Event === "OriginateResponse") {
          await handleOriginateResponse(msg);
        } else if (msg.Event === "Hangup") {
          await handleHangup(msg);
        }
      } catch (error) {
        console.error("[ami-events] Error handling event", {
          event: msg.Event,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });
}

/**
 * Handle OriginateResponse event
 *
 * Fields: ActionID, Response, Channel, Uniqueid, Reason, CallerIDNum
 */
async function handleOriginateResponse(msg: AmiEvent): Promise<void> {
  const actionId = msg.ActionID;
  if (!isCallbackActionId(actionId)) return;

  const jobId = extractJobId(actionId);
  if (!jobId) {
    console.warn("[ami-events] Failed to extract jobId from ActionID", {
      actionId,
    });
    return;
  }

  const response = msg.Response || "Unknown";
  const uniqueid = msg.Uniqueid;

  console.log("[ami-events] OriginateResponse", {
    jobId,
    actionId,
    response,
    uniqueid,
    reason: msg.Reason,
  });

  // Save outcome to Redis
  await saveCallbackOutcome(jobId, {
    stage: "originate",
    actionId,
    response,
    channel: msg.Channel || "",
    uniqueid: uniqueid || "",
    reason: msg.Reason || "",
    at: new Date().toISOString(),
  });

  // Link uniqueid to job for Hangup correlation
  if (uniqueid) {
    await linkUniqueIdToJob(uniqueid, jobId);
  }

  // Retry if originate failed immediately
  if (response.toLowerCase() !== "success") {
    await maybeRetry(jobId, `originate_${response.toLowerCase()}`);
  }
}

/**
 * Handle Hangup event
 *
 * Fields: Uniqueid, Cause, Cause-txt, Channel
 */
async function handleHangup(msg: AmiEvent): Promise<void> {
  const uniqueid = msg.Uniqueid;
  if (!uniqueid) return;

  // Look up job ID from uniqueid
  const jobId = await lookupJobByUniqueId(uniqueid);
  if (!jobId) return; // Not a callback job

  const causeTxt = msg["Cause-txt"] || "";
  const cause = msg.Cause || "";

  console.log("[ami-events] Hangup", {
    jobId,
    uniqueid,
    cause,
    causeTxt,
  });

  // Save hangup outcome
  await saveCallbackOutcome(jobId, {
    stage: "hangup",
    hangup_cause: cause,
    hangup_cause_txt: causeTxt,
    hangup_channel: msg.Channel || "",
    at: new Date().toISOString(),
  });

  // Retry if hangup indicates no-answer/busy/congestion
  const txt = causeTxt.toLowerCase();
  if (
    txt.includes("busy") ||
    txt.includes("no answer") ||
    txt.includes("congestion")
  ) {
    await maybeRetry(jobId, `hangup_${txt.replace(/\s+/g, "_")}`);
  }
}

/**
 * Maybe retry callback based on outcome
 *
 * V1 retry policy:
 * - Up to 2 retries
 * - Delay: 2 minutes (1st retry), 5 minutes (2nd retry)
 * - Stored in Redis outcome hash
 *
 * @param jobId - BullMQ job ID
 * @param reason - Failure reason
 */
async function maybeRetry(jobId: string, reason: string): Promise<void> {
  const current = await getCallbackOutcome(jobId);
  const attempts = Number(current?.attempts || "0");

  if (attempts >= 2) {
    console.warn("[callback] Retry exhausted", { jobId, reason, attempts });

    await saveCallbackOutcome(jobId, {
      final: "failed",
      final_reason: reason,
      attempts: String(attempts),
      at: new Date().toISOString(),
    });

    return;
  }

  const nextAttempts = attempts + 1;
  const delayMs = nextAttempts === 1 ? 120_000 : 300_000; // 2min, 5min

  console.log("[callback] Scheduling retry", {
    jobId,
    nextAttempts,
    delayMs,
    reason,
  });

  await saveCallbackOutcome(jobId, {
    attempts: String(nextAttempts),
    last_retry_reason: reason,
    next_retry_in_ms: String(delayMs),
    at: new Date().toISOString(),
  });

  // Enqueue retry job
  await callbackQueue.add(
    "callback.retry",
    { originalJobId: jobId },
    {
      delay: delayMs,
      removeOnComplete: true,
      attempts: 1, // Don't retry the retry job itself
    }
  );
}

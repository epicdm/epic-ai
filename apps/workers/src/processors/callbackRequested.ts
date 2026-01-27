import type { Job } from "bullmq";
import { CallbackRequestedPayloadSchema } from "@epic-ai/shared";
import { AmiClient } from "../lib/asterisk-ami";

/**
 * Strip non-digit characters except +
 */
function digitsOnly(v: string): string {
  return (v || "").replace(/[^\d+]/g, "");
}

/**
 * Callback Requested Processor (v2: AMI Originate)
 *
 * Processes scheduled callback jobs by triggering outbound calls via Asterisk AMI.
 * Uses AMI Originate to dial the caller, then hands the answered call to voice-service
 * via FastAGI route_to_agent endpoint.
 *
 * @param job - BullMQ job containing callback request payload
 * @returns Result object with originate status
 */
export async function callbackRequestedProcessor(job: Job) {
  const payload = CallbackRequestedPayloadSchema.parse(job.data);

  console.log("[callback.requested] processing", {
    jobId: job.id,
    voiceAgentId: payload.voiceAgentId,
    caller: payload.caller,
    callbackTimeIso: payload.callbackTimeIso,
    callbackWindow: payload.callbackWindow,
  });

  // AMI configuration from environment
  const AMI_HOST = process.env.ASTERISK_AMI_HOST;
  const AMI_PORT = Number(process.env.ASTERISK_AMI_PORT || "5038");
  const AMI_USER = process.env.ASTERISK_AMI_USER;
  const AMI_PASS = process.env.ASTERISK_AMI_PASS;

  if (!AMI_HOST || !AMI_USER || !AMI_PASS) {
    console.warn("[callback.requested] AMI not configured, skipping originate");
    return { ok: false, error: "AMI not configured" };
  }

  const OUTBOUND_TRUNK = process.env.ASTERISK_OUTBOUND_TRUNK || "trunk";
  const OUTBOUND_CID = process.env.ASTERISK_OUTBOUND_CID || "+17675550000";

  // Where voice-service FastAGI is reachable FROM Asterisk
  const FASTAGI_HOST = process.env.VOICE_SERVICE_FASTAGI_HOST || "voice-service";
  const FASTAGI_PORT = Number(process.env.VOICE_SERVICE_FASTAGI_PORT || "4573");

  const caller = digitsOnly(payload.caller);
  const did = digitsOnly(payload.did || OUTBOUND_CID);

  const voiceAgentId = payload.voiceAgentId;
  const sessionId = payload.sessionId;
  const callId = payload.callId || `cb-${job.id}`;

  // Build FastAGI URL with query params
  // When callee answers, Asterisk runs AGI to voice-service
  const agiUrl =
    `agi://${FASTAGI_HOST}:${FASTAGI_PORT}/route_to_agent` +
    `?voiceAgentId=${encodeURIComponent(voiceAgentId)}` +
    `&sessionId=${encodeURIComponent(sessionId)}` +
    `&callId=${encodeURIComponent(callId)}` +
    `&did=${encodeURIComponent(did)}` +
    `&caller=${encodeURIComponent(caller)}` +
    `&jobId=${encodeURIComponent(String(job.id))}`;

  console.log("[callback.requested] connecting to AMI", {
    host: AMI_HOST,
    port: AMI_PORT,
    user: AMI_USER,
  });

  const ami = new AmiClient({
    host: AMI_HOST,
    port: AMI_PORT,
    username: AMI_USER,
    secret: AMI_PASS,
  });

  try {
    await ami.connect();

    console.log("[callback.requested] originating call", {
      caller,
      trunk: OUTBOUND_TRUNK,
      callerID: OUTBOUND_CID,
      agiUrl,
    });

    // Build deterministic ActionID for event correlation
    // Format: cb-<jobId>-<timestamp>
    const actionId = `cb-${job.id}-${Date.now()}`;

    // Originate: dial out via trunk to caller, then execute AGI on answer
    // Channel format for PJSIP: PJSIP/<number>@<endpoint>
    const channel = `PJSIP/${caller}@${OUTBOUND_TRUNK}`;

    const res = await ami.action({
      Action: "Originate",
      ActionID: actionId,
      Channel: channel,
      CallerID: OUTBOUND_CID,
      Timeout: 30000,
      Async: "true",
      Application: "AGI",
      Data: agiUrl,
      Variable: [
        `EPIC_VOICE_AGENT_ID=${voiceAgentId}`,
        `EPIC_SESSION_ID=${sessionId}`,
        `EPIC_CALL_ID=${callId}`,
        `EPIC_DID=${did}`,
        `EPIC_CALLER=${caller}`,
        `EPIC_CALLBACK_JOB_ID=${job.id}`,
        `EPIC_CALLBACK_ACTION_ID=${actionId}`,
      ].join("|"),
    });

    console.log("[callback.requested] originate response", {
      response: res.Response,
      message: res.Message,
    });

    await ami.close();

    return {
      ok: true,
      actionId,
      originate: {
        response: res.Response,
        message: res.Message,
      },
      agiUrl,
    };
  } catch (error) {
    console.error("[callback.requested] AMI error", {
      error: error instanceof Error ? error.message : String(error),
    });

    await ami.close();

    return {
      ok: false,
      error: error instanceof Error ? error.message : "AMI error",
    };
  }
}


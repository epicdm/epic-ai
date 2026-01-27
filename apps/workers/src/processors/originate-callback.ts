import { Job } from "bullmq";
import Redis from "ioredis";
import { amiSendAction } from "../lib/asterisk-ami";
import { writeOutcome } from "../lib/callback-outcome";

type OriginatePayload = {
  toNumber: string;     // who we call
  fromDid: string;      // our DID / caller id
  voiceAgentId: string; // VoiceAgent.id
  metadata?: Record<string, unknown>;
  createdAt?: string;
};

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function envInt(name: string, fallback: number) {
  const v = process.env[name];
  const n = v ? Number(v) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

export async function originateCallbackProcessor(job: Job<OriginatePayload>) {
  const redisUrl = reqEnv("REDIS_URL");
  const redis = new Redis(redisUrl);

  const startedAt = Date.now();
  const jobId = String(job.id);

  const payload = job.data;

  // v1: basic validation (worker-side safety)
  if (!payload?.toNumber || !payload?.fromDid || !payload?.voiceAgentId) {
    await writeOutcome(redis, jobId, {
      stage: "error",
      final: "failed",
      final_reason: "missing required payload fields",
    });
    await redis.quit();
    return;
  }

  // Mark job started
  await writeOutcome(redis, jobId, {
    stage: "originate",
    response: "START",
    to: payload.toNumber,
    from: payload.fromDid,
    voiceAgentId: payload.voiceAgentId,
    attempts: String(job.attemptsMade + 1),
  });

  // AMI originate settings
  const amiHost = reqEnv("ASTERISK_AMI_HOST");
  const amiPort = envInt("ASTERISK_AMI_PORT", 5038);
  const amiUser = reqEnv("ASTERISK_AMI_USER");
  const amiPass = reqEnv("ASTERISK_AMI_PASS");

  const context = process.env.ASTERISK_ORIGINATE_CONTEXT || "from-internal";
  const priority = envInt("ASTERISK_ORIGINATE_PRIORITY", 1);
  const callerIdLabel = process.env.ASTERISK_ORIGINATE_CALLERID || "EPIC";
  const timeoutMs = envInt("ASTERISK_ORIGINATE_TIMEOUT_MS", 30000);

  const channelPrefix = process.env.ASTERISK_ORIGINATE_CHANNEL_PREFIX || "PJSIP/";

  // NOTE:
  // We originate a call to the user. When answered, we send them into a context/exten
  // that will hit your dialplan "route_to_agent" entry point.
  //
  // Here we set EXTEN to route_to_agent (or s) — adjust to match your dialplan.
  const routeExten = "route_to_agent"; // <-- match your dialplan entry extension
  const actionId = `cb-${jobId}-${Date.now()}`;

  // Variables passed to dialplan so route_to_agent can resolve DID + voiceAgentId etc.
  // IMPORTANT: keep these strings; dialplan reads as ${VOICE_AGENT_ID}, etc.
  const variables = [
    `CALLBACK_JOB_ID=${jobId}`,
    `VOICE_AGENT_ID=${payload.voiceAgentId}`,
    `CALLBACK_TO=${payload.toNumber}`,
    `CALLBACK_FROM_DID=${payload.fromDid}`,
  ].join("|");

  // Channel: what we dial out on (trunk tech)
  // Example: PJSIP/+1767..., SIP/+1767..., Local/+1767@outbound, etc.
  const channel = `${channelPrefix}${payload.toNumber}`;

  // CallerID can be "Name <number>" format
  const callerId = `${callerIdLabel} <${payload.fromDid}>`;

  try {
    const res = await amiSendAction(
      {
        host: amiHost,
        port: amiPort,
        username: amiUser,
        password: amiPass,
        timeoutMs: Math.max(5000, Math.min(timeoutMs, 60000)),
      },
      [
        "Action: Originate",
        `ActionID: ${actionId}`,
        `Channel: ${channel}`,
        `Context: ${context}`,
        `Exten: ${routeExten}`,
        `Priority: ${priority}`,
        `CallerID: ${callerId}`,
        `Timeout: ${timeoutMs}`,
        // Async = true so AMI returns immediately. Actual call progress is via AMI events.
        "Async: true",
        `Variable: ${variables}`,
      ]
    );

    // AMI returns success for submission; call may still fail later.
    const response = res.headers["Response"] || "Unknown";
    const message = res.headers["Message"] || "";

    await writeOutcome(redis, jobId, {
      stage: "originate",
      response: response.toUpperCase(),
      reason: message,
      actionId,
      // Not final here; we expect AMI event listener (or dialplan) to write hangup/final later.
    });

    // For v1: if AMI submission is not Success, mark final failed (otherwise leave open)
    if (response.toLowerCase() !== "success") {
      await writeOutcome(redis, jobId, {
        stage: "error",
        final: "failed",
        final_reason: `AMI originate response: ${response} ${message}`.trim(),
      });
    }
  } catch (err: any) {
    await writeOutcome(redis, jobId, {
      stage: "error",
      response: "ERROR",
      final: "failed",
      final_reason: err?.message || "AMI originate failed",
    });
    // rethrow to let BullMQ retries happen
    throw err;
  } finally {
    const dur = Date.now() - startedAt;
    await writeOutcome(redis, jobId, {
      processing_time_ms: String(dur),
    });
    await redis.quit();
  }
}

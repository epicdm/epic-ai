import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";

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

type EnqueueCallbackBody = {
  toNumber: string;
  fromDid: string;
  voiceAgentId: string; // IMPORTANT: VoiceAgent.id, not Agent.id
  metadata?: Record<string, unknown>;
};

function normalizePhone(v: string) {
  return v.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EnqueueCallbackBody>;

    const toNumber = body.toNumber ? normalizePhone(body.toNumber) : "";
    const fromDid = body.fromDid ? normalizePhone(body.fromDid) : "";
    const voiceAgentId = body.voiceAgentId ? String(body.voiceAgentId).trim() : "";

    if (!toNumber || !fromDid || !voiceAgentId) {
      return NextResponse.json(
        {
          data: null,
          confidence: {},
          gaps: [],
          warnings: [
            {
              code: "VALIDATION_ERROR",
              message: "Required: toNumber, fromDid, voiceAgentId",
              severity: "error",
            },
          ],
        },
        { status: 400 }
      );
    }

    // Queue config
    const redisUrl = reqEnv("REDIS_URL");
    const queueName = process.env.CALLBACK_QUEUE_NAME || "telephony-callback";
    const prefix = process.env.BULLMQ_PREFIX || "epic";

    const queue = new Queue(queueName, {
      connection: { url: redisUrl },
      prefix,
    });

    try {
      const attempts = envInt("CALLBACK_JOB_ATTEMPTS", 3);
      const backoffMs = envInt("CALLBACK_JOB_BACKOFF_MS", 5000);

      const job = await queue.add(
        "originate-callback",
        {
          toNumber,
          fromDid,
          voiceAgentId,
          metadata: body.metadata || {},
          createdAt: new Date().toISOString(),
        },
        {
          attempts,
          backoff: { type: "fixed", delay: backoffMs },
          removeOnComplete: true,
          removeOnFail: false, // keep failed jobs for debugging
        }
      );

      return NextResponse.json(
        {
          data: {
            jobId: String(job.id),
            queue: queueName,
            name: "originate-callback",
            toNumber,
            fromDid,
            voiceAgentId,
          },
          confidence: {},
          gaps: [],
          warnings: [],
        },
        { status: 200 }
      );
    } finally {
      await queue.close();
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        data: null,
        confidence: {},
        gaps: [],
        warnings: [
          {
            code: "INTERNAL_ERROR",
            message: err?.message || "Unexpected error",
            severity: "error",
          },
        ],
      },
      { status: 500 }
    );
  }
}

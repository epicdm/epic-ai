import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Queue } from "bullmq";

type GapItem = {
  gap_type:
    | "missing_required"
    | "missing_data"
    | "missing_context"
    | "invalid"
    | "incomplete";
  field_path: string;
  severity: "low" | "medium" | "high";
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
};

type WarningItem = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  field_path?: string;
  suggestion?: string;
};

const ScheduleSchema = z
  .object({
    // Who we call
    toNumber: z.string().min(6, "toNumber required (E.164 preferred)"),
    // The DID we originate from (or context for routing)
    fromDid: z.string().min(6, "fromDid required (E.164 preferred)"),
    // IMPORTANT: VoiceAgent.id (not Agent.id)
    voiceAgentId: z.string().min(1, "voiceAgentId required"),
    // Delay before originate
    delaySeconds: z.number().int().min(0).max(86400).default(0),
    // Optional job metadata
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

function envRedisUrl() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("Missing REDIS_URL in apps/web runtime");
  }
  return url;
}

function envQueueName() {
  // Use a stable name; change later only if you add a dedicated worker consumer name.
  return process.env.CALLBACK_QUEUE_NAME || "telephony-callback";
}

function envPrefix() {
  // BullMQ prefix is optional; align with the rest of your system if you already use one.
  return process.env.BULLMQ_PREFIX || "epic";
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    const warnings: WarningItem[] = [
      {
        code: "INVALID_JSON",
        message: "Request body must be valid JSON.",
        severity: "error",
      },
    ];
    return NextResponse.json(
      {
        data: null,
        confidence: { schedule: 0 },
        gaps: [
          {
            gap_type: "invalid",
            field_path: "body",
            severity: "high",
            impact: "Cannot schedule callback without valid JSON body.",
            recommended_fix: "Send JSON with toNumber, fromDid, voiceAgentId, delaySeconds.",
          } satisfies GapItem,
        ],
        warnings,
      },
      { status: 400 }
    );
  }

  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    const warnings: WarningItem[] = [
      { code: "VALIDATION_FAILED", message: msg, severity: "error" },
    ];

    return NextResponse.json(
      {
        data: null,
        confidence: { schedule: 0 },
        gaps: [
          {
            gap_type: "missing_required",
            field_path: "body",
            severity: "high",
            impact: "Required fields missing or invalid; callback job not scheduled.",
            recommended_fix: "Fix the form fields and retry.",
          } satisfies GapItem,
        ],
        warnings,
      },
      { status: 400 }
    );
  }

  try {
    const redisUrl = envRedisUrl();
    const queueName = envQueueName();
    const prefix = envPrefix();

    const queue = new Queue(queueName, {
      connection: { url: redisUrl },
      prefix,
    });

    const { toNumber, fromDid, voiceAgentId, delaySeconds, metadata } = parsed.data;

    const job = await queue.add(
      "originate-callback",
      {
        toNumber,
        fromDid,
        voiceAgentId,
        // The runtime adapter will use these fields later.
        // Keep everything minimal + explicit for now.
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
      },
      {
        delay: delaySeconds * 1000,
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 200,
        removeOnFail: 200,
      }
    );

    return NextResponse.json(
      {
        data: {
          jobId: String(job.id),
          queue: queueName,
          delaySeconds,
        },
        confidence: { schedule: 1 },
        gaps: [],
        warnings: [],
      },
      { status: 200 }
    );
  } catch (err: any) {
    const warnings: WarningItem[] = [
      {
        code: "SCHEDULE_FAILED",
        message: err?.message || "Failed to enqueue callback job.",
        severity: "error",
        suggestion: "Confirm REDIS_URL is reachable from apps/web and BullMQ is configured.",
      },
    ];

    return NextResponse.json(
      {
        data: null,
        confidence: { schedule: 0 },
        gaps: [
          {
            gap_type: "invalid",
            field_path: "redis",
            severity: "high",
            impact: "Callback job could not be scheduled.",
            recommended_fix: "Fix Redis/BullMQ connectivity and retry.",
          } satisfies GapItem,
        ],
        warnings,
      },
      { status: 500 }
    );
  }
}

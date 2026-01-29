/**
 * Live Session Endpoint (Telephony)
 *
 * Reads live session state from Redis during active calls.
 * Follows session-events pattern from Transfer Tool Adapter Pack v1.
 *
 * GET /api/telephony/session?sessionId=SESSION_123
 *
 * Redis key: session:<sessionId> (HASH)
 * Fields: state, escalated, escalation_reason, escalation_target, etc.
 *
 * Returns standard envelope:
 * {
 *   data: { sessionId, ...hash fields } | null,
 *   confidence: {},
 *   gaps: [],
 *   warnings: []
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * GET /api/telephony/session?sessionId=abc
 *
 * Redis key: session:<sessionId> (HASH)
 *
 * Returns:
 * {
 *   data: { sessionId, ...hash } | null,
 *   confidence: {},
 *   gaps: [],
 *   warnings: []
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId || sessionId.trim().length === 0) {
      return NextResponse.json(
        {
          data: null,
          confidence: {},
          gaps: [],
          warnings: [
            {
              code: "MISSING_SESSION_ID",
              message: "Missing required query param: sessionId",
              severity: "error",
            },
          ],
        },
        { status: 400 }
      );
    }

    const redis = new Redis(reqEnv("REDIS_URL"));
    try {
      const key = `session:${sessionId}`;
      const hash = await redis.hgetall(key);

      if (!hash || Object.keys(hash).length === 0) {
        return NextResponse.json(
          {
            data: null,
            confidence: {},
            gaps: [],
            warnings: [
              {
                code: "NOT_FOUND",
                message: `No live session found for sessionId=${sessionId}`,
                severity: "info",
              },
            ],
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          data: { sessionId, ...hash },
          confidence: {},
          gaps: [],
          warnings: [],
        },
        { status: 200 }
      );
    } finally {
      await redis.quit();
    }
  } catch (err: any) {
    console.error("[session-endpoint] Error:", err?.message);

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

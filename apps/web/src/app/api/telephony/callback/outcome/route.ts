import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

function reqEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * GET /api/telephony/callback/outcome?jobId=123
 *
 * Reads Redis hash: callback:job:<jobId>
 *
 * Response:
 * {
 *   data: { jobId, ...hashFields } | null,
 *   confidence: {},
 *   gaps: [],
 *   warnings: []
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");

    if (!jobId || jobId.trim().length === 0) {
      return NextResponse.json(
        {
          data: null,
          confidence: {},
          gaps: [],
          warnings: [
            {
              code: "MISSING_JOB_ID",
              message: "Missing required query param: jobId",
              severity: "error",
            },
          ],
        },
        { status: 400 }
      );
    }

    const redis = new Redis(reqEnv("REDIS_URL"));
    try {
      const key = `callback:job:${jobId}`;
      const hash = await redis.hgetall(key);

      // If key not found, hgetall returns {}
      if (!hash || Object.keys(hash).length === 0) {
        return NextResponse.json(
          {
            data: null,
            confidence: {},
            gaps: [],
            warnings: [
              {
                code: "NOT_FOUND",
                message: `No callback outcome found for jobId=${jobId}`,
                severity: "info",
              },
            ],
          },
          { status: 200 }
        );
      }

      // Normalize to include jobId for UI convenience
      const data = { jobId, ...hash };

      return NextResponse.json(
        {
          data,
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

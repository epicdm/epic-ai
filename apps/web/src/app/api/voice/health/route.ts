import { NextResponse } from "next/server";

/**
 * GET /api/voice/health
 * Check if voice services are properly configured
 */
export async function GET() {
  const health = {
    status: "ok",
    checks: {
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || "missing",
      },
      deepgram: {
        configured: !!process.env.DEEPGRAM_API_KEY,
      },
      livekit: {
        configured: !!process.env.LIVEKIT_URL && !!process.env.LIVEKIT_API_KEY,
      },
    },
  };

  const allConfigured =
    health.checks.openai.configured;

  if (!allConfigured) {
    health.status = "degraded";
  }

  return NextResponse.json(health);
}

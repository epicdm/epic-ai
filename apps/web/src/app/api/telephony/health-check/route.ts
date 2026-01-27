import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { HealthCheckResponseSchema } from "@epic-ai/shared";

/**
 * Telephony Health Check Endpoint
 *
 * Simple system health check for the telephony guard.
 * Validates database connectivity.
 *
 * GET /api/telephony/health-check
 * Returns: { data: { ok, checks: { db } }, confidence, gaps, warnings }
 */

/**
 * Helper to create success response with envelope
 */
function ok(dbHealthy: boolean) {
  const isHealthy = dbHealthy;

  return NextResponse.json(
    {
      data: {
        ok: isHealthy,
        checks: {
          db: dbHealthy,
        },
      },
      confidence: { health: isHealthy ? 0.95 : 0.2 },
      gaps: isHealthy ? [] : [
        {
          gap_type: "missing_context",
          field_path: "telephony.health_check.db",
          severity: "high",
          impact: "Cannot process calls without database",
          recommended_fix: "Check database connection and credentials",
        },
      ],
      warnings: isHealthy ? [] : [
        {
          code: "DB_UNHEALTHY",
          message: "Database connectivity check failed",
          severity: "error",
        },
      ],
    },
    { status: isHealthy ? 200 : 503 }
  );
}

export async function GET(request: NextRequest) {
  try {
    // Simple database connectivity check
    await prisma.$queryRaw`SELECT 1`;

    console.log("[HealthCheck] Database connectivity: OK");
    return ok(true);
  } catch (error) {
    console.error("[HealthCheck] Database connectivity failed:", error);
    return ok(false);
  }
}

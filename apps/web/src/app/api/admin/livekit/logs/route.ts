/**
 * LiveKit Logs Admin API
 * GET - Fetch logs from voice service
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/logs
 * Fetch logs from voice service for troubleshooting
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get("room");
    const level = searchParams.get("level") || "info";
    const limit = searchParams.get("limit") || "100";
    const since = searchParams.get("since");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (roomName) params.set("room", roomName);
      params.set("level", level);
      params.set("limit", limit);
      if (since) params.set("since", since);

      const response = await fetch(
        `${VOICE_SERVICE_URL}/api/logs?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      // If the endpoint doesn't exist, return empty logs
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          logs: [],
          message: "Logs endpoint not available in voice service",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch logs" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        logs: data.logs || [],
        totalCount: data.total_count || 0,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching logs:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

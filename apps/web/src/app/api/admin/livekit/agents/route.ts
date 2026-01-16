/**
 * LiveKit Agents Admin API
 * GET - List all agents/workers
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/agents
 * List all registered agents/workers
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${VOICE_SERVICE_URL}/api/livekit/agents`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // If endpoint doesn't exist, return empty
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          agents: [],
          message: "Agents endpoint not available",
        });
      }

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch agents" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        agents: data.agents || [],
        totalCount: data.total || 0,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching agents:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

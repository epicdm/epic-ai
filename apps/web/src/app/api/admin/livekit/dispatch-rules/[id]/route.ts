/**
 * LiveKit Dispatch Rule by ID Admin API
 * GET - Get specific dispatch rule details
 * DELETE - Delete dispatch rule
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/dispatch-rules/[id]
 * Get a specific dispatch rule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules/${encodeURIComponent(id)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch dispatch rule" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        rule: data.rule,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching dispatch rule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dispatch rule" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/livekit/dispatch-rules/[id]
 * Delete a dispatch rule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to delete dispatch rule" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Dispatch rule deleted successfully",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error deleting dispatch rule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete dispatch rule" },
      { status: 500 }
    );
  }
}

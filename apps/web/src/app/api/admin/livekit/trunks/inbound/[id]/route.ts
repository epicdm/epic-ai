/**
 * LiveKit Inbound Trunk by ID Admin API
 * GET - Get specific trunk details
 * PATCH - Update trunk
 * DELETE - Delete trunk
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/trunks/inbound/[id]
 * Get a specific inbound trunk
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
        `${VOICE_SERVICE_URL}/api/telephony/trunks/${encodeURIComponent(id)}`,
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
          { error: data.error || "Failed to fetch trunk" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        trunk: data.trunk,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching trunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch trunk" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/livekit/trunks/inbound/[id]
 * Update an inbound trunk
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/trunks/inbound/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to update trunk" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        trunk: data.trunk,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error updating trunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update trunk" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/livekit/trunks/inbound/[id]
 * Delete an inbound trunk
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
        `${VOICE_SERVICE_URL}/api/telephony/trunks/${encodeURIComponent(id)}`,
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
          { error: data.error || "Failed to delete trunk" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Trunk deleted successfully",
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error deleting trunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete trunk" },
      { status: 500 }
    );
  }
}

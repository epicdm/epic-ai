/**
 * LiveKit Inbound Trunks Admin API
 * GET - List all inbound SIP trunks
 * POST - Create new inbound trunk
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/trunks/inbound
 * List all inbound SIP trunks
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
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/inbound`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch inbound trunks" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        trunks: data.trunks || [],
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching inbound trunks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch inbound trunks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/livekit/trunks/inbound
 * Create a new inbound SIP trunk
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { phone_numbers, organization_id, name } = body;

    if (!phone_numbers || !Array.isArray(phone_numbers) || phone_numbers.length === 0) {
      return NextResponse.json(
        { error: "phone_numbers array is required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/inbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_numbers,
          organization_id,
          name,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to create inbound trunk" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        trunk_id: data.trunk_id,
        trunk: data.trunk,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error creating inbound trunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create inbound trunk" },
      { status: 500 }
    );
  }
}

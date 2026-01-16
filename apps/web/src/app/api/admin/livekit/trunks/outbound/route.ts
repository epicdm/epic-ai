/**
 * LiveKit Outbound Trunks Admin API
 * GET - List all outbound SIP trunks
 * POST - Create new outbound trunk
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/trunks/outbound
 * List all outbound SIP trunks
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
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch outbound trunks" },
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
    console.error("[Admin LiveKit] Error fetching outbound trunks:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch outbound trunks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/livekit/trunks/outbound
 * Create a new outbound SIP trunk
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, password, sip_domain, phone_numbers, organization_id, name } = body;

    if (!username || !password || !sip_domain) {
      return NextResponse.json(
        { error: "username, password, and sip_domain are required" },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          sip_domain,
          phone_numbers: phone_numbers || [],
          organization_id,
          name,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to create outbound trunk" },
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
    console.error("[Admin LiveKit] Error creating outbound trunk:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create outbound trunk" },
      { status: 500 }
    );
  }
}

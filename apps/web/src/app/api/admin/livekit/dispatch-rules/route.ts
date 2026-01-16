/**
 * LiveKit Dispatch Rules Admin API
 * GET - List all dispatch rules
 * POST - Create new dispatch rule
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * GET /api/admin/livekit/dispatch-rules
 * List all dispatch rules
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
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/dispatch-rules`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to fetch dispatch rules" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        rules: data.rules || [],
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching dispatch rules:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch dispatch rules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/livekit/dispatch-rules
 * Create a new dispatch rule
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      agent_name,
      phone_numbers,
      trunk_ids,
      organization_id,
      user_id,
      agent_id,
      room_prefix,
      pin,
      hide_phone_number,
      name,
    } = body;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), VOICE_SERVICE_TIMEOUT_MS);

    try {
      const response = await fetch(`${VOICE_SERVICE_URL}/api/telephony/dispatch-rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agent_name || "epic-voice-agent",
          phone_numbers,
          trunk_ids,
          organization_id,
          user_id,
          agent_id,
          room_prefix,
          pin,
          hide_phone_number,
          name,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || "Failed to create dispatch rule" },
          { status: response.status }
        );
      }

      return NextResponse.json({
        success: true,
        rule_id: data.rule_id,
        rule: data.rule,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.error("[Admin LiveKit] Error creating dispatch rule:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create dispatch rule" },
      { status: 500 }
    );
  }
}

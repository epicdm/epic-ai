/**
 * Fix Missing SIP Account Admin API
 * POST - Create missing SIP account in Magnus for a phone number
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

// Voice service URL with fallback
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

const fixSipSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

/**
 * POST /api/admin/livekit/magnus-diagnostics/fix-sip
 * Create a missing SIP account in Magnus for a phone number
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = fixSipSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { phoneNumber } = parseResult.data;
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "");

    // First check if the SIP account already exists
    const checkResponse = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/sip-accounts?username=${cleanNumber}`
    );

    if (checkResponse.ok) {
      const checkData = await checkResponse.json();
      if (checkData.accounts && checkData.accounts.length > 0) {
        return NextResponse.json({
          success: false,
          error: "SIP account already exists",
          account: checkData.accounts[0],
        });
      }
    }

    // Use the recreate-sip-account endpoint which handles account creation
    const createResponse = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/recreate-sip-account`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          did: cleanNumber,
        }),
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[Admin Magnus] Failed to create SIP account:", createResponse.status, errorText);
      return NextResponse.json(
        {
          error: "Failed to create SIP account",
          details: errorText,
          status: createResponse.status,
        },
        { status: createResponse.status }
      );
    }

    const createData = await createResponse.json();

    return NextResponse.json({
      success: true,
      message: `SIP account created for ${cleanNumber}`,
      account: createData.account || createData,
    });
  } catch (error) {
    console.error("[Admin Magnus] Error fixing SIP account:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fix SIP account",
      },
      { status: 500 }
    );
  }
}

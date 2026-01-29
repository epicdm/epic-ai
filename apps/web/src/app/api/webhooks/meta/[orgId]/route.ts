/**
 * Meta (Facebook/Instagram) Webhook Receiver
 * TODO: Implement when webhookConfig and webhookLog models exist
 */

import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * GET - Meta webhook verification
 * Meta sends a verification request when you set up the webhook
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode !== "subscribe") {
      return new NextResponse("Invalid mode", { status: 400 });
    }

    // Check against environment variable
    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (token !== verifyToken) {
      console.error("Token mismatch for Meta webhook verification");
      return new NextResponse("Invalid verify token", { status: 403 });
    }

    // Return challenge to verify
    return new NextResponse(challenge, { status: 200 });
  } catch (error) {
    console.error("Meta webhook verification error:", error);
    return new NextResponse("Verification failed", { status: 500 });
  }
}

/**
 * POST - Meta webhook payload
 * Receives lead data when someone fills out a Lead Ad form
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orgId } = await params;

    // TODO: Implement when webhook models exist
    console.log(`Received Meta webhook for org ${orgId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Meta webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

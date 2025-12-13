/**
 * Google Ads Webhook Receiver
 * TODO: Implement when webhookConfig and webhookLog models exist
 */

import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * POST - Google Ads webhook payload
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orgId } = await params;

    // TODO: Implement when webhook models exist
    console.log(`Received Google webhook for org ${orgId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Google webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

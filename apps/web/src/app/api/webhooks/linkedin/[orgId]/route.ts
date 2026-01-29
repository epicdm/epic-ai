/**
 * LinkedIn Webhook Receiver
 * TODO: Implement when webhookConfig and webhookLog models exist
 */

import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

/**
 * POST - LinkedIn Lead Gen Forms webhook
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { orgId } = await params;

    // TODO: Implement when webhook models exist
    console.log(`Received LinkedIn webhook for org ${orgId}`);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("LinkedIn webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

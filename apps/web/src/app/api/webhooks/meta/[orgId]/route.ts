import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { processWebhookLead, triggerVoiceAIForLead } from "@/lib/services/webhook-processor";

/**
 * GET - Meta webhook verification
 * Meta sends a verification request when you set up the webhook
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode !== "subscribe") {
      return new NextResponse("Invalid mode", { status: 400 });
    }

    // Get webhook config
    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId,
          platform: "META",
        },
      },
    });

    if (!config) {
      console.error(`No Meta webhook config for org ${orgId}`);
      return new NextResponse("Webhook not configured", { status: 404 });
    }

    if (token !== config.verifyToken) {
      console.error(`Token mismatch for org ${orgId}`);
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
  { params }: { params: Promise<{ orgId: string }> }
) {
  const receivedAt = new Date();
  const { orgId } = await params;

  try {
    const payload = await request.json();

    // Get webhook config
    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId,
          platform: "META",
        },
      },
    });

    if (!config || !config.enabled) {
      console.log(`Meta webhook disabled for org ${orgId}`);
      return NextResponse.json({ received: true });
    }

    // Log the webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        orgId,
        platform: "META",
        endpoint: `/api/webhooks/meta/${orgId}`,
        method: "POST",
        headers: Object.fromEntries(request.headers),
        payload,
        status: "PROCESSING",
        receivedAt,
      },
    });

    // Check if this is a lead event
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];

    if (changes?.field !== "leadgen") {
      // Not a lead event, just acknowledge
      await prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: "SUCCESS", processedAt: new Date() },
      });
      return NextResponse.json({ received: true });
    }

    // Process the lead
    const result = await processWebhookLead(
      orgId,
      "META",
      payload,
      webhookLog.id,
      config
    );

    // Update webhook log
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: result.success ? (result.duplicate ? "DUPLICATE" : "SUCCESS") : "FAILED",
        leadId: result.leadId,
        error: result.error,
        processedAt: new Date(),
      },
    });

    // Update config stats
    await prisma.webhookConfig.update({
      where: { id: config.id },
      data: {
        leadsReceived: { increment: 1 },
        lastReceivedAt: new Date(),
        lastError: result.success ? null : result.error,
      },
    });

    // Trigger Voice AI if enabled and lead was created
    if (result.success && result.leadId && !result.duplicate && config.autoTriggerVoiceAI) {
      triggerVoiceAIForLead(orgId, result.leadId);
    }

    return NextResponse.json({ received: true, leadId: result.leadId });
  } catch (error) {
    console.error("Meta webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

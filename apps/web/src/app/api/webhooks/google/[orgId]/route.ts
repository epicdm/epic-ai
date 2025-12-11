import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { processWebhookLead, triggerVoiceAIForLead } from "@/lib/services/webhook-processor";
import crypto from "crypto";

/**
 * POST - Google Ads webhook payload
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
          platform: "GOOGLE",
        },
      },
    });

    if (!config || !config.enabled) {
      console.log(`Google webhook disabled for org ${orgId}`);
      return NextResponse.json({ received: true });
    }

    // Optional: Verify signature if provided
    const signature = request.headers.get("x-google-signature");
    if (signature && config.secretKey) {
      const expectedSig = crypto
        .createHmac("sha256", config.secretKey)
        .update(JSON.stringify(payload))
        .digest("hex");

      if (signature !== expectedSig) {
        console.error(`Invalid Google signature for org ${orgId}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // Log the webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        orgId,
        platform: "GOOGLE",
        endpoint: `/api/webhooks/google/${orgId}`,
        method: "POST",
        headers: Object.fromEntries(request.headers),
        payload,
        status: "PROCESSING",
        receivedAt,
      },
    });

    // Process the lead
    const result = await processWebhookLead(
      orgId,
      "GOOGLE",
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

    // Trigger Voice AI if enabled
    if (result.success && result.leadId && !result.duplicate && config.autoTriggerVoiceAI) {
      triggerVoiceAIForLead(orgId, result.leadId);
    }

    return NextResponse.json({ received: true, leadId: result.leadId });
  } catch (error) {
    console.error("Google webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

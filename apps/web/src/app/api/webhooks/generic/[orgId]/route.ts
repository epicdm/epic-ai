import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { processWebhookLead, triggerVoiceAIForLead } from "@/lib/services/webhook-processor";
import crypto from "crypto";

/**
 * POST - Generic webhook (Zapier, custom integrations, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const receivedAt = new Date();
  const { orgId } = await params;

  try {
    // Support both JSON and form-encoded
    let payload: any;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (contentType.includes("form")) {
      const formData = await request.formData();
      payload = Object.fromEntries(formData);
    } else {
      payload = await request.json().catch(() => ({}));
    }

    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId,
          platform: "GENERIC",
        },
      },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ received: true });
    }

    // Optional: Verify HMAC signature
    const signature = request.headers.get("x-webhook-signature") ||
                      request.headers.get("x-signature");

    if (signature && config.secretKey) {
      const expectedSig = crypto
        .createHmac("sha256", config.secretKey)
        .update(JSON.stringify(payload))
        .digest("hex");

      if (signature !== expectedSig && signature !== `sha256=${expectedSig}`) {
        console.error(`Invalid signature for org ${orgId}`);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const webhookLog = await prisma.webhookLog.create({
      data: {
        orgId,
        platform: "GENERIC",
        endpoint: `/api/webhooks/generic/${orgId}`,
        method: "POST",
        headers: Object.fromEntries(request.headers),
        payload,
        status: "PROCESSING",
        receivedAt,
      },
    });

    const result = await processWebhookLead(
      orgId,
      "GENERIC",
      payload,
      webhookLog.id,
      config
    );

    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: result.success ? (result.duplicate ? "DUPLICATE" : "SUCCESS") : "FAILED",
        leadId: result.leadId,
        error: result.error,
        processedAt: new Date(),
      },
    });

    await prisma.webhookConfig.update({
      where: { id: config.id },
      data: {
        leadsReceived: { increment: 1 },
        lastReceivedAt: new Date(),
        lastError: result.success ? null : result.error,
      },
    });

    if (result.success && result.leadId && !result.duplicate && config.autoTriggerVoiceAI) {
      triggerVoiceAIForLead(orgId, result.leadId);
    }

    return NextResponse.json({
      received: true,
      success: result.success,
      leadId: result.leadId,
      duplicate: result.duplicate,
    });
  } catch (error) {
    console.error("Generic webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

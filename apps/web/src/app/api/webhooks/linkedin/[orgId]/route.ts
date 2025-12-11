import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { processWebhookLead, triggerVoiceAIForLead } from "@/lib/services/webhook-processor";

/**
 * POST - LinkedIn Lead Gen Forms webhook
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const receivedAt = new Date();
  const { orgId } = await params;

  try {
    const payload = await request.json();

    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId,
          platform: "LINKEDIN",
        },
      },
    });

    if (!config || !config.enabled) {
      return NextResponse.json({ received: true });
    }

    const webhookLog = await prisma.webhookLog.create({
      data: {
        orgId,
        platform: "LINKEDIN",
        endpoint: `/api/webhooks/linkedin/${orgId}`,
        method: "POST",
        headers: Object.fromEntries(request.headers),
        payload,
        status: "PROCESSING",
        receivedAt,
      },
    });

    const result = await processWebhookLead(
      orgId,
      "LINKEDIN",
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

    return NextResponse.json({ received: true, leadId: result.leadId });
  } catch (error) {
    console.error("LinkedIn webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}

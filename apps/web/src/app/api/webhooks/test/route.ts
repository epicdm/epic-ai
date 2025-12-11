import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { processWebhookLead } from "@/lib/services/webhook-processor";

/**
 * POST - Send test webhook
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const { platform, testData } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform required" }, { status: 400 });
    }

    // Get webhook config
    const config = await prisma.webhookConfig.findUnique({
      where: {
        orgId_platform: {
          orgId: org.id,
          platform,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 404 });
    }

    // Create test payload based on platform
    let payload: any;

    switch (platform) {
      case "META":
        payload = {
          entry: [{
            changes: [{
              field: "leadgen",
              value: {
                leadgen_id: `test_${Date.now()}`,
                form_id: "test_form",
                field_data: [
                  { name: "email", values: [testData?.email || "test@example.com"] },
                  { name: "full_name", values: [testData?.name || "Test Lead"] },
                  { name: "phone_number", values: [testData?.phone || "+1234567890"] },
                  { name: "company_name", values: [testData?.company || "Test Company"] },
                ],
                campaign_name: testData?.campaign || "Test Campaign",
              },
            }],
          }],
        };
        break;

      case "GOOGLE":
        payload = {
          lead_id: `test_${Date.now()}`,
          user_column_data: [
            { column_id: "email", string_value: testData?.email || "test@example.com" },
            { column_id: "full_name", string_value: testData?.name || "Test Lead" },
            { column_id: "phone_number", string_value: testData?.phone || "+1234567890" },
            { column_id: "company_name", string_value: testData?.company || "Test Company" },
          ],
        };
        break;

      case "LINKEDIN":
        payload = {
          leadId: `test_${Date.now()}`,
          answers: [
            { questionId: "email", answer: testData?.email || "test@example.com" },
            { questionId: "firstName", answer: testData?.firstName || "Test" },
            { questionId: "lastName", answer: testData?.lastName || "Lead" },
            { questionId: "phoneNumber", answer: testData?.phone || "+1234567890" },
            { questionId: "companyName", answer: testData?.company || "Test Company" },
          ],
        };
        break;

      case "GENERIC":
      default:
        payload = {
          id: `test_${Date.now()}`,
          email: testData?.email || "test@example.com",
          first_name: testData?.firstName || "Test",
          last_name: testData?.lastName || "Lead",
          phone: testData?.phone || "+1234567890",
          company: testData?.company || "Test Company",
        };
    }

    // Log the test webhook
    const webhookLog = await prisma.webhookLog.create({
      data: {
        orgId: org.id,
        platform,
        endpoint: `/api/webhooks/test`,
        method: "POST",
        headers: { "x-test": "true" },
        payload,
        status: "PROCESSING",
        receivedAt: new Date(),
      },
    });

    // Process the test lead
    const result = await processWebhookLead(
      org.id,
      platform as any,
      payload,
      webhookLog.id,
      config
    );

    // Update log
    await prisma.webhookLog.update({
      where: { id: webhookLog.id },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        leadId: result.leadId,
        error: result.error,
        processedAt: new Date(),
      },
    });

    // Don't trigger Voice AI for test leads

    return NextResponse.json({
      success: result.success,
      leadId: result.leadId,
      duplicate: result.duplicate,
      error: result.error,
      webhookLogId: webhookLog.id,
    });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
}

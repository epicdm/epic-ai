/**
 * Social Trigger API
 * TODO: Implement when autopilotSettings and socialSuggestion models exist
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const triggerSchema = z.object({
  organizationId: z.string(),
  triggerType: z.enum(["LEAD_CONVERTED", "FIVE_STAR_CALL", "WEEKLY_CONTENT", "MANUAL"]),
  data: z.record(z.unknown()).optional().default({}),
});

/**
 * POST - Trigger suggestion generation
 *
 * This endpoint is called by:
 * - Internal webhooks when leads convert or calls complete
 * - Cron jobs for weekly content
 * - Manual generation requests
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal webhook secret
    const authHeader = request.headers.get("x-webhook-secret");
    const webhookSecret = process.env.INTERNAL_WEBHOOK_SECRET;

    if (!webhookSecret || authHeader !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = triggerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid trigger data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // TODO: Implement when autopilotSettings and socialSuggestion models exist
    return NextResponse.json({
      success: false,
      reason: "Autopilot not yet implemented",
    });
  } catch (error) {
    console.error("Error in trigger endpoint:", error);
    return NextResponse.json({ error: "Failed to process trigger" }, { status: 500 });
  }
}

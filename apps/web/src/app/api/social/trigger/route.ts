import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { z } from "zod";
import {
  createSuggestion,
  canAutoPost,
  TriggerType,
} from "@/lib/services/suggestion-generator";
import { getPostizClient } from "@/lib/services/postiz";

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

    const { organizationId, triggerType, data } = parsed.data;

    // Check if autopilot is enabled for this trigger
    const settings = await prisma.autopilotSettings.findUnique({
      where: { organizationId },
      select: {
        enabled: true,
        onLeadConverted: true,
        onFiveStarCall: true,
        onWeeklySchedule: true,
        approvalMode: true,
        defaultPlatforms: true,
      },
    });

    if (!settings?.enabled) {
      return NextResponse.json({
        success: false,
        reason: "Autopilot not enabled",
      });
    }

    // Check if this trigger type is enabled
    const triggerEnabled = checkTriggerEnabled(triggerType, settings);
    if (!triggerEnabled) {
      return NextResponse.json({
        success: false,
        reason: `Trigger ${triggerType} not enabled`,
      });
    }

    // Check rate limits
    const canPost = await canAutoPost(organizationId);
    if (!canPost && settings.approvalMode === "AUTO_POST") {
      return NextResponse.json({
        success: false,
        reason: "Rate limit exceeded, will create as pending",
      });
    }

    // Generate and create suggestion
    const shouldAutoPost = settings.approvalMode === "AUTO_POST" && canPost;
    const suggestion = await createSuggestion(
      organizationId,
      triggerType,
      data,
      shouldAutoPost
    );

    // If auto-post mode and rate limit allows, post immediately
    if (shouldAutoPost && settings.defaultPlatforms.length > 0) {
      await autoPostSuggestion(
        suggestion.id,
        organizationId,
        settings.defaultPlatforms
      );
    }

    return NextResponse.json({
      success: true,
      suggestionId: suggestion.id,
      autoPosted: shouldAutoPost,
    });
  } catch (error) {
    console.error("Error in trigger endpoint:", error);
    return NextResponse.json({ error: "Failed to process trigger" }, { status: 500 });
  }
}

/**
 * Check if a trigger type is enabled in settings
 */
function checkTriggerEnabled(
  triggerType: TriggerType,
  settings: {
    onLeadConverted: boolean;
    onFiveStarCall: boolean;
    onWeeklySchedule: boolean;
  }
): boolean {
  switch (triggerType) {
    case "LEAD_CONVERTED":
      return settings.onLeadConverted;
    case "FIVE_STAR_CALL":
      return settings.onFiveStarCall;
    case "WEEKLY_CONTENT":
      return settings.onWeeklySchedule;
    case "MANUAL":
      return true;
    default:
      return false;
  }
}

/**
 * Auto-post a suggestion to configured platforms
 */
async function autoPostSuggestion(
  suggestionId: string,
  organizationId: string,
  platforms: string[]
): Promise<void> {
  try {
    const suggestion = await prisma.socialSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) return;

    const postizClient = await getPostizClient(organizationId);
    if (!postizClient) return;

    // Get integrations
    const integrations = await postizClient.getIntegrations();
    const matchingIntegrations = integrations.filter(
      (int) => platforms.includes(int.identifier) && !int.disabled
    );

    if (matchingIntegrations.length === 0) return;

    // Find next available slot
    const scheduleDate = await postizClient.findSlot(matchingIntegrations[0].id);

    // Create the post
    const result = await postizClient.createPost({
      type: "schedule",
      date: scheduleDate,
      content: suggestion.content,
      integrationIds: matchingIntegrations.map((int) => int.id),
    });

    // Update suggestion
    const postIds = result.map((r) => r.postId).join(",");
    await prisma.socialSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        postId: postIds,
        postPlatforms: platforms,
      },
    });

    // Log the post
    await prisma.socialPostLog.create({
      data: {
        organizationId,
        postizPostId: postIds,
        content: suggestion.content,
        platforms,
        postType: "AUTOPILOT",
        scheduledFor: scheduleDate,
        status: "SCHEDULED",
      },
    });
  } catch (error) {
    console.error("Failed to auto-post suggestion:", error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { getPostizClient } from "@/lib/services/postiz";
import { z } from "zod";

const postSchema = z.object({
  platforms: z.array(z.string()).min(1, "At least one platform required"),
  scheduleType: z.enum(["now", "schedule", "queue"]).default("now"),
  scheduleDate: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST - Publish a suggestion to social media via Postiz
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Get the suggestion
    const suggestion = await prisma.socialSuggestion.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.status === "POSTED") {
      return NextResponse.json({ error: "Already posted" }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid post data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Get Postiz client
    const postizClient = await getPostizClient(org.id);
    if (!postizClient) {
      return NextResponse.json(
        { error: "Postiz not connected. Please set up social integration first." },
        { status: 400 }
      );
    }

    // Get integrations and find matching ones
    const integrations = await postizClient.getIntegrations();
    const matchingIntegrations = integrations.filter(
      (int) => parsed.data.platforms.includes(int.identifier) && !int.disabled
    );

    if (matchingIntegrations.length === 0) {
      return NextResponse.json(
        { error: "No connected accounts for selected platforms" },
        { status: 400 }
      );
    }

    // Determine schedule date
    let scheduleDate = new Date();
    if (parsed.data.scheduleType === "schedule" && parsed.data.scheduleDate) {
      scheduleDate = new Date(parsed.data.scheduleDate);
    } else if (parsed.data.scheduleType === "queue") {
      // Find next available slot using the first integration
      scheduleDate = await postizClient.findSlot(matchingIntegrations[0].id);
    }

    // Upload image if present
    let images: { id: string; path: string }[] | undefined;
    if (suggestion.imageUrl) {
      try {
        const uploaded = await postizClient.uploadFromUrl(suggestion.imageUrl);
        images = [uploaded];
      } catch (error) {
        console.error("Failed to upload image:", error);
        // Continue without image
      }
    }

    // Create the post
    const result = await postizClient.createPost({
      type: parsed.data.scheduleType === "now" ? "now" : "schedule",
      date: scheduleDate,
      content: suggestion.content,
      integrationIds: matchingIntegrations.map((int) => int.id),
      images,
    });

    // Update suggestion status
    const postIds = result.map((r) => r.postId).join(",");
    await prisma.socialSuggestion.update({
      where: { id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
        postId: postIds,
        postPlatforms: parsed.data.platforms,
      },
    });

    // Log the post
    await prisma.socialPostLog.create({
      data: {
        organizationId: org.id,
        postizPostId: postIds,
        content: suggestion.content,
        platforms: parsed.data.platforms,
        postType: "AUTOPILOT",
        scheduledFor: scheduleDate,
        status: parsed.data.scheduleType === "now" ? "PUBLISHED" : "SCHEDULED",
      },
    });

    return NextResponse.json({
      success: true,
      postIds: result.map((r) => r.postId),
      scheduledFor: scheduleDate,
    });
  } catch (error) {
    console.error("Error posting suggestion:", error);
    return NextResponse.json({ error: "Failed to post" }, { status: 500 });
  }
}

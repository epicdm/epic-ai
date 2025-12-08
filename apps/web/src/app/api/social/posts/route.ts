import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { getPostizClient } from "@/lib/services/postiz";
import { prisma } from "@epic-ai/database";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const client = await getPostizClient(org.id);
    if (!client) {
      return NextResponse.json({ posts: [] });
    }

    // Get posts for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const posts = await client.getPosts(startDate, endDate);

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

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

    const client = await getPostizClient(org.id);
    if (!client) {
      return NextResponse.json(
        { error: "Postiz not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      content,
      integrationIds,
      scheduleDate,
      postNow,
      imageUrl,
      generatedBy,
      sourceType,
      sourceId,
    } = body;

    if (!content || !integrationIds || integrationIds.length === 0) {
      return NextResponse.json(
        { error: "Content and platforms required" },
        { status: 400 }
      );
    }

    // Upload image if provided (e.g., AI-generated)
    let images: { id: string; path: string }[] = [];
    if (imageUrl) {
      try {
        const uploaded = await client.uploadFromUrl(imageUrl);
        images = [{ id: uploaded.id, path: uploaded.path }];
      } catch (error) {
        console.error("Image upload failed:", error);
        // Continue without image
      }
    }

    // Create post in Postiz
    const result = await client.createPost({
      type: postNow ? "now" : scheduleDate ? "schedule" : "draft",
      date: scheduleDate ? new Date(scheduleDate) : new Date(),
      content,
      integrationIds,
      images,
    });

    // Log in our database for tracking
    await prisma.socialPostLog.create({
      data: {
        organizationId: org.id,
        content,
        platforms: integrationIds,
        postizPostIds: result.map((r) => r.postId),
        status: postNow ? "POSTED" : scheduleDate ? "SCHEDULED" : "DRAFT",
        scheduledFor: scheduleDate ? new Date(scheduleDate) : null,
        postedAt: postNow ? new Date() : null,
        generatedBy: generatedBy || "MANUAL",
        sourceType,
        sourceId,
      },
    });

    return NextResponse.json({ success: true, posts: result });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

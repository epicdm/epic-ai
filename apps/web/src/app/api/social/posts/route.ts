/**
 * Social Posts API
 * GET - List scheduled/published posts
 * POST - Create new post (publish or schedule)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import type { SocialPlatform } from "@prisma/client";
import { getUserOrganization } from "@/lib/sync-user";
import { SocialPublisher } from "@/lib/services/social-publishing";
import { z } from "zod";

const createPostSchema = z.object({
  content: z.string().min(1),
  accountIds: z.array(z.string()).min(1),
  scheduleDate: z.string().datetime().optional(),
  postNow: z.boolean().optional(),
  imageUrl: z.string().url().optional(),
  contentItemId: z.string().optional(),
});

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

    // Get brand for this org
    const brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      return NextResponse.json({ posts: [] });
    }

    // Get recent posts (variations that have been published or are pending)
    const posts = await prisma.contentVariation.findMany({
      where: {
        content: {
          brandId: brand.id,
        },
        OR: [
          { publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // Published in last 7 days
          { status: "PENDING" }, // Or pending
          { status: "SCHEDULED" }, // Or scheduled
        ],
      },
      include: {
        content: {
          select: { id: true, content: true, contentType: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
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

    const body = await request.json();
    const validated = createPostSchema.parse(body);

    // Get brand for this org
    const brand = await prisma.brand.findFirst({
      where: { organizationId: org.id },
    });

    if (!brand) {
      return NextResponse.json({ error: "No brand found" }, { status: 404 });
    }

    // Verify accounts belong to this brand
    const accounts = await prisma.socialAccount.findMany({
      where: {
        id: { in: validated.accountIds },
        brandId: brand.id,
        status: "CONNECTED",
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No valid social accounts found" },
        { status: 400 }
      );
    }

    // Get unique platforms from selected accounts
    const platforms = [...new Set(accounts.map((a) => a.platform))];

    try {
      // Create ContentItem for the post
      const contentItem = await prisma.contentItem.create({
        data: {
          brandId: brand.id,
          content: validated.content,
          contentType: "POST",
          mediaUrls: validated.imageUrl ? [validated.imageUrl] : [],
          targetPlatforms: platforms,
          status: validated.postNow ? "PENDING" : validated.scheduleDate ? "SCHEDULED" : "DRAFT",
          scheduledFor: validated.scheduleDate ? new Date(validated.scheduleDate) : null,
        },
      });

      if (validated.postNow) {
        // Publish immediately using SocialPublisher instance
        const publisher = new SocialPublisher(brand.id);
        const publishResults = await publisher.publish(contentItem.id, platforms);

        const successCount = publishResults.filter((r) => r.result.success).length;
        const failedCount = publishResults.filter((r) => !r.result.success).length;

        return NextResponse.json({
          success: failedCount === 0,
          contentItemId: contentItem.id,
          results: publishResults.map((r) => ({
            platform: r.platform,
            success: r.result.success,
            postId: r.result.postId,
            postUrl: r.result.postUrl,
            error: r.result.error,
          })),
          summary: { published: successCount, failed: failedCount },
        });
      } else if (validated.scheduleDate) {
        // Content is already scheduled via ContentItem
        return NextResponse.json({
          success: true,
          contentItemId: contentItem.id,
          status: "scheduled",
          scheduledFor: validated.scheduleDate,
          platforms,
        });
      } else {
        // Saved as draft
        return NextResponse.json({
          success: true,
          contentItemId: contentItem.id,
          status: "draft",
          platforms,
        });
      }
    } catch (err) {
      console.error("Error creating/publishing post:", err);
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Failed to create post" },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

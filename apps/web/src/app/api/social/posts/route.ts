/**
 * Social Posts API
 * GET - List scheduled/published posts
 * POST - Create new post (publish or schedule)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
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

    // Get scheduled and recent posts
    const posts = await prisma.contentVariation.findMany({
      where: {
        content: {
          brandId: brand.id,
        },
        scheduledAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        content: {
          select: { id: true, title: true, type: true },
        },
      },
      orderBy: { scheduledAt: "desc" },
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
        isActive: true,
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: "No valid social accounts found" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    // Publish to each account
    for (const account of accounts) {
      try {
        if (validated.postNow) {
          // Publish immediately
          const result = await SocialPublisher.publish(account.id, {
            text: validated.content,
            imageUrl: validated.imageUrl,
          });
          results.push({
            accountId: account.id,
            platform: account.platform,
            success: result.success,
            postId: result.platformPostId,
          });
        } else if (validated.scheduleDate) {
          // Schedule for later via PublishingSchedule
          const schedule = await prisma.publishingSchedule.create({
            data: {
              brandId: brand.id,
              platform: account.platform,
              contentVariationId: validated.contentItemId,
              scheduledAt: new Date(validated.scheduleDate),
              status: "PENDING",
            },
          });
          results.push({
            accountId: account.id,
            platform: account.platform,
            success: true,
            scheduleId: schedule.id,
          });
        } else {
          // Save as draft
          results.push({
            accountId: account.id,
            platform: account.platform,
            success: true,
            status: "draft",
          });
        }
      } catch (err) {
        errors.push({
          accountId: account.id,
          platform: account.platform,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

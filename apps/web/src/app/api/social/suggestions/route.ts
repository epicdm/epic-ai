import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const createSuggestionSchema = z.object({
  content: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  triggerType: z.enum(["LEAD_CONVERTED", "FIVE_STAR_CALL", "WEEKLY_CONTENT", "MANUAL"]),
  triggerData: z.record(z.unknown()).optional(),
  suggestedPlatforms: z.array(z.string()).default([]),
  status: z.enum(["PENDING", "APPROVED", "POSTED", "DISMISSED"]).default("PENDING"),
});

/**
 * GET - List suggestions for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: Record<string, unknown> = { organizationId: org.id };
    if (status) {
      where.status = status;
    }

    const [suggestions, total] = await Promise.all([
      prisma.socialSuggestion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.socialSuggestion.count({ where }),
    ]);

    return NextResponse.json({
      suggestions,
      total,
      hasMore: offset + suggestions.length < total,
    });
  } catch (error) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}

/**
 * POST - Create a new suggestion (typically from trigger service)
 */
export async function POST(request: Request) {
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
    const parsed = createSuggestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid suggestion data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const suggestion = await prisma.socialSuggestion.create({
      data: {
        organizationId: org.id,
        content: parsed.data.content,
        imageUrl: parsed.data.imageUrl,
        triggerType: parsed.data.triggerType,
        triggerData: parsed.data.triggerData || {},
        suggestedPlatforms: parsed.data.suggestedPlatforms,
        status: parsed.data.status,
      },
    });

    return NextResponse.json(suggestion, { status: 201 });
  } catch (error) {
    console.error("Error creating suggestion:", error);
    return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
  }
}

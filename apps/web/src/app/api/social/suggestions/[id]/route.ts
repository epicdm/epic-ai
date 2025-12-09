import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const updateSuggestionSchema = z.object({
  content: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  suggestedPlatforms: z.array(z.string()).optional(),
  status: z.enum(["PENDING", "APPROVED", "POSTED", "DISMISSED"]).optional(),
  dismissReason: z.string().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get a single suggestion
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const suggestion = await prisma.socialSuggestion.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Error fetching suggestion:", error);
    return NextResponse.json({ error: "Failed to fetch suggestion" }, { status: 500 });
  }
}

/**
 * PUT - Update a suggestion (edit content or change status)
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

    // Verify ownership
    const existing = await prisma.socialSuggestion.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSuggestionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { ...parsed.data };

    // Handle dismiss status
    if (parsed.data.status === "DISMISSED" && !existing.dismissedAt) {
      updateData.dismissedAt = new Date();
    }

    const suggestion = await prisma.socialSuggestion.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(suggestion);
  } catch (error) {
    console.error("Error updating suggestion:", error);
    return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
  }
}

/**
 * DELETE - Delete a suggestion
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    // Verify ownership
    const existing = await prisma.socialSuggestion.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    await prisma.socialSuggestion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting suggestion:", error);
    return NextResponse.json({ error: "Failed to delete suggestion" }, { status: 500 });
  }
}

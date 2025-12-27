/**
 * Post Suggestion API
 * TODO: Implement when socialSuggestion and socialPostLog models exist
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
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
 * POST - Publish a suggestion to social media via native OAuth
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = postSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid post data", details: parsed.error.errors },
        { status: 400 }
      );
    }

    // TODO: Implement when socialSuggestion model exists
    return NextResponse.json(
      { error: `Suggestion ${id} not found or posting not yet implemented` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error posting suggestion:", error);
    return NextResponse.json({ error: "Failed to post" }, { status: 500 });
  }
}

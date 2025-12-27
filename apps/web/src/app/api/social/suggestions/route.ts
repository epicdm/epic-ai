/**
 * Social Suggestions API
 * TODO: Implement when socialSuggestion model exists
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";
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
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // TODO: Implement when socialSuggestion model exists
    return NextResponse.json({
      suggestions: [],
      total: 0,
      hasMore: false,
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
    const { userId } = await getAuthWithBypass();
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

    // TODO: Implement when socialSuggestion model exists
    return NextResponse.json(
      { error: "Suggestions not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating suggestion:", error);
    return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
  }
}

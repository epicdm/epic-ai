/**
 * Lead Activities API
 * TODO: Implement when LeadActivity model is added to schema
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET lead activities
export async function GET(_request: NextRequest, { params }: RouteParams) {
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
    // TODO: Implement when LeadActivity model is available
    return NextResponse.json({
      leadId: id,
      activities: [],
    });
  } catch (error) {
    console.error("Error fetching lead activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// POST create activity
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
    // TODO: Implement when LeadActivity model is available
    return NextResponse.json(
      { error: `Lead activities not yet implemented for ${id}` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating activity:", error);
    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 }
    );
  }
}

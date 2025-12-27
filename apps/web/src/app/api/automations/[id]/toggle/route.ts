/**
 * Automation Toggle API
 * TODO: Implement when Automation model is added to schema
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST toggle automation enabled/disabled
export async function POST(_request: NextRequest, { params }: RouteParams) {
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
    // TODO: Implement when Automation model is available
    return NextResponse.json(
      { error: `Cannot toggle automation ${id} - not implemented` },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error toggling automation:", error);
    return NextResponse.json(
      { error: "Failed to toggle automation" },
      { status: 500 }
    );
  }
}

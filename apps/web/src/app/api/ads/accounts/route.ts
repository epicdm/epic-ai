/**
 * Ad Accounts API
 * TODO: Fix schema mismatches (orgId field, MANUAL status)
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { getUserOrganization } from "@/lib/sync-user";

export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // TODO: Implement when schema is fixed
    return NextResponse.json([]);
  } catch (error) {
    console.error("Error fetching ad accounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch ad accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Implement when schema is fixed
    return NextResponse.json(
      { error: "Ad accounts not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating ad account:", error);
    return NextResponse.json(
      { error: "Failed to create ad account" },
      { status: 500 }
    );
  }
}

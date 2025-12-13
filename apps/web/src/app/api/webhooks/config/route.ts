/**
 * Webhook Config API
 * TODO: Implement when webhookConfig model exists
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * GET - List webhook configs
 */
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

    // TODO: Implement when webhookConfig model exists
    return NextResponse.json({ configs: [] });
  } catch (error) {
    console.error("Error getting webhook configs:", error);
    return NextResponse.json({ error: "Failed to get configs" }, { status: 500 });
  }
}

/**
 * POST - Create or update webhook config
 */
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

    // TODO: Implement when webhookConfig model exists
    return NextResponse.json(
      { error: "Webhook configuration not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error creating webhook config:", error);
    return NextResponse.json({ error: "Failed to create config" }, { status: 500 });
  }
}

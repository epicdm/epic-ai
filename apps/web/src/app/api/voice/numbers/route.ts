/**
 * Voice Phone Numbers API
 * TODO: Implement when PhoneNumber model exists
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * GET /api/voice/numbers - List phone numbers for the organization
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

    // TODO: Implement when PhoneNumber model exists
    return NextResponse.json({
      phoneNumbers: [],
      magnusConfigured: false,
    });
  } catch (error) {
    console.error("Error fetching phone numbers:", error);
    return NextResponse.json(
      { error: "Failed to fetch phone numbers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/numbers - Provision a new phone number
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

    // TODO: Implement when PhoneNumber model and Magnus billing are completed
    return NextResponse.json(
      { error: "Phone number provisioning not yet implemented" },
      { status: 501 }
    );
  } catch (error) {
    console.error("Error provisioning phone number:", error);
    return NextResponse.json(
      { error: "Failed to provision phone number" },
      { status: 500 }
    );
  }
}

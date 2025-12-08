import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createOrganization } from "@/lib/services/organization";
import { organizationSchema } from "@/lib/validations/onboarding";
import { syncUser } from "@/lib/sync-user";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Ensure user exists in database before creating organization
    const user = await syncUser();
    if (!user) {
      return NextResponse.json(
        { error: "Failed to sync user. Please try again." },
        { status: 500 }
      );
    }

    const body = await request.json();

    // Validate input
    const validationResult = organizationSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name } = validationResult.data;

    // Create organization
    const organization = await createOrganization({
      name,
      userId,
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error creating organization:", error);
    // Return more specific error message for debugging
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to create organization: ${message}` },
      { status: 500 }
    );
  }
}

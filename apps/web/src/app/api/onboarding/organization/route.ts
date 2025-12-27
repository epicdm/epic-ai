import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { createOrganization } from "@/lib/services/organization";
import { organizationSchema } from "@/lib/validations/onboarding";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get Clerk user data for sync
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json(
        { error: "Could not retrieve user data from Clerk" },
        { status: 500 }
      );
    }

    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (!primaryEmail) {
      return NextResponse.json(
        { error: "No email address found for user" },
        { status: 400 }
      );
    }

    // Ensure user exists in database before creating organization
    // Handle case where email exists with different Clerk ID (user re-registered)
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (existingUserByEmail && existingUserByEmail.id !== userId) {
      // User re-registered with same email - update their Clerk ID
      await prisma.user.update({
        where: { email: primaryEmail },
        data: {
          id: userId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });
    } else {
      // Normal upsert - either new user or same Clerk ID
      await prisma.user.upsert({
        where: { id: userId },
        update: {
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
        create: {
          id: userId,
          email: primaryEmail,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });
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

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { createOrganization } from "@/lib/services/organization";
import { organizationSchema } from "@/lib/validations/onboarding";

// PATCH - Update organization name
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
    }

    // Verify user has access to this organization
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not authorized to update this organization" }, { status: 403 });
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(organization);
  } catch (error) {
    console.error("Error updating organization:", error);
    return NextResponse.json({ error: "Failed to update organization" }, { status: 500 });
  }
}

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
      const oldUserId = existingUserByEmail.id;

      // First, update all memberships to use the new userId
      // This must happen BEFORE updating User.id due to foreign key constraints
      await prisma.membership.updateMany({
        where: { userId: oldUserId },
        data: { userId: userId },
      });

      // Also update FlywheelProgress if it exists
      await prisma.flywheelProgress.updateMany({
        where: { userId: oldUserId },
        data: { userId: userId },
      });

      // Now update the User record with the new Clerk ID
      await prisma.user.update({
        where: { email: primaryEmail },
        data: {
          id: userId,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
        },
      });

      console.log(`[onboarding/organization] Updated user ${primaryEmail} from old Clerk ID ${oldUserId} to new ID ${userId}`);

      // After updating IDs, check if user already has an organization
      const existingMembership = await prisma.membership.findFirst({
        where: { userId },
        include: {
          organization: {
            include: {
              brands: true,
            },
          },
        },
      });

      if (existingMembership?.organization) {
        console.log(`[onboarding/organization] Re-registered user already has org: ${existingMembership.organization.name}`);
        return NextResponse.json(existingMembership.organization);
      }
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

      // Check if user already has an organization (shouldn't create duplicate)
      const existingMembership = await prisma.membership.findFirst({
        where: { userId },
        include: {
          organization: {
            include: {
              brands: true,
            },
          },
        },
      });

      if (existingMembership?.organization) {
        console.log(`[onboarding/organization] User already has org: ${existingMembership.organization.name}`);
        return NextResponse.json(existingMembership.organization);
      }
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

    // Create organization (only if user doesn't have one)
    const organization = await createOrganization({
      name,
      userId,
    });
    console.log('[Onboarding Org API] Created org:', organization.id, 'name:', organization.name, 'for userId:', userId);

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

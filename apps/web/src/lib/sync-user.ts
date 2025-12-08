import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * Ensures the current Clerk user exists in our database.
 * Call this on protected pages as a fallback for webhooks.
 * Uses upsert to handle race conditions.
 * Returns null on any error to prevent 500s.
 */
export async function syncUser() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return null;
    }

    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!primaryEmail) {
      return null;
    }

    // Use upsert to handle race conditions
    const user = await prisma.user.upsert({
      where: { id: clerkUser.id },
      update: {
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      create: {
        id: clerkUser.id,
        email: primaryEmail,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        imageUrl: clerkUser.imageUrl,
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    return user;
  } catch (error) {
    console.error("Error syncing user:", error);
    return null;
  }
}

/**
 * Get the user's current organization, or null if they don't have one.
 * Returns null on any error to prevent 500s.
 */
export async function getUserOrganization() {
  try {
    const user = await syncUser();

    if (!user || user.memberships.length === 0) {
      return null;
    }

    // Return the first organization (later: add org switching)
    return user.memberships[0].organization;
  } catch (error) {
    console.error("Error getting user organization:", error);
    return null;
  }
}

/**
 * Check if user needs onboarding (no organization yet).
 * Returns true on any error (fail-safe: redirect to onboarding).
 */
export async function needsOnboarding() {
  try {
    const user = await syncUser();

    if (!user) {
      return true;
    }

    return user.memberships.length === 0;
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    // On error, assume they need onboarding (fail-safe)
    return true;
  }
}

import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * Ensures the current Clerk user exists in our database.
 * Call this on protected pages as a fallback for webhooks.
 * Uses upsert to handle race conditions.
 */
export async function syncUser() {
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
}

/**
 * Get the user's current organization, or null if they don't have one.
 */
export async function getUserOrganization() {
  const user = await syncUser();

  if (!user || user.memberships.length === 0) {
    return null;
  }

  // Return the first organization (later: add org switching)
  return user.memberships[0].organization;
}

/**
 * Check if user needs onboarding (no organization yet).
 */
export async function needsOnboarding() {
  const user = await syncUser();

  if (!user) {
    return true;
  }

  return user.memberships.length === 0;
}

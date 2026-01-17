import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

// UAT bypass support
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

const UAT_TEST_USER_ID = "uat_test_user_001";

/**
 * Ensures the current Clerk user exists in our database.
 * Call this on protected pages as a fallback for webhooks.
 * Uses upsert to handle race conditions.
 * Returns null on any error to prevent 500s.
 */
export async function syncUser() {
  try {
    const clerkUser = await currentUser();

    // UAT bypass: return test user if no clerk user
    if (!clerkUser && isUATBypassEnabled) {
      const uatUser = await prisma.user.findUnique({
        where: { id: UAT_TEST_USER_ID },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
      return uatUser;
    }

    if (!clerkUser) {
      return null;
    }

    const primaryEmail = clerkUser.emailAddresses?.[0]?.emailAddress;

    if (!primaryEmail) {
      return null;
    }

    // Check if user with this email exists with a different Clerk ID (re-registration)
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });

    if (existingUserByEmail && existingUserByEmail.id !== clerkUser.id) {
      // User re-registered with same email but different Clerk ID
      const oldUserId = existingUserByEmail.id;

      // Update all memberships to use the new userId first
      await prisma.membership.updateMany({
        where: { userId: oldUserId },
        data: { userId: clerkUser.id },
      });

      // Update FlywheelProgress if it exists
      await prisma.flywheelProgress.updateMany({
        where: { userId: oldUserId },
        data: { userId: clerkUser.id },
      });

      // Now update the User record with the new Clerk ID
      const user = await prisma.user.update({
        where: { email: primaryEmail },
        data: {
          id: clerkUser.id,
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

      console.log(`[syncUser] Updated user ${primaryEmail} from old Clerk ID ${oldUserId} to new ID ${clerkUser.id}`);
      return user;
    }

    // Normal upsert - either new user or same Clerk ID
    // Wrapped in retry logic to handle race conditions when multiple requests
    // try to create the same user simultaneously
    try {
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
    } catch (upsertError: unknown) {
      // Handle race condition: if unique constraint fails, the user was created
      // by another concurrent request - just fetch it
      if (
        upsertError &&
        typeof upsertError === "object" &&
        "code" in upsertError &&
        upsertError.code === "P2002"
      ) {
        console.log(
          `[syncUser] Race condition detected for user ${clerkUser.id}, fetching existing record`
        );
        const existingUser = await prisma.user.findUnique({
          where: { id: clerkUser.id },
          include: {
            memberships: {
              include: {
                organization: true,
              },
            },
          },
        });
        return existingUser;
      }
      // Re-throw other errors
      throw upsertError;
    }
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

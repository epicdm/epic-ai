import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

// UAT test user ID (consistent ID for testing)
const UAT_TEST_USER_ID = "uat_test_user_001";
const UAT_TEST_ORG_ID = "uat_test_org_001";

// Re-export Clerk's auth function for convenience
export const auth = clerkAuth;

/**
 * Get the current authenticated user from Clerk (with UAT bypass)
 */
export async function getAuth() {
  const result = await clerkAuth();

  // In UAT bypass mode, return test user ID if no real user
  if (isUATBypassEnabled && !result.userId) {
    return { ...result, userId: UAT_TEST_USER_ID };
  }

  return result;
}

/**
 * Get auth for API routes with UAT bypass support
 * Returns { userId, isUATBypass } to indicate if we're in bypass mode
 */
export async function getAuthWithBypass(): Promise<{ userId: string | null; isUATBypass: boolean }> {
  const result = await clerkAuth();

  if (result.userId) {
    return { userId: result.userId, isUATBypass: false };
  }

  if (isUATBypassEnabled) {
    try {
      // Ensure UAT test user and org exist in database
      await ensureUATTestData();
      return { userId: UAT_TEST_USER_ID, isUATBypass: true };
    } catch (error) {
      console.error("Error in UAT bypass mode:", error);
      // Even if UAT test data creation fails, still return the test user ID
      // This prevents auth failures in development
      return { userId: UAT_TEST_USER_ID, isUATBypass: true };
    }
  }

  return { userId: null, isUATBypass: false };
}

/**
 * Ensure UAT test user and organization exist in database
 */
async function ensureUATTestData() {
  // Check if test user exists
  const existingUser = await prisma.user.findUnique({
    where: { id: UAT_TEST_USER_ID },
  });

  if (!existingUser) {
    // Create test user
    await prisma.user.create({
      data: {
        id: UAT_TEST_USER_ID,
        email: "uat-test@epic.dm",
        firstName: "UAT",
        lastName: "Tester",
      },
    });
  }

  // Check if test org exists
  const existingOrg = await prisma.organization.findUnique({
    where: { id: UAT_TEST_ORG_ID },
  });

  if (!existingOrg) {
    // Create test organization
    await prisma.organization.create({
      data: {
        id: UAT_TEST_ORG_ID,
        name: "UAT Test Organization",
        slug: "uat-test-org",
        plan: "enterprise",
      },
    });
  }

  // Check if membership exists
  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: UAT_TEST_USER_ID,
        organizationId: UAT_TEST_ORG_ID,
      },
    },
  });

  if (!existingMembership) {
    // Create membership
    await prisma.membership.create({
      data: {
        userId: UAT_TEST_USER_ID,
        organizationId: UAT_TEST_ORG_ID,
        role: "owner",
      },
    });
  }
}

/**
 * Get the current user's full profile from Clerk
 */
export async function getUser() {
  return currentUser();
}

/**
 * Get the current user from our database (with organization data)
 * Supports UAT bypass mode
 */
export async function getCurrentUser() {
  try {
    const { userId, isUATBypass } = await getAuthWithBypass();

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    // In UAT bypass, user might not exist yet if ensureUATTestData is still running
    if (!user && isUATBypass) {
      console.warn("[getCurrentUser] UAT user not found, waiting for test data creation...");
      await new Promise(resolve => setTimeout(resolve, 200));
      return prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });
    }

    return user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    // Return null instead of throwing to prevent auth failures from breaking the app
    return null;
  }
}

/**
 * Get the user's current organization
 * Includes retry logic for UAT bypass mode where test data may not be ready yet
 */
export async function getCurrentOrganization() {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
    // In UAT bypass mode, the test data might not be ready yet (race condition)
    // Retry once after a short delay
    if (isUATBypassEnabled) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const retryUser = await getCurrentUser();
      if (retryUser && retryUser.memberships.length > 0) {
        return retryUser.memberships[0].organization;
      }
    }
    return null;
  }

  // For now, return the first organization
  // Later we can add org switching
  return user.memberships[0].organization;
}

/**
 * Check if user has access to an organization
 */
export async function hasOrgAccess(organizationId: string) {
  const { userId } = await clerkAuth();

  if (!userId) {
    return false;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  return !!membership;
}

/**
 * Check if user has a specific role in an organization
 */
export async function hasRole(organizationId: string, roles: string[]) {
  const { userId } = await clerkAuth();

  if (!userId) {
    return false;
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });

  if (!membership) {
    return false;
  }

  return roles.includes(membership.role);
}

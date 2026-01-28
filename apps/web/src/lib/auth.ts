import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

// UAT bypass - allows testing without auth when explicitly enabled
// Works in both development and production (when E2E_UAT_BYPASS is set)
// NOTE: Evaluated at request time (not build time) to support runtime env var changes
function isUATBypassEnabledAtRequest() {
  return process.env.E2E_UAT_BYPASS === "true";
}

// UAT test user ID (consistent ID for testing)
const UAT_TEST_USER_ID = "uat_test_user_001";
const UAT_TEST_ORG_ID = "uat_test_org_001";

// Re-export Clerk's auth function for convenience
export const auth = clerkAuth;

/**
 * Get the current authenticated user from Clerk (with UAT bypass)
 */
export async function getAuth() {
  try {
    const result = await clerkAuth();

    // In UAT bypass mode, return test user ID if no real user
    if (isUATBypassEnabledAtRequest() && !result.userId) {
      return { ...result, userId: UAT_TEST_USER_ID };
    }

    return result;
  } catch (error) {
    // If clerkMiddleware wasn't called (e.g., UAT bypass skips it), handle gracefully
    if (isUATBypassEnabledAtRequest()) {
      return { userId: UAT_TEST_USER_ID } as Awaited<ReturnType<typeof clerkAuth>>;
    }
    throw error;
  }
}

/**
 * Get auth for API routes with UAT bypass support
 * Returns { userId, isUATBypass } to indicate if we're in bypass mode
 */
export async function getAuthWithBypass(): Promise<{ userId: string | null; isUATBypass: boolean }> {
  let result;
  try {
    result = await clerkAuth();
  } catch (error) {
    // If clerkMiddleware wasn't called (e.g., UAT bypass skips it), handle gracefully
    if (isUATBypassEnabledAtRequest()) {
      try {
        await ensureUATTestData();
      } catch {
        console.debug('[UAT Bypass] Database unavailable, skipping test data creation');
      }
      return { userId: UAT_TEST_USER_ID, isUATBypass: true };
    }
    throw error;
  }

  if (result.userId) {
    return { userId: result.userId, isUATBypass: false };
  }

  if (isUATBypassEnabledAtRequest()) {
    // In UAT bypass mode, try to ensure test data exists but don't fail if DB is unavailable
    // This allows E2E tests to run even without a connected database
    try {
      await ensureUATTestData();
    } catch (error) {
      // Silently ignore database errors in UAT bypass mode
      // The test data may not exist but the bypass will still work
      console.debug('[UAT Bypass] Database unavailable, skipping test data creation');
    }
    return { userId: UAT_TEST_USER_ID, isUATBypass: true };
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
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    return null;
  }

  // In UAT bypass mode, return mock user data to avoid database queries
  if (isUATBypass) {
    return {
      id: UAT_TEST_USER_ID,
      email: "uat-test@epic.dm",
      firstName: "UAT",
      lastName: "Tester",
      memberships: [
        {
          userId: UAT_TEST_USER_ID,
          organizationId: UAT_TEST_ORG_ID,
          role: "owner",
          organization: {
            id: UAT_TEST_ORG_ID,
            name: "UAT Test Organization",
            slug: "uat-test-org",
            plan: "enterprise",
          },
        },
      ],
    };
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

  return user;
}

/**
 * Get the user's current organization
 */
export async function getCurrentOrganization() {
  const user = await getCurrentUser();

  if (!user || user.memberships.length === 0) {
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
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    return false;
  }

  // In UAT bypass mode, grant access to the test organization
  if (isUATBypass) {
    return organizationId === UAT_TEST_ORG_ID;
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
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    return false;
  }

  // In UAT bypass mode, grant owner role for test organization
  if (isUATBypass) {
    return organizationId === UAT_TEST_ORG_ID && roles.includes("owner");
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

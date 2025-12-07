import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * Get the current authenticated user from Clerk
 */
export async function getAuth() {
  return auth();
}

/**
 * Get the current user's full profile from Clerk
 */
export async function getUser() {
  return currentUser();
}

/**
 * Get the current user from our database (with organization data)
 */
export async function getCurrentUser() {
  const { userId } = await auth();

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
  const { userId } = await auth();

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
  const { userId } = await auth();

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

import { auth, currentUser } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { prisma } from "@epic-ai/database";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  // In UAT bypass mode, skip auth check and use mock values
  if (isUATBypassEnabled && !userId) {
    return (
      <DashboardShell
        organizationName="UAT Test Organization"
        userName="UAT Tester"
      >
        {children}
      </DashboardShell>
    );
  }

  if (!userId) {
    redirect("/sign-in");
  }

  // Single onboarding gate for ALL dashboard routes
  // This check runs for every dashboard route including /onboarding
  // The /onboarding page itself will render the wizard and not redirect back
  const onboardingProgress = await prisma.userOnboardingProgress.findUnique({
    where: { userId },
  });

  // Check if user is truly a new user or an existing user
  // Existing users (who have been using the app before onboarding gate was added) should be allowed through
  const needsOnboarding = async (): Promise<boolean> => {
    // If onboarding is marked complete, no need to check further
    if (onboardingProgress?.onboardingCompletedAt) {
      return false;
    }

    // Check for signs of existing user activity (indicates they were using the app before the onboarding gate)
    // This prevents breaking OAuth login for existing users
    const [syncedUser, contentCount, socialAccountCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      }),
      prisma.contentItem.count({ where: { createdById: userId } }),
      prisma.socialAccount.count({
        where: {
          organization: {
            memberships: {
              some: { userId },
            },
          },
        },
      }),
    ]);

    // If user has any existing activity, they're not a new user - let them through
    // This fixes OAuth login for users who were using the app before commit 646ec98
    const hasExistingActivity =
      (syncedUser?.memberships && syncedUser.memberships.length > 0) ||
      contentCount > 0 ||
      socialAccountCount > 0;

    if (hasExistingActivity) {
      // Auto-mark onboarding as complete for existing users
      await prisma.userOnboardingProgress.upsert({
        where: { userId },
        create: {
          userId,
          onboardingCompletedAt: new Date(),
          completionPercentage: 100,
        },
        update: {
          onboardingCompletedAt: new Date(),
          completionPercentage: 100,
        },
      });
      return false; // Don't need onboarding
    }

    return true; // New user, needs onboarding
  };

  // If user needs onboarding and isn't on the onboarding page, redirect
  // We check the current path to avoid redirect loops
  try {
    const headersList = await headers();
    const pathname = headersList.get("x-invoke-path") || "";

    if ((await needsOnboarding()) && !pathname.includes("/onboarding")) {
      redirect("/onboarding");
    }
  } catch {
    // If we can't determine the path, check if onboarding is complete
    // If not complete, redirect (this is safe because onboarding page won't redirect back)
    if (await needsOnboarding()) {
      redirect("/onboarding");
    }
  }

  // Get user data in parallel - wrap in try/catch for resilience
  let organizationName: string | undefined;
  let userName: string | undefined;

  try {
    const [syncedUser, clerkUser] = await Promise.all([
      syncUser(),
      currentUser(),
    ]);

    // Get organization from synced user (already includes memberships)
    if (syncedUser?.memberships?.[0]?.organization) {
      organizationName = syncedUser.memberships[0].organization.name;
    }

    // Get user name from Clerk
    if (clerkUser?.firstName) {
      userName = clerkUser.firstName;
    }
  } catch (e) {
    console.error("Error in dashboard layout:", e);
    // Continue rendering with default values
  }

  return (
    <DashboardShell
      organizationName={organizationName}
      userName={userName}
    >
      {children}
    </DashboardShell>
  );
}

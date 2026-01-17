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

  // If user hasn't completed onboarding and isn't on the onboarding page, redirect
  // We check the current path to avoid redirect loops
  try {
    const headersList = await headers();
    const pathname = headersList.get("x-invoke-path") || "";

    if (!onboardingProgress?.onboardingCompletedAt && !pathname.includes("/onboarding")) {
      redirect("/onboarding");
    }
  } catch {
    // If we can't determine the path, check if onboarding is complete
    // If not complete, redirect (this is safe because onboarding page won't redirect back)
    if (!onboardingProgress?.onboardingCompletedAt) {
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

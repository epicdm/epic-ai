import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAuthWithBypass } from "@/lib/auth";
import { syncUser } from "@/lib/sync-user";
import { UnifiedOnboardingWizard } from "@/components/onboarding/unified-onboarding-wizard";

interface OnboardingPageProps {
  searchParams: Promise<{ force?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const { userId, isUATBypass } = await getAuthWithBypass();
  const params = await searchParams;

  // force=true bypasses the "has org" check (used after brand-only reset)
  const forceOnboarding = params.force === "true";

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user and check if they need onboarding in one call
  let userHasOrg = false;
  let clerkUser = null;

  try {
    // In UAT bypass mode, skip syncUser (already handled) and use mock clerk user
    if (isUATBypass) {
      // UAT bypass - check if test user has org membership
      const { prisma } = await import("@epic-ai/database");
      const testUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { memberships: true },
      });
      userHasOrg = testUser?.memberships && testUser.memberships.length > 0;
    } else {
      const [syncedUser, clerk] = await Promise.all([
        syncUser(),
        currentUser(),
      ]);

      clerkUser = clerk;

      // Only redirect if we successfully verified user HAS an organization
      // If syncUser fails or returns null, stay on onboarding to be safe
      if (syncedUser && syncedUser.memberships.length > 0) {
        userHasOrg = true;
      }
    }
  } catch (e) {
    console.error("Error in onboarding check:", e);
    // On error, DON'T redirect - stay on onboarding to avoid redirect loop
  }

  if (userHasOrg && !forceOnboarding) {
    // User already has an organization, go to dashboard
    // (unless force=true was passed, e.g., after brand-only reset)
    redirect("/dashboard");
  }

  const userName = isUATBypass ? "UAT Tester" : (clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || "there");
  const userEmail = isUATBypass ? "uat-test@epic.dm" : (clerkUser?.emailAddresses?.[0]?.emailAddress || "");

  return (
    <UnifiedOnboardingWizard
      userName={userName}
      userEmail={userEmail}
    />
  );
}

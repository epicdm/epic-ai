import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";
import { UnifiedOnboardingWizard } from "@/components/onboarding/unified-onboarding-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user and check if they need onboarding in one call
  let userHasOrg = false;
  let clerkUser = null;

  try {
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
  } catch (e) {
    console.error("Error in onboarding check:", e);
    // On error, DON'T redirect - stay on onboarding to avoid redirect loop
  }

  if (userHasOrg) {
    // User already has an organization, go to dashboard
    redirect("/dashboard");
  }

  const userName = clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || "there";
  const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";

  return (
    <UnifiedOnboardingWizard
      userName={userName}
      userEmail={userEmail}
    />
  );
}

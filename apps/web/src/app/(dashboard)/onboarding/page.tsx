import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser, needsOnboarding } from "@/lib/sync-user";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user to database - wrap in try/catch for resilience
  try {
    await syncUser();
  } catch (e) {
    console.error("Error syncing user:", e);
  }

  // Check if user already has an organization
  let needs = true;
  try {
    needs = await needsOnboarding();
  } catch (e) {
    console.error("Error checking onboarding status:", e);
    // If we can't check, assume they need onboarding
    needs = true;
  }

  if (!needs) {
    // User already has an organization, go to dashboard
    redirect("/dashboard");
  }

  let user = null;
  try {
    user = await currentUser();
  } catch (e) {
    console.error("Error getting current user:", e);
  }

  return (
    <OnboardingWizard
      userName={user?.firstName || user?.emailAddresses?.[0]?.emailAddress || "there"}
    />
  );
}

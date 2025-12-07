import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser, needsOnboarding } from "@/lib/sync-user";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Sync user to database
  await syncUser();

  // Check if user already has an organization
  const needs = await needsOnboarding();

  if (!needs) {
    // User already has an organization, go to dashboard
    redirect("/dashboard");
  }

  const user = await currentUser();

  return (
    <OnboardingWizard
      userName={user?.firstName || user?.emailAddresses[0]?.emailAddress || "there"}
    />
  );
}

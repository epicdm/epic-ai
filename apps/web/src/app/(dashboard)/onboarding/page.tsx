import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getAuthWithBypass } from "@/lib/auth";
import { UnifiedOnboardingWizard } from "@/components/onboarding/unified-onboarding-wizard";

export default async function OnboardingPage() {
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user name and email for the wizard
  let userName = "there";
  let userEmail = "";

  if (isUATBypass) {
    userName = "UAT Tester";
    userEmail = "uat-test@epic.dm";
  } else {
    try {
      const clerkUser = await currentUser();
      userName = clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || "there";
      userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
    } catch (e) {
      console.error("Error fetching user data:", e);
      // Use defaults if we can't fetch user data
    }
  }

  return (
    <UnifiedOnboardingWizard
      userName={userName}
      userEmail={userEmail}
    />
  );
}

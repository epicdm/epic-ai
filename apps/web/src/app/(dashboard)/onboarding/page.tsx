import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OnboardingContent } from "@/components/dashboard/onboarding-content";

export default async function OnboardingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  return <OnboardingContent firstName={user.firstName || null} />;
}

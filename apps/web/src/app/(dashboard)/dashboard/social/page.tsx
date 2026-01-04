import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { SocialDashboard } from "@/components/social/social-dashboard";

export default async function SocialPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <SocialDashboard />;
}

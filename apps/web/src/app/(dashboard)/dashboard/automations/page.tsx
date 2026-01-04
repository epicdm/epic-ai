import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { AutomationsDashboard } from "@/components/automations/automations-dashboard";

export default async function AutomationsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <AutomationsDashboard />;
}

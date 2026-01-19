import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationsDashboard } from "@/components/automations/automations-dashboard";

export default async function AutomationsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <AutomationsDashboard />;
}

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeadsDashboard } from "@/components/leads/leads-dashboard";

export default async function LeadsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <LeadsDashboard />;
}

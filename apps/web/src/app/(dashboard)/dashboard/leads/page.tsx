import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { EmptyStateLeads } from "@/components/empty-states/empty-state-leads";

export default async function LeadsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  return <EmptyStateLeads />;
}

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding, getUserOrganization } from "@/lib/sync-user";
import { UsagePageClient } from "./client";

export default async function UsagePage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding
  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  const organization = await getUserOrganization();

  if (!organization) {
    redirect("/onboarding");
  }

  return <UsagePageClient />;
}

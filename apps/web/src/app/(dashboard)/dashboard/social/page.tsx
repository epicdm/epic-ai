import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { EmptyStateSocial } from "@/components/empty-states/empty-state-social";

export default async function SocialPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  return <EmptyStateSocial />;
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { EmptyStateVoice } from "@/components/empty-states/empty-state-voice";

export default async function VoicePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  return <EmptyStateVoice />;
}

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { FlowManager } from "@/components/voice/flow-manager";

export default async function FlowsPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  return <FlowManager />;
}

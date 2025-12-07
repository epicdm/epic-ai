import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
import { AutomationDetail } from "@/components/automations/automation-detail";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const { id } = await params;

  return <AutomationDetail automationId={id} />;
}

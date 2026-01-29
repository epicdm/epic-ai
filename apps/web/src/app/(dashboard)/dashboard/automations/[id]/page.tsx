import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationDetail } from "@/components/automations/automation-detail";

export const dynamic = 'force-dynamic';

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <AutomationDetail automationId={id} />;
}

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeadDetail } from "@/components/leads/lead-detail";

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { id } = await params;

  return <LeadDetail leadId={id} />;
}

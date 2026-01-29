import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { AgentWizard } from "@/components/voice/agent-wizard";

export const dynamic = 'force-dynamic';

export default async function NewAgentPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const org = await getUserOrganization();

  // Get brands for dropdown
  const brands = org
    ? await prisma.brand.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true },
      })
    : [];

  return <AgentWizard brands={brands} />;
}

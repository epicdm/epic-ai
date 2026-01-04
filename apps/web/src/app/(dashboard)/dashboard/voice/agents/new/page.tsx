import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { needsOnboarding, getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { AgentForm } from "@/components/voice/agent-form";

export default async function NewAgentPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const org = await getUserOrganization();

  // Get brands for dropdown
  const brands = org
    ? await prisma.brand.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true },
      })
    : [];

  return <AgentForm brands={brands} />;
}

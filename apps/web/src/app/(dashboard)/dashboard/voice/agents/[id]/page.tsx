import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { needsOnboarding, getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { AgentForm } from "@/components/voice/agent-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const org = await getUserOrganization();
  if (!org) {
    redirect("/onboarding");
  }

  const { id } = await params;

  // Fetch the agent
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      id,
      brand: {
        organizationId: org.id,
      },
    },
    include: {
      brand: {
        select: { id: true, name: true },
      },
    },
  });

  if (!agent) {
    notFound();
  }

  // Get brands for dropdown
  const brands = await prisma.brand.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  });

  // Transform agent data for the form
  const initialData = {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    brandId: agent.brandId,
    systemPrompt: agent.systemPrompt,
    greeting: agent.greeting,
    llmProvider: agent.llmProvider,
    llmModel: agent.llmModel,
    ttsProvider: agent.ttsProvider,
    sttProvider: agent.sttProvider,
    voiceSettings: (agent.voiceSettings as { voiceId?: string; temperature?: number }) || {},
    transferNumber: agent.transferNumber,
    isActive: agent.isActive,
  };

  return <AgentForm brands={brands} initialData={initialData} />;
}

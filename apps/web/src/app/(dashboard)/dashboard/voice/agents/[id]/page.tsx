import { getAuth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { needsOnboarding, getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { AgentForm } from "@/components/voice/agent-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { userId } = await getAuth();

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

  // First get the brand IDs for this organization
  const orgBrands = await prisma.brand.findMany({
    where: { organizationId: org.id },
    select: { id: true },
  });
  const brandIds = orgBrands.map(b => b.id);

  // Fetch the agent (VoiceAgent doesn't have a direct brand relation)
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      id,
      brandId: { in: brandIds },
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
  // Settings JSON may contain extended configuration
  const agentSettings = (agent.settings as Record<string, unknown>) || {};
  const initialData = {
    id: agent.id,
    name: agent.name,
    description: (agentSettings.description as string) || "",
    brandId: agent.brandId,
    systemPrompt: agent.systemPrompt,
    greeting: (agentSettings.greeting as string) || "",
    llmProvider: (agentSettings.llmProvider as string) || "openai",
    llmModel: (agentSettings.llmModel as string) || "gpt-4",
    ttsProvider: (agentSettings.ttsProvider as string) || "elevenlabs",
    sttProvider: (agentSettings.sttProvider as string) || "deepgram",
    voiceSettings: {
      voiceId: agent.voiceId || undefined,
      temperature: (agentSettings.temperature as number) || 0.7,
    },
    transferNumber: (agentSettings.transferNumber as string) || "",
    isActive: agent.isActive,
  };

  return <AgentForm brands={brands} initialData={initialData} />;
}

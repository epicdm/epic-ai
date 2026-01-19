import { getAuth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
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

  const org = await getUserOrganization();
  if (!org) {
    throw new Error("Organization not found - please contact support");
  }

  const { id } = await params;

  // First get the brand IDs for this organization
  const orgBrands = await prisma.brand.findMany({
    where: { organizationId: org.id },
    select: { id: true },
  });
  const brandIds = orgBrands.map(b => b.id);

  // Fetch the agent with phone mappings
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      id,
      brandId: { in: brandIds },
    },
    include: {
      phoneMappings: {
        select: {
          id: true,
          phoneNumber: true,
          isActive: true,
          magnusStatus: true,
        },
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
    phoneNumbers: agent.phoneMappings.map(pm => ({
      id: pm.id,
      number: pm.phoneNumber,
      isActive: pm.isActive,
      status: pm.magnusStatus,
    })),
  };

  return <AgentForm brands={brands} initialData={initialData} />;
}

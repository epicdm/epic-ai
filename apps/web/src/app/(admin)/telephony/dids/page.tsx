import { prisma } from "@epic-ai/database";
import DidProvisioningPanel from "./ui/DidProvisioningPanel";

export const dynamic = "force-dynamic";

type DidRow = {
  did: string;
  agentId: string;
  isActive: boolean;
  updatedAt?: string | null;
  agentStatus?: string | null;
  agentName?: string | null;
};

async function loadDidRoutes(): Promise<DidRow[]> {
  // PhoneMapping model (schema uses phoneNumber field, not did)
  const routes = await prisma.phoneMapping.findMany({
    orderBy: [{ isActive: "desc" }, { phoneNumber: "asc" }],
    select: {
      phoneNumber: true,
      agentId: true,
      isActive: true,
      updatedAt: true,
    },
  });

  // Pull agent details for display (using VoiceAgent per schema relation)
  const agentIds = Array.from(
    new Set(routes.map((r) => r.agentId).filter(Boolean) as string[])
  );

  const agents = await prisma.voiceAgent.findMany({
    where: { id: { in: agentIds } },
    select: { id: true, status: true, name: true, isActive: true },
  });

  const agentById = new Map(agents.map((a) => [a.id, a]));

  return routes.map((r) => {
    const a = r.agentId ? agentById.get(r.agentId) : undefined;
    return {
      did: r.phoneNumber, // Map phoneNumber to did for UI consistency
      agentId: r.agentId || "",
      isActive: r.isActive,
      updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null,
      agentStatus: a?.status ?? null,
      agentName: a?.name ?? null,
    };
  });
}

async function loadLiveAgents() {
  // Load all active agents (API will enforce PUBLISHED/READY requirement)
  const agents = await prisma.voiceAgent.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    select: { id: true, name: true, status: true, isActive: true },
  });

  // Filter to live-eligible statuses (PUBLISHED or READY)
  // This matches the Inbound Call Guard v1 logic
  const liveAgents = agents.filter((a) => {
    const statusUpper = (a.status || "").toUpperCase();
    return statusUpper === "PUBLISHED" || statusUpper === "READY";
  });

  return liveAgents.map((a) => ({
    id: a.id,
    name: a.name ?? "(unnamed agent)",
    status: a.status,
  }));
}

export default async function DidRoutingPage() {
  const [routes, liveAgents] = await Promise.all([
    loadDidRoutes(),
    loadLiveAgents(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Telephony DID Routing</h1>
        <p className="text-sm text-muted-foreground">
          Map inbound DIDs to live agents. Changes apply immediately to inbound
          routing.
        </p>
      </div>

      <DidProvisioningPanel initialRoutes={routes} liveAgents={liveAgents} />
    </div>
  );
}

import { prisma } from "@epic-ai/database";

export type InboundGuardDecision =
  | { allowed: true; did: string; voiceAgentId: string; mappingId: string }
  | {
      allowed: false;
      did: string;
      code:
        | "UNMAPPED"
        | "INACTIVE_MAPPING"
        | "MISSING_AGENT"
        | "INACTIVE_AGENT"
        | "NOT_LIVE"
        | "BAD_REQUEST";
      message: string;
      mappingId?: string;
      voiceAgentId?: string;
      agentStatus?: string;
    };

function normalizeDid(input: string): string {
  const s = (input || "").trim();
  return s.replace(/[ \-\(\)]/g, "");
}

function isLiveStatus(status: string | null | undefined): boolean {
  const s = String(status || "").trim().toUpperCase();
  return s === "READY" || s === "PUBLISHED";
}

export async function inboundCallGuard(rawDid: string): Promise<InboundGuardDecision> {
  const did = normalizeDid(rawDid);

  if (!did) {
    return {
      allowed: false,
      did,
      code: "BAD_REQUEST",
      message: "Missing DID",
    };
  }

  // Note: Schema uses phoneNumber field, not did
  const mapping = await prisma.phoneMapping.findUnique({
    where: { phoneNumber: did },
    select: {
      id: true,
      phoneNumber: true,
      isActive: true,
      agentId: true, // Schema uses agentId, not voiceAgentId
    },
  });

  if (!mapping) {
    return {
      allowed: false,
      did,
      code: "UNMAPPED",
      message: "No DID mapping found",
    };
  }

  if (!mapping.isActive) {
    return {
      allowed: false,
      did,
      code: "INACTIVE_MAPPING",
      message: "DID mapping exists but is inactive",
      mappingId: mapping.id,
      voiceAgentId: mapping.agentId || undefined,
    };
  }

  if (!mapping.agentId) {
    return {
      allowed: false,
      did,
      code: "MISSING_AGENT",
      message: "Mapping exists but no agent assigned",
      mappingId: mapping.id,
    };
  }

  const agent = await prisma.voiceAgent.findUnique({
    where: { id: mapping.agentId },
    select: {
      id: true,
      status: true,
      isActive: true,
    },
  });

  if (!agent) {
    return {
      allowed: false,
      did,
      code: "MISSING_AGENT",
      message: "Mapping exists but VoiceAgent not found",
      mappingId: mapping.id,
      voiceAgentId: mapping.agentId,
    };
  }

  if (!agent.isActive) {
    return {
      allowed: false,
      did,
      code: "INACTIVE_AGENT",
      message: "VoiceAgent is inactive",
      mappingId: mapping.id,
      voiceAgentId: agent.id,
      agentStatus: agent.status || undefined,
    };
  }

  if (!isLiveStatus(agent.status)) {
    return {
      allowed: false,
      did,
      code: "NOT_LIVE",
      message: "VoiceAgent must be READY or PUBLISHED for inbound calls",
      mappingId: mapping.id,
      voiceAgentId: agent.id,
      agentStatus: agent.status || undefined,
    };
  }

  return {
    allowed: true,
    did,
    mappingId: mapping.id,
    voiceAgentId: agent.id,
  };
}

import { NextRequest } from "next/server";
import { prisma } from "@epic-ai/database";

/**
 * Resolve DID v1
 *
 * Answers one question reliably:
 * "Given an inbound DID, what VoiceAgent (if any) should receive the call — and is it active?"
 *
 * GET /api/telephony/resolve-did?did=+1767...
 *
 * Response:
 * {
 *   ok: boolean,
 *   did: string,
 *   mapping: null | { id, did, voiceAgentId, isActive, updatedAt },
 *   voiceAgent: null | { id, name, status, isActive },
 *   reason?: "UNMAPPED" | "INACTIVE_MAPPING" | "MISSING_AGENT"
 * }
 */

export const dynamic = "force-dynamic";

function normalizeDid(input: string): string {
  // v1: simple normalization (keep + and digits)
  const s = (input || "").trim();
  // remove spaces, hyphens, parentheses
  const cleaned = s.replace(/[ \-\(\)]/g, "");
  return cleaned;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const didRaw = url.searchParams.get("did") || "";
    const did = normalizeDid(didRaw);

    if (!did) {
      return Response.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Missing did" } },
        { status: 400 }
      );
    }

    // Find mapping
    // Note: Schema uses phoneNumber field, not did
    const mapping = await prisma.phoneMapping.findUnique({
      where: { phoneNumber: did },
      select: {
        id: true,
        phoneNumber: true,
        agentId: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (!mapping) {
      return Response.json(
        {
          ok: true,
          did,
          mapping: null,
          voiceAgent: null,
          reason: "UNMAPPED",
        },
        { status: 200 }
      );
    }

    if (!mapping.isActive) {
      // mapping exists but disabled
      return Response.json(
        {
          ok: true,
          did,
          mapping: {
            id: mapping.id,
            did: mapping.phoneNumber,
            voiceAgentId: mapping.agentId,
            isActive: mapping.isActive,
            updatedAt: mapping.updatedAt?.toISOString() || null,
          },
          voiceAgent: null,
          reason: "INACTIVE_MAPPING",
        },
        { status: 200 }
      );
    }

    // Load voice agent
    const voiceAgent = await prisma.voiceAgent.findUnique({
      where: { id: mapping.agentId! },
      select: {
        id: true,
        name: true,
        status: true, // string per schema
        isActive: true,
      },
    });

    if (!voiceAgent) {
      return Response.json(
        {
          ok: true,
          did,
          mapping: {
            id: mapping.id,
            did: mapping.phoneNumber,
            voiceAgentId: mapping.agentId,
            isActive: mapping.isActive,
            updatedAt: mapping.updatedAt?.toISOString() || null,
          },
          voiceAgent: null,
          reason: "MISSING_AGENT",
        },
        { status: 200 }
      );
    }

    return Response.json(
      {
        ok: true,
        did,
        mapping: {
          id: mapping.id,
          did: mapping.phoneNumber,
          voiceAgentId: mapping.agentId,
          isActive: mapping.isActive,
          updatedAt: mapping.updatedAt?.toISOString() || null,
        },
        voiceAgent: {
          id: voiceAgent.id,
          name: voiceAgent.name,
          status: voiceAgent.status,
          isActive: voiceAgent.isActive,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to resolve DID",
          details: String(err?.message || err),
        },
      },
      { status: 500 }
    );
  }
}

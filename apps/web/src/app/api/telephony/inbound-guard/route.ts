import { NextRequest } from "next/server";
import { inboundCallGuard } from "@/lib/telephony/inbound-guard";

/**
 * Inbound Call Guard v1
 *
 * Runtime "single source of truth" gate that prevents any inbound traffic
 * from touching non-live agents.
 *
 * Live-Eligibility Rules (v1):
 * Allow inbound call ONLY IF:
 * - DID mapping exists
 * - mapping.isActive = true
 * - voiceAgent exists
 * - voiceAgent.isActive = true
 * - voiceAgent.status is READY or PUBLISHED (case-insensitive)
 *
 * GET /api/telephony/inbound-guard?did=+1767...
 *
 * Response HTTP Codes:
 * - 200: Allowed (voiceAgentId returned)
 * - 404: Unmapped or missing agent
 * - 409: Mapped but not eligible (inactive/not_live)
 * - 400: Bad request (missing DID)
 * - 500: Internal error
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const did = url.searchParams.get("did") || "";

    const decision = await inboundCallGuard(did);

    if (decision.allowed) {
      return Response.json(
        {
          ok: true,
          allowed: true,
          did: decision.did,
          mappingId: decision.mappingId,
          voiceAgentId: decision.voiceAgentId,
        },
        { status: 200 }
      );
    }

    // HTTP codes matter for runtime behavior:
    // - 404 for unmapped
    // - 409 for mapped but not eligible (inactive/not_live)
    // - 400 for bad request
    const status =
      decision.code === "UNMAPPED" || decision.code === "MISSING_AGENT"
        ? 404
        : decision.code === "BAD_REQUEST"
        ? 400
        : 409;

    return Response.json(
      {
        ok: true,
        allowed: false,
        did: decision.did,
        reason: decision.code,
        message: decision.message,
        mappingId: decision.mappingId,
        voiceAgentId: decision.voiceAgentId,
        agentStatus: decision.agentStatus,
      },
      { status }
    );
  } catch (err: any) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Inbound guard failed",
          details: String(err?.message || err),
        },
      },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import {
  jsonErr,
  jsonOk,
  normalizeDid,
  normalizeCaller,
  requestId,
  requireInternalToken,
} from "./_helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/telephony/inbound-call-guard?did=+1767...&from=+1...
 *
 * Purpose:
 * - Fail-closed "call-time" enforcement.
 * - Delegates DID resolution to /api/telephony/resolve-did.
 * - Enforces live-only routing (PUBLISHED/READY status + isActive)
 *
 * Output:
 * - allow: true/false
 * - reason_code: stable reason string for dialplan decisions
 * - voiceAgentId when allowed
 *
 * Recommended:
 * - Asterisk calls this before starting any expensive runtime steps.
 * - voice-service also calls it before starting session.
 */
export async function GET(req: NextRequest) {
  const rid = requestId(req);

  // Optional internal auth
  const auth = requireInternalToken(req);
  if (!auth.ok)
    return jsonErr({ ...auth.error, details: { request_id: rid } }, 401);

  const url = new URL(req.url);

  const didRaw = url.searchParams.get("did") || "";
  const fromRaw = url.searchParams.get("from") || "";
  const callSid =
    url.searchParams.get("callSid") || url.searchParams.get("sid") || null;

  const did = normalizeDid(didRaw);
  const from = normalizeCaller(fromRaw);

  if (!did || did.replace(/[^\d]/g, "").length < 7) {
    return jsonErr(
      {
        code: "DID_MISSING",
        message: "Query param 'did' is required",
        details: { request_id: rid },
      },
      400
    );
  }

  // Call resolve-did locally (same app) so you maintain one source of truth.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const resolveUrl = new URL("/api/telephony/resolve-did", baseUrl);
  resolveUrl.searchParams.set("did", did);

  const internalToken = process.env.TELEPHONY_INTERNAL_TOKEN;

  const resolveRes = await fetch(resolveUrl.toString(), {
    method: "GET",
    headers: {
      "content-type": "application/json",
      ...(internalToken ? { "x-epic-internal-token": internalToken } : {}),
      "x-request-id": rid,
    },
    cache: "no-store",
  });

  const resolveJson = (await resolveRes.json().catch(() => null)) as any;

  // Check if resolve-did failed
  if (!resolveRes.ok || !resolveJson?.ok) {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=RESOLVE_FAILED, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "RESOLVE_FAILED",
        reason_detail: "Unable to resolve DID",
        did,
        from,
        callSid,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  // Parse resolve-did response
  // New format: { ok, did, mapping, voiceAgent, reason? }
  const { mapping, voiceAgent, reason } = resolveJson;

  // Check for rejection reasons from resolve-did
  if (reason === "UNMAPPED") {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=NO_MAPPING, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "NO_MAPPING",
        reason_detail: "This number is not currently in service. Please check the number and try again.",
        did,
        from,
        callSid,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  if (reason === "INACTIVE_MAPPING") {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=MAPPING_INACTIVE, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "MAPPING_INACTIVE",
        reason_detail: "This line is temporarily unavailable.",
        did,
        from,
        callSid,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  if (reason === "MISSING_AGENT") {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_MISSING, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_MISSING",
        reason_detail: "This line is temporarily unavailable.",
        did,
        from,
        callSid,
        agentId: mapping?.voiceAgentId || null,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  // We have mapping + voiceAgent, now enforce live-only routing
  if (!voiceAgent) {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_MISSING, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_MISSING",
        reason_detail: "This line is temporarily unavailable.",
        did,
        from,
        callSid,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  // Check if agent is active
  if (!voiceAgent.isActive) {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_INACTIVE, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_INACTIVE",
        reason_detail: "This line is temporarily unavailable.",
        did,
        from,
        callSid,
        agentId: voiceAgent.id,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  // Check if agent status allows live calls (PUBLISHED or READY)
  const statusUpper = (voiceAgent.status || "").toUpperCase();

  if (statusUpper === "ARCHIVED") {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_ARCHIVED, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_ARCHIVED",
        reason_detail: "This line is no longer in service.",
        did,
        from,
        callSid,
        agentId: voiceAgent.id,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  if (statusUpper === "PAUSED") {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_PAUSED, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_PAUSED",
        reason_detail: "This line is temporarily unavailable.",
        did,
        from,
        callSid,
        agentId: voiceAgent.id,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  const isLiveAllowed = statusUpper === "PUBLISHED" || statusUpper === "READY";

  if (!isLiveAllowed) {
    console.log(
      `[InboundGuard] REJECT: DID=${did}, From=${from}, Reason=AGENT_NOT_LIVE, Status=${statusUpper}, RequestID=${rid}`
    );

    return jsonOk(
      {
        allow: false,
        reason_code: "AGENT_NOT_LIVE",
        reason_detail: "This line is not yet available. Please try again later.",
        did,
        from,
        callSid,
        agentId: voiceAgent.id,
        request_id: rid,
      },
      {
        confidence: { inbound_call_guard: 1.0 },
      }
    );
  }

  // All checks passed - allow the call
  console.log(
    `[InboundGuard] ALLOW: DID=${did}, From=${from}, Agent=${voiceAgent.id}, RequestID=${rid}`
  );

  return jsonOk(
    {
      allow: true,
      reason_code: "OK",
      did,
      from,
      callSid,
      voiceAgentId: voiceAgent.id,
      agentName: voiceAgent.name,
      agentStatus: voiceAgent.status,
      request_id: rid,
    },
    {
      confidence: { inbound_call_guard: 1.0, resolve_did: 1.0 },
      warnings: [],
    }
  );
}

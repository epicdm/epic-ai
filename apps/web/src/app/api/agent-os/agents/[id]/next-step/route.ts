/**
 * Agent OS - Next Step Explain v1
 *
 * GET /api/agent-os/agents/:id/next-step
 *
 * Returns enhanced next-step information including:
 * - Why this is the next step (reason, reason_detail)
 * - What's missing (gaps)
 * - What autopilot can do (auto_actions)
 * - What user must answer (questions)
 * - Step readiness + confidence for all steps
 * - UI rendering hints (title, description, actions)
 *
 * This makes the wizard brain transparent and actionable.
 *
 * Backwards-compatible with v0 - still returns next_step, is_blocked, etc.
 * but now enriched with explanation data.
 *
 * This is the API layer - THIN, no business logic.
 * Business logic lives in:
 * - buildNextStepExplainFromAgentId (enhanced builder)
 * - resolveNextStepV1 (pure step router)
 */

import { NextRequest, NextResponse } from "next/server";

// Match Agent OS route conventions
import { ok, fail, validateAgentAccess, isErrorResponse, returnError } from "../../_helpers";

// Next-step explain builder (orchestrates snapshot + resolver + enrichment)
import { buildNextStepExplainFromAgentId } from "@epic-ai/workers/lib";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Auth + access check (read-only)
    const context = await validateAgentAccess(id);
    if (isErrorResponse(context)) {
      return returnError(context);
    }

    // Build enhanced next-step result (snapshot + resolver + explain)
    const result = await buildNextStepExplainFromAgentId(id);

    if (!result.ok) {
      return NextResponse.json(
        fail(result.error.code, result.error.message, result.error),
        { status: result.error.code === "AGENT_NOT_FOUND" ? 404 : 400 }
      );
    }

    // Return the full explanation
    // The data includes: next_step, reason, reason_detail, step_readiness,
    // confidence, gaps, warnings, questions, auto_actions, ui
    return NextResponse.json(ok(result.data));
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    const code = error?.code || "INTERNAL_ERROR";
    const message = error?.message || "Unexpected error";

    const status =
      code === "AGENT_PUBLISHED"
        ? 409
        : code === "AGENT_NOT_FOUND"
          ? 404
          : 500;

    return NextResponse.json(fail(code, message, { code, message }), {
      status,
    });
  }
}

/**
 * Agent OS - Auto-fill Next Step v1
 *
 * POST /api/agent-os/agents/:id/auto-fill-next-step
 *
 * Automatically runs the appropriate engine for the next step,
 * saves the result, and returns the updated snapshot + next step.
 *
 * Steps auto-fillable:
 * - tools, flow, personality, brain, knowledge, memory, learning
 *
 * Steps NOT auto-fillable (returns gap):
 * - company (needs enrichment or manual profile)
 * - template (needs selection intent)
 * - governance, economics (engines not implemented yet)
 * - review (not a config step)
 */

import { NextRequest, NextResponse } from "next/server";

// API helpers
import { ok, fail, validateAgentAccess, isErrorResponse, returnError } from "../../_helpers";

// Shared auto-fill logic
import {
  autoFillOneStep,
  saveAutoFillResult,
  extractChannels,
  extractTools,
  type WizardStepKey,
} from "../_autofill";

// Workers: next-step + snapshot
import {
  buildNextStepFromAgentId,
  buildWizardSnapshotFromAgentId,
} from "@epic-ai/workers/lib";

// ============================================================================
// Types
// ============================================================================

type RouteParams = { params: Promise<{ id: string }> };

interface AutoFillBody {
  /** Force auto-fill even if not needed */
  force?: boolean;
  /** Override the step to auto-fill (skips next-step computation) */
  desiredStep?: WizardStepKey;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: agentId } = await params;

    // 1) Auth + editable check (blocks published agents)
    const context = await validateAgentAccess(agentId, { requireEditable: true });
    if (isErrorResponse(context)) {
      return returnError(context);
    }

    // 2) Parse optional body
    let body: AutoFillBody = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK
    }

    // 3) Get current snapshot (needed for engine context)
    const snapResult = await buildWizardSnapshotFromAgentId(agentId);
    if (!snapResult.ok) {
      return NextResponse.json(
        fail("SNAPSHOT_ERROR", snapResult.error.message, snapResult.error),
        { status: 400 }
      );
    }

    // 4) Determine step to auto-fill
    let stepToFill: WizardStepKey;

    if (body.desiredStep) {
      stepToFill = body.desiredStep;
    } else {
      const nextStepResult = await buildNextStepFromAgentId(agentId);
      if (!nextStepResult.ok) {
        return NextResponse.json(
          fail("NEXT_STEP_ERROR", nextStepResult.error.message, nextStepResult.error),
          { status: 400 }
        );
      }
      stepToFill = nextStepResult.data.next_step;
    }

    // 5) Extract context from snapshot
    const snapshotData = snapResult.data as Record<string, unknown> | null;
    const companyProfile = (snapshotData?.company_profile as Record<string, unknown>) ?? null;
    const brandVoice = (snapshotData?.brand_voice_profile as Record<string, unknown>) ?? null;
    const selectedTemplate = snapshotData?.selected_template as Record<string, unknown> | null;
    const templateKey = snapResult.templateKey ?? null;
    const channels = extractChannels(selectedTemplate);
    const tools = extractTools(snapshotData);

    // 6) Run the appropriate engine
    const envelope = await autoFillOneStep({
      agentId,
      step: stepToFill,
      templateKey,
      channels,
      companyProfile,
      brandVoice,
      tools,
    });

    // 7) If engine produced a config, save it
    if (envelope.did_save) {
      await saveAutoFillResult(agentId, envelope);
    }

    // 8) If not auto-fillable, return early with reason
    if (!envelope.did_save) {
      return NextResponse.json(
        ok(
          {
            agentId,
            attempted_step: stepToFill,
            did_save: false,
            reason: envelope.reason,
          },
          {
            confidence: envelope.confidence,
            gaps: envelope.gaps,
            warnings: envelope.warnings,
          }
        )
      );
    }

    // 9) Rebuild snapshot + next step after changes
    const updatedSnap = await buildWizardSnapshotFromAgentId(agentId);
    const updatedNext = await buildNextStepFromAgentId(agentId);

    return NextResponse.json(
      ok(
        {
          agentId,
          did_save: true,
          saved_step: stepToFill,
          saved_module: envelope.saved_module,
          wizard_snapshot: updatedSnap.ok ? updatedSnap.data : null,
          next_step: updatedNext.ok ? updatedNext.data : null,
          deploymentState: updatedSnap.ok ? updatedSnap.deploymentState : null,
          templateKey: updatedSnap.ok ? updatedSnap.templateKey : null,
        },
        {
          confidence: {
            ...(updatedSnap.ok ? updatedSnap.confidence : {}),
            ...envelope.confidence,
          },
          gaps: updatedSnap.ok ? updatedSnap.gaps : [],
          warnings: updatedSnap.ok ? updatedSnap.warnings : [],
        }
      )
    );
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Auto-fill error:", error);
    return NextResponse.json(
      fail("INTERNAL_ERROR", error?.message || "Unexpected error"),
      { status: 500 }
    );
  }
}

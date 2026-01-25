/**
 * Agent OS - Auto-fill Loop v2 (with Enrichment + Template Auto-select)
 *
 * POST /api/agent-os/agents/:id/auto-fill-loop
 *
 * "One click build as much as possible"
 *
 * Repeatedly:
 * 1. Compute next_step
 * 2. If company step + websiteUrl provided → run enrichment first
 * 3. If template step → run template engine and auto-apply if confident
 * 4. Auto-fill that step (using shared dispatcher)
 * 5. Save the result
 *
 * Stops when:
 * - template needs confirmation (confidence < threshold and no desiredTemplateKey)
 * - it hits review
 * - it can't make progress (same step repeats 3x)
 * - it hits max steps (default 8, max 25)
 * - enrichment fails (if websiteUrl not provided for company step)
 *
 * Template Auto-select Logic:
 * - If desiredTemplateKey provided → always apply that template
 * - If confidence >= threshold (default 0.75) → auto-apply recommended template
 * - Otherwise → stop with recommendation for user confirmation
 *
 * Returns:
 * - final wizard_snapshot
 * - final next_step
 * - trace of what happened each iteration (includes template decisions)
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

// Company enrichment helpers
import { saveCompanyEnrichment, getCompanyForEnrichment } from "../_company-save";

// Template selection helpers
import { saveTemplateSelection, getAgentTemplateKey } from "../_template-save";

// Workers: next-step + snapshot + enrichment + template
import {
  buildNextStepFromAgentId,
  buildWizardSnapshotFromAgentId,
  runEnrichmentEngine,
  runTemplateEngine,
} from "@epic-ai/workers/lib";

// Shared types
import type { AgentType } from "@epic-ai/shared";

// ============================================================================
// Types
// ============================================================================

type RouteParams = { params: Promise<{ id: string }> };

interface AutoFillLoopBody {
  /** Maximum steps to auto-fill (default 8, max 25) */
  maxSteps?: number;
  /** Stop when reaching review step (default true) */
  stopAtReview?: boolean;
  /** Override the starting step for first iteration */
  desiredStartStep?: WizardStepKey;

  // ─────────────────────────────────────────────────────────────
  // Enrichment v1 inputs
  // ─────────────────────────────────────────────────────────────
  /** Website URL to enrich company from */
  websiteUrl?: string;
  /** Manual answers to supplement AI extraction */
  manualAnswers?: Record<string, string>;
  /** Force enrichment even if company was already enriched */
  forceEnrich?: boolean;

  // ─────────────────────────────────────────────────────────────
  // Template Auto-select v1 inputs
  // ─────────────────────────────────────────────────────────────
  /** Explicit template key to apply (overrides auto-select) */
  desiredTemplateKey?: string;
  /** Auto-apply template if confidence >= threshold (default true) */
  autoApplyTemplate?: boolean;
  /** Confidence threshold for auto-apply (default 0.75) */
  autoApplyThreshold?: number;

  // ─────────────────────────────────────────────────────────────
  // Template Engine v1 (fast path)
  // ─────────────────────────────────────────────────────────────
  /**
   * Use Template Engine v1 (sales_qualifier only, stores in governance_config).
   * When true, bypasses full template engine and uses autoFillOneStep for template.
   * This enables the fast path: template → tools → flow in one loop.
   * Default: false
   */
  useTemplateEngineV1?: boolean;
}

interface TraceItemAutoFill {
  iteration: number;
  step: WizardStepKey;
  kind: "autofill";
  did_save: boolean;
  saved_module: string | null;
  reason: string | null;
  duration_ms: number;
}

interface TraceItemEnrichment {
  iteration: number;
  step: "company";
  kind: "enrichment";
  ran: boolean;
  success: boolean;
  companyId: string | null;
  reason: string | null;
  duration_ms: number;
  gapCount?: number;
}

interface TraceItemTemplate {
  iteration: number;
  step: "template";
  kind: "template";
  ran: boolean;
  success: boolean;
  templateKey: string | null;
  confidence: number;
  reason: string | null;
  duration_ms: number;
  autoApplied: boolean;
}

type TraceItem = TraceItemAutoFill | TraceItemEnrichment | TraceItemTemplate;

interface AutoFillLoopResult {
  agentId: string;
  iterations_completed: number;
  trace: TraceItem[];
  wizard_snapshot: Record<string, unknown> | null;
  next_step: {
    next_step: WizardStepKey;
    is_blocked: boolean;
    reasons: string[];
  } | null;
  deploymentState: string | null;
  templateKey: string | null;
  stopped_because: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_STEPS = 8;
const ABSOLUTE_MAX_STEPS = 25;
const MAX_SAME_STEP_REPEATS = 3;
const DEFAULT_AUTO_APPLY_THRESHOLD = 0.75;

// Steps that always require user input (cannot auto-fill)
// Note: "company" can be auto-filled if websiteUrl is provided
// Note: "template" can be auto-filled if desiredTemplateKey is provided or confidence >= threshold
const BLOCKING_STEPS_ALWAYS: WizardStepKey[] = [];

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
    let body: AutoFillLoopBody = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK
    }

    // 3) Validate and clamp maxSteps
    const maxSteps = Math.max(1, Math.min(body.maxSteps ?? DEFAULT_MAX_STEPS, ABSOLUTE_MAX_STEPS));
    const stopAtReview = body.stopAtReview ?? true;

    // 4) Initialize loop state
    const trace: TraceItem[] = [];
    const stepVisitCount = new Map<WizardStepKey, number>();
    let stoppedBecause = "max_iterations_reached";

    // 5) Run the loop
    for (let i = 0; i < maxSteps; i++) {
      const iterationStart = Date.now();

      // Get current snapshot for context
      const snapResult = await buildWizardSnapshotFromAgentId(agentId);
      if (!snapResult.ok) {
        stoppedBecause = `snapshot_error: ${snapResult.error.message}`;
        break;
      }

      // Determine step to fill
      let stepToFill: WizardStepKey;

      if (i === 0 && body.desiredStartStep) {
        // Use override for first iteration only
        stepToFill = body.desiredStartStep;
      } else {
        // Compute next step
        const nextStepResult = await buildNextStepFromAgentId(agentId);
        if (!nextStepResult.ok) {
          stoppedBecause = `next_step_error: ${nextStepResult.error.message}`;
          break;
        }
        stepToFill = nextStepResult.data.next_step;
      }

      // Stop condition: always-blocking step
      if (BLOCKING_STEPS_ALWAYS.includes(stepToFill)) {
        trace.push({
          iteration: i,
          step: stepToFill,
          kind: "autofill",
          did_save: false,
          saved_module: null,
          reason: `Step "${stepToFill}" requires user input.`,
          duration_ms: Date.now() - iterationStart,
        });
        stoppedBecause = `blocking_step:${stepToFill}`;
        break;
      }

      // Stop condition: review step
      if (stopAtReview && stepToFill === "review") {
        trace.push({
          iteration: i,
          step: stepToFill,
          kind: "autofill",
          did_save: false,
          saved_module: null,
          reason: "Reached review step.",
          duration_ms: Date.now() - iterationStart,
        });
        stoppedBecause = "reached_review";
        break;
      }

      // No-progress safeguard: same step repeating too many times
      const visitCount = (stepVisitCount.get(stepToFill) ?? 0) + 1;
      stepVisitCount.set(stepToFill, visitCount);

      if (visitCount >= MAX_SAME_STEP_REPEATS) {
        trace.push({
          iteration: i,
          step: stepToFill,
          kind: "autofill",
          did_save: false,
          saved_module: null,
          reason: `Step "${stepToFill}" repeated ${visitCount} times (no progress safeguard).`,
          duration_ms: Date.now() - iterationStart,
        });
        stoppedBecause = `no_progress:${stepToFill}`;
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // COMPANY STEP: Try enrichment if websiteUrl provided
      // ─────────────────────────────────────────────────────────────
      if (stepToFill === "company") {
        const companyId = snapResult.companyId;
        const websiteUrl = body.websiteUrl;

        // If no companyId, can't enrich
        if (!companyId) {
          trace.push({
            iteration: i,
            step: "company",
            kind: "enrichment",
            ran: false,
            success: false,
            companyId: null,
            reason: "No companyId on agent. Create or link a company profile first.",
            duration_ms: Date.now() - iterationStart,
          });
          stoppedBecause = "no_company_profile";
          break;
        }

        // If no websiteUrl and not forcing, stop here
        if (!websiteUrl && !body.forceEnrich) {
          trace.push({
            iteration: i,
            step: "company",
            kind: "enrichment",
            ran: false,
            success: false,
            companyId,
            reason: "No websiteUrl provided. Provide websiteUrl to run enrichment v1.",
            duration_ms: Date.now() - iterationStart,
          });
          stoppedBecause = "no_website_url";
          break;
        }

        // Check if already enriched (unless forceEnrich)
        if (!body.forceEnrich) {
          const company = await getCompanyForEnrichment(companyId);
          if (company?.enrichedAt) {
            // Already enriched, skip enrichment and continue loop
            trace.push({
              iteration: i,
              step: "company",
              kind: "enrichment",
              ran: false,
              success: true,
              companyId,
              reason: "Company already enriched. Skipping enrichment.",
              duration_ms: Date.now() - iterationStart,
            });
            // Continue to next iteration (company step should now pass)
            continue;
          }
        }

        // Run enrichment engine
        try {
          const enrichmentStart = Date.now();

          const enrichment = await runEnrichmentEngine({
            websiteUrl: websiteUrl || "https://example.com",
            manualAnswers: body.manualAnswers,
          });

          // Save enrichment to company
          const saveResult = await saveCompanyEnrichment(companyId, enrichment);

          trace.push({
            iteration: i,
            step: "company",
            kind: "enrichment",
            ran: true,
            success: true,
            companyId,
            reason: "Enrichment completed and saved.",
            duration_ms: Date.now() - enrichmentStart,
            gapCount: saveResult.gapCount,
          });

          // If enrichment has blocking gaps, warn but continue
          if (saveResult.hasBlockingGaps) {
            console.log(`[AutoFillLoop] Enrichment has ${saveResult.gapCount} gaps (some blocking)`);
          }

          // Continue to next iteration (next-step should now move past company)
          continue;
        } catch (err: unknown) {
          const error = err as { message?: string };
          trace.push({
            iteration: i,
            step: "company",
            kind: "enrichment",
            ran: true,
            success: false,
            companyId,
            reason: `Enrichment failed: ${error?.message ?? "unknown error"}`,
            duration_ms: Date.now() - iterationStart,
          });
          stoppedBecause = `enrichment_failed:${error?.message ?? "unknown"}`;
          break;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // TEMPLATE STEP: Run template engine and auto-apply if confident
      // ─────────────────────────────────────────────────────────────
      if (stepToFill === "template") {
        const templateStart = Date.now();

        // ─────────────────────────────────────────────────────────────
        // FAST PATH: Template Engine v1 (uses autoFillOneStep)
        // This stores template_key=sales_qualifier in governance_config
        // and enables the fast loop: template → tools → flow
        // ─────────────────────────────────────────────────────────────
        if (body.useTemplateEngineV1) {
          // Check if template already selected (v1 stores in governance_config)
          const existingTemplateKey = await getAgentTemplateKey(agentId);
          if (existingTemplateKey) {
            trace.push({
              iteration: i,
              step: "template",
              kind: "template",
              ran: false,
              success: true,
              templateKey: existingTemplateKey,
              confidence: 1,
              reason: "Template already selected (v1). Skipping to next step.",
              duration_ms: Date.now() - templateStart,
              autoApplied: false,
            });
            continue;
          }

          // Use autoFillOneStep for template (Template Engine v1)
          const snapshotData = snapResult.data as Record<string, unknown> | null;
          const companyProfile = (snapshotData?.company_profile as Record<string, unknown>) ?? null;
          const brandVoice = (snapshotData?.brand_voice_profile as Record<string, unknown>) ?? null;

          const envelope = await autoFillOneStep({
            agentId,
            step: "template",
            templateKey: null, // Not yet set
            channels: [],
            companyProfile,
            brandVoice,
            tools: [],
          });

          trace.push({
            iteration: i,
            step: "template",
            kind: "template",
            ran: true,
            success: envelope.did_save,
            templateKey: envelope.did_save ? "sales_qualifier" : null,
            confidence: 0.95, // Template Engine v1 always selects with high confidence
            reason: envelope.did_save
              ? "Template Engine v1: applied sales_qualifier (stored in governance_config)"
              : envelope.reason ?? "Template Engine v1 failed",
            duration_ms: Date.now() - templateStart,
            autoApplied: true,
          });

          if (!envelope.did_save) {
            stoppedBecause = `template_v1_failed:${envelope.reason ?? "unknown"}`;
            break;
          }

          // Save the result
          await saveAutoFillResult(agentId, envelope);
          continue;
        }

        // ─────────────────────────────────────────────────────────────
        // FULL PATH: Full template engine with confidence-based selection
        // ─────────────────────────────────────────────────────────────
        const autoApply = body.autoApplyTemplate ?? true;
        const threshold = body.autoApplyThreshold ?? DEFAULT_AUTO_APPLY_THRESHOLD;

        // Check if template already selected (unless forcing with desiredTemplateKey)
        if (!body.desiredTemplateKey) {
          const existingTemplateKey = await getAgentTemplateKey(agentId);
          if (existingTemplateKey) {
            trace.push({
              iteration: i,
              step: "template",
              kind: "template",
              ran: false,
              success: true,
              templateKey: existingTemplateKey,
              confidence: 1,
              reason: "Template already selected. Skipping template engine.",
              duration_ms: Date.now() - templateStart,
              autoApplied: false,
            });
            // Continue to next iteration
            continue;
          }
        }

        // Extract company profile and brand voice from snapshot
        const snapshotData = snapResult.data as Record<string, unknown> | null;
        const companyProfile = (snapshotData?.company_profile as Record<string, unknown>) ?? null;
        const brandVoice = (snapshotData?.brand_voice_profile as Record<string, unknown>) ?? null;
        const selectedTemplate = snapshotData?.selected_template as Record<string, unknown> | null;
        const channels = extractChannels(selectedTemplate);

        try {
          // Run template engine
          const templateResult = await runTemplateEngine({
            company_profile: companyProfile as Parameters<typeof runTemplateEngine>[0]["company_profile"],
            brand_voice_profile: brandVoice as Parameters<typeof runTemplateEngine>[0]["brand_voice_profile"],
            desiredTemplateKey: body.desiredTemplateKey as AgentType | undefined,
            channels: channels.map((c) => c.toLowerCase()),
          });

          const overallConfidence = templateResult.confidence.overall ?? 0;

          // Decision: can we auto-apply?
          const hasDesiredKey = !!body.desiredTemplateKey;
          const meetsThreshold = overallConfidence >= threshold;
          const canApply = hasDesiredKey || (autoApply && meetsThreshold && templateResult.templateKey);

          if (canApply && templateResult.templateKey) {
            // Auto-apply the template
            await saveTemplateSelection(agentId, templateResult);

            trace.push({
              iteration: i,
              step: "template",
              kind: "template",
              ran: true,
              success: true,
              templateKey: templateResult.templateKey,
              confidence: overallConfidence,
              reason: hasDesiredKey
                ? `Applied user-specified template: ${templateResult.templateKey}`
                : `Auto-applied template with confidence ${(overallConfidence * 100).toFixed(0)}%`,
              duration_ms: Date.now() - templateStart,
              autoApplied: !hasDesiredKey,
            });

            // Continue to next iteration
            continue;
          } else {
            // Cannot auto-apply - needs user confirmation
            trace.push({
              iteration: i,
              step: "template",
              kind: "template",
              ran: true,
              success: false,
              templateKey: templateResult.templateKey,
              confidence: overallConfidence,
              reason: templateResult.templateKey
                ? `Template "${templateResult.templateKey}" recommended with ${(overallConfidence * 100).toFixed(0)}% confidence (below ${(threshold * 100).toFixed(0)}% threshold). Provide desiredTemplateKey to confirm.`
                : "No template could be recommended. Provide desiredTemplateKey explicitly.",
              duration_ms: Date.now() - templateStart,
              autoApplied: false,
            });
            stoppedBecause = templateResult.templateKey
              ? `template_needs_confirmation:${templateResult.templateKey}`
              : "template_no_recommendation";
            break;
          }
        } catch (err: unknown) {
          const error = err as { message?: string };
          trace.push({
            iteration: i,
            step: "template",
            kind: "template",
            ran: true,
            success: false,
            templateKey: null,
            confidence: 0,
            reason: `Template engine failed: ${error?.message ?? "unknown error"}`,
            duration_ms: Date.now() - templateStart,
            autoApplied: false,
          });
          stoppedBecause = `template_failed:${error?.message ?? "unknown"}`;
          break;
        }
      }

      // ─────────────────────────────────────────────────────────────
      // NORMAL AUTO-FILL STEP
      // ─────────────────────────────────────────────────────────────

      // Extract context from snapshot
      const snapshotData = snapResult.data as Record<string, unknown> | null;
      const companyProfile = (snapshotData?.company_profile as Record<string, unknown>) ?? null;
      const brandVoice = (snapshotData?.brand_voice_profile as Record<string, unknown>) ?? null;
      const selectedTemplate = snapshotData?.selected_template as Record<string, unknown> | null;
      const templateKey = snapResult.templateKey ?? null;
      const channels = extractChannels(selectedTemplate);
      const tools = extractTools(snapshotData);

      // Run the engine
      const envelope = await autoFillOneStep({
        agentId,
        step: stepToFill,
        templateKey,
        channels,
        companyProfile,
        brandVoice,
        tools,
      });

      const duration = Date.now() - iterationStart;

      // Record trace
      trace.push({
        iteration: i,
        step: stepToFill,
        kind: "autofill",
        did_save: envelope.did_save,
        saved_module: envelope.saved_module,
        reason: envelope.reason,
        duration_ms: duration,
      });

      // If we couldn't save, stop
      if (!envelope.did_save) {
        stoppedBecause = `cannot_autofill:${stepToFill}`;
        break;
      }

      // Save the result
      await saveAutoFillResult(agentId, envelope);
    }

    // 6) Get final state
    const finalSnap = await buildWizardSnapshotFromAgentId(agentId);
    const finalNext = await buildNextStepFromAgentId(agentId);

    // 7) Build response
    const result: AutoFillLoopResult = {
      agentId,
      iterations_completed: trace.filter((t) =>
        (t.kind === "autofill" && t.did_save) ||
        (t.kind === "enrichment" && t.success)
      ).length,
      trace,
      wizard_snapshot: finalSnap.ok ? (finalSnap.data as Record<string, unknown>) : null,
      next_step: finalNext.ok
        ? {
            next_step: finalNext.data.next_step,
            is_blocked: finalNext.data.is_blocked,
            reasons: finalNext.data.reasons,
          }
        : null,
      deploymentState: finalSnap.ok ? finalSnap.deploymentState : null,
      templateKey: finalSnap.ok ? finalSnap.templateKey : null,
      stopped_because: stoppedBecause,
    };

    return NextResponse.json(
      ok(result, {
        confidence: finalSnap.ok ? (finalSnap.confidence ?? {}) : {},
        gaps: finalSnap.ok ? (finalSnap.gaps ?? []) : [],
        warnings: finalSnap.ok ? (finalSnap.warnings ?? []) : [],
      })
    );
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    console.error("Auto-fill loop error:", error);
    return NextResponse.json(
      fail("INTERNAL_ERROR", error?.message || "Unexpected error"),
      { status: 500 }
    );
  }
}

"use client";

/**
 * NextStepBanner Component
 *
 * Displays the AI-recommended next step with:
 * - Step name + confidence badge
 * - Reason explanation
 * - Blocking gaps list
 * - Questions to finish the step
 * - Auto-fill / Refresh / Go-to-step buttons
 *
 * @module components/agent-os/NextStepBanner
 */

import React, { useMemo, useState } from "react";
import {
  useNextStep,
  type NextStepKey,
  type GapItem,
} from "./hooks/useNextStep";
import { NextStepAnswerPanel } from "./NextStepAnswerPanel";
import {
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

// ============================================================================
// Helpers
// ============================================================================

function badgeForStep(step: NextStepKey): string {
  const labels: Record<NextStepKey, string> = {
    company: "Company",
    template: "Template",
    tools: "Tools",
    flow: "Flow",
    knowledge: "Knowledge",
    brain: "Brain",
    personality: "Personality",
    memory: "Memory",
    learning: "Learning",
    governance: "Governance",
    economics: "Economics",
    review: "Review",
  };
  return labels[step] || step;
}

function severityPill(sev: "low" | "medium" | "high"): string {
  const base = "text-xs px-2 py-0.5 rounded-full border font-medium";
  if (sev === "high")
    return `${base} border-red-500/40 text-red-300 bg-red-500/10`;
  if (sev === "medium")
    return `${base} border-yellow-500/40 text-yellow-300 bg-yellow-500/10`;
  return `${base} border-emerald-500/40 text-emerald-300 bg-emerald-500/10`;
}

// ============================================================================
// Types
// ============================================================================

export type NextStepBannerProps = {
  /** The agent ID to fetch next-step for */
  agentId: string;
  /**
   * Optional callback for navigation.
   * If not provided, component just displays the step name.
   */
  onGoToStep?: (step: NextStepKey) => void;
  /**
   * Optional callback when you want to refresh snapshot externally
   * after autofill has run.
   */
  onAfterAutoFill?: () => Promise<void> | void;
  /**
   * Show/hide question list (default true)
   */
  showQuestions?: boolean;
  /**
   * Start expanded or collapsed (default true)
   */
  defaultExpanded?: boolean;
  /**
   * Optional className for styling
   */
  className?: string;
};

// ============================================================================
// Component
// ============================================================================

export function NextStepBanner({
  agentId,
  onGoToStep,
  onAfterAutoFill,
  showQuestions = true,
  defaultExpanded = true,
  className = "",
}: NextStepBannerProps) {
  const {
    loading,
    autofillLoading,
    error,
    clearError,
    explanation,
    confidence,
    fetchNextStep,
    runAutoFillForNextStep,
    nextStep,
  } = useNextStep(agentId);

  const [expanded, setExpanded] = useState(defaultExpanded);

  const topConfidence = useMemo(() => {
    const v = confidence?.wizard_next_step;
    return typeof v === "number" ? Math.round(v * 100) : null;
  }, [confidence]);

  async function handleAutoFill() {
    await runAutoFillForNextStep();
    await onAfterAutoFill?.();
  }

  const stepLabel = nextStep ? badgeForStep(nextStep) : "…";
  const isReview = nextStep === "review";

  return (
    <div
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60 p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Sparkles className="h-4 w-4 text-teal-500" />
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Next Step:{" "}
              <span className="text-teal-600 dark:text-teal-300">{stepLabel}</span>
            </div>
            {topConfidence !== null && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-teal-500/30 text-teal-600 dark:text-teal-200 bg-teal-500/10">
                {topConfidence}% confidence
              </span>
            )}
            {isReview && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/30 text-emerald-600 dark:text-emerald-200 bg-emerald-500/10">
                Ready for review!
              </span>
            )}
          </div>

          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing wizard state…
              </span>
            ) : (
              explanation?.reason || "—"
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-2 flex-wrap">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            type="button"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          <button
            onClick={fetchNextStep}
            disabled={loading}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors"
            type="button"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleAutoFill}
            disabled={autofillLoading || loading || !nextStep || isReview}
            className="px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
            type="button"
          >
            {autofillLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Auto-filling…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Auto-fill this step
              </>
            )}
          </button>

          {onGoToStep && (
            <button
              onClick={() => nextStep && onGoToStep(nextStep)}
              disabled={!nextStep}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
              type="button"
            >
              Go to step
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-200">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Error</div>
                <div className="opacity-90">{error}</div>
              </div>
            </div>
            <button
              onClick={clearError}
              className="p-1 rounded hover:bg-red-500/10 transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Expanded content */}
      {expanded && explanation && (
        <div className="mt-4 space-y-4">
          {/* Blocking gaps */}
          {explanation.blocking_gaps?.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Blocking gaps ({explanation.blocking_gaps.length})
              </div>
              <div className="space-y-2">
                {explanation.blocking_gaps.map((g: GapItem, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-zinc-800 dark:text-zinc-100 text-sm">
                        {g.gap_type}
                      </div>
                      <span className={severityPill(g.severity)}>{g.severity}</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                      {g.impact}
                    </div>
                    <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                        Fix:
                      </span>{" "}
                      {g.recommended_fix}
                    </div>
                    <div className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 break-all font-mono">
                      {g.field_path}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Answer-to-PATCH inline form */}
          {showQuestions && explanation.questions?.length > 0 && (
            <NextStepAnswerPanel
              agentId={agentId}
              questions={explanation.questions}
              onAfterSubmit={async () => {
                await fetchNextStep();
                await onAfterAutoFill?.();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

"use client";

/**
 * NextStepAnswerPanel Component
 *
 * Inline form to answer next-step questions and patch JSONB modules.
 * Takes questions from next-step explanation, renders inputs, submits to answer-to-patch.
 *
 * @module components/agent-os/NextStepAnswerPanel
 */

import React, { useMemo, useState } from "react";
import { useAnswerToPatch } from "./hooks/useAnswerToPatch";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  X,
  Send,
  HelpCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface NextStepQuestion {
  id: string;
  question: string;
  field_path: string;
  expected: "text" | "choice";
  choices?: string[];
}

export interface NextStepAnswerPanelProps {
  /** The agent ID to patch */
  agentId: string;
  /** Questions from next-step explanation */
  questions: NextStepQuestion[];
  /** Callback after successful submission */
  onAfterSubmit?: () => Promise<void> | void;
  /** Optional className */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function NextStepAnswerPanel({
  agentId,
  questions,
  onAfterSubmit,
  className = "",
}: NextStepAnswerPanelProps) {
  const { loading, error, clearError, submitAnswers } =
    useAnswerToPatch(agentId);

  // Initialize values from questions
  const initial = useMemo(() => {
    const m: Record<string, unknown> = {};
    for (const q of questions) m[q.field_path] = "";
    return m;
  }, [questions]);

  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Count how many answers are filled
  const filledCount = Object.values(values).filter(
    (v) => v !== "" && v !== null && v !== undefined
  ).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg(null);
    clearError();

    const answers = Object.entries(values)
      .filter(([, v]) => v !== "" && v !== null && v !== undefined)
      .map(([field_path, value]) => ({ field_path, value }));

    if (!answers.length) return;

    await submitAnswers(answers);
    setSuccessMsg("Saved. Re-evaluating next step…");
    await onAfterSubmit?.();
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Answer these to unblock the next step
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              We'll patch the correct config module(s) automatically.
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || filledCount === 0}
          className="px-3 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Save answers
              {filledCount > 0 && (
                <span className="px-1.5 py-0.5 bg-teal-700 rounded text-xs">
                  {filledCount}
                </span>
              )}
            </>
          )}
        </button>
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
              type="button"
              onClick={clearError}
              className="p-1 rounded hover:bg-red-500/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="mt-3 rounded-lg border border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 p-3 text-sm text-teal-700 dark:text-teal-200 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Questions */}
      <div className="mt-4 space-y-3">
        {questions.map((q) => {
          const v = values[q.field_path];

          return (
            <div
              key={q.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3"
            >
              <div className="text-sm text-zinc-800 dark:text-zinc-100 font-medium">
                {q.question}
              </div>

              {q.expected === "choice" && q.choices?.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.choices.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setValues((prev) => ({ ...prev, [q.field_path]: c }))
                      }
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        v === c
                          ? "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-200 font-medium"
                          : "border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  value={typeof v === "string" ? v : ""}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [q.field_path]: e.target.value,
                    }))
                  }
                  placeholder="Type your answer…"
                  className="mt-2 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              )}

              <div className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 break-all font-mono">
                {q.field_path}
              </div>
            </div>
          );
        })}
      </div>
    </form>
  );
}

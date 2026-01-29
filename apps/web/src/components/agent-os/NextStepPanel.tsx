/**
 * Next-Step Panel v1
 *
 * Renders the "wizard brain" UI:
 * - Title/description from UI hints
 * - Questions (form inputs user must answer)
 * - Auto-actions (buttons for autopilot)
 * - Gaps and warnings
 * - Step readiness progress
 *
 * Aligned with NextStepExplain schema from @epic-ai/shared
 */

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import type {
  NextStepExplain,
  UserQuestion,
  AutoAction,
  StepReadiness,
  GapItem,
  WarningItem,
} from "@epic-ai/shared";
import { answerToPatchV1 } from "./answer-to-patch.v1";

// ============================================================================
// Types
// ============================================================================

interface Props {
  agentId: string;
  /** Called after any action succeeds (refetch snapshot, advance step, etc) */
  onDidAction?: () => void | Promise<void>;
}

interface FetchState {
  loading: boolean;
  error: string | null;
  data: NextStepExplain | null;
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchNextStep(agentId: string): Promise<NextStepExplain> {
  const res = await fetch(`/api/agent-os/agents/${agentId}/next-step`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to load next-step (${res.status})`);
  }

  const json = await res.json();

  if (!json.data) {
    throw new Error(json.error?.message ?? "No data returned");
  }

  return json.data as NextStepExplain;
}

async function runAction(
  action: AutoAction,
  body?: Record<string, unknown>
): Promise<unknown> {
  const init: RequestInit = {
    method: action.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? action.body ?? {}),
  };

  const res = await fetch(action.endpoint, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Action failed (${res.status}): ${text || action.endpoint}`);
  }

  return res.json().catch(() => ({}));
}

// ============================================================================
// Question Input Component
// ============================================================================

interface QuestionInputProps {
  question: UserQuestion;
  register: ReturnType<typeof useForm>["register"];
  setValue: ReturnType<typeof useForm>["setValue"];
  watch: ReturnType<typeof useForm>["watch"];
}

function QuestionInput({ question, register, setValue, watch }: QuestionInputProps) {
  const value = watch(question.question_id);

  if (question.input_type === "boolean") {
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            {...register(question.question_id)}
            onChange={(e) => setValue(question.question_id, e.target.checked)}
            checked={!!value}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm">{question.question}</span>
        </label>
        {question.why_needed && (
          <p className="text-xs text-gray-500 ml-6">{question.why_needed}</p>
        )}
      </div>
    );
  }

  if (question.input_type === "select" || question.input_type === "multiselect") {
    return (
      <div className="space-y-1">
        <label className="text-sm font-medium">{question.question}</label>
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          {...register(question.question_id, { required: question.required })}
          defaultValue=""
          multiple={question.input_type === "multiselect"}
        >
          <option value="" disabled>
            {question.placeholder ?? "Select one…"}
          </option>
          {(question.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value} title={opt.description}>
              {opt.label}
            </option>
          ))}
        </select>
        {question.why_needed && (
          <p className="text-xs text-gray-500">{question.why_needed}</p>
        )}
      </div>
    );
  }

  // Default: text or url
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{question.question}</label>
      <input
        type={question.input_type === "url" ? "url" : "text"}
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder={question.placeholder}
        {...register(question.question_id, { required: question.required })}
      />
      {question.why_needed && (
        <p className="text-xs text-gray-500">{question.why_needed}</p>
      )}
    </div>
  );
}

// ============================================================================
// Step Progress Component
// ============================================================================

interface StepProgressProps {
  stepReadiness: StepReadiness[];
  currentStep: string;
  progressPercent: number;
}

function StepProgress({ stepReadiness, currentStep, progressPercent }: StepProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Progress</span>
        <span>{progressPercent}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {stepReadiness.map((sr) => (
          <span
            key={sr.step}
            className={`text-xs px-2 py-0.5 rounded ${
              sr.step === currentStep
                ? "bg-blue-100 text-blue-700 font-medium"
                : sr.is_complete
                  ? "bg-green-100 text-green-700"
                  : sr.has_data
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-500"
            }`}
            title={sr.status_message}
          >
            {sr.step}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Gaps and Warnings Component
// ============================================================================

interface GapsWarningsProps {
  gaps: GapItem[];
  warnings: WarningItem[];
}

function GapsWarnings({ gaps, warnings }: GapsWarningsProps) {
  const highGaps = gaps.filter((g) => g.severity === "high");
  const otherGaps = gaps.filter((g) => g.severity !== "high");

  if (gaps.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {highGaps.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium text-red-600">Blocking Issues</div>
          <ul className="list-disc pl-5 space-y-1">
            {highGaps.slice(0, 4).map((g, idx) => (
              <li key={idx} className="text-sm text-red-700">
                <span className="font-medium">{g.gap_type}</span>: {g.impact}
                {g.recommended_fix && (
                  <span className="text-gray-600"> → {g.recommended_fix}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {otherGaps.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium text-yellow-600">Gaps</div>
          <ul className="list-disc pl-5 space-y-1">
            {otherGaps.slice(0, 4).map((g, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="font-medium">{g.gap_type}</span>: {g.impact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-medium text-orange-600">Warnings</div>
          <ul className="list-disc pl-5 space-y-1">
            {warnings.slice(0, 4).map((w, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                <span className="font-medium">{w.code}</span>: {w.message}
                {w.suggestion && (
                  <span className="text-gray-500"> ({w.suggestion})</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function NextStepPanel({ agentId, onDidAction }: Props) {
  const [state, setState] = React.useState<FetchState>({
    loading: true,
    error: null,
    data: null,
  });

  const [busyActionId, setBusyActionId] = React.useState<string | null>(null);
  const [autoFillBusy, setAutoFillBusy] = React.useState(false);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });
  const { register, handleSubmit, setValue, watch, reset } = form;

  // Load next-step data
  const load = React.useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetchNextStep(agentId);
      setState({ loading: false, error: null, data });

      // Reset form with default values for questions
      const defaults: Record<string, unknown> = {};
      for (const q of data.questions ?? []) {
        defaults[q.question_id] = q.input_type === "boolean" ? false : "";
      }
      reset(defaults);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load";
      setState({ loading: false, error: message, data: null });
    }
  }, [agentId, reset]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Execute an auto-action
  async function doAction(action: AutoAction, formValues?: Record<string, unknown>) {
    setBusyActionId(action.action_id);
    try {
      // Merge action body with form values for questions that map to known fields
      const body: Record<string, unknown> = { ...(action.body ?? {}) };

      // Map common question IDs to action body fields
      if (formValues) {
        const websiteUrl = formValues["company_website"];
        const templateKey = formValues["template_selection"];

        if (websiteUrl) body.websiteUrl = websiteUrl;
        if (templateKey) body.desiredTemplateKey = templateKey;
      }

      await runAction(action, body);
      await load();

      if (onDidAction) {
        await onDidAction();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed";
      console.error("Action failed:", e);
      // TODO: Replace with toast notification
      alert(message);
    } finally {
      setBusyActionId(null);
    }
  }

  // Auto-fill current step
  async function doAutoFill() {
    setAutoFillBusy(true);
    try {
      const res = await fetch(`/api/agent-os/agents/${agentId}/auto-fill-next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSeconds: 12 }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Auto-fill failed (${res.status}): ${text || "Unknown error"}`);
      }

      await load();

      if (onDidAction) {
        await onDidAction();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Auto-fill failed";
      console.error("Auto-fill failed:", e);
      // TODO: Replace with toast notification
      alert(message);
    } finally {
      setAutoFillBusy(false);
    }
  }

  // Form submission handler
  const onSubmit = handleSubmit(async (values) => {
    const data = state.data;
    if (!data) return;

    // Apply answers to module PATCH endpoints (if any questions answered)
    if ((data.questions?.length ?? 0) > 0) {
      const patched = await answerToPatchV1({
        agentId,
        questions: data.questions,
        values,
      });
      if (!patched.applied.ok) {
        console.warn("Some patches failed:", patched.applied.results);
      }
    }

    // Find the best action to run:
    // 1. Action matching primary CTA label
    // 2. First action in the list
    const primaryLabel = data.ui.primary_action.label.toLowerCase();
    const preferred =
      data.auto_actions.find((a) =>
        a.label.toLowerCase().includes(primaryLabel)
      ) ?? data.auto_actions[0];

    if (preferred) {
      await doAction(preferred, values);
    }
  });

  // Loading state
  if (state.loading) {
    return (
      <div className="rounded-lg border p-4">
        <div className="text-sm text-gray-600">Loading next step…</div>
      </div>
    );
  }

  // Error state
  if (state.error || !state.data) {
    return (
      <div className="rounded-lg border p-4">
        <div className="text-sm font-medium">Next step unavailable</div>
        <div className="mt-1 text-sm text-red-600">
          {state.error ?? "Unknown error"}
        </div>
        <button
          className="mt-3 rounded border px-3 py-2 text-sm hover:bg-gray-50"
          onClick={() => void load()}
        >
          Retry
        </button>
      </div>
    );
  }

  const data = state.data;
  const hasQuestions = (data.questions?.length ?? 0) > 0;
  const hasActions = (data.auto_actions?.length ?? 0) > 0;

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <div className="text-lg font-semibold">{data.ui.title}</div>
        <div className="text-sm text-gray-700">{data.ui.description}</div>
        <div className="text-xs text-gray-500">{data.reason_detail}</div>
      </div>

      {/* Progress */}
      <StepProgress
        stepReadiness={data.step_readiness}
        currentStep={data.next_step}
        progressPercent={data.ui.progress_percent}
      />

      {/* Blocked indicator */}
      {data.is_blocked && (
        <div className="rounded bg-red-50 border border-red-200 p-3">
          <div className="text-sm font-medium text-red-700">
            Blocked: Resolve issues below before continuing
          </div>
        </div>
      )}

      {/* Questions form */}
      {hasQuestions && (
        <form className="space-y-3" onSubmit={onSubmit}>
          {data.questions.map((q) => (
            <QuestionInput
              key={q.question_id}
              question={q}
              register={register}
              setValue={setValue}
              watch={watch}
            />
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-gray-800"
              disabled={!!busyActionId || data.ui.primary_action.disabled}
              title={data.ui.primary_action.disabled_reason}
            >
              {busyActionId ? "Working…" : data.ui.primary_action.label}
            </button>

            {data.ui.secondary_action && (
              <button
                type="button"
                className="rounded border px-4 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={!!busyActionId}
                onClick={() => void load()}
              >
                {data.ui.secondary_action.label}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Auto-actions */}
      {hasActions && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            {data.auto_actions.map((action) => (
              <button
                key={action.action_id}
                className="rounded border px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-50"
                disabled={!!busyActionId}
                onClick={() => void doAction(action, form.getValues())}
                title={action.description}
              >
                {busyActionId === action.action_id ? "Running…" : action.label}
              </button>
            ))}
          </div>
          {data.ui.show_autofill && (
            <>
              <button
                className="rounded border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700 disabled:opacity-50 hover:bg-blue-100"
                disabled={!!busyActionId || autoFillBusy}
                onClick={() => void doAutoFill()}
                title="Auto-fill this module with sensible defaults"
              >
                {autoFillBusy ? "Auto-filling…" : "Auto-fill Module"}
              </button>
              <div className="text-xs text-gray-500">
                Tip: Auto-fill is safe — it stops when user input is required.
              </div>
            </>
          )}
        </div>
      )}

      {/* Gaps and warnings */}
      <GapsWarnings gaps={data.gaps} warnings={data.warnings} />
    </div>
  );
}

export default NextStepPanel;

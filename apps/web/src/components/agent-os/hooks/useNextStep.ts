"use client";

/**
 * useNextStep Hook
 *
 * Fetches the next-step explanation for an agent and provides auto-fill actions.
 * Powers the NextStepBanner component for guided wizard experience.
 *
 * @module components/agent-os/hooks/useNextStep
 */

import { useCallback, useEffect, useState } from "react";

// ============================================================================
// Types
// ============================================================================

type Severity = "low" | "medium" | "high";

export type NextStepKey =
  | "company"
  | "template"
  | "tools"
  | "flow"
  | "knowledge"
  | "brain"
  | "personality"
  | "memory"
  | "learning"
  | "governance"
  | "economics"
  | "review";

export type GapItem = {
  gap_type: string;
  field_path: string;
  severity: Severity;
  impact: string;
  recommended_fix: string;
  question_to_user?: string;
  suggestions?: string[];
};

export type NextStepQuestion = {
  id: string;
  question: string;
  field_path: string;
  expected: "text" | "choice";
  choices?: string[];
};

export type NextStepExplanation = {
  next_step: NextStepKey;
  reason: string;
  blocking_gaps: GapItem[];
  recommended_actions: Array<
    | { type: "auto_fill"; step: NextStepKey; label?: string }
    | { type: "go_to"; step: NextStepKey; label?: string }
    | { type: "ask_user"; field_path: string; question: string; choices?: string[] }
  >;
  questions: NextStepQuestion[];
};

export type Envelope<T> = {
  data: T | null;
  confidence?: Record<string, number>;
  gaps?: GapItem[];
  warnings?: Array<{
    code: string;
    message: string;
    severity: "info" | "warning" | "error";
    field_path?: string;
  }>;
  error?: { code: string; message: string };
};

// ============================================================================
// Hook
// ============================================================================

export function useNextStep(agentId: string | null) {
  const [loading, setLoading] = useState(false);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<Envelope<NextStepExplanation> | null>(null);

  const fetchNextStep = useCallback(async () => {
    if (!agentId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/agent-os/agents/${agentId}/next-step`, {
        method: "GET",
      });
      const json = (await res.json()) as Envelope<NextStepExplanation>;

      if (!res.ok || json.error) {
        throw new Error(json?.error?.message || "Failed to load next step");
      }

      setResult(json);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load next step";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  const runAutoFillForNextStep = useCallback(async () => {
    if (!agentId) return;

    const step = result?.data?.next_step;
    if (!step) return;

    try {
      setAutofillLoading(true);
      setError(null);

      const res = await fetch(`/api/agent-os/agents/${agentId}/auto-fill-next-step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceStep: step }),
      });

      const json = await res.json();
      if (!res.ok || json?.error) {
        throw new Error(json?.error?.message || `Auto-fill failed for ${step}`);
      }

      // Refresh next-step after autofill
      await fetchNextStep();
      return json;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Auto-fill failed";
      setError(message);
      throw e;
    } finally {
      setAutofillLoading(false);
    }
  }, [agentId, result?.data?.next_step, fetchNextStep]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    if (!agentId) return;
    fetchNextStep();
  }, [agentId, fetchNextStep]);

  return {
    loading,
    autofillLoading,
    error,
    clearError,
    result,
    confidence: result?.confidence ?? {},
    gaps: result?.gaps ?? [],
    warnings: result?.warnings ?? [],
    nextStep: result?.data?.next_step ?? null,
    explanation: result?.data ?? null,
    fetchNextStep,
    runAutoFillForNextStep,
  };
}

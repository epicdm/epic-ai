"use client";

/**
 * useAutoFillStep Hook
 *
 * Generic hook to auto-fill a specific wizard step (knowledge, brain, personality, etc.)
 * Calls the auto-fill-next-step API with desiredStep parameter.
 *
 * @module components/agent-os/hooks/useAutoFillStep
 */

import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export type WizardStepKey =
  | "company"
  | "template"
  | "tools"
  | "flow"
  | "personality"
  | "brain"
  | "knowledge"
  | "memory"
  | "learning"
  | "governance"
  | "economics"
  | "review";

export interface AutoFillStepResult {
  agentId: string;
  did_save: boolean;
  saved_step?: string;
  saved_module?: string;
  wizard_snapshot?: Record<string, unknown>;
  next_step?: {
    next_step: string | null;
    is_done: boolean;
  };
  reason?: string;
}

export interface AutoFillStepResponse {
  data: AutoFillStepResult | null;
  meta?: {
    confidence?: Record<string, number>;
    gaps?: Array<{
      gap_type: string;
      field_path: string;
      severity: string;
      impact: string;
      recommended_fix: string;
    }>;
    warnings?: Array<{
      code: string;
      message: string;
      severity: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface UseAutoFillStepOptions {
  /** Called when the auto-fill completes successfully */
  onSuccess?: (result: AutoFillStepResult) => void;
  /** Called when the auto-fill fails */
  onError?: (error: string) => void;
}

export interface UseAutoFillStepReturn {
  /** Run auto-fill for a specific step */
  runAutoFill: (step: WizardStepKey) => Promise<AutoFillStepResult | null>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Last successful result */
  result: AutoFillStepResult | null;
  /** Confidence scores from last run */
  confidence: Record<string, number>;
  /** Gaps detected from last run */
  gaps: AutoFillStepResponse["meta"]["gaps"];
  /** Clear error state */
  clearError: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAutoFillStep(
  agentId: string,
  options?: UseAutoFillStepOptions
): UseAutoFillStepReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoFillStepResult | null>(null);
  const [confidence, setConfidence] = useState<Record<string, number>>({});
  const [gaps, setGaps] = useState<AutoFillStepResponse["meta"]["gaps"]>([]);

  /**
   * Run auto-fill for a specific step
   */
  const runAutoFill = useCallback(
    async (step: WizardStepKey): Promise<AutoFillStepResult | null> => {
      try {
        setLoading(true);
        setError(null);
        setResult(null);

        const res = await fetch(`/api/agent-os/agents/${agentId}/auto-fill-next-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            desiredStep: step,
            force: false,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          const errorMessage =
            errorData?.error?.message || `Auto-fill ${step} failed (${res.status})`;
          throw new Error(errorMessage);
        }

        const json: AutoFillStepResponse = await res.json();

        if (!json.data) {
          throw new Error(json.error?.message || "No data returned from auto-fill");
        }

        // Extract metadata
        if (json.meta?.confidence) {
          setConfidence(json.meta.confidence);
        }
        if (json.meta?.gaps) {
          setGaps(json.meta.gaps);
        }

        setResult(json.data);
        options?.onSuccess?.(json.data);

        return json.data;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "Unknown error";
        setError(errorMessage);
        options?.onError?.(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [agentId, options]
  );

  return {
    runAutoFill,
    loading,
    error,
    result,
    confidence,
    gaps,
    clearError: () => setError(null),
  };
}

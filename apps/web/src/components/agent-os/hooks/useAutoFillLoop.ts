"use client";

/**
 * useAutoFillLoop Hook
 *
 * Runs the auto-fill loop for the Agent OS wizard.
 * Uses Template Engine v1 fast path: template -> tools -> flow in one call.
 *
 * @module components/agent-os/hooks/useAutoFillLoop
 */

import { useState, useCallback } from "react";

// ============================================================================
// Types
// ============================================================================

export interface AutoFillLoopTrace {
  iteration: number;
  step: string;
  kind: string;
  ran: boolean;
  success: boolean;
  templateKey?: string | null;
  confidence?: number;
  reason?: string;
  duration_ms: number;
  autoApplied: boolean;
}

export interface AutoFillLoopResult {
  ok: boolean;
  steps_run: number;
  trace: AutoFillLoopTrace[];
  snapshot_after?: Record<string, unknown>;
  next_step_after?: {
    next_step: string | null;
    is_done: boolean;
  };
  stopped_because?: string;
}

export interface AutoFillLoopResponse {
  loop: AutoFillLoopResult | null;
  error?: {
    code: string;
    message: string;
  };
}

export interface UseAutoFillLoopOptions {
  /** Called when the loop completes successfully */
  onSuccess?: (result: AutoFillLoopResult) => void;
  /** Called when the loop fails */
  onError?: (error: string) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAutoFillLoop(agentId: string, options?: UseAutoFillLoopOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AutoFillLoopResult | null>(null);

  /**
   * Run the fast auto-fill loop (Template Engine v1)
   * Executes: template -> tools -> flow in one bounded call
   */
  const runAutoFillFast = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const res = await fetch(`/api/agent-os/agents/${agentId}/auto-fill-loop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxSteps: 3,
          bundleToolsFlow: true,
          useTemplateEngineV1: true, // Fast path: stores in governance_config
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData?.error?.message || `Auto-fill loop failed (${res.status})`;
        throw new Error(errorMessage);
      }

      const json: AutoFillLoopResponse = await res.json();

      if (!json.loop?.ok) {
        throw new Error(json.loop?.stopped_because || json.error?.message || "Auto-fill loop failed");
      }

      setResult(json.loop);
      options?.onSuccess?.(json.loop);

      return json.loop;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Unknown error";
      setError(errorMessage);
      options?.onError?.(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [agentId, options]);

  /**
   * Run auto-fill for a specific step only
   */
  const runAutoFillStep = useCallback(
    async (step: "template" | "tools" | "flow") => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/agent-os/agents/${agentId}/auto-fill-loop`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            maxSteps: 1,
            startStep: step,
            useTemplateEngineV1: step === "template",
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData?.error?.message || `Auto-fill ${step} failed`);
        }

        const json: AutoFillLoopResponse = await res.json();

        if (json.loop) {
          setResult(json.loop);
          options?.onSuccess?.(json.loop);
        }

        return json.loop;
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
    runAutoFillFast,
    runAutoFillStep,
    loading,
    error,
    result,
    /** Clear error state */
    clearError: () => setError(null),
  };
}

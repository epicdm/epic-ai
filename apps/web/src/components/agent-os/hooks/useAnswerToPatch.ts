"use client";

/**
 * useAnswerToPatch Hook
 *
 * Submits user answers to the answer-to-patch API endpoint.
 * The API infers which JSONB module to patch based on field_path.
 *
 * @module components/agent-os/hooks/useAnswerToPatch
 */

import { useCallback, useState } from "react";

// ============================================================================
// Types
// ============================================================================

export interface AnswerItem {
  field_path: string;
  value: unknown;
}

export interface PatchedModule {
  module: string;
  count: number;
}

export interface AnswerToPatchResult {
  agentId: string;
  patchedModules: PatchedModule[];
  plan: Array<{
    module: string;
    updates: Array<{ field_path: string; relativePath: string }>;
  }>;
}

export interface AnswerToPatchResponse {
  data: AnswerToPatchResult | null;
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
    field_path?: string;
  }>;
  error?: { code: string; message: string; details?: unknown };
}

export interface UseAnswerToPatchReturn {
  /** Submit answers to patch JSONB modules */
  submitAnswers: (answers: AnswerItem[]) => Promise<AnswerToPatchResponse>;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Clear error state */
  clearError: () => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useAnswerToPatch(agentId: string): UseAnswerToPatchReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAnswers = useCallback(
    async (answers: AnswerItem[]): Promise<AnswerToPatchResponse> => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/agent-os/agents/${agentId}/answer-to-patch`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          }
        );

        const json = (await res.json()) as AnswerToPatchResponse;

        if (!res.ok || json.error) {
          throw new Error(json?.error?.message || "Failed to apply answers");
        }

        return json;
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Failed to apply answers";
        setError(message);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [agentId]
  );

  const clearError = useCallback(() => setError(null), []);

  return { loading, error, clearError, submitAnswers };
}

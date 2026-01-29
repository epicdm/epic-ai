/**
 * useWizardSnapshot Hook
 *
 * Fetches the wizard snapshot for an agent and provides
 * step routing decision and status information.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import type { WizardStepId, StepRouteDecision, StepMetadata } from "../step-router";

interface StepWithStatus extends StepMetadata {
  status: "complete" | "incomplete" | "error";
  gapCount: number;
}

interface WizardSnapshotData {
  decision: StepRouteDecision;
  steps: StepWithStatus[];
  agentId: string;
  deploymentState: string;
}

interface UseWizardSnapshotResult {
  /** The snapshot data, null while loading or on error */
  data: WizardSnapshotData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch the snapshot */
  refetch: () => Promise<void>;
  /** The recommended next step */
  nextStepId: WizardStepId | null;
  /** All steps with their status */
  steps: StepWithStatus[];
  /** Whether the agent is ready for review (no gaps) */
  isReadyForReview: boolean;
  /** Overall completion percentage */
  completionPercent: number;
}

/**
 * Hook to fetch and manage wizard snapshot state
 *
 * @param agentId - The agent ID to fetch snapshot for
 * @param options - Configuration options
 */
export function useWizardSnapshot(
  agentId: string | null,
  options: {
    /** Auto-fetch on mount (default: true) */
    autoFetch?: boolean;
    /** Polling interval in ms (default: 0 = no polling) */
    pollingInterval?: number;
  } = {}
): UseWizardSnapshotResult {
  const { autoFetch = true, pollingInterval = 0 } = options;

  const [data, setData] = useState<WizardSnapshotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!agentId) {
      setError("No agent ID provided");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/agent-os/agents/${agentId}/next-step`);
      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || "Failed to fetch snapshot");
      }

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[useWizardSnapshot] Error:", message);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && agentId) {
      fetchSnapshot();
    }
  }, [autoFetch, agentId, fetchSnapshot]);

  // Polling
  useEffect(() => {
    if (pollingInterval > 0 && agentId) {
      const interval = setInterval(fetchSnapshot, pollingInterval);
      return () => clearInterval(interval);
    }
  }, [pollingInterval, agentId, fetchSnapshot]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSnapshot,
    nextStepId: data?.decision.nextStepId ?? null,
    steps: data?.steps ?? [],
    isReadyForReview: data?.decision.remainingGaps === 0,
    completionPercent: data?.decision.completionPercent ?? 0,
  };
}

/**
 * Hook to get step status for a specific step
 */
export function useStepStatus(
  agentId: string | null,
  stepId: WizardStepId
): {
  status: "complete" | "incomplete" | "error" | "loading";
  gapCount: number;
  confidence: number;
} {
  const { data, isLoading } = useWizardSnapshot(agentId);

  if (isLoading) {
    return { status: "loading", gapCount: 0, confidence: 0 };
  }

  const step = data?.steps.find((s) => s.id === stepId);
  if (!step) {
    return { status: "incomplete", gapCount: 0, confidence: 0 };
  }

  return {
    status: step.status,
    gapCount: step.gapCount,
    confidence: 0, // Would need confidence in step data
  };
}

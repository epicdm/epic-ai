/**
 * WizardEntryClient Component
 *
 * Client component that handles automatic redirect to the appropriate
 * wizard step based on gaps. This makes the wizard "drive itself".
 *
 * Flow:
 * 1. Fetch snapshot via /api/agent-os/agents/:id/next-step
 * 2. If user hasn't selected a specific step, redirect to nextStepId
 * 3. Apply focusPath to scroll to specific field
 */

"use client";

import React, { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWizardSnapshot } from "@/lib/agent-os/wizard";
import { applyFocusPathAfterPaint } from "@/lib/agent-os/wizard/focus";
import type { WizardStepId } from "@/lib/agent-os";

interface WizardEntryClientProps {
  /** The agent ID */
  agentId: string;
  /** Current step from URL/props (if user manually selected) */
  currentStep?: WizardStepId | null;
  /** Base URL for wizard steps (default: current path) */
  baseUrl?: string;
  /** Whether to auto-redirect (default: true) */
  autoRedirect?: boolean;
  /** Callback when redirect happens */
  onRedirect?: (stepId: WizardStepId, focusPath?: string) => void;
  /** Children to render (the wizard content) */
  children: React.ReactNode;
}

/**
 * WizardEntryClient wraps the wizard and handles auto-navigation.
 *
 * Usage:
 * ```tsx
 * <WizardEntryClient agentId={agentId} currentStep={step}>
 *   <WizardContent />
 * </WizardEntryClient>
 * ```
 */
export function WizardEntryClient({
  agentId,
  currentStep,
  baseUrl,
  autoRedirect = true,
  onRedirect,
  children,
}: WizardEntryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasRedirected = useRef(false);

  // Fetch the wizard snapshot
  const { data, isLoading, nextStepId } = useWizardSnapshot(agentId);

  // Check for focusPath in URL
  const focusPath = searchParams.get("focus") || searchParams.get("focusPath");

  // Handle auto-redirect to next step
  useEffect(() => {
    // Skip if:
    // - Auto-redirect disabled
    // - Still loading
    // - Already redirected this mount
    // - No snapshot data
    // - User has explicitly selected a step
    if (!autoRedirect || isLoading || hasRedirected.current || !data) {
      return;
    }

    // If user is on a specific step, don't redirect
    if (currentStep && currentStep !== "review") {
      return;
    }

    // If we have a next step recommendation, redirect
    if (nextStepId && nextStepId !== currentStep) {
      hasRedirected.current = true;

      const focusParam = data.decision.focusPath
        ? `?focus=${encodeURIComponent(data.decision.focusPath)}`
        : "";

      const targetUrl = baseUrl
        ? `${baseUrl}?step=${nextStepId}${focusParam ? `&${focusParam.slice(1)}` : ""}`
        : `?step=${nextStepId}${focusParam ? `&${focusParam.slice(1)}` : ""}`;

      onRedirect?.(nextStepId, data.decision.focusPath);
      router.replace(targetUrl);
    }
  }, [
    autoRedirect,
    isLoading,
    data,
    nextStepId,
    currentStep,
    baseUrl,
    router,
    onRedirect,
  ]);

  // Apply focus after navigation settles
  useEffect(() => {
    if (focusPath && !isLoading) {
      applyFocusPathAfterPaint(focusPath);
    }
  }, [focusPath, isLoading, currentStep]);

  return <>{children}</>;
}

/**
 * Hook to get wizard navigation state
 */
export function useWizardNavigation(agentId: string) {
  const { data, isLoading, error, refetch } = useWizardSnapshot(agentId);

  return {
    /** Whether the wizard is loading */
    isLoading,
    /** Error if any */
    error,
    /** The recommended next step */
    nextStepId: data?.decision.nextStepId ?? null,
    /** Reason for the recommendation */
    reason: data?.decision.reason ?? null,
    /** CTA text */
    cta: data?.decision.cta ?? null,
    /** Focus path for deep-linking */
    focusPath: data?.decision.focusPath ?? null,
    /** Remaining gaps count */
    remainingGaps: data?.decision.remainingGaps ?? 0,
    /** High severity gaps count */
    highSeverityCount: data?.decision.highSeverityCount ?? 0,
    /** Completion percentage */
    completionPercent: data?.decision.completionPercent ?? 0,
    /** All steps with status */
    steps: data?.steps ?? [],
    /** Deployment state */
    deploymentState: data?.deploymentState ?? null,
    /** Refetch snapshot */
    refetch,
  };
}

export default WizardEntryClient;

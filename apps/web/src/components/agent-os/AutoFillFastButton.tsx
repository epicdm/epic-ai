"use client";

/**
 * AutoFillFastButton Component
 *
 * One-click button to auto-fill template -> tools -> flow.
 * Uses Template Engine v1 fast path for bounded, intelligent setup.
 *
 * @module components/agent-os/AutoFillFastButton
 */

import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAutoFillLoop, type AutoFillLoopResult } from "./hooks/useAutoFillLoop";

// ============================================================================
// Types
// ============================================================================

export interface AutoFillFastButtonProps {
  /** The agent ID to auto-fill */
  agentId: string;
  /** Callback after successful auto-fill with updated snapshot and next step */
  onAfter?: (snapshot: Record<string, unknown> | undefined, nextStep: string | null) => void;
  /** Callback with full result for custom handling */
  onResult?: (result: AutoFillLoopResult) => void;
  /** Optional className for styling */
  className?: string;
  /** Button variant */
  variant?: "default" | "compact" | "outline";
  /** Disable the button */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AutoFillFastButton({
  agentId,
  onAfter,
  onResult,
  className = "",
  variant = "default",
  disabled = false,
}: AutoFillFastButtonProps) {
  const { runAutoFillFast, loading, error, result } = useAutoFillLoop(agentId, {
    onSuccess: (loopResult) => {
      const snapshot = loopResult.snapshot_after;
      const nextStep = loopResult.next_step_after?.next_step ?? null;
      onAfter?.(snapshot, nextStep);
      onResult?.(loopResult);
    },
  });

  // Button styling based on variant
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    default:
      "px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    compact:
      "px-3 py-1.5 rounded-md text-sm bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500",
    outline:
      "px-4 py-2 rounded-lg border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500",
  };

  // Success state (brief flash)
  const showSuccess = result?.ok && !loading;

  return (
    <div className="space-y-2">
      <button
        onClick={runAutoFillFast}
        disabled={loading || disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        title="Auto-configure template, tools, and flow based on company data"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Auto-Filling...</span>
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-300" />
            <span>Done!</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span>Auto-Fill Setup</span>
          </>
        )}
      </button>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-md">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success summary */}
      {showSuccess && result && (
        <div className="text-xs text-gray-500">
          Configured {result.steps_run} step{result.steps_run !== 1 ? "s" : ""} in{" "}
          {result.trace.reduce((sum, t) => sum + t.duration_ms, 0)}ms
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Variant (for inline use)
// ============================================================================

export function AutoFillFastButtonCompact(
  props: Omit<AutoFillFastButtonProps, "variant">
) {
  return <AutoFillFastButton {...props} variant="compact" />;
}

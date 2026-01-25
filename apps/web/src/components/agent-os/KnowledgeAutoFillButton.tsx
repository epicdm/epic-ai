"use client";

/**
 * KnowledgeAutoFillButton Component
 *
 * One-click button to auto-fill the knowledge config from company profile.
 * Extracts FAQs → quick_answers, services → knowledge sources, detects gaps.
 *
 * @module components/agent-os/KnowledgeAutoFillButton
 */

import { BookOpen, Loader2, AlertCircle, CheckCircle2, Lightbulb } from "lucide-react";
import { useAutoFillStep, type AutoFillStepResult } from "./hooks/useAutoFillStep";

// ============================================================================
// Types
// ============================================================================

export interface KnowledgeAutoFillButtonProps {
  /** The agent ID to auto-fill knowledge for */
  agentId: string;
  /** Callback after successful auto-fill */
  onAfter?: (result: AutoFillStepResult) => void;
  /** Optional className for styling */
  className?: string;
  /** Button variant */
  variant?: "default" | "compact" | "outline";
  /** Disable the button */
  disabled?: boolean;
  /** Show detailed results */
  showDetails?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function KnowledgeAutoFillButton({
  agentId,
  onAfter,
  className = "",
  variant = "default",
  disabled = false,
  showDetails = true,
}: KnowledgeAutoFillButtonProps) {
  const { runAutoFill, loading, error, result, confidence, gaps, clearError } =
    useAutoFillStep(agentId, {
      onSuccess: (stepResult) => {
        onAfter?.(stepResult);
      },
    });

  const handleClick = () => {
    clearError();
    runAutoFill("knowledge");
  };

  // Button styling based on variant
  const baseStyles =
    "inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    default:
      "px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
    compact:
      "px-3 py-1.5 rounded-md text-sm bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
    outline:
      "px-4 py-2 rounded-lg border-2 border-teal-600 text-teal-600 hover:bg-teal-50 focus:ring-teal-500",
  };

  // Success state
  const showSuccess = result?.did_save && !loading;
  const showNotSaved = result && !result.did_save && !loading;

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={`${baseStyles} ${variantStyles[variant]} ${className}`}
        title="Auto-generate knowledge config from company profile"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Building Knowledge...</span>
          </>
        ) : showSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-300" />
            <span>Knowledge Configured!</span>
          </>
        ) : (
          <>
            <BookOpen className="h-4 w-4" />
            <span>Auto-Fill Knowledge</span>
          </>
        )}
      </button>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to auto-fill knowledge</p>
            <p className="text-xs mt-1 text-red-500">{error}</p>
          </div>
        </div>
      )}

      {/* Not saved reason */}
      {showNotSaved && result.reason && (
        <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Knowledge not configured</p>
            <p className="text-xs mt-1 text-amber-500">{result.reason}</p>
          </div>
        </div>
      )}

      {/* Success details */}
      {showSuccess && showDetails && (
        <div className="space-y-2 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Knowledge config generated</span>
          </div>

          {/* Confidence scores */}
          {Object.keys(confidence).length > 0 && (
            <div className="text-xs text-teal-600 dark:text-teal-400">
              <span className="font-medium">Confidence: </span>
              {Object.entries(confidence)
                .map(([key, val]) => `${key}: ${Math.round(val * 100)}%`)
                .join(" · ")}
            </div>
          )}

          {/* Gaps detected */}
          {gaps && gaps.length > 0 && (
            <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-700">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                Gaps detected ({gaps.length}):
              </p>
              <ul className="text-xs text-amber-500 dark:text-amber-400 space-y-0.5">
                {gaps.slice(0, 3).map((gap, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-amber-400">•</span>
                    <span>{gap.recommended_fix || gap.impact}</span>
                  </li>
                ))}
                {gaps.length > 3 && (
                  <li className="text-amber-400 italic">
                    +{gaps.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Variant (for inline use)
// ============================================================================

export function KnowledgeAutoFillButtonCompact(
  props: Omit<KnowledgeAutoFillButtonProps, "variant" | "showDetails">
) {
  return <KnowledgeAutoFillButton {...props} variant="compact" showDetails={false} />;
}

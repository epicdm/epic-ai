"use client";

import { Sparkles, HelpCircle } from "lucide-react";
import { Tooltip, Badge } from "@heroui/react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { WhyExplanationModal } from "@/components/ui/why-explanation-modal";

export type AIBadgeType = "recommended" | "suggestion" | "popular" | "new";

export interface AIBadgeProps {
  /** Type of badge determining color and icon */
  type: AIBadgeType;
  /** Short reason for the recommendation (shown in tooltip) */
  reason?: string;
  /** Confidence score 0-100 (optional - shows dots if provided) */
  confidence?: number;
  /** Analysis data for WhyExplanationModal */
  analysisData?: {
    keyFactors: string[];
    dataPoints: { label: string; value: string | number }[];
  };
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Position style */
  position?: "corner" | "inline" | "tooltip";
  /** Additional CSS classes */
  className?: string;
}

/**
 * AI Badge Component
 *
 * Shows AI-powered recommendations with visual indicators.
 * Used throughout the app to highlight AI suggestions.
 *
 * @example
 * ```tsx
 * // Simple recommendation badge
 * <AIBadge type="recommended" reason="Best for B2B SaaS companies" />
 *
 * // With confidence indicator
 * <AIBadge
 *   type="recommended"
 *   reason="LinkedIn has 78% success rate for your industry"
 *   confidence={92}
 * />
 *
 * // Popular badge
 * <AIBadge type="popular" reason="Most used by similar companies" />
 * ```
 */
export function AIBadge({
  type,
  reason,
  confidence,
  analysisData,
  size = "md",
  position = "inline",
  className,
}: AIBadgeProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  // Determine badge styling based on type
  const getBadgeColor = () => {
    switch (type) {
      case "recommended":
        return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700";
      case "suggestion":
        return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700";
      case "popular":
        return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700";
      case "new":
        return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700";
    }
  };

  // Get badge label text
  const getLabel = () => {
    switch (type) {
      case "recommended":
        return "AI Recommended";
      case "suggestion":
        return "AI Suggestion";
      case "popular":
        return "Popular";
      case "new":
        return "New";
    }
  };

  // Render confidence dots (1-3 dots based on confidence %)
  const renderConfidenceDots = () => {
    if (!confidence) return null;

    const dotCount = confidence >= 90 ? 3 : confidence >= 75 ? 2 : 1;
    const dots = Array.from({ length: dotCount }, (_, i) => (
      <div
        key={i}
        className={cn(
          "w-1 h-1 rounded-full",
          type === "recommended"
            ? "bg-purple-600 dark:bg-purple-400"
            : type === "suggestion"
              ? "bg-blue-600 dark:bg-blue-400"
              : type === "popular"
                ? "bg-green-600 dark:bg-green-400"
                : "bg-orange-600 dark:bg-orange-400"
        )}
      />
    ));

    return (
      <div className="flex items-center gap-0.5 ml-1.5" title={`${confidence}% confidence`}>
        {dots}
      </div>
    );
  };

  // Size classes
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  // Position classes
  const positionClasses = {
    corner: "absolute top-2 right-2",
    inline: "inline-flex",
    tooltip: "inline-flex",
  };

  const badgeContent = (
    <div
      className={cn(
        "flex items-center gap-1 rounded-md border font-medium",
        getBadgeColor(),
        sizeClasses[size],
        positionClasses[position],
        className
      )}
      onClick={() => analysisData && setShowExplanation(true)}
    >
      <Sparkles className={cn("flex-shrink-0", size === "sm" ? "w-3 h-3" : "w-4 h-4")} />
      <span>{getLabel()}</span>
      {renderConfidenceDots()}
    </div>
  );

  // If no reason provided, just show the badge
  if (!reason) {
    return (
      <>
        {badgeContent}
        {analysisData && (
          <WhyExplanationModal
            isOpen={showExplanation}
            onClose={() => setShowExplanation(false)}
            title={`${type} Recommendation`}
            analysis={{
              ...analysisData,
              confidenceScore: confidence
            }}
          />
        )}
      </>
    );
  }

  // Wrap in tooltip if reason is provided
  return (
    <>
      <Tooltip content={reason}>
        <div className="inline-flex">{badgeContent}</div>
      </Tooltip>

      {analysisData && (
        <WhyExplanationModal
          isOpen={showExplanation}
          onClose={() => setShowExplanation(false)}
          title={`${type} Recommendation`}
          analysis={{
            ...analysisData,
            confidenceScore: confidence
          }}
        />
      )}
    </>
  );
}

/**
 * Compact AI Confidence Dots Component
 *
 * Shows only confidence dots without full badge.
 * Useful for compact views where space is limited.
 *
 * @example
 * ```tsx
 * <AIConfidenceDots confidence={95} />
 * ```
 */
export interface AIConfidenceDotsProps {
  /** Confidence score 0-100 */
  confidence: number;
  /** Color variant */
  variant?: "purple" | "blue" | "green" | "orange";
  /** Additional CSS classes */
  className?: string;
}

export function AIConfidenceDots({
  confidence,
  variant = "purple",
  className,
}: AIConfidenceDotsProps) {
  const dotCount = confidence >= 90 ? 3 : confidence >= 75 ? 2 : 1;

  const colorClasses = {
    purple: "bg-purple-600 dark:bg-purple-400",
    blue: "bg-blue-600 dark:bg-blue-400",
    green: "bg-green-600 dark:bg-green-400",
    orange: "bg-orange-600 dark:bg-orange-400",
  };

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      title={`${confidence}% confidence`}
    >
      {Array.from({ length: dotCount }, (_, i) => (
        <div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full", colorClasses[variant])}
        />
      ))}
    </div>
  );
}

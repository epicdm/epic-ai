"use client";

import { Progress, Badge } from "@heroui/react";
import { cn } from "@/lib/utils";

/**
 * AI Confidence Component
 *
 * Visual indicators showing how confident AI is in its recommendations.
 * Supports 3 visual styles: dots, badge, and progress bar.
 *
 * Confidence Levels:
 * - High: 90-100% (3 dots, green badge)
 * - Medium: 75-89% (2 dots, yellow badge)
 * - Low: 60-74% (1 dot, gray badge)
 *
 * @example
 * ```tsx
 * // Compact dots view
 * <AIConfidence score={92} variant="dots" />
 *
 * // Badge with label
 * <AIConfidence score={78} variant="badge" showPercentage />
 *
 * // Progress bar with details
 * <AIConfidence score={85} variant="bar" showPercentage />
 * ```
 */

export interface AIConfidenceProps {
  /** Confidence score 0-100 */
  score: number;
  /** Visual style variant */
  variant: "dots" | "badge" | "bar";
  /** Show exact percentage (default: false) */
  showPercentage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Determine confidence level from score
 */
function getConfidenceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 90) return "high";
  if (score >= 75) return "medium";
  return "low";
}

/**
 * Confidence Dots Component
 * Shows 1-3 dots based on confidence level
 */
function ConfidenceDots({ score, className }: { score: number; className?: string }) {
  const level = getConfidenceLevel(score);
  const dotCount = level === "high" ? 3 : level === "medium" ? 2 : 1;

  const dotColor = level === "high"
    ? "bg-green-600 dark:bg-green-400"
    : level === "medium"
    ? "bg-yellow-600 dark:bg-yellow-400"
    : "bg-gray-600 dark:bg-gray-400";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      title={`${score}% confidence`}
    >
      {Array.from({ length: dotCount }, (_, i) => (
        <div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full", dotColor)}
        />
      ))}
    </div>
  );
}

/**
 * Confidence Badge Component
 * Shows High/Medium/Low badge with color coding
 */
function ConfidenceBadge({
  score,
  showPercentage = false,
  className
}: {
  score: number;
  showPercentage?: boolean;
  className?: string;
}) {
  const level = getConfidenceLevel(score);

  const badgeColor = level === "high"
    ? "success"
    : level === "medium"
    ? "warning"
    : "default";

  const label = level === "high"
    ? "High Confidence"
    : level === "medium"
    ? "Medium Confidence"
    : "Low Confidence";

  return (
    <Badge
      color={badgeColor}
      variant="flat"
      className={className}
    >
      {label}
      {showPercentage && ` (${score}%)`}
    </Badge>
  );
}

/**
 * Confidence Progress Bar Component
 * Shows horizontal progress bar with percentage
 */
function ConfidenceBar({
  score,
  showPercentage = false,
  className
}: {
  score: number;
  showPercentage?: boolean;
  className?: string;
}) {
  const level = getConfidenceLevel(score);

  const progressColor = level === "high"
    ? "success"
    : level === "medium"
    ? "warning"
    : "default";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress
        value={score}
        color={progressColor}
        className="flex-1"
        size="sm"
        aria-label={`${score}% confidence`}
      />
      {showPercentage && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[3rem] text-right">
          {score}%
        </span>
      )}
    </div>
  );
}

/**
 * Main AIConfidence Component
 * Renders appropriate variant based on props
 */
export function AIConfidence({
  score,
  variant,
  showPercentage = false,
  className
}: AIConfidenceProps) {
  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  if (variant === "dots") {
    return <ConfidenceDots score={clampedScore} className={className} />;
  }

  if (variant === "badge") {
    return (
      <ConfidenceBadge
        score={clampedScore}
        showPercentage={showPercentage}
        className={className}
      />
    );
  }

  if (variant === "bar") {
    return (
      <ConfidenceBar
        score={clampedScore}
        showPercentage={showPercentage}
        className={className}
      />
    );
  }

  return null;
}

/**
 * Compact AIConfidenceDots Export
 * Convenience export for dots-only usage
 */
export function AIConfidenceDots({
  confidence,
  variant = "purple",
  className,
}: {
  confidence: number;
  variant?: "purple" | "blue" | "green" | "orange";
  className?: string;
}) {
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

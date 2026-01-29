import { cn } from "@/lib/utils";

type ConfidenceLevel = "high" | "medium" | "low" | "none";

function getLevel(score: number): ConfidenceLevel {
  if (score >= 90) return "high";
  if (score >= 70) return "medium";
  if (score >= 40) return "low";
  return "none";
}

const LEVEL_COLORS: Record<ConfidenceLevel, { bar: string; text: string; dot: string }> = {
  high: {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  medium: {
    bar: "bg-yellow-500",
    text: "text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  low: {
    bar: "bg-red-500",
    text: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
  none: {
    bar: "bg-gray-300 dark:bg-gray-600",
    text: "text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
  },
};

interface ConfidenceIndicatorProps {
  /** 0-100 */
  score: number;
  /** "bar" shows a horizontal progress bar, "dots" shows 1-3 filled dots, "badge" shows a text label */
  variant?: "bar" | "dots" | "badge";
  /** Show the numeric percentage */
  showPercentage?: boolean;
  className?: string;
}

export function ConfidenceIndicator({
  score,
  variant = "bar",
  showPercentage = true,
  className,
}: ConfidenceIndicatorProps) {
  const level = getLevel(score);
  const colors = LEVEL_COLORS[level];

  if (variant === "dots") {
    const filled = level === "high" ? 3 : level === "medium" ? 2 : level === "low" ? 1 : 0;
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full",
                i < filled ? colors.dot : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>
        {showPercentage && (
          <span className={cn("text-xs font-medium", colors.text)}>{score}%</span>
        )}
      </div>
    );
  }

  if (variant === "badge") {
    const label = level === "high" ? "High" : level === "medium" ? "Medium" : level === "low" ? "Low" : "None";
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          level === "high" && "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
          level === "medium" && "border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
          level === "low" && "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400",
          level === "none" && "border-gray-300 bg-gray-50 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400",
          className
        )}
      >
        {label}
        {showPercentage && ` (${score}%)`}
      </span>
    );
  }

  // bar variant (default)
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn("h-full rounded-full transition-all", colors.bar)}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
      {showPercentage && (
        <span className={cn("text-xs font-medium tabular-nums", colors.text)}>
          {score}%
        </span>
      )}
    </div>
  );
}

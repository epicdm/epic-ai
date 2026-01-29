import { cn } from "@/lib/utils";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import type { ReactNode } from "react";

export type GapSeverity = "low" | "medium" | "high";

interface GapAlertProps {
  /** The gap type or title */
  title: string;
  /** Optional description */
  description?: string;
  severity: GapSeverity;
  /** Optional right-side action */
  action?: ReactNode;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  GapSeverity,
  { border: string; bg: string; text: string; icon: typeof AlertTriangle; pillClass: string }
> = {
  high: {
    border: "border-red-200 dark:border-red-500/30",
    bg: "bg-red-50 dark:bg-red-500/10",
    text: "text-red-700 dark:text-red-300",
    icon: XCircle,
    pillClass:
      "border-red-500/40 text-red-600 bg-red-500/10 dark:text-red-300 dark:bg-red-500/10",
  },
  medium: {
    border: "border-yellow-200 dark:border-yellow-500/30",
    bg: "bg-yellow-50 dark:bg-yellow-500/10",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: AlertTriangle,
    pillClass:
      "border-yellow-500/40 text-yellow-600 bg-yellow-500/10 dark:text-yellow-300 dark:bg-yellow-500/10",
  },
  low: {
    border: "border-emerald-200 dark:border-emerald-500/30",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-700 dark:text-emerald-300",
    icon: Info,
    pillClass:
      "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 dark:text-emerald-300 dark:bg-emerald-500/10",
  },
};

export function GapAlert({
  title,
  description,
  severity,
  action,
  className,
}: GapAlertProps) {
  const config = SEVERITY_CONFIG[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        config.border,
        config.bg,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Icon className={cn("mt-0.5 h-4 w-4 flex-shrink-0", config.text)} />
          <div className="min-w-0">
            <div className={cn("text-sm font-medium", config.text)}>
              {title}
            </div>
            {description && (
              <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {description}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
              config.pillClass
            )}
          >
            {severity}
          </span>
          {action}
        </div>
      </div>
    </div>
  );
}

interface GapAlertListProps {
  gaps: Array<{
    gap_type: string;
    severity: GapSeverity;
    description?: string;
  }>;
  onFix?: (gapType: string) => void;
  className?: string;
}

/** Renders a vertical list of gap alerts sorted by severity */
export function GapAlertList({ gaps, onFix, className }: GapAlertListProps) {
  const order: Record<GapSeverity, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...gaps].sort((a, b) => order[a.severity] - order[b.severity]);

  if (sorted.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {sorted.map((g) => (
        <GapAlert
          key={g.gap_type}
          title={g.gap_type}
          description={g.description}
          severity={g.severity}
          action={
            onFix ? (
              <button
                onClick={() => onFix(g.gap_type)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Fix
              </button>
            ) : undefined
          }
        />
      ))}
    </div>
  );
}

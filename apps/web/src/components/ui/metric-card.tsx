import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MetricCardProps {
  /** Label above the value */
  label: string;
  /** The main metric value */
  value: ReactNode;
  /** Optional icon rendered in a gradient circle */
  icon?: ReactNode;
  /** Optional change text (e.g. "+12%") */
  change?: string;
  /** Whether the change is positive */
  changePositive?: boolean;
  /** Optional subtitle beneath the value */
  subtitle?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  icon,
  change,
  changePositive,
  subtitle,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-slate-900 dark:text-white">
          {value}
        </span>
        {change && (
          <span
            className={cn(
              "text-sm font-medium",
              changePositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface MetricCardGridProps {
  children: ReactNode;
  className?: string;
}

/** Responsive grid wrapper for metric cards */
export function MetricCardGrid({ children, className }: MetricCardGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  );
}

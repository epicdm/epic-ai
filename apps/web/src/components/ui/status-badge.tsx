import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type AgentStatus =
  | "DRAFT"
  | "CONFIGURING"
  | "READY"
  | "PUBLISHED"
  | "PAUSED"
  | "ARCHIVED"
  | "ERROR";

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; className: string }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300",
  },
  CONFIGURING: {
    label: "Configuring",
    className:
      "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-900/40 dark:text-blue-300",
  },
  READY: {
    label: "Ready",
    className:
      "border-teal-300 bg-teal-100 text-teal-700 dark:border-teal-600 dark:bg-teal-900/40 dark:text-teal-300",
  },
  PUBLISHED: {
    label: "Published",
    className:
      "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  PAUSED: {
    label: "Paused",
    className:
      "border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300",
  },
  ARCHIVED: {
    label: "Archived",
    className:
      "border-gray-300 bg-gray-100 text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400",
  },
  ERROR: {
    label: "Error",
    className:
      "border-red-300 bg-red-100 text-red-700 dark:border-red-600 dark:bg-red-900/40 dark:text-red-300",
  },
};

interface StatusBadgeProps {
  status: AgentStatus;
  className?: string;
  /** Show a pulsing dot for active statuses */
  showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = false,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  const isActive = status === "PUBLISHED" || status === "CONFIGURING";

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-medium",
        config.className,
        className
      )}
    >
      {showDot && isActive && (
        <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}

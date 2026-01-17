"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Switch,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
} from "@heroui/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  ArrowDown,
  Mail,
  Share2,
  MessageCircle,
  Phone,
  Calendar,
  Smartphone,
  GitBranch,
  UserCheck,
  Bell,
  Brain,
  Target,
  Flag,
  Play,
  Heart,
} from "lucide-react";
import {
  humanizeStep,
  TRIGGER_LABELS,
  ACTION_LABELS,
  getWorkflowSummary,
  getEstimatedDuration,
} from "@/lib/services/cross-channel/step-humanizer";
import { ChannelType } from "@epic-ai/database";

interface AutomationRun {
  id: string;
  status: string;
  triggerData: unknown;
  actionsExecuted: unknown;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  channel?: ChannelType;
  config?: Record<string, unknown>;
  branches?: Array<{
    condition: {
      field: string;
      operator: string;
      value: unknown;
    };
    nextStepId: string;
  }>;
  onSuccess?: string;
  onFailure?: string;
  delayMinutes?: number;
  useBrandVoice?: boolean;
}

interface Action {
  type: string;
  config: Record<string, unknown>;
}

interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  triggerConfig: unknown;
  conditions: Condition[] | null;
  actions: Action[];
  steps?: WorkflowStep[];
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  runs: AutomationRun[];
  channels?: string[];
  templateName?: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "SKIPPED":
      return <Clock className="w-4 h-4 text-gray-400" />;
    case "RUNNING":
      return <Spinner size="sm" />;
    default:
      return null;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "SUCCESS":
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "danger";
    case "SKIPPED":
      return "default";
    case "RUNNING":
      return "primary";
    default:
      return "default";
  }
};

/**
 * Get the appropriate Lucide icon component for a step
 */
const getStepIcon = (iconName: string) => {
  const iconMap: Record<string, typeof Mail> = {
    mail: Mail,
    share: Share2,
    "message-circle": MessageCircle,
    heart: Heart,
    phone: Phone,
    calendar: Calendar,
    smartphone: Smartphone,
    clock: Clock,
    "git-branch": GitBranch,
    "user-check": UserCheck,
    bell: Bell,
    brain: Brain,
    target: Target,
    flag: Flag,
    play: Play,
  };
  return iconMap[iconName] || Play;
};

/**
 * Get background color class based on step color
 */
const getStepColorClasses = (
  color: "blue" | "green" | "yellow" | "purple" | "orange" | "red" | "gray"
) => {
  const colorMap = {
    blue: {
      bg: "bg-blue-100 dark:bg-blue-900/30",
      icon: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    green: {
      bg: "bg-green-100 dark:bg-green-900/30",
      icon: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    yellow: {
      bg: "bg-yellow-100 dark:bg-yellow-900/30",
      icon: "text-yellow-600 dark:text-yellow-400",
      border: "border-yellow-200 dark:border-yellow-800",
    },
    purple: {
      bg: "bg-purple-100 dark:bg-purple-900/30",
      icon: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
    orange: {
      bg: "bg-orange-100 dark:bg-orange-900/30",
      icon: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800",
    },
    red: {
      bg: "bg-red-100 dark:bg-red-900/30",
      icon: "text-red-600 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
    },
    gray: {
      bg: "bg-gray-100 dark:bg-gray-800/50",
      icon: "text-gray-600 dark:text-gray-400",
      border: "border-gray-200 dark:border-gray-700",
    },
  };
  return colorMap[color] || colorMap.gray;
};

/**
 * Format duration in milliseconds to human readable
 */
const formatRunDuration = (ms: number | null): string => {
  if (!ms) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
};

/**
 * Format relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export function AutomationDetail({ automationId }: { automationId: string }) {
  const router = useRouter();
  const [automation, setAutomation] = useState<Automation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAutomation();
  }, [automationId]);

  async function fetchAutomation() {
    try {
      const response = await fetch(`/api/automations/${automationId}`);
      if (response.ok) {
        const data = await response.json();
        setAutomation(data);
      }
    } catch (error) {
      console.error("Error fetching automation:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAutomation() {
    try {
      const response = await fetch(`/api/automations/${automationId}/toggle`, {
        method: "POST",
      });
      if (response.ok) {
        fetchAutomation();
      }
    } catch (error) {
      console.error("Error toggling automation:", error);
    }
  }

  async function deleteAutomation() {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      const response = await fetch(`/api/automations/${automationId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.push("/dashboard/automations");
      }
    } catch (error) {
      console.error("Error deleting automation:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!automation) {
    return (
      <Card>
        <CardBody className="py-16 text-center">
          <p className="text-gray-500">Automation not found</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={automation.name}
        description={automation.description || TRIGGER_LABELS[automation.trigger]}
        actions={
          <div className="flex items-center gap-3">
            <Button
              as={Link}
              href="/dashboard/automations"
              variant="bordered"
              startContent={<ArrowLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            <Button
              color="danger"
              variant="bordered"
              startContent={<Trash2 className="w-4 h-4" />}
              onPress={deleteAutomation}
            >
              Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Visualization */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg font-semibold">Workflow</h2>
              {automation.steps && automation.steps.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{automation.steps.length} steps</span>
                  <span>~{getEstimatedDuration(automation.steps)}</span>
                </div>
              )}
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {/* Trigger */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {TRIGGER_LABELS[automation.trigger] || automation.trigger}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      When this happens, the workflow starts
                    </p>
                  </div>
                </div>

                {/* Conditions (if no steps but has conditions) */}
                {automation.conditions && automation.conditions.length > 0 && !automation.steps?.length && (
                  <>
                    <div className="flex justify-center py-1">
                      <ArrowDown className="w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-100 dark:border-yellow-800">
                        <p className="font-medium text-gray-900 dark:text-white mb-2">
                          Conditions
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {automation.conditions.map((c, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-yellow-600 dark:text-yellow-400">if</span>
                              <span className="font-mono bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">
                                {c.field}
                              </span>
                              <span>{c.operator}</span>
                              <span className="font-mono bg-yellow-100 dark:bg-yellow-900/50 px-1.5 py-0.5 rounded">
                                {String(c.value)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {/* Workflow Steps (if available) */}
                {automation.steps && automation.steps.length > 0 ? (
                  automation.steps.map((step, index) => {
                    const humanized = humanizeStep(step);
                    const colors = getStepColorClasses(humanized.color);
                    const IconComponent = getStepIcon(humanized.icon);

                    return (
                      <div key={step.id}>
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div
                            className={`flex-1 p-4 ${colors.bg} rounded-lg border ${colors.border}`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {humanized.title}
                              </p>
                              {humanized.channel && (
                                <Chip size="sm" variant="flat" className="ml-2">
                                  {humanized.channel}
                                </Chip>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {humanized.description}
                            </p>
                            {humanized.duration && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {humanized.duration}
                              </p>
                            )}
                            {humanized.branches && humanized.branches.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                  Branches:
                                </p>
                                <ul className="space-y-1">
                                  {humanized.branches.map((branch, bi) => (
                                    <li
                                      key={bi}
                                      className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2"
                                    >
                                      <GitBranch className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                      <span>
                                        <span className="text-gray-500">if</span>{" "}
                                        <span className="font-mono">{branch.condition}</span>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  /* Legacy Actions (fallback if no steps) */
                  (automation.actions || []).map((action, index) => {
                    const humanized = humanizeStep({
                      id: `action-${index}`,
                      name: ACTION_LABELS[action.type] || action.type,
                      action: action.type,
                      config: action.config,
                    });
                    const colors = getStepColorClasses(humanized.color);
                    const IconComponent = getStepIcon(humanized.icon);

                    return (
                      <div key={index}>
                        <div className="flex justify-center py-1">
                          <ArrowDown className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
                          >
                            <IconComponent className={`w-5 h-5 ${colors.icon}`} />
                          </div>
                          <div
                            className={`flex-1 p-4 ${colors.bg} rounded-lg border ${colors.border}`}
                          >
                            <p className="font-medium text-gray-900 dark:text-white">
                              {humanized.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {humanized.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardBody>
          </Card>

          {/* Run History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Run History</h2>
            </CardHeader>
            <CardBody className="p-0">
              {(!automation.runs || automation.runs.length === 0) ? (
                <div className="p-8 text-center text-gray-500">No runs yet</div>
              ) : (
                <Table aria-label="Run history">
                  <TableHeader>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Started</TableColumn>
                    <TableColumn>Duration</TableColumn>
                    <TableColumn>Details</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {(automation.runs || []).map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(run.status)}
                            <Chip
                              size="sm"
                              color={
                                getStatusColor(run.status) as
                                  | "success"
                                  | "danger"
                                  | "default"
                                  | "primary"
                              }
                              variant="flat"
                            >
                              {run.status}
                            </Chip>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(run.startedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {run.durationMs ? `${run.durationMs}ms` : "-"}
                        </TableCell>
                        <TableCell>
                          {run.error ? (
                            <span className="text-red-500 text-sm">
                              {run.error}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">
                              {run.actionsExecuted
                                ? `${(run.actionsExecuted as unknown[]).length} actions`
                                : "-"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Status</h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Enabled</span>
                <Switch
                  isSelected={automation.isActive}
                  onValueChange={toggleAutomation}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Total Runs</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {automation.runCount}
                </span>
              </div>
              {automation.lastRunAt && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Run</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Date(automation.lastRunAt).toLocaleDateString()}
                  </span>
                </div>
              )}
              {automation.lastRunStatus && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Status</span>
                  <Chip
                    size="sm"
                    color={
                      getStatusColor(automation.lastRunStatus) as
                        | "success"
                        | "danger"
                        | "default"
                        | "primary"
                    }
                    variant="flat"
                  >
                    {automation.lastRunStatus}
                  </Chip>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

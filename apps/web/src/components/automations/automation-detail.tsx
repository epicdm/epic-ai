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
  ArrowRight,
} from "lucide-react";

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
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  runs: AutomationRun[];
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
  MANUAL: "Manual Trigger",
};

const ACTION_LABELS: Record<string, string> = {
  create_lead: "Create Lead",
  update_lead: "Update Lead",
  update_lead_status: "Update Lead Status",
  add_lead_activity: "Add Activity",
  add_lead_tag: "Add Tag",
  send_notification: "Send Notification",
  webhook: "Call Webhook",
};

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
            <CardHeader>
              <h2 className="text-lg font-semibold">Workflow</h2>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {/* Trigger */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Trigger: {TRIGGER_LABELS[automation.trigger] || automation.trigger}
                    </p>
                  </div>
                </div>

                {/* Conditions */}
                {automation.conditions && automation.conditions.length > 0 && (
                  <>
                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                    </div>
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <p className="font-medium text-gray-900 dark:text-white mb-2">
                        Conditions
                      </p>
                      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {automation.conditions.map((c, i) => (
                          <li key={i}>
                            {c.field} {c.operator} {String(c.value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Actions */}
                {automation.actions.map((action, index) => (
                  <div key={index}>
                    <div className="flex justify-center">
                      <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {ACTION_LABELS[action.type] || action.type}
                        </p>
                        {action.config && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {JSON.stringify(action.config)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Run History */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Run History</h2>
            </CardHeader>
            <CardBody className="p-0">
              {automation.runs.length === 0 ? (
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
                    {automation.runs.map((run) => (
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

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
} from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Zap,
  Plus,
  PlayCircle,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Mail,
  Share2,
  Phone,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import {
  humanizeWorkflow,
  getEstimatedDuration,
  TRIGGER_LABELS as HUMANIZER_TRIGGERS,
} from "@/lib/services/cross-channel/step-humanizer";
import { ChannelType } from "@epic-ai/database";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
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

interface Template {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: unknown[];
  actions: unknown[];
  steps?: WorkflowStep[];
  channels?: string[];
  category?: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  ...HUMANIZER_TRIGGERS,
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
  MANUAL: "Manual Trigger",
};

// Channel icon and color mapping
const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  EMAIL: {
    icon: <Mail className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Email",
  },
  SOCIAL: {
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    label: "Social",
  },
  VOICE: {
    icon: <Phone className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    label: "Voice",
  },
  CHAT: {
    icon: <MessageCircle className="w-3 h-3" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    label: "Chat",
  },
  SMS: {
    icon: <Phone className="w-3 h-3" />,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    label: "SMS",
  },
};

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  LEAD_NURTURE: "primary",
  CUSTOMER_ONBOARDING: "success",
  RE_ENGAGEMENT: "warning",
  EVENT_PROMOTION: "secondary",
  SALES_OUTREACH: "primary",
  RETENTION: "success",
  FEEDBACK: "default",
  CUSTOM: "default",
};

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "SKIPPED":
      return <Clock className="w-4 h-4 text-gray-400" />;
    default:
      return null;
  }
};

export function AutomationsDashboard() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchAutomations();
    fetchTemplates();
  }, []);

  async function fetchAutomations() {
    try {
      const response = await fetch("/api/automations");
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array before setting state
        setAutomations(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching automations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTemplates() {
    try {
      const response = await fetch("/api/automations/templates");
      if (response.ok) {
        const data = await response.json();
        // Extract templates array from response object
        const templatesArray = data?.templates || data;
        setTemplates(Array.isArray(templatesArray) ? templatesArray : []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    }
  }

  async function toggleAutomation(id: string) {
    try {
      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: "POST",
      });
      if (response.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error("Error toggling automation:", error);
    }
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchAutomations();
      }
    } catch (error) {
      console.error("Error deleting automation:", error);
    }
  }

  async function createFromTemplate(template: Template) {
    try {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          name: template.name,
          description: template.description,
        }),
      });
      if (response.ok) {
        onClose();
        fetchAutomations();
      } else {
        const errorData = await response.json();
        console.error("Error creating automation:", errorData);
      }
    } catch (error) {
      console.error("Error creating automation:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automations"
        description="Create workflows that connect social media, voice calls, and leads."
        actions={
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onOpen}
          >
            Create Automation
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.length}
                </p>
                <p className="text-sm text-gray-500">Total Automations</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.filter((a) => a.isActive).length}
                </p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.reduce((sum, a) => sum + a.runCount, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Runs</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Automations List */}
      {automations.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Automations Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first automation to connect your social media, voice calls,
              and leads into a seamless workflow.
            </p>
            <Button color="primary" onPress={onOpen}>
              Create Your First Automation
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => (
            <Card key={automation.id}>
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        automation.isActive
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Zap
                        className={`w-5 h-5 ${
                          automation.isActive
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {automation.name}
                        </h3>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={automation.isActive ? "success" : "default"}
                        >
                          {automation.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {automation.description ||
                          TRIGGER_LABELS[automation.trigger] ||
                          automation.trigger}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(automation.lastRunStatus)}
                        <span>{automation.runCount} runs</span>
                      </div>
                      {automation.lastRunAt && (
                        <span>
                          Last: {new Date(automation.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        isSelected={automation.isActive}
                        onValueChange={() => toggleAutomation(automation.id)}
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        onPress={() => deleteAutomation(automation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        as={Link}
                        href={`/dashboard/automations/${automation.id}`}
                        isIconOnly
                        size="sm"
                        variant="light"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal with Rich Template Previews */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>Create Automation</span>
            <span className="text-sm font-normal text-gray-500">
              Choose a template to get started quickly
            </span>
          </ModalHeader>
          <ModalBody className="pb-6">
            <div className="space-y-4">
              {templates.map((template) => {
                const steps = template.steps || [];
                const humanizedSteps = humanizeWorkflow(steps);
                const estimatedDuration = getEstimatedDuration(steps);
                const channels = template.channels || [];
                const categoryColor = CATEGORY_COLORS[template.category || "CUSTOM"] || "default";

                return (
                  <Card
                    key={template.id}
                    className="border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
                  >
                    <CardBody className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                            <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {template.name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        {template.category && (
                          <Chip
                            size="sm"
                            variant="flat"
                            color={categoryColor as "primary" | "secondary" | "success" | "warning" | "default"}
                          >
                            {template.category.replace(/_/g, " ")}
                          </Chip>
                        )}
                      </div>

                      {/* Workflow Steps Preview */}
                      {humanizedSteps.length > 0 && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                            Workflow Steps
                          </p>
                          <div className="space-y-2">
                            {humanizedSteps.slice(0, 5).map((step, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                  {index + 1}
                                </span>
                                <span className="text-gray-700 dark:text-gray-300">
                                  {step.description}
                                </span>
                                {step.channel && (
                                  <Chip size="sm" variant="flat" className="ml-auto">
                                    {step.channel}
                                  </Chip>
                                )}
                              </div>
                            ))}
                            {humanizedSteps.length > 5 && (
                              <p className="text-xs text-gray-500 pl-7">
                                +{humanizedSteps.length - 5} more steps
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Metadata Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          {/* Channels */}
                          {channels.length > 0 && (
                            <Tooltip content="Channels used in this workflow">
                              <div className="flex items-center gap-1.5">
                                {channels.map((channel) => {
                                  const config = CHANNEL_CONFIG[channel];
                                  if (!config) return null;
                                  return (
                                    <span
                                      key={channel}
                                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
                                    >
                                      {config.icon}
                                      {config.label}
                                    </span>
                                  );
                                })}
                              </div>
                            </Tooltip>
                          )}

                          {/* Duration */}
                          {estimatedDuration !== "Instant" && (
                            <Tooltip content="Estimated workflow duration">
                              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                                <Clock className="w-4 h-4" />
                                {estimatedDuration}
                              </span>
                            </Tooltip>
                          )}

                          {/* Trigger */}
                          <Tooltip content="When this automation triggers">
                            <Chip size="sm" variant="flat">
                              {TRIGGER_LABELS[template.trigger] || template.trigger}
                            </Chip>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          color="primary"
                          onPress={() => createFromTemplate(template)}
                          startContent={<Sparkles className="w-4 h-4" />}
                        >
                          Use This Template
                        </Button>
                        <Button
                          variant="bordered"
                          as={Link}
                          href={`/dashboard/automations/new?template=${template.id}`}
                        >
                          Customize First
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}

              {/* Custom Automation Card */}
              <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                <CardBody className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Create Custom Automation
                        </h4>
                        <p className="text-sm text-gray-500 mt-0.5">
                          Build your own workflow from scratch with full control
                        </p>
                      </div>
                    </div>
                    <Button
                      as={Link}
                      href="/dashboard/automations/new"
                      variant="bordered"
                      endContent={<ChevronRight className="w-4 h-4" />}
                    >
                      Start Building
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

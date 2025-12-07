"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  _count: { runs: number };
}

interface Template {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: unknown[];
  actions: unknown[];
}

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
  MANUAL: "Manual Trigger",
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
        // Ensure data is an array before setting state
        setTemplates(Array.isArray(data) ? data : []);
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
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          conditions: template.conditions,
          actions: template.actions,
          isActive: false, // Start inactive
        }),
      });
      if (response.ok) {
        onClose();
        fetchAutomations();
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

      {/* Create Modal with Templates */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>Create Automation</ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start with a template or create from scratch.
            </p>

            <div className="space-y-3">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  isPressable
                  onPress={() => createFromTemplate(template)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <CardBody className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {template.name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {template.description}
                        </p>
                        <Chip size="sm" variant="flat" className="mt-2">
                          {TRIGGER_LABELS[template.trigger] || template.trigger}
                        </Chip>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardBody>
                </Card>
              ))}

              <Card
                isPressable
                as={Link}
                href="/dashboard/automations/new"
                className="border-dashed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <CardBody className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        Create Custom Automation
                      </h4>
                      <p className="text-sm text-gray-500">
                        Build from scratch with full control
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

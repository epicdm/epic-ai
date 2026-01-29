"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
  Select,
  SelectItem,
  Breadcrumbs,
  BreadcrumbItem,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FlowBuilder } from "./flow-builder";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  agentId: string | null;
  version: number;
  isPublished: boolean;
  agent: { id: string; name: string } | null;
}

interface Agent {
  id: string;
  name: string;
}

interface FlowEditorPageProps {
  flowId: string;
}

export function FlowEditorPage({ flowId }: FlowEditorPageProps) {
  const router = useRouter();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [flowName, setFlowName] = useState("");
  const [flowDescription, setFlowDescription] = useState("");
  const [flowAgentId, setFlowAgentId] = useState<string | null>(null);

  // Fetch flow details
  const fetchFlow = useCallback(async () => {
    try {
      const res = await fetch(`/api/voice/flows/${flowId}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Flow not found");
          router.push("/dashboard/voice/flows");
          return;
        }
        throw new Error("Failed to fetch flow");
      }
      const data = await res.json();
      setFlow(data.flow);
      setFlowName(data.flow.name);
      setFlowDescription(data.flow.description || "");
      setFlowAgentId(data.flow.agentId);
    } catch (error) {
      console.error("Error fetching flow:", error);
      toast.error("Failed to load flow");
    } finally {
      setLoading(false);
    }
  }, [flowId, router]);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/voice/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, []);

  useEffect(() => {
    fetchFlow();
    fetchAgents();
  }, [fetchFlow, fetchAgents]);

  // Save flow settings
  const handleSaveSettings = async () => {
    if (!flowName.trim()) {
      toast.error("Please enter a flow name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/voice/flows/${flowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: flowName,
          description: flowDescription || null,
          agentId: flowAgentId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save settings");
      }

      const data = await res.json();
      setFlow(data.flow);
      toast.success("Settings saved");
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  // Toggle publish
  const togglePublish = async () => {
    if (!flow) return;

    try {
      const res = await fetch(`/api/voice/flows/${flowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !flow.isPublished }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update publish status");
      }

      const data = await res.json();
      setFlow((prev) =>
        prev ? { ...prev, isPublished: data.flow.isPublished } : null
      );
      toast.success(data.message);
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update publish status"
      );
    }
  };

  // Get available agents
  const availableAgents = agents.filter(
    (agent) => agent.id === flow?.agentId || !flow?.agent
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!flow) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumbs>
        <BreadcrumbItem>
          <Link href="/dashboard/voice">Voice</Link>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <Link href="/dashboard/voice/flows">Flows</Link>
        </BreadcrumbItem>
        <BreadcrumbItem>{flow.name}</BreadcrumbItem>
      </Breadcrumbs>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {flow.name}
            </h1>
            {flow.isPublished ? (
              <Chip color="success" size="sm" variant="flat">
                Published
              </Chip>
            ) : (
              <Chip color="warning" size="sm" variant="flat">
                Draft
              </Chip>
            )}
            <Chip color="default" size="sm" variant="flat">
              v{flow.version}
            </Chip>
          </div>
          {flow.description && (
            <p className="text-gray-500 mt-1">{flow.description}</p>
          )}
          {flow.agent && (
            <p className="text-sm text-gray-500 mt-1">
              Agent: <strong>{flow.agent.name}</strong>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="flat" onPress={onOpen}>
            Settings
          </Button>
          <Button
            color={flow.isPublished ? "warning" : "success"}
            variant="flat"
            onPress={togglePublish}
          >
            {flow.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="light"
            onPress={() => router.push("/dashboard/voice/flows")}
          >
            Back to Flows
          </Button>
        </div>
      </div>

      {/* Flow Builder */}
      <FlowBuilder
        flowId={flowId}
        agentId={flow.agentId || undefined}
        onSave={(updatedFlow) => {
          setFlow((prev) =>
            prev
              ? {
                  ...prev,
                  version: updatedFlow.version,
                  name: updatedFlow.name,
                }
              : null
          );
        }}
      />

      {/* Settings Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Flow Settings</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Flow Name"
                value={flowName}
                onValueChange={setFlowName}
                isRequired
              />
              <Textarea
                label="Description"
                value={flowDescription}
                onValueChange={setFlowDescription}
                minRows={2}
              />
              <Select
                label="Linked Agent"
                placeholder="Select an agent"
                selectedKeys={flowAgentId ? [flowAgentId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setFlowAgentId(selected || null);
                }}
              >
                {agents.map((agent) => (
                  <SelectItem key={agent.id}>{agent.name}</SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleSaveSettings} isLoading={saving}>
              Save Settings
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default FlowEditorPage;

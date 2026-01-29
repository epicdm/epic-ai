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
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Select,
  SelectItem,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  publishedAt: string | null;
  nodesCount: number;
  edgesCount: number;
  agent: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
}

export function FlowManager() {
  const router = useRouter();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create flow modal
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [newFlowAgentId, setNewFlowAgentId] = useState<string | null>(null);

  // Delete confirmation modal
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure();
  const [flowToDelete, setFlowToDelete] = useState<Flow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch flows
  const fetchFlows = useCallback(async () => {
    try {
      const res = await fetch("/api/voice/flows");
      if (!res.ok) throw new Error("Failed to fetch flows");
      const data = await res.json();
      setFlows(data.flows);
    } catch (error) {
      console.error("Error fetching flows:", error);
      toast.error("Failed to load conversation flows");
    } finally {
      setLoading(false);
    }
  }, []);

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
    fetchFlows();
    fetchAgents();
  }, [fetchFlows, fetchAgents]);

  // Create new flow
  const handleCreate = async () => {
    if (!newFlowName.trim()) {
      toast.error("Please enter a flow name");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/voice/flows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFlowName,
          description: newFlowDescription || null,
          agentId: newFlowAgentId || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create flow");
      }

      const data = await res.json();
      toast.success("Flow created successfully");
      onClose();
      setNewFlowName("");
      setNewFlowDescription("");
      setNewFlowAgentId(null);

      // Navigate to the flow editor
      router.push(`/dashboard/voice/flows/${data.flow.id}`);
    } catch (error) {
      console.error("Error creating flow:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create flow"
      );
    } finally {
      setCreating(false);
    }
  };

  // Delete flow
  const handleDelete = async () => {
    if (!flowToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/voice/flows/${flowToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete flow");

      toast.success("Flow deleted successfully");
      setFlows((prev) => prev.filter((f) => f.id !== flowToDelete.id));
      onDeleteClose();
      setFlowToDelete(null);
    } catch (error) {
      console.error("Error deleting flow:", error);
      toast.error("Failed to delete flow");
    } finally {
      setDeleting(false);
    }
  };

  // Toggle publish status
  const togglePublish = async (flow: Flow) => {
    try {
      const res = await fetch(`/api/voice/flows/${flow.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: !flow.isPublished }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update publish status");
      }

      const data = await res.json();
      setFlows((prev) =>
        prev.map((f) =>
          f.id === flow.id
            ? { ...f, isPublished: data.flow.isPublished }
            : f
        )
      );
      toast.success(data.message);
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update publish status"
      );
    }
  };

  // Get available agents (without flows)
  const availableAgents = agents.filter(
    (agent) => !flows.some((f) => f.agent?.id === agent.id)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Conversation Flows
          </h1>
          <p className="text-gray-500 mt-1">
            Design visual conversation flows for your voice agents
          </p>
        </div>
        <Button color="primary" onPress={onOpen}>
          Create Flow
        </Button>
      </div>

      {/* Flows Grid */}
      {flows.length === 0 ? (
        <Card>
          <CardBody className="p-12 text-center">
            <div className="text-4xl mb-4">🔀</div>
            <h3 className="text-lg font-medium mb-2">No Conversation Flows</h3>
            <p className="text-gray-500 mb-4">
              Create your first visual conversation flow to guide how your voice
              agents handle calls.
            </p>
            <Button color="primary" onPress={onOpen}>
              Create Your First Flow
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flows.map((flow) => (
            <Card key={flow.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-0">
                <div className="flex items-start justify-between w-full">
                  <div>
                    <h3 className="text-lg font-semibold">{flow.name}</h3>
                    {flow.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                        {flow.description}
                      </p>
                    )}
                  </div>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button isIconOnly size="sm" variant="light">
                        ⋮
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem
                        key="edit"
                        onPress={() =>
                          router.push(`/dashboard/voice/flows/${flow.id}`)
                        }
                      >
                        Edit Flow
                      </DropdownItem>
                      <DropdownItem
                        key="publish"
                        onPress={() => togglePublish(flow)}
                      >
                        {flow.isPublished ? "Unpublish" : "Publish"}
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        className="text-danger"
                        color="danger"
                        onPress={() => {
                          setFlowToDelete(flow);
                          onDeleteOpen();
                        }}
                      >
                        Delete
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center gap-2">
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

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{flow.nodesCount} nodes</span>
                    <span>{flow.edgesCount} connections</span>
                  </div>

                  {/* Agent */}
                  {flow.agent ? (
                    <div className="text-sm">
                      <span className="text-gray-500">Agent: </span>
                      <span className="font-medium">{flow.agent.name}</span>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 italic">
                      No agent linked
                    </div>
                  )}

                  {/* Actions */}
                  <Button
                    color="primary"
                    variant="flat"
                    className="w-full mt-2"
                    onPress={() =>
                      router.push(`/dashboard/voice/flows/${flow.id}`)
                    }
                  >
                    Open Editor
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Create Flow Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalContent>
          <ModalHeader>Create Conversation Flow</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Flow Name"
                placeholder="e.g., Customer Support Flow"
                value={newFlowName}
                onValueChange={setNewFlowName}
                isRequired
              />
              <Textarea
                label="Description"
                placeholder="Describe what this flow does..."
                value={newFlowDescription}
                onValueChange={setNewFlowDescription}
                minRows={2}
              />
              <Select
                label="Link to Agent (Optional)"
                placeholder="Select an agent"
                selectedKeys={newFlowAgentId ? [newFlowAgentId] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string;
                  setNewFlowAgentId(selected || null);
                }}
              >
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id}>{agent.name}</SelectItem>
                ))}
              </Select>
              {availableAgents.length === 0 && agents.length > 0 && (
                <p className="text-sm text-gray-500">
                  All agents already have flows. You can link this flow to an
                  agent later.
                </p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleCreate} isLoading={creating}>
              Create Flow
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>Delete Flow</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete{" "}
              <strong>{flowToDelete?.name}</strong>? This action cannot be
              undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              Cancel
            </Button>
            <Button color="danger" onPress={handleDelete} isLoading={deleting}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default FlowManager;

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState("");
  const [newFlowDescription, setNewFlowDescription] = useState("");
  const [newFlowAgentId, setNewFlowAgentId] = useState<string | null>(null);

  // Delete confirmation modal
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
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
      setIsCreateOpen(false);
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
      setIsDeleteOpen(false);
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
        <Loader2 className="h-8 w-8 animate-spin" />
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
        <Button onClick={() => setIsCreateOpen(true)}>
          Create Flow
        </Button>
      </div>

      {/* Flows Grid */}
      {flows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="text-4xl mb-4">🔀</div>
            <h3 className="text-lg font-medium mb-2">No Conversation Flows</h3>
            <p className="text-gray-500 mb-4">
              Create your first visual conversation flow to guide how your voice
              agents handle calls.
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              Create Your First Flow
            </Button>
          </CardContent>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onSelect={() =>
                          router.push(`/dashboard/voice/flows/${flow.id}`)
                        }
                      >
                        Edit Flow
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => togglePublish(flow)}
                      >
                        {flow.isPublished ? "Unpublish" : "Publish"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => {
                          setFlowToDelete(flow);
                          setIsDeleteOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {flow.isPublished ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Draft
                      </Badge>
                    )}
                    <Badge variant="outline">
                      v{flow.version}
                    </Badge>
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
                    variant="secondary"
                    className="w-full mt-2"
                    onClick={() =>
                      router.push(`/dashboard/voice/flows/${flow.id}`)
                    }
                  >
                    Open Editor
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Flow Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Conversation Flow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Flow Name</Label>
              <Input
                placeholder="e.g., Customer Support Flow"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this flow does..."
                value={newFlowDescription}
                onChange={(e) => setNewFlowDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Link to Agent (Optional)</Label>
              <Select
                value={newFlowAgentId || ""}
                onValueChange={(value) => setNewFlowAgentId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {availableAgents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableAgents.length === 0 && agents.length > 0 && (
                <p className="text-sm text-gray-500">
                  All agents already have flows. You can link this flow to an
                  agent later.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              Create Flow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flow</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete{" "}
              <strong>{flowToDelete?.name}</strong>? This action cannot be
              undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FlowManager;

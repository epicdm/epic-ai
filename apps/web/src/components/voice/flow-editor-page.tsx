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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
      setIsSettingsOpen(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!flow) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/voice">Voice</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard/voice/flows">Flows</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{flow.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {flow.name}
            </h1>
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
          <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
            Settings
          </Button>
          <Button
            variant="secondary"
            onClick={togglePublish}
          >
            {flow.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/voice/flows")}
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
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flow Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Flow Name</Label>
              <Input
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={flowDescription}
                onChange={(e) => setFlowDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Linked Agent</Label>
              <Select
                value={flowAgentId || ""}
                onValueChange={(value) => setFlowAgentId(value || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FlowEditorPage;

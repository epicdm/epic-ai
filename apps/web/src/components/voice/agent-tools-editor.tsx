"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Settings,
  Globe,
  Code,
  Zap,
  Save,
  X,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

interface ToolParameter {
  type: string;
  description?: string;
  enum?: string[];
}

interface Tool {
  id?: string;
  name: string;
  description: string;
  type: "WEBHOOK" | "BUILTIN" | "FUNCTION";
  webhookUrl?: string | null;
  webhookMethod: string;
  webhookHeaders: Record<string, string>;
  authType?: string | null;
  authConfig: Record<string, unknown>;
  parameters: {
    type: "object";
    properties: Record<string, ToolParameter>;
  };
  requiredParams: string[];
  responseMapping: Record<string, unknown>;
  timeoutMs: number;
  retryCount: number;
  builtinType?: string | null;
  builtinConfig: Record<string, unknown>;
  isActive: boolean;
}

interface AgentToolsEditorProps {
  agentId: string;
  onToolsChange?: (tools: Tool[]) => void;
}

const defaultTool: Tool = {
  name: "",
  description: "",
  type: "WEBHOOK",
  webhookUrl: "",
  webhookMethod: "POST",
  webhookHeaders: {},
  authType: "none",
  authConfig: {},
  parameters: {
    type: "object",
    properties: {},
  },
  requiredParams: [],
  responseMapping: {},
  timeoutMs: 10000,
  retryCount: 1,
  builtinType: null,
  builtinConfig: {},
  isActive: true,
};

const builtinTools = [
  { value: "transfer_call", label: "Transfer Call", description: "Transfer the call to another number or agent" },
  { value: "end_call", label: "End Call", description: "End the current call gracefully" },
  { value: "send_sms", label: "Send SMS", description: "Send an SMS message to a phone number" },
  { value: "send_email", label: "Send Email", description: "Send an email to a specified address" },
  { value: "schedule_callback", label: "Schedule Callback", description: "Schedule a callback at a specified time" },
  { value: "lookup_crm", label: "CRM Lookup", description: "Look up customer information in the CRM" },
  { value: "create_lead", label: "Create Lead", description: "Create a new lead in the CRM system" },
  { value: "check_availability", label: "Check Availability", description: "Check calendar availability for scheduling" },
  { value: "book_appointment", label: "Book Appointment", description: "Book an appointment on the calendar" },
];

export function AgentToolsEditor({ agentId, onToolsChange }: AgentToolsEditorProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch tools on mount
  useEffect(() => {
    fetchTools();
  }, [agentId]);

  const fetchTools = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/voice/agents/${agentId}/tools`);
      if (!response.ok) throw new Error("Failed to fetch tools");
      const data = await response.json();
      setTools(data.tools || []);
      onToolsChange?.(data.tools || []);
    } catch (err) {
      console.error("Error fetching tools:", err);
      setError("Failed to load tools");
    } finally {
      setLoading(false);
    }
  };

  const handleAddTool = () => {
    setEditingTool({ ...defaultTool });
    setEditingIndex(null);
    setIsOpen(true);
  };

  const handleEditTool = (tool: Tool, index: number) => {
    setEditingTool({ ...tool });
    setEditingIndex(index);
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingTool(null);
    setEditingIndex(null);
  };

  const handleSaveTool = async () => {
    if (!editingTool) return;

    try {
      setSaving(true);
      setError(null);

      if (editingTool.id) {
        // Update existing tool
        const response = await fetch(`/api/voice/agents/${agentId}/tools/${editingTool.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingTool),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update tool");
        }

        const data = await response.json();
        const newTools = [...tools];
        if (editingIndex !== null) {
          newTools[editingIndex] = data.tool;
        }
        setTools(newTools);
        onToolsChange?.(newTools);
      } else {
        // Create new tool
        const response = await fetch(`/api/voice/agents/${agentId}/tools`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingTool),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create tool");
        }

        const data = await response.json();
        const newTools = [...tools, data.tool];
        setTools(newTools);
        onToolsChange?.(newTools);
      }

      handleCloseDialog();
    } catch (err) {
      console.error("Error saving tool:", err);
      setError(err instanceof Error ? err.message : "Failed to save tool");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTool = async (tool: Tool, index: number) => {
    if (!tool.id) return;
    if (!confirm(`Are you sure you want to delete "${tool.name}"?`)) return;

    try {
      const response = await fetch(`/api/voice/agents/${agentId}/tools/${tool.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete tool");

      const newTools = tools.filter((_, i) => i !== index);
      setTools(newTools);
      onToolsChange?.(newTools);
    } catch (err) {
      console.error("Error deleting tool:", err);
      setError("Failed to delete tool");
    }
  };

  const handleToggleActive = async (tool: Tool, index: number) => {
    if (!tool.id) return;

    try {
      const response = await fetch(`/api/voice/agents/${agentId}/tools/${tool.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tool.isActive }),
      });

      if (!response.ok) throw new Error("Failed to update tool");

      const data = await response.json();
      const newTools = [...tools];
      newTools[index] = data.tool;
      setTools(newTools);
      onToolsChange?.(newTools);
    } catch (err) {
      console.error("Error toggling tool:", err);
      setError("Failed to update tool");
    }
  };

  const updateEditingTool = (updates: Partial<Tool>) => {
    if (!editingTool) return;
    setEditingTool({ ...editingTool, ...updates });
  };

  const addParameter = () => {
    if (!editingTool) return;
    const paramName = `param_${Object.keys(editingTool.parameters.properties).length + 1}`;
    updateEditingTool({
      parameters: {
        ...editingTool.parameters,
        properties: {
          ...editingTool.parameters.properties,
          [paramName]: { type: "string", description: "" },
        },
      },
    });
  };

  const updateParameter = (oldName: string, newName: string, param: ToolParameter) => {
    if (!editingTool) return;
    const newProperties = { ...editingTool.parameters.properties };
    if (oldName !== newName) {
      delete newProperties[oldName];
    }
    newProperties[newName] = param;
    updateEditingTool({
      parameters: {
        ...editingTool.parameters,
        properties: newProperties,
      },
    });
  };

  const removeParameter = (name: string) => {
    if (!editingTool) return;
    const newProperties = { ...editingTool.parameters.properties };
    delete newProperties[name];
    updateEditingTool({
      parameters: {
        ...editingTool.parameters,
        properties: newProperties,
      },
      requiredParams: editingTool.requiredParams.filter((p) => p !== name),
    });
  };

  const toggleRequiredParam = (name: string) => {
    if (!editingTool) return;
    const isRequired = editingTool.requiredParams.includes(name);
    updateEditingTool({
      requiredParams: isRequired
        ? editingTool.requiredParams.filter((p) => p !== name)
        : [...editingTool.requiredParams, name],
    });
  };

  const getToolIcon = (type: string) => {
    switch (type) {
      case "WEBHOOK":
        return <Globe className="w-4 h-4" />;
      case "BUILTIN":
        return <Zap className="w-4 h-4" />;
      case "FUNCTION":
        return <Code className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Function Calling Tools</h3>
          <p className="text-sm text-muted-foreground">
            Configure tools the AI agent can use during calls
          </p>
        </div>
        <Button onClick={handleAddTool}>
          Add Tool
        </Button>
      </div>

      {error && (
        <Card className="bg-destructive/10 border border-destructive/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {tools.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-muted">
                <Settings className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">No tools configured</p>
                <p className="text-sm text-muted-foreground">
                  Add tools to enable function calling for this agent
                </p>
              </div>
              <Button variant="secondary" onClick={handleAddTool}>
                Add Your First Tool
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tools.map((tool, index) => (
            <Card key={tool.id || index} className={!tool.isActive ? "opacity-60" : ""}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getToolIcon(tool.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.name}</span>
                        <Badge variant={tool.type === "WEBHOOK" ? "default" : tool.type === "BUILTIN" ? "secondary" : "outline"}>
                          {tool.type}
                        </Badge>
                        {!tool.isActive && (
                          <Badge variant="secondary">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tool.isActive}
                      onCheckedChange={() => handleToggleActive(tool, index)}
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => handleEditTool(tool, index)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDeleteTool(tool, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tool Editor Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTool?.id ? "Edit Tool" : "Add New Tool"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {editingTool && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tool Name</Label>
                    <Input
                      placeholder="e.g., check_order_status"
                      value={editingTool.name}
                      onChange={(e) => updateEditingTool({ name: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">A unique identifier for this tool (no spaces)</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe what this tool does and when the AI should use it"
                      value={editingTool.description}
                      onChange={(e) => updateEditingTool({ description: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">The AI uses this to decide when to call the tool</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Tool Type</Label>
                    <Select
                      value={editingTool.type}
                      onValueChange={(val) => updateEditingTool({ type: val as "WEBHOOK" | "BUILTIN" | "FUNCTION" })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select tool type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEBHOOK">
                          Webhook - Call an external API
                        </SelectItem>
                        <SelectItem value="BUILTIN">
                          Built-in - Use a pre-configured action
                        </SelectItem>
                        <SelectItem value="FUNCTION">
                          Function - Custom code execution
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t" />

                {/* Type-specific configuration */}
                {editingTool.type === "WEBHOOK" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Webhook Configuration</h4>
                    <div className="space-y-2">
                      <Label>Webhook URL</Label>
                      <Input
                        placeholder="https://api.example.com/endpoint"
                        value={editingTool.webhookUrl || ""}
                        onChange={(e) => updateEditingTool({ webhookUrl: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>HTTP Method</Label>
                        <Select
                          value={editingTool.webhookMethod}
                          onValueChange={(val) => updateEditingTool({ webhookMethod: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="PATCH">PATCH</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Authentication</Label>
                        <Select
                          value={editingTool.authType || "none"}
                          onValueChange={(val) => updateEditingTool({ authType: val })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Authentication</SelectItem>
                            <SelectItem value="api_key">API Key</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="basic">Basic Auth</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Timeout (ms)</Label>
                        <Input
                          type="number"
                          value={String(editingTool.timeoutMs)}
                          onChange={(e) => updateEditingTool({ timeoutMs: parseInt(e.target.value) || 10000 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Retry Count</Label>
                        <Input
                          type="number"
                          value={String(editingTool.retryCount)}
                          onChange={(e) => updateEditingTool({ retryCount: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingTool.type === "BUILTIN" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Built-in Tool Selection</h4>
                    <div className="space-y-2">
                      <Label>Built-in Action</Label>
                      <Select
                        value={editingTool.builtinType || ""}
                        onValueChange={(val) => updateEditingTool({ builtinType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a built-in action" />
                        </SelectTrigger>
                        <SelectContent>
                          {builtinTools.map((tool) => (
                            <SelectItem key={tool.value} value={tool.value}>
                              {tool.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div className="border-t" />

                {/* Parameters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Parameters</h4>
                    <Button size="sm" variant="secondary" onClick={addParameter}>
                      Add Parameter
                    </Button>
                  </div>

                  {Object.entries(editingTool.parameters.properties).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No parameters defined. Add parameters that the AI will extract from the conversation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(editingTool.parameters.properties).map(([name, param]) => (
                        <Card key={name} className="bg-muted/50">
                          <CardContent className="py-3">
                            <div className="grid grid-cols-12 gap-3 items-start">
                              <div className="col-span-3 space-y-2">
                                <Label>Name</Label>
                                <Input
                                  value={name}
                                  onChange={(e) => updateParameter(name, e.target.value, param)}
                                />
                              </div>
                              <div className="col-span-2 space-y-2">
                                <Label>Type</Label>
                                <Select
                                  value={param.type}
                                  onValueChange={(val) =>
                                    updateParameter(name, name, { ...param, type: val })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="string">String</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                    <SelectItem value="array">Array</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="col-span-4 space-y-2">
                                <Label>Description</Label>
                                <Input
                                  value={param.description || ""}
                                  onChange={(e) =>
                                    updateParameter(name, name, { ...param, description: e.target.value })
                                  }
                                />
                              </div>
                              <div className="col-span-2 pt-8">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={editingTool.requiredParams.includes(name)}
                                    onCheckedChange={() => toggleRequiredParam(name)}
                                  />
                                  <Label className="text-sm">Required</Label>
                                </div>
                              </div>
                              <div className="col-span-1 pt-8">
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => removeParameter(name)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveTool}
              disabled={saving || !editingTool?.name || !editingTool?.description}
            >
              {editingTool?.id ? "Update Tool" : "Create Tool"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Accordion,
  AccordionItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Divider,
} from "@heroui/react";
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
  const { isOpen, onOpen, onClose } = useDisclosure();

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
    onOpen();
  };

  const handleEditTool = (tool: Tool, index: number) => {
    setEditingTool({ ...tool });
    setEditingIndex(index);
    onOpen();
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

      onClose();
      setEditingTool(null);
      setEditingIndex(null);
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
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Function Calling Tools</h3>
          <p className="text-sm text-default-500">
            Configure tools the AI agent can use during calls
          </p>
        </div>
        <Button color="primary" startContent={<Plus className="w-4 h-4" />} onPress={handleAddTool}>
          Add Tool
        </Button>
      </div>

      {error && (
        <Card className="bg-danger-50 border border-danger-200">
          <CardBody className="py-3">
            <div className="flex items-center gap-2 text-danger">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardBody>
        </Card>
      )}

      {tools.length === 0 ? (
        <Card>
          <CardBody className="py-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 rounded-full bg-default-100">
                <Settings className="w-8 h-8 text-default-400" />
              </div>
              <div>
                <p className="font-medium">No tools configured</p>
                <p className="text-sm text-default-500">
                  Add tools to enable function calling for this agent
                </p>
              </div>
              <Button color="primary" variant="flat" startContent={<Plus className="w-4 h-4" />} onPress={handleAddTool}>
                Add Your First Tool
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-3">
          {tools.map((tool, index) => (
            <Card key={tool.id || index} className={!tool.isActive ? "opacity-60" : ""}>
              <CardBody className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-default-100">
                      {getToolIcon(tool.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tool.name}</span>
                        <Chip size="sm" variant="flat" color={tool.type === "WEBHOOK" ? "primary" : tool.type === "BUILTIN" ? "secondary" : "success"}>
                          {tool.type}
                        </Chip>
                        {!tool.isActive && (
                          <Chip size="sm" variant="flat" color="default">
                            Disabled
                          </Chip>
                        )}
                      </div>
                      <p className="text-sm text-default-500 line-clamp-1">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      size="sm"
                      isSelected={tool.isActive}
                      onValueChange={() => handleToggleActive(tool, index)}
                    />
                    <Button
                      size="sm"
                      variant="flat"
                      isIconOnly
                      onPress={() => handleEditTool(tool, index)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isIconOnly
                      onPress={() => handleDeleteTool(tool, index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Tool Editor Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            {editingTool?.id ? "Edit Tool" : "Add New Tool"}
          </ModalHeader>
          <ModalBody>
            {editingTool && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <Input
                    label="Tool Name"
                    placeholder="e.g., check_order_status"
                    value={editingTool.name}
                    onValueChange={(value) => updateEditingTool({ name: value })}
                    description="A unique identifier for this tool (no spaces)"
                  />
                  <Textarea
                    label="Description"
                    placeholder="Describe what this tool does and when the AI should use it"
                    value={editingTool.description}
                    onValueChange={(value) => updateEditingTool({ description: value })}
                    description="The AI uses this to decide when to call the tool"
                  />
                  <Select
                    label="Tool Type"
                    selectedKeys={[editingTool.type]}
                    onSelectionChange={(keys) => {
                      const type = Array.from(keys)[0] as "WEBHOOK" | "BUILTIN" | "FUNCTION";
                      updateEditingTool({ type });
                    }}
                  >
                    <SelectItem key="WEBHOOK" startContent={<Globe className="w-4 h-4" />}>
                      Webhook - Call an external API
                    </SelectItem>
                    <SelectItem key="BUILTIN" startContent={<Zap className="w-4 h-4" />}>
                      Built-in - Use a pre-configured action
                    </SelectItem>
                    <SelectItem key="FUNCTION" startContent={<Code className="w-4 h-4" />}>
                      Function - Custom code execution
                    </SelectItem>
                  </Select>
                </div>

                <Divider />

                {/* Type-specific configuration */}
                {editingTool.type === "WEBHOOK" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Webhook Configuration</h4>
                    <Input
                      label="Webhook URL"
                      placeholder="https://api.example.com/endpoint"
                      value={editingTool.webhookUrl || ""}
                      onValueChange={(value) => updateEditingTool({ webhookUrl: value })}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="HTTP Method"
                        selectedKeys={[editingTool.webhookMethod]}
                        onSelectionChange={(keys) =>
                          updateEditingTool({ webhookMethod: Array.from(keys)[0] as string })
                        }
                      >
                        <SelectItem key="GET">GET</SelectItem>
                        <SelectItem key="POST">POST</SelectItem>
                        <SelectItem key="PUT">PUT</SelectItem>
                        <SelectItem key="PATCH">PATCH</SelectItem>
                        <SelectItem key="DELETE">DELETE</SelectItem>
                      </Select>
                      <Select
                        label="Authentication"
                        selectedKeys={[editingTool.authType || "none"]}
                        onSelectionChange={(keys) =>
                          updateEditingTool({ authType: Array.from(keys)[0] as string })
                        }
                      >
                        <SelectItem key="none">No Authentication</SelectItem>
                        <SelectItem key="api_key">API Key</SelectItem>
                        <SelectItem key="bearer">Bearer Token</SelectItem>
                        <SelectItem key="basic">Basic Auth</SelectItem>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        label="Timeout (ms)"
                        value={String(editingTool.timeoutMs)}
                        onValueChange={(value) => updateEditingTool({ timeoutMs: parseInt(value) || 10000 })}
                      />
                      <Input
                        type="number"
                        label="Retry Count"
                        value={String(editingTool.retryCount)}
                        onValueChange={(value) => updateEditingTool({ retryCount: parseInt(value) || 1 })}
                      />
                    </div>
                  </div>
                )}

                {editingTool.type === "BUILTIN" && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Built-in Tool Selection</h4>
                    <Select
                      label="Built-in Action"
                      selectedKeys={editingTool.builtinType ? [editingTool.builtinType] : []}
                      onSelectionChange={(keys) =>
                        updateEditingTool({ builtinType: Array.from(keys)[0] as string })
                      }
                    >
                      {builtinTools.map((tool) => (
                        <SelectItem key={tool.value} description={tool.description}>
                          {tool.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}

                <Divider />

                {/* Parameters */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Parameters</h4>
                    <Button size="sm" variant="flat" startContent={<Plus className="w-4 h-4" />} onPress={addParameter}>
                      Add Parameter
                    </Button>
                  </div>

                  {Object.entries(editingTool.parameters.properties).length === 0 ? (
                    <p className="text-sm text-default-500">
                      No parameters defined. Add parameters that the AI will extract from the conversation.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(editingTool.parameters.properties).map(([name, param]) => (
                        <Card key={name} className="bg-default-50">
                          <CardBody className="py-3">
                            <div className="grid grid-cols-12 gap-3 items-start">
                              <div className="col-span-3">
                                <Input
                                  size="sm"
                                  label="Name"
                                  value={name}
                                  onValueChange={(newName) => updateParameter(name, newName, param)}
                                />
                              </div>
                              <div className="col-span-2">
                                <Select
                                  size="sm"
                                  label="Type"
                                  selectedKeys={[param.type]}
                                  onSelectionChange={(keys) =>
                                    updateParameter(name, name, { ...param, type: Array.from(keys)[0] as string })
                                  }
                                >
                                  <SelectItem key="string">String</SelectItem>
                                  <SelectItem key="number">Number</SelectItem>
                                  <SelectItem key="boolean">Boolean</SelectItem>
                                  <SelectItem key="array">Array</SelectItem>
                                </Select>
                              </div>
                              <div className="col-span-4">
                                <Input
                                  size="sm"
                                  label="Description"
                                  value={param.description || ""}
                                  onValueChange={(value) =>
                                    updateParameter(name, name, { ...param, description: value })
                                  }
                                />
                              </div>
                              <div className="col-span-2 pt-6">
                                <Switch
                                  size="sm"
                                  isSelected={editingTool.requiredParams.includes(name)}
                                  onValueChange={() => toggleRequiredParam(name)}
                                >
                                  Required
                                </Switch>
                              </div>
                              <div className="col-span-1 pt-6">
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="danger"
                                  isIconOnly
                                  onPress={() => removeParameter(name)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button
              color="primary"
              startContent={<Save className="w-4 h-4" />}
              onPress={handleSaveTool}
              isLoading={saving}
              isDisabled={!editingTool?.name || !editingTool?.description}
            >
              {editingTool?.id ? "Update Tool" : "Create Tool"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

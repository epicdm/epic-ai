"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Select,
  SelectItem,
  Textarea,
  Spinner,
  Switch,
  Tabs,
  Tab,
} from "@heroui/react";
import { toast } from "sonner";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface AgentGroup {
  id: string;
  name: string;
  routingStrategy: string;
}

interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  targetAgentId: string | null;
  priority: number;
  conditions: Record<string, unknown>[];
  fallbackAction: string;
  fallbackAgentId: string | null;
  fallbackGroupId: string | null;
  maxWaitSeconds: number;
  scheduleEnabled: boolean;
  isActive: boolean;
  createdAt: string;
  group: AgentGroup | null;
  targetAgent: Agent | null;
  fallbackAgent: Agent | null;
}

const CONDITION_FIELDS = [
  { value: "caller_id", label: "Caller ID" },
  { value: "caller_name", label: "Caller Name" },
  { value: "time_of_day", label: "Time of Day" },
  { value: "day_of_week", label: "Day of Week" },
  { value: "intent", label: "Detected Intent" },
  { value: "skill_required", label: "Required Skill" },
  { value: "language", label: "Language" },
  { value: "custom", label: "Custom Field" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "starts_with", label: "Starts With" },
  { value: "ends_with", label: "Ends With" },
  { value: "in_list", label: "In List" },
  { value: "not_in_list", label: "Not In List" },
];

const FALLBACK_ACTIONS = [
  { value: "voicemail", label: "Send to Voicemail" },
  { value: "hangup", label: "Hang Up" },
  { value: "transfer", label: "Transfer to Fallback" },
  { value: "queue", label: "Keep in Queue" },
];

export default function RoutingRulesPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetType: "group" as "group" | "agent",
    groupId: "",
    targetAgentId: "",
    priority: 0,
    conditions: [] as { field: string; operator: string; value: string }[],
    fallbackAction: "voicemail",
    fallbackAgentId: "",
    maxWaitSeconds: 300,
    isActive: true,
  });

  const fetchRules = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/routing");
      if (!response.ok) throw new Error("Failed to fetch rules");
      const data = await response.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error("Error fetching rules:", error);
      toast.error("Failed to load routing rules");
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchRules(), fetchAgents(), fetchGroups()]).finally(() =>
      setLoading(false)
    );
  }, [fetchRules, fetchAgents, fetchGroups]);

  const handleCreateRule = async () => {
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    if (formData.targetType === "group" && !formData.groupId) {
      toast.error("Please select a target group");
      return;
    }

    if (formData.targetType === "agent" && !formData.targetAgentId) {
      toast.error("Please select a target agent");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/voice/routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          groupId: formData.targetType === "group" ? formData.groupId : null,
          targetAgentId: formData.targetType === "agent" ? formData.targetAgentId : null,
          priority: formData.priority,
          conditions: formData.conditions,
          fallbackAction: formData.fallbackAction,
          fallbackAgentId: formData.fallbackAgentId || null,
          maxWaitSeconds: formData.maxWaitSeconds,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create rule");
      }

      toast.success("Routing rule created successfully");
      onClose();
      resetForm();
      fetchRules();
    } catch (error) {
      console.error("Error creating rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create rule");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      targetType: "group",
      groupId: "",
      targetAgentId: "",
      priority: 0,
      conditions: [],
      fallbackAction: "voicemail",
      fallbackAgentId: "",
      maxWaitSeconds: 300,
      isActive: true,
    });
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/voice/routing/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      toast.success("Rule deleted successfully");
      fetchRules();
    } catch (error) {
      console.error("Error deleting rule:", error);
      toast.error("Failed to delete rule");
    }
  };

  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...formData.conditions,
        { field: "caller_id", operator: "equals", value: "" },
      ],
    });
  };

  const updateCondition = (index: number, field: string, value: string) => {
    const newConditions = [...formData.conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setFormData(prev => ({ ...prev, conditions: newConditions }));
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  const toggleRuleStatus = async (rule: RoutingRule) => {
    try {
      const response = await fetch(`/api/voice/routing/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (!response.ok) throw new Error("Failed to update rule");

      toast.success(`Rule ${rule.isActive ? "disabled" : "enabled"}`);
      fetchRules();
    } catch (error) {
      console.error("Error updating rule:", error);
      toast.error("Failed to update rule");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
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
            Routing Rules
          </h1>
          <p className="text-gray-500 mt-1">
            Configure how incoming calls are routed to agents
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/voice/groups">
            <Button variant="light">Manage Groups</Button>
          </Link>
          <Button color="primary" onPress={onOpen}>
            + Create Rule
          </Button>
        </div>
      </div>

      {/* Rules List */}
      {rules.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-4xl mb-4">🔀</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Routing Rules Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create rules to intelligently route incoming calls
            </p>
            <Button color="primary" onPress={onOpen}>
              Create Your First Rule
            </Button>
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules
            .sort((a, b) => b.priority - a.priority)
            .map((rule) => (
              <Card key={rule.id} className="hover:shadow-md transition-shadow">
                <CardBody className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link
                          href={`/dashboard/voice/routing/${rule.id}`}
                          className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary"
                        >
                          {rule.name}
                        </Link>
                        <Chip
                          size="sm"
                          color={rule.isActive ? "success" : "default"}
                          variant="flat"
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </Chip>
                        <Chip size="sm" variant="flat" color="primary">
                          Priority: {rule.priority}
                        </Chip>
                      </div>
                      {rule.description && (
                        <p className="text-gray-500 text-sm mb-3">
                          {rule.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        {rule.group && (
                          <span className="text-gray-600 dark:text-gray-400">
                            <strong>Target Group:</strong> {rule.group.name}
                          </span>
                        )}
                        {rule.targetAgent && (
                          <span className="text-gray-600 dark:text-gray-400">
                            <strong>Target Agent:</strong> {rule.targetAgent.name}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                          <strong>Fallback:</strong>{" "}
                          {FALLBACK_ACTIONS.find((a) => a.value === rule.fallbackAction)?.label}
                        </span>
                        {rule.conditions.length > 0 && (
                          <span className="text-gray-600 dark:text-gray-400">
                            <strong>{rule.conditions.length}</strong> condition(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        size="sm"
                        isSelected={rule.isActive}
                        onValueChange={() => toggleRuleStatus(rule)}
                      />
                      <Dropdown>
                        <DropdownTrigger>
                          <Button size="sm" variant="light" isIconOnly>
                            ⋮
                          </Button>
                        </DropdownTrigger>
                        <DropdownMenu>
                          <DropdownItem
                            key="edit"
                            href={`/dashboard/voice/routing/${rule.id}`}
                          >
                            Edit Rule
                          </DropdownItem>
                          <DropdownItem
                            key="delete"
                            className="text-danger"
                            color="danger"
                            onPress={() => handleDeleteRule(rule.id)}
                          >
                            Delete Rule
                          </DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
        </div>
      )}

      {/* Create Rule Modal */}
      <Modal size="3xl" isOpen={isOpen} onClose={onClose} scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Create Routing Rule</ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <Input
                  label="Rule Name"
                  placeholder="e.g., VIP Customers, Business Hours"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  isRequired
                />

                <Textarea
                  label="Description"
                  placeholder="Describe when this rule should apply..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />

                <Input
                  type="number"
                  label="Priority"
                  description="Higher priority rules are evaluated first"
                  min={0}
                  max={100}
                  value={formData.priority.toString()}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>

              {/* Target */}
              <div className="space-y-4">
                <h3 className="font-medium">Route To</h3>
                <Tabs
                  selectedKey={formData.targetType}
                  onSelectionChange={(key) =>
                    setFormData(prev => ({ ...prev, targetType: key as "group" | "agent" }))
                  }
                >
                  <Tab key="group" title="Agent Group">
                    <Select
                      label="Select Group"
                      placeholder="Choose a group"
                      selectedKeys={formData.groupId ? [formData.groupId] : []}
                      onSelectionChange={(keys) => {
                        console.log("[DEBUG] Group Select onSelectionChange - keys:", keys, "type:", typeof keys, "size:", keys instanceof Set ? keys.size : 'not a Set');
                        const selected = Array.from(keys)[0] as string;
                        console.log("[DEBUG] Group Select - selected value:", selected);
                        setFormData(prev => {
                          console.log("[DEBUG] Group Select - prev groupId:", prev.groupId, "new groupId:", selected || "");
                          return { ...prev, groupId: selected || "" };
                        });
                      }}
                      className="mt-4"
                    >
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name} ({group.routingStrategy.replace(/_/g, " ")})
                        </SelectItem>
                      ))}
                    </Select>
                  </Tab>
                  <Tab key="agent" title="Specific Agent">
                    <Select
                      label="Select Agent"
                      placeholder="Choose an agent"
                      selectedKeys={formData.targetAgentId ? [formData.targetAgentId] : []}
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0] as string;
                        setFormData(prev => ({ ...prev, targetAgentId: selected || "" }));
                      }}
                      className="mt-4"
                    >
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} {!agent.isActive && "(Inactive)"}
                        </SelectItem>
                      ))}
                    </Select>
                  </Tab>
                </Tabs>
              </div>

              {/* Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Conditions (Optional)</h3>
                  <Button size="sm" variant="flat" onPress={addCondition}>
                    + Add Condition
                  </Button>
                </div>

                {formData.conditions.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No conditions set. Rule will always match.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {formData.conditions.map((condition, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Select
                          size="sm"
                          selectedKeys={[condition.field]}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string;
                            if (selected) updateCondition(index, "field", selected);
                          }}
                          className="w-40"
                        >
                          {CONDITION_FIELDS.map((f) => (
                            <SelectItem key={f.value} value={f.value}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </Select>
                        <Select
                          size="sm"
                          selectedKeys={[condition.operator]}
                          onSelectionChange={(keys) => {
                            const selected = Array.from(keys)[0] as string;
                            if (selected) updateCondition(index, "operator", selected);
                          }}
                          className="w-36"
                        >
                          {CONDITION_OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </Select>
                        <Input
                          size="sm"
                          placeholder="Value"
                          value={condition.value}
                          onChange={(e) => updateCondition(index, "value", e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          isIconOnly
                          onPress={() => removeCondition(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fallback */}
              <div className="space-y-4">
                <h3 className="font-medium">Fallback Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Fallback Action"
                    selectedKeys={[formData.fallbackAction]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      if (selected) setFormData(prev => ({ ...prev, fallbackAction: selected }));
                    }}
                  >
                    {FALLBACK_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </Select>

                  <Input
                    type="number"
                    label="Max Wait Time (seconds)"
                    min={0}
                    max={3600}
                    value={formData.maxWaitSeconds.toString()}
                    onChange={(e) =>
                      setFormData(prev => ({
                        ...prev,
                        maxWaitSeconds: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                {formData.fallbackAction === "transfer" && (
                  <Select
                    label="Fallback Agent"
                    placeholder="Select fallback agent"
                    selectedKeys={formData.fallbackAgentId ? [formData.fallbackAgentId] : []}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0] as string;
                      setFormData(prev => ({ ...prev, fallbackAgentId: selected || "" }));
                    }}
                  >
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <Switch
                  isSelected={formData.isActive}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
                >
                  Rule Active
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleCreateRule} isLoading={saving}>
              Create Rule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

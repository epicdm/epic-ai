"use client";

import { useState, useEffect, useCallback, use } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
  description: string | null;
}

interface AgentGroup {
  id: string;
  name: string;
  routingStrategy: string;
  isActive: boolean;
  _count?: { members: number };
}

interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  groupId: string | null;
  targetAgentId: string | null;
  priority: number;
  conditions: { field: string; operator: string; value: string }[];
  fallbackAction: string;
  fallbackAgentId: string | null;
  fallbackGroupId: string | null;
  announcementMessage: string | null;
  holdMusic: string | null;
  maxWaitSeconds: number;
  scheduleEnabled: boolean;
  schedule: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  group: AgentGroup | null;
  targetAgent: Agent | null;
  fallbackAgent: Agent | null;
  fallbackGroup: AgentGroup | null;
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

export const dynamic = 'force-dynamic';

export default function EditRoutingRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [rule, setRule] = useState<RoutingRule | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    fallbackGroupId: "",
    announcementMessage: "",
    holdMusic: "",
    maxWaitSeconds: 300,
    scheduleEnabled: false,
    isActive: true,
  });

  const fetchRule = useCallback(async () => {
    try {
      const response = await fetch(`/api/voice/routing/${id}`);
      if (!response.ok) throw new Error("Failed to fetch rule");
      const data = await response.json();
      const r = data.rule as RoutingRule;
      setRule(r);
      setFormData({
        name: r.name,
        description: r.description || "",
        targetType: r.groupId ? "group" : "agent",
        groupId: r.groupId || "",
        targetAgentId: r.targetAgentId || "",
        priority: r.priority,
        conditions: r.conditions || [],
        fallbackAction: r.fallbackAction,
        fallbackAgentId: r.fallbackAgentId || "",
        fallbackGroupId: r.fallbackGroupId || "",
        announcementMessage: r.announcementMessage || "",
        holdMusic: r.holdMusic || "",
        maxWaitSeconds: r.maxWaitSeconds,
        scheduleEnabled: r.scheduleEnabled,
        isActive: r.isActive,
      });
    } catch (error) {
      console.error("Error fetching rule:", error);
      toast.error("Failed to load routing rule");
    }
  }, [id]);

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
    Promise.all([fetchRule(), fetchAgents(), fetchGroups()]).finally(() =>
      setLoading(false)
    );
  }, [fetchRule, fetchAgents, fetchGroups]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Rule name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/voice/routing/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          groupId: formData.targetType === "group" ? formData.groupId || null : null,
          targetAgentId: formData.targetType === "agent" ? formData.targetAgentId || null : null,
          priority: formData.priority,
          conditions: formData.conditions,
          fallbackAction: formData.fallbackAction,
          fallbackAgentId: formData.fallbackAgentId || null,
          fallbackGroupId: formData.fallbackGroupId || null,
          announcementMessage: formData.announcementMessage || null,
          holdMusic: formData.holdMusic || null,
          maxWaitSeconds: formData.maxWaitSeconds,
          scheduleEnabled: formData.scheduleEnabled,
          isActive: formData.isActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update rule");
      }

      toast.success("Routing rule updated successfully");
      fetchRule();
    } catch (error) {
      console.error("Error updating rule:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update rule");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this rule? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/voice/routing/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete rule");

      toast.success("Rule deleted successfully");
      router.push("/dashboard/voice/routing");
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
    setFormData({ ...formData, conditions: newConditions });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!rule) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Rule Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The routing rule you're looking for doesn't exist.
          </p>
          <Link href="/dashboard/voice/routing">
            <Button >Back to Rules</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/voice/routing"
              className="text-gray-500 hover:text-gray-700"
            >
              Routing Rules
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-white">{rule.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Routing Rule
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Basic Information</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Rule Name"
              placeholder="e.g., VIP Customers"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              isRequired
            />

            <Input
              type="number"
              label="Priority"
              
              min={0}
              max={100}
              value={formData.priority.toString()}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })
              }
            />
          </div>

          <Textarea
            label="Description"
            placeholder="Describe when this rule should apply..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex items-center gap-4">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(value) => setFormData({ ...formData, isActive: value })}
            >
              Rule Active
            </Switch>
          </div>
        </CardContent>
      </Card>

      {/* Target */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Route To</h2>
        </CardHeader>
        <CardContent>
          <Tabs
            selectedKey={formData.targetType}
            onSelectionChange={(key) =>
              setFormData({ ...formData, targetType: key as "group" | "agent" })
            }
          >
            <TabsTrigger value="group">
              <div className="mt-4">
                <Select
                  label="Select Group"
                  placeholder="Choose a group"
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                >
                  {groups.map((group) => (
                    <SelectItem key={group.id}>
                      {group.name} ({group.routingStrategy.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </Select>
                {groups.length === 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    No groups available.{" "}
                    <Link href="/dashboard/voice/groups" className="text-primary">
                      Create a group first.
                    </Link>
                  </p>
                )}
              </div>
            </TabsTrigger>
            <TabsTrigger value="agent">
              <div className="mt-4">
                <Select
                  label="Select Agent"
                  placeholder="Choose an agent"
                  value={formData.targetAgentId}
                  onChange={(e) => setFormData({ ...formData, targetAgentId: e.target.value })}
                >
                  {agents.map((agent) => (
                    <SelectItem key={agent.id}>
                      {agent.name} {!agent.isActive && "(Inactive)"}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </TabsTrigger>
          </Tabs>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Conditions ({formData.conditions.length})
          </h2>
          <Button size="sm" variant="secondary" onClick={addCondition}>
            + Add Condition
          </Button>
        </CardHeader>
        <CardContent>
          {formData.conditions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No conditions set. Rule will always match.
            </p>
          ) : (
            <div className="space-y-3">
              {formData.conditions.map((condition, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    size="sm"
                    aria-label="Field"
                    value={condition.field}
                    onChange={(e) => updateCondition(index, "field", e.target.value)}
                    className="w-40"
                  >
                    {CONDITION_FIELDS.map((f) => (
                      <SelectItem key={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <Select
                    size="sm"
                    aria-label="Operator"
                    value={condition.operator}
                    onChange={(e) => updateCondition(index, "operator", e.target.value)}
                    className="w-36"
                  >
                    {CONDITION_OPERATORS.map((op) => (
                      <SelectItem key={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </Select>
                  <Input
                    size="sm"
                    aria-label="Value"
                    placeholder="Value"
                    value={condition.value}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => removeCondition(index)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fallback Settings */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Fallback Settings</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Fallback Action"
              value={formData.fallbackAction}
              onChange={(e) => setFormData({ ...formData, fallbackAction: e.target.value })}
            >
              {FALLBACK_ACTIONS.map((action) => (
                <SelectItem key={action.value}>
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
                setFormData({
                  ...formData,
                  maxWaitSeconds: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          {formData.fallbackAction === "transfer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Fallback Agent"
                placeholder="Select fallback agent"
                value={formData.fallbackAgentId}
                onChange={(e) => setFormData({ ...formData, fallbackAgentId: e.target.value })}
              >
                {agents.map((agent) => (
                  <SelectItem key={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Fallback Group"
                placeholder="Select fallback group"
                value={formData.fallbackGroupId}
                onChange={(e) => setFormData({ ...formData, fallbackGroupId: e.target.value })}
              >
                {groups.map((group) => (
                  <SelectItem key={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </Select>
            </div>
          )}

          <Textarea
            label="Announcement Message"
            placeholder="Optional message to play while waiting..."
            value={formData.announcementMessage}
            onChange={(e) =>
              setFormData({ ...formData, announcementMessage: e.target.value })
            }
          />

          <Input
            label="Hold Music URL"
            placeholder="https://example.com/hold-music.mp3"
            value={formData.holdMusic}
            onChange={(e) => setFormData({ ...formData, holdMusic: e.target.value })}
          />
        </CardContent>
      </Card>

      {/* Schedule (placeholder for now) */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Schedule</h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Switch
              checked={formData.scheduleEnabled}
              onCheckedChange={(value) => setFormData({ ...formData, scheduleEnabled: value })}
            >
              Enable Schedule
            </Switch>
          </div>
          {formData.scheduleEnabled && (
            <p className="text-sm text-gray-500 mt-4">
              Schedule configuration coming soon. For now, the rule will be active
              at all times when enabled.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

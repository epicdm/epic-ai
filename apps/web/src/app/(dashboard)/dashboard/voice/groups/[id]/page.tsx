"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Chip,
  Select,
  SelectItem,
  Textarea,
  Spinner,
  Switch,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Slider,
} from "@heroui/react";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
  description: string | null;
}

interface GroupMember {
  id: string;
  agentId: string;
  priority: number;
  weight: number;
  maxConcurrent: number;
  skills: string[];
  isActive: boolean;
  agent: Agent | null;
}

interface AgentGroup {
  id: string;
  name: string;
  description: string | null;
  routingStrategy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
  routingRules: { id: string; name: string }[];
  _count: {
    members: number;
    routingRules: number;
  };
}

const ROUTING_STRATEGIES = [
  { value: "ROUND_ROBIN", label: "Round Robin", description: "Distribute calls evenly across agents" },
  { value: "LEAST_BUSY", label: "Least Busy", description: "Route to agent with fewest active calls" },
  { value: "PRIORITY", label: "Priority", description: "Route to highest priority available agent" },
  { value: "WEIGHTED", label: "Weighted", description: "Distribute based on agent weights" },
  { value: "SKILLS_BASED", label: "Skills Based", description: "Match caller needs to agent skills" },
  { value: "RANDOM", label: "Random", description: "Randomly select an available agent" },
];

export default function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [group, setGroup] = useState<AgentGroup | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    routingStrategy: "ROUND_ROBIN",
    isActive: true,
    members: [] as {
      agentId: string;
      priority: number;
      weight: number;
      maxConcurrent: number;
      skills: string[];
      isActive: boolean;
    }[],
  });

  const fetchGroup = useCallback(async () => {
    try {
      const response = await fetch(`/api/voice/groups/${id}`);
      if (!response.ok) throw new Error("Failed to fetch group");
      const data = await response.json();
      setGroup(data.group);
      setFormData({
        name: data.group.name,
        description: data.group.description || "",
        routingStrategy: data.group.routingStrategy,
        isActive: data.group.isActive,
        members: data.group.members.map((m: GroupMember) => ({
          agentId: m.agentId,
          priority: m.priority,
          weight: m.weight,
          maxConcurrent: m.maxConcurrent,
          skills: m.skills,
          isActive: m.isActive,
        })),
      });
    } catch (error) {
      console.error("Error fetching group:", error);
      toast.error("Failed to load group");
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

  useEffect(() => {
    Promise.all([fetchGroup(), fetchAgents()]).finally(() => setLoading(false));
  }, [fetchGroup, fetchAgents]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/voice/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          routingStrategy: formData.routingStrategy,
          isActive: formData.isActive,
          members: formData.members,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update group");
      }

      toast.success("Group updated successfully");
      fetchGroup();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update group");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/voice/groups/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      toast.success("Group deleted successfully");
      router.push("/dashboard/voice/groups");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const toggleMember = (agentId: string) => {
    const existing = formData.members.find((m) => m.agentId === agentId);
    if (existing) {
      setFormData({
        ...formData,
        members: formData.members.filter((m) => m.agentId !== agentId),
      });
    } else {
      setFormData({
        ...formData,
        members: [
          ...formData.members,
          { agentId, priority: 0, weight: 100, maxConcurrent: 5, skills: [], isActive: true },
        ],
      });
    }
  };

  const updateMember = (agentId: string, field: string, value: number | boolean | string[]) => {
    setFormData({
      ...formData,
      members: formData.members.map((m) =>
        m.agentId === agentId ? { ...m, [field]: value } : m
      ),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!group) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Group Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The agent group you're looking for doesn't exist.
          </p>
          <Link href="/dashboard/voice/groups">
            <Button color="primary">Back to Groups</Button>
          </Link>
        </CardBody>
      </Card>
    );
  }

  const selectedAgentIds = new Set(formData.members.map((m) => m.agentId));
  const availableAgents = agents.filter((a) => !selectedAgentIds.has(a.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard/voice/groups"
              className="text-gray-500 hover:text-gray-700"
            >
              Agent Groups
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-white">{group.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Agent Group
          </h1>
        </div>
        <div className="flex gap-2">
          <Button color="danger" variant="light" onPress={handleDelete}>
            Delete
          </Button>
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Basic Information</h2>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Group Name"
              placeholder="e.g., Sales Team"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              isRequired
            />

            <Select
              label="Routing Strategy"
              selectedKeys={[formData.routingStrategy]}
              onChange={(e) => setFormData({ ...formData, routingStrategy: e.target.value })}
            >
              {ROUTING_STRATEGIES.map((strategy) => (
                <SelectItem key={strategy.value} value={strategy.value} description={strategy.description}>
                  {strategy.label}
                </SelectItem>
              ))}
            </Select>
          </div>

          <Textarea
            label="Description"
            placeholder="Describe the purpose of this group..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div className="flex items-center gap-4">
            <Switch
              isSelected={formData.isActive}
              onValueChange={(value) => setFormData({ ...formData, isActive: value })}
            >
              Group Active
            </Switch>
          </div>
        </CardBody>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Group Members ({formData.members.length})</h2>
        </CardHeader>
        <CardBody>
          {formData.members.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No members in this group. Add agents below.
            </p>
          ) : (
            <Table aria-label="Group members">
              <TableHeader>
                <TableColumn>Agent</TableColumn>
                <TableColumn>Priority</TableColumn>
                <TableColumn>Weight</TableColumn>
                <TableColumn>Max Concurrent</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Actions</TableColumn>
              </TableHeader>
              <TableBody>
                {formData.members.map((member) => {
                  const agent = agents.find((a) => a.id === member.agentId);
                  return (
                    <TableRow key={member.agentId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{agent?.name || "Unknown Agent"}</p>
                          {agent?.description && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {agent.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          size="sm"
                          className="w-20"
                          min={0}
                          max={100}
                          value={member.priority.toString()}
                          onChange={(e) =>
                            updateMember(member.agentId, "priority", parseInt(e.target.value) || 0)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <Slider
                            size="sm"
                            step={10}
                            minValue={0}
                            maxValue={100}
                            value={member.weight}
                            onChange={(value) =>
                              updateMember(member.agentId, "weight", value as number)
                            }
                          />
                          <span className="text-xs text-gray-500">{member.weight}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          size="sm"
                          className="w-20"
                          min={1}
                          max={50}
                          value={member.maxConcurrent.toString()}
                          onChange={(e) =>
                            updateMember(member.agentId, "maxConcurrent", parseInt(e.target.value) || 1)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          size="sm"
                          isSelected={member.isActive}
                          onValueChange={(value) =>
                            updateMember(member.agentId, "isActive", value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          color="danger"
                          variant="light"
                          onPress={() => toggleMember(member.agentId)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Add Members */}
          {availableAgents.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Add Members
              </p>
              <div className="flex flex-wrap gap-2">
                {availableAgents.map((agent) => (
                  <Chip
                    key={agent.id}
                    variant="flat"
                    className="cursor-pointer hover:bg-primary-100"
                    onClick={() => toggleMember(agent.id)}
                  >
                    + {agent.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Routing Rules */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Associated Routing Rules ({group._count.routingRules})
          </h2>
          <Link href="/dashboard/voice/routing">
            <Button size="sm" variant="light">
              Manage Rules
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          {group.routingRules.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No routing rules associated with this group.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {group.routingRules.map((rule) => (
                <Chip key={rule.id} variant="flat">
                  {rule.name}
                </Chip>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

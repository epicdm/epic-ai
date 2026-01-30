"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
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

export const dynamic = 'force-dynamic';

export default function AgentGroupsPage() {
  const [groups, setGroups] = useState<AgentGroup[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    routingStrategy: "ROUND_ROBIN",
    members: [] as { agentId: string; priority: number; weight: number; maxConcurrent: number; skills: string[] }[],
  });

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch("/api/voice/groups");
      if (!response.ok) throw new Error("Failed to fetch groups");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load agent groups");
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

  useEffect(() => {
    Promise.all([fetchGroups(), fetchAgents()]).finally(() => setLoading(false));
  }, [fetchGroups, fetchAgents]);

  const handleCreateGroup = async () => {
    if (!formData.name.trim()) {
      toast.error("Group name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/voice/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          routingStrategy: formData.routingStrategy,
          members: formData.members.length > 0 ? formData.members : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create group");
      }

      toast.success("Agent group created successfully");
      setIsOpen(false);
      setFormData({
        name: "",
        description: "",
        routingStrategy: "ROUND_ROBIN",
        members: [],
      });
      fetchGroups();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const response = await fetch(`/api/voice/groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete group");

      toast.success("Group deleted successfully");
      fetchGroups();
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
          { agentId, priority: 0, weight: 100, maxConcurrent: 5, skills: [] },
        ],
      });
    }
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy) {
      case "ROUND_ROBIN": return "primary";
      case "LEAST_BUSY": return "success";
      case "PRIORITY": return "warning";
      case "WEIGHTED": return "secondary";
      case "SKILLS_BASED": return "danger";
      case "RANDOM": return "default";
      default: return "default";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Agent Groups
          </h1>
          <p className="text-gray-500 mt-1">
            Organize agents into groups for call routing
          </p>
        </div>
        <Button onClick={() => setIsOpen(true)}>
          + Create Group
        </Button>
      </div>

      {/* Groups List */}
      {groups.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Agent Groups Yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create groups to organize your agents and set up call routing
            </p>
            <Button onClick={() => setIsOpen(true)}>
              Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Card key={group.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/dashboard/voice/groups/${group.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary"
                      >
                        {group.name}
                      </Link>
                      <Badge
                        
                        color={group.isActive ? "success" : "default"}
                        variant="secondary"
                      >
                        {group.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge
                        
                        color={getStrategyColor(group.routingStrategy)}
                        variant="secondary"
                      >
                        {group.routingStrategy.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="text-gray-500 text-sm mb-3">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        <strong>{group._count.members}</strong> members
                      </span>
                      <span>
                        <strong>{group._count.routingRules}</strong> routing rules
                      </span>
                    </div>
                    {group.members.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-gray-500">Members:</span>
                        <div className="flex flex-wrap gap-1">
                          {group.members.slice(0, 5).map((member) => (
                            <Badge
                              key={member.id}
                              
                              variant="secondary"
                              color={member.isActive && member.agent?.isActive ? "success" : "default"}
                            >
                              {member.agent?.name || "Unknown"}
                            </Badge>
                          ))}
                          {group.members.length > 5 && (
                            <Badge  variant="secondary">
                              +{group.members.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <Dropdown>
                    <DropdownTrigger>
                      <Button size="icon" variant="ghost">
                        ⋮
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                      <DropdownItem
                        key="edit"
                        href={`/dashboard/voice/groups/${group.id}`}
                      >
                        Edit Group
                      </DropdownItem>
                      <DropdownItem
                        key="delete"
                        className="text-danger"
                        color="danger"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        Delete Group
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Agent Group</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <Input
                label="Group Name"
                placeholder="e.g., Sales Team, Support Queue"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                isRequired
              />

              <Textarea
                label="Description"
                placeholder="Describe the purpose of this group..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <Select
                label="Routing Strategy"
                value={formData.routingStrategy}
                onChange={(e) => setFormData({ ...formData, routingStrategy: e.target.value })}
              >
                {ROUTING_STRATEGIES.map((strategy) => (
                  <SelectItem key={strategy.value} description={strategy.description}>
                    {strategy.label}
                  </SelectItem>
                ))}
              </Select>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Select Members
                </label>
                {agents.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No agents available. Create agents first.
                  </p>
                ) : (
                  <Table
                    aria-label="Select agents"
                    selectionMode="multiple"
                    selectedKeys={new Set(formData.members.map((m) => m.agentId))}
                    onSelectionChange={(keys) => {
                      if (keys === "all") {
                        setFormData({
                          ...formData,
                          members: agents.map((a) => ({
                            agentId: a.id,
                            priority: 0,
                            weight: 100,
                            maxConcurrent: 5,
                            skills: [],
                          })),
                        });
                      } else {
                        const selectedIds = Array.from(keys) as string[];
                        setFormData({
                          ...formData,
                          members: selectedIds.map((id) => {
                            const existing = formData.members.find((m) => m.agentId === id);
                            return existing || {
                              agentId: id,
                              priority: 0,
                              weight: 100,
                              maxConcurrent: 5,
                              skills: [],
                            };
                          }),
                        });
                      }
                    }}
                  >
                    <TableHeader>
                      <TableColumn>Agent</TableColumn>
                      <TableColumn>Status</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {agents.map((agent) => (
                        <TableRow key={agent.id}>
                          <TableCell>{agent.name}</TableCell>
                          <TableCell>
                            <Badge
                              
                              color={agent.isActive ? "success" : "default"}
                              variant="secondary"
                            >
                              {agent.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup} disabled={saving}>
              Create Group
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

interface Agent {
  id: string;
  name: string;
  isActive: boolean;
}

interface GroupMember {
  id: string;
  agentId: string;
  agent: Agent | null;
  isActive: boolean;
}

interface AgentGroup {
  id: string;
  name: string;
  description: string | null;
  routingStrategy: string;
  isActive: boolean;
  members: GroupMember[];
  _count: {
    members: number;
    routingRules: number;
  };
}

interface RoutingRule {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  fallbackAction: string;
  conditions: Record<string, unknown>[];
  group: { id: string; name: string } | null;
  targetAgent: { id: string; name: string } | null;
}

interface GroupsResponse {
  groups: AgentGroup[];
}

interface RoutingResponse {
  rules: RoutingRule[];
}

function strategyVariant(
  strategy: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (strategy) {
    case "ROUND_ROBIN":
    case "LEAST_BUSY":
      return "default";
    case "PRIORITY":
    case "WEIGHTED":
      return "secondary";
    case "SKILLS_BASED":
      return "destructive";
    default:
      return "outline";
  }
}

export function RoutingContent() {
  const { data: groupsResult, isLoading: groupsLoading } = useQuery({
    queryKey: queryKeys.voice.groups.list(),
    queryFn: () =>
      apiClient.get<GroupsResponse>(endpoints.voice.groups.list()),
  });

  const { data: routingResult, isLoading: routingLoading } = useQuery({
    queryKey: queryKeys.voice.routing.list(),
    queryFn: () =>
      apiClient.get<RoutingResponse>(endpoints.voice.routing.list()),
  });

  const groups = groupsResult?.data?.groups ?? [];
  const rules = routingResult?.data?.rules ?? [];
  const isLoading = groupsLoading || routingLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Routing &amp; Groups
        </h1>
        <p className="text-muted-foreground">
          Configure agent groups and call routing rules.
        </p>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">
            Agent Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="rules">
            Routing Rules ({rules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <Card>
            <CardHeader>
              <CardTitle>Agent Groups</CardTitle>
              <CardDescription>
                Organize agents into groups for call distribution.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium">No groups yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create an agent group to start routing calls.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Rules</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">
                          {group.name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={strategyVariant(group.routingStrategy)}
                          >
                            {group.routingStrategy.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{group._count.members}</TableCell>
                        <TableCell>{group._count.routingRules}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              group.isActive ? "default" : "outline"
                            }
                          >
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <Card>
            <CardHeader>
              <CardTitle>Routing Rules</CardTitle>
              <CardDescription>
                Define how incoming calls are routed to agents and groups.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : rules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <p className="text-lg font-medium">No routing rules yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a routing rule to control call distribution.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead>Fallback</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules
                      .sort((a, b) => b.priority - a.priority)
                      .map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.name}
                          </TableCell>
                          <TableCell>{rule.priority}</TableCell>
                          <TableCell>
                            {rule.group?.name ??
                              rule.targetAgent?.name ??
                              "--"}
                          </TableCell>
                          <TableCell>{rule.conditions.length}</TableCell>
                          <TableCell className="capitalize">
                            {rule.fallbackAction.replace(/_/g, " ")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                rule.isActive ? "default" : "outline"
                              }
                            >
                              {rule.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

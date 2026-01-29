"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, Bot, Search } from "lucide-react";
import { apiClient, endpoints, queryKeys, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

interface Agent {
  id: string;
  name: string;
  status: string;
  templateSlug?: string;
  confidence?: number;
  companyName?: string;
  voiceAgentId?: string;
  createdAt: string;
  updatedAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
  ERROR: "destructive",
};

export function AgentsListContent() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.agents.lists(),
    queryFn: async () => {
      const res = await apiClient.get<Agent[] | { data: Agent[] | null }>(
        endpoints.agents.list()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<Agent>(res.data);
    },
  });

  const agents = data ?? [];
  const filtered = agents.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: agents.length,
    DRAFT: agents.filter((a) => a.status === "DRAFT").length,
    PUBLISHED: agents.filter((a) => a.status === "PUBLISHED").length,
    ARCHIVED: agents.filter((a) => a.status === "ARCHIVED").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">
            Create and manage AI agents. Deploy to voice, chat, or any channel.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="DRAFT">Draft ({counts.DRAFT})</TabsTrigger>
            <TabsTrigger value="PUBLISHED">Published ({counts.PUBLISHED})</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Archived ({counts.ARCHIVED})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Table */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading agents...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Bot className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <CardTitle className="mb-2">No agents yet</CardTitle>
            <CardDescription className="mb-6 max-w-sm">
              Create your first AI agent to get started. Agents can be deployed
              to voice calls, chat, and more.
            </CardDescription>
            <Button asChild>
              <Link href="/dashboard/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Agent
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="font-medium hover:underline"
                    >
                      {agent.name}
                    </Link>
                    {agent.companyName && (
                      <p className="text-xs text-muted-foreground">
                        {agent.companyName}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[agent.status] ?? "outline"}>
                      {agent.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {agent.templateSlug ?? "--"}
                  </TableCell>
                  <TableCell>
                    {agent.confidence != null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${agent.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {agent.confidence}%
                        </span>
                      </div>
                    ) : (
                      "--"
                    )}
                  </TableCell>
                  <TableCell>
                    {agent.voiceAgentId ? (
                      <Badge variant="outline">Voice</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(agent.updatedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

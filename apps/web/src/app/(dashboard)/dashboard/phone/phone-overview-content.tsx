"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Phone, Hash, Users, GitBranch } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

interface VoiceStats {
  totalCalls: number;
  activeCalls: number;
  totalAgents: number;
  activeAgents: number;
}

interface NumbersResponse {
  numbers: Array<{ id: string; status: string }>;
}

interface GroupsResponse {
  groups: Array<{ id: string }>;
}

interface FlowsResponse {
  flows: Array<{ id: string }>;
}

export function PhoneOverviewContent() {
  const { data: statsResult, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.voice.stats(),
    queryFn: () => apiClient.get<VoiceStats>(endpoints.voice.stats()),
  });

  const { data: numbersResult, isLoading: numbersLoading } = useQuery({
    queryKey: queryKeys.voice.phoneNumbers.list(),
    queryFn: () =>
      apiClient.get<NumbersResponse>(endpoints.voice.phoneNumbers.list()),
  });

  const { data: groupsResult, isLoading: groupsLoading } = useQuery({
    queryKey: queryKeys.voice.groups.list(),
    queryFn: () =>
      apiClient.get<GroupsResponse>(endpoints.voice.groups.list()),
  });

  const { data: flowsResult, isLoading: flowsLoading } = useQuery({
    queryKey: queryKeys.voice.flows.list(),
    queryFn: () =>
      apiClient.get<FlowsResponse>(endpoints.voice.flows.list()),
  });

  const stats = statsResult?.data;
  const numbers = numbersResult?.data?.numbers ?? [];
  const groups = groupsResult?.data?.groups ?? [];
  const flows = flowsResult?.data?.flows ?? [];

  const isLoading = statsLoading || numbersLoading || groupsLoading || flowsLoading;

  const overviewCards = [
    {
      title: "Total Calls",
      description: "Call history and recordings",
      value: stats?.totalCalls ?? 0,
      activeBadge: stats?.activeCalls
        ? `${stats.activeCalls} active`
        : undefined,
      href: "/dashboard/phone/calls",
      icon: Phone,
    },
    {
      title: "Active Numbers",
      description: "DID management and provisioning",
      value: numbers.length,
      href: "/dashboard/phone/numbers",
      icon: Hash,
    },
    {
      title: "Agent Groups",
      description: "Groups and routing rules",
      value: groups.length,
      href: "/dashboard/phone/routing",
      icon: Users,
    },
    {
      title: "Active Flows",
      description: "Conversation flow management",
      value: flows.length,
      href: "/dashboard/phone/flows",
      icon: GitBranch,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Phone</h1>
        <p className="text-muted-foreground">
          Manage calls, numbers, routing, and conversation flows.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.title}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    {isLoading ? (
                      <div className="h-8 w-12 animate-pulse rounded bg-muted" />
                    ) : (
                      <span className="text-2xl font-bold">{card.value}</span>
                    )}
                    {card.activeBadge && !isLoading && (
                      <Badge variant="secondary">{card.activeBadge}</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {card.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

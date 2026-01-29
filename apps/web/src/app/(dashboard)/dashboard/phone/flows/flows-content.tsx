"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

interface Flow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number | null;
  updatedAt: string;
}

interface FlowsResponse {
  flows: Flow[];
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "published":
    case "active":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
    case "disabled":
      return "outline";
    default:
      return "outline";
  }
}

export function FlowsContent() {
  const { data: result, isLoading } = useQuery({
    queryKey: queryKeys.voice.flows.list(),
    queryFn: () =>
      apiClient.get<FlowsResponse>(endpoints.voice.flows.list()),
  });

  const flows = result?.data?.flows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Conversation Flows
        </h1>
        <p className="text-muted-foreground">
          Design and manage conversation flows for your phone agents.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : flows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg font-medium">No flows yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create a conversation flow to define how your agents interact with
              callers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{flow.name}</CardTitle>
                  <Badge variant={statusVariant(flow.status)}>
                    {flow.status}
                  </Badge>
                </div>
                {flow.description && (
                  <CardDescription>{flow.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                {flow.version !== null && flow.version !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    Version {flow.version}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <Link
                  href={`/dashboard/phone/flows/${flow.id}`}
                  className="w-full"
                >
                  <Button variant="outline" className="w-full">
                    Open Editor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

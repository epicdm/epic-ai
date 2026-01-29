"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

interface PhoneNumber {
  id: string;
  number: string;
  agentId: string | null;
  agentName: string | null;
  status: string;
  region: string | null;
  provider: string | null;
  createdAt: string;
}

interface NumbersResponse {
  numbers: PhoneNumber[];
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "active":
    case "assigned":
      return "default";
    case "available":
    case "unassigned":
      return "secondary";
    case "suspended":
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

export function NumbersContent() {
  const { data: result, isLoading } = useQuery({
    queryKey: queryKeys.voice.phoneNumbers.list(),
    queryFn: () =>
      apiClient.get<NumbersResponse>(endpoints.voice.phoneNumbers.list()),
  });

  const numbers = result?.data?.numbers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Phone Numbers</h1>
          <p className="text-muted-foreground">
            Manage your provisioned DIDs and assign them to agents.
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Provision Number
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>DID Inventory</CardTitle>
          <CardDescription>
            All provisioned phone numbers and their assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : numbers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium">No numbers provisioned</p>
              <p className="text-sm text-muted-foreground mt-1">
                Provision a new phone number to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Region</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {numbers.map((num) => (
                  <TableRow key={num.id}>
                    <TableCell className="font-mono text-sm">
                      {num.number}
                    </TableCell>
                    <TableCell>{num.agentName ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(num.status)}>
                        {num.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{num.region ?? "--"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

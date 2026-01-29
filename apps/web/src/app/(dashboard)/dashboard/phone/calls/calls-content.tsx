"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search, Calendar } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

interface Call {
  id: string;
  agentId: string | null;
  agentName: string | null;
  phoneNumber: string | null;
  direction: string;
  status: string;
  duration: number | null;
  sentiment: string | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

interface CallsResponse {
  calls: Call[];
  total: number;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function statusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status.toLowerCase()) {
    case "completed":
      return "default";
    case "in_progress":
    case "active":
    case "ringing":
      return "secondary";
    case "failed":
    case "error":
      return "destructive";
    default:
      return "outline";
  }
}

function sentimentVariant(
  sentiment: string | null
): "default" | "secondary" | "destructive" | "outline" {
  switch (sentiment?.toLowerCase()) {
    case "positive":
      return "default";
    case "neutral":
      return "secondary";
    case "negative":
      return "destructive";
    default:
      return "outline";
  }
}

export function CallsContent() {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filters: Record<string, string> = {};
  if (search) filters.search = search;
  if (dateFrom) filters.from = dateFrom;
  if (dateTo) filters.to = dateTo;

  const { data: result, isLoading } = useQuery({
    queryKey: queryKeys.voice.calls.list(filters),
    queryFn: () =>
      apiClient.get<CallsResponse>(endpoints.voice.calls.list(), {
        params: filters,
      }),
  });

  const calls = result?.data?.calls ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
        <p className="text-muted-foreground">
          View and search all inbound and outbound calls.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search calls by agent, number, or filter by date range.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by agent or number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36"
                  aria-label="From date"
                />
              </div>
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36"
                aria-label="To date"
              />
            </div>
            {(search || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-lg font-medium">No calls found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search || dateFrom || dateTo
                  ? "Try adjusting your filters."
                  : "Calls will appear here once they are made."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sentiment</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(call.startedAt || call.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>{call.agentName ?? "--"}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.phoneNumber ?? "--"}
                    </TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(call.status)}>
                        {call.status.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {call.sentiment ? (
                        <Badge variant={sentimentVariant(call.sentiment)}>
                          {call.sentiment}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          --
                        </span>
                      )}
                    </TableCell>
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

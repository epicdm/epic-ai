"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { Phone, PhoneIncoming, PhoneOutgoing, Loader2 } from "lucide-react";
import { PRICING } from "@/components/ui/cost-estimator";
import { EmptyState } from "@/components/ui/empty-state";

interface Call {
  id: string;
  direction: string;
  status: string;
  outcome: string | null;
  callerNumber: string | null;
  phoneNumber: string | null;
  duration: number | null;
  startedAt: string | null;
  endedAt: string | null;
  agent: { id: string; name: string } | null;
  phoneMapping: { id: string; phoneNumber: string } | null;
}

export function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCalls() {
      try {
        const response = await fetch("/api/voice/calls");
        if (!response.ok) throw new Error("Failed to fetch calls");
        const data = await response.json();
        setCalls(data.calls || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchCalls();
  }, []);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateCost = (seconds: number | null) => {
    if (!seconds) return null;
    const minutes = seconds / 60;
    return (minutes * PRICING.voice.perMinute).toFixed(2);
  };

  const getBadgeVariant = (status: string, outcome: string | null): "default" | "secondary" | "destructive" | "outline" => {
    const displayStatus = outcome?.toLowerCase() || status.toLowerCase();
    switch (displayStatus) {
      case "completed":
      case "transferred":
        return "default";
      case "in_progress":
      case "in-progress":
      case "active":
      case "ringing":
        return "default";
      case "failed":
        return "destructive";
      case "no_answer":
      case "no-answer":
      case "busy":
      case "voicemail":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getBadgeClassName = (status: string, outcome: string | null): string => {
    const displayStatus = outcome?.toLowerCase() || status.toLowerCase();
    switch (displayStatus) {
      case "completed":
      case "transferred":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "in_progress":
      case "in-progress":
      case "active":
      case "ringing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "failed":
        return "";
      case "no_answer":
      case "no-answer":
      case "busy":
      case "voicemail":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "";
    }
  };

  const getDisplayStatus = (status: string, outcome: string | null): string => {
    if (outcome) {
      return outcome.replace(/_/g, " ").toLowerCase();
    }
    return status.replace(/_/g, " ").toLowerCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Call History"
        description="View all inbound and outbound calls handled by your voice agents."
      />

      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      ) : calls.length === 0 ? (
        <EmptyState
          icon={<Phone className="w-full h-full" />}
          title="No Calls Yet"
          description="Your voice agents will appear here once activated."
          features={[
            "Sales outreach",
            "Customer support",
            "Appointment booking",
            "Surveys & feedback",
          ]}
          actions={[
            {
              label: "Create Your First Agent",
              variant: "primary",
              onClick: () => window.location.href = "/dashboard/voice",
            },
            {
              label: "Hear Examples",
              variant: "secondary",
              onClick: () => {
                window.open("/docs/voice-examples", "_blank");
              },
            },
          ]}
          variant="card"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direction</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow key={call.id}>
                    <TableCell>
                      {call.direction === "INBOUND" || call.direction === "inbound" ? (
                        <PhoneIncoming className="w-4 h-4 text-green-500" />
                      ) : (
                        <PhoneOutgoing className="w-4 h-4 text-blue-500" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.callerNumber || "-"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {call.phoneNumber || call.phoneMapping?.phoneNumber || "-"}
                    </TableCell>
                    <TableCell>{call.agent?.name || "-"}</TableCell>
                    <TableCell>{formatDuration(call.duration)}</TableCell>
                    <TableCell>
                      {calculateCost(call.duration) ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          ${calculateCost(call.duration)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getBadgeVariant(call.status, call.outcome)}
                        className={getBadgeClassName(call.status, call.outcome)}
                      >
                        {getDisplayStatus(call.status, call.outcome)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {call.startedAt
                        ? new Date(call.startedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

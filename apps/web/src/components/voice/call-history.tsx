"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Spinner,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import { Phone, PhoneIncoming, PhoneOutgoing, DollarSign } from "lucide-react";
import { PRICING } from "@/components/ui/cost-estimator";

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

  const getStatusColor = (status: string, outcome: string | null): "success" | "primary" | "danger" | "warning" | "default" => {
    // Use outcome if available, otherwise fall back to status
    const displayStatus = outcome?.toLowerCase() || status.toLowerCase();
    switch (displayStatus) {
      case "completed":
        return "success";
      case "in_progress":
      case "in-progress":
      case "active":
      case "ringing":
        return "primary";
      case "failed":
        return "danger";
      case "no_answer":
      case "no-answer":
      case "busy":
      case "voicemail":
        return "warning";
      case "transferred":
        return "success";
      default:
        return "default";
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
        <Spinner size="lg" />
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
          <CardBody className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardBody>
        </Card>
      ) : calls.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Calls Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Calls will appear here once your voice agents start handling them.
            </p>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody className="p-0">
            <Table aria-label="Call history">
              <TableHeader>
                <TableColumn>Direction</TableColumn>
                <TableColumn>From</TableColumn>
                <TableColumn>To</TableColumn>
                <TableColumn>Agent</TableColumn>
                <TableColumn>Duration</TableColumn>
                <TableColumn>Cost</TableColumn>
                <TableColumn>Status</TableColumn>
                <TableColumn>Date</TableColumn>
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
                      <Chip size="sm" color={getStatusColor(call.status, call.outcome)} variant="flat">
                        {getDisplayStatus(call.status, call.outcome)}
                      </Chip>
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
          </CardBody>
        </Card>
      )}
    </div>
  );
}

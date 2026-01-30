"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Phone, PhoneCall, PhoneOff, RefreshCw, AlertCircle, CheckCircle, Clock, Trash2, Loader2 } from "lucide-react";

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  phoneMappings?: Array<{ id: string; phoneNumber: string }>;
}

interface CallRecord {
  id: string;
  phoneNumber: string;
  agentId: string;
  agent?: { id: string; name: string };
  status: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  createdAt: string;
}

export function OutboundTestPanel() {
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAgents();
    fetchCalls();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch("/api/voice/agents");
      if (!response.ok) throw new Error("Failed to fetch agents");
      const data = await response.json();
      const agentList = data.agents || [];
      setAgents(agentList);
      if (agentList.length > 0) {
        setSelectedAgentId(agentList[0].id);
      }
    } catch (err) {
      setError("Failed to load voice agents");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCalls = async () => {
    try {
      setIsRefreshing(true);
      const response = await fetch("/api/voice/calls?limit=10&direction=OUTBOUND");
      if (response.ok) {
        const data = await response.json();
        setCalls(data.calls || []);
      }
    } catch (err) {
      console.error("Failed to fetch calls:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const initiateCall = async () => {
    if (!selectedAgentId) {
      setError("Please select a voice agent");
      return;
    }

    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number (at least 10 digits)");
      return;
    }

    setIsCallLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/voice/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          phoneNumber: phoneNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate call");
      }

      setSuccess(`Call initiated! ID: ${data.callId}, Status: ${data.status}`);
      setPhoneNumber("");
      await fetchCalls();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate call");
      console.error(err);
    } finally {
      setIsCallLoading(false);
    }
  };

  const cancelCall = async (callId: string) => {
    try {
      const response = await fetch(`/api/voice/calls/${callId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchCalls();
        setSuccess("Call cancelled");
      }
    } catch (err) {
      console.error("Failed to cancel call:", err);
    }
  };

  const getStatusBadgeClass = (status: string): string => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "IN_PROGRESS":
      case "RINGING":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "QUEUED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "FAILED":
      case "CANCELLED":
        return "";
      default:
        return "";
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "default";
      case "IN_PROGRESS":
      case "RINGING":
        return "default";
      case "QUEUED":
        return "secondary";
      case "FAILED":
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4" />;
      case "IN_PROGRESS":
      case "RINGING":
        return <PhoneCall className="w-4 h-4" />;
      case "QUEUED":
        return <Clock className="w-4 h-4" />;
      case "FAILED":
      case "CANCELLED":
        return <PhoneOff className="w-4 h-4" />;
      default:
        return <Phone className="w-4 h-4" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="flex flex-row items-center gap-3 py-3 px-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-600 text-sm">{error}</span>
            <Button size="sm" variant="ghost" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success display */}
      {success && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardContent className="flex flex-row items-center gap-3 py-3 px-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-600 text-sm">{success}</span>
            <Button size="sm" variant="ghost" onClick={() => setSuccess(null)} className="ml-auto">
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Outbound Call Form */}
        <Card className="lg:col-span-1">
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Make Outbound Call
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Test your voice agent by calling a phone number.
              </p>
            </div>

            {/* Agent Select */}
            <div className="space-y-2">
              <Label>Voice Agent</Label>
              <Select
                value={selectedAgentId}
                onValueChange={setSelectedAgentId}
                disabled={isCallLoading || agents.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.phoneMappings?.[0]?.phoneNumber && (
                        <span className="text-xs text-gray-500 ml-2">
                          From: {agent.phoneMappings[0].phoneNumber}
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgent?.description && (
                <p className="text-sm text-gray-500 mt-2">{selectedAgent.description}</p>
              )}
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label>Phone Number to Call</Label>
              <Input
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isCallLoading}
              />
              <p className="text-xs text-muted-foreground">Enter the phone number you want to test call</p>
            </div>

            {/* Call Button */}
            <Button
              size="lg"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={initiateCall}
              disabled={!selectedAgentId || !phoneNumber || isCallLoading}
            >
              {isCallLoading ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <PhoneCall className="w-5 h-5 mr-2" />
              )}
              {isCallLoading ? "Initiating Call..." : "Start Outbound Call"}
            </Button>

            {/* Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Note:</strong> The call will be made from your assigned phone number
                and will use your voice agent&apos;s configuration.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Calls Panel */}
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Recent Outbound Calls
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchCalls}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>

            {calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Phone className="w-12 h-12 mb-4 opacity-50" />
                <p>No outbound calls yet</p>
                <p className="text-sm">Make a test call to see it here</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((call) => (
                      <TableRow key={call.id}>
                        <TableCell>
                          <span className="font-mono">{call.phoneNumber}</span>
                        </TableCell>
                        <TableCell>{call.agent?.name || "Unknown"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(call.status)}
                            className={`flex items-center gap-1 w-fit ${getStatusBadgeClass(call.status)}`}
                          >
                            {getStatusIcon(call.status)}
                            {call.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDuration(call.duration)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(call.createdAt)}
                        </TableCell>
                        <TableCell>
                          {(call.status === "QUEUED" ||
                            call.status === "RINGING" ||
                            call.status === "IN_PROGRESS") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => cancelCall(call.id)}
                            >
                              <PhoneOff className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            How Outbound Testing Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Select Agent</p>
                <p className="text-sm text-gray-500">
                  Choose the voice agent configuration to test
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Enter Number</p>
                <p className="text-sm text-gray-500">
                  Enter the phone number you want the agent to call
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Answer & Test</p>
                <p className="text-sm text-gray-500">
                  Answer the phone and interact with your AI agent
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

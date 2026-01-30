"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Server,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Users,
  Route,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle,
  Copy,
  Radio,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Clock,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  XCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Bot,
  Activity,
  Filter,
  PhoneCall,
  Play,
  Wrench,
  Database,
  Settings,
  Shield,
  Link,
} from "lucide-react";

// Types
interface InboundTrunk {
  sip_trunk_id: string;
  name: string;
  numbers: string[];
  allowed_addresses: string[];
  metadata: string;
  created_at?: string;
}

interface OutboundTrunk {
  sip_trunk_id: string;
  name: string;
  address: string;
  transport: string;
  numbers: string[];
  auth_username?: string;
  metadata: string;
  created_at?: string;
}

interface DispatchRule {
  sip_dispatch_rule_id: string;
  name: string;
  trunk_ids: string[];
  rule: {
    dispatchRuleIndividual?: {
      roomPrefix: string;
      pin?: string;
    };
  };
  metadata?: string;
  created_at?: string;
}

interface Participant {
  sid: string;
  identity: string;
  name: string;
  state: number;
  joinedAt: number;
  metadata: string;
  isPublisher: boolean;
  kind: number;
  attributes: Record<string, string>;
  tracks: Array<{
    sid: string;
    type: number;
    name: string;
    muted: boolean;
    source: number;
  }>;
}

interface Room {
  sid: string;
  name: string;
  numParticipants: number;
  maxParticipants: number;
  creationTime: number;
  metadata: string;
  emptyTimeout: number;
  departureTimeout: number;
  participants: Participant[];
  error?: string;
}

interface VoiceCall {
  id: string;
  roomName: string;
  direction: string;
  status: string;
  fromNumber: string | null;
  toNumber: string | null;
  duration: number | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  agentName: string | null;
  agentId: string | null;
  sipCallId: string | null;
  participantIdentity: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
}

interface VoiceAgentOption {
  id: string;
  name: string;
  organizationId: string;
  organizationName?: string;
}

interface TestCallResult {
  success: boolean;
  callId?: string;
  roomName?: string;
  sipCallId?: string;
  error?: string;
  details?: string;
}

interface MagnusDiagnostics {
  overall_status: string;
  magnus_integration: {
    status: string;
    api_response_time_ms: number;
    total_dids_in_magnus: number;
  };
  did_usage: {
    total_capacity: number;
    currently_used: number;
    currently_available: number;
    utilization_percent: number;
    health_score: number;
    status: string;
    status_message: string;
  };
  configuration: {
    magnus_url: string;
    sip_server: string;
    did_range: string;
  };
  errors: string[];
}

interface SipAccountValidation {
  trunkId: string;
  number: string;
  sipAccountExists: boolean;
  sipAccountId?: string;
  sipAccountDetails?: {
    username: string;
    fromdomain: string;
    insecure: string;
    transport: string;
  };
  error?: string;
}

export function LiveKitPanel() {
  const [selectedTab, setSelectedTab] = useState("trunks");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Trunks state
  const [inboundTrunks, setInboundTrunks] = useState<InboundTrunk[]>([]);
  const [outboundTrunks, setOutboundTrunks] = useState<OutboundTrunk[]>([]);
  const [trunksLoading, setTrunksLoading] = useState(false);

  // Dispatch rules state
  const [dispatchRules, setDispatchRules] = useState<DispatchRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  // Calls state
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [callsStats, setCallsStats] = useState<{ totalCalls: number; avgDuration: number; totalMinutes: number } | null>(null);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  // Logs state
  const [logs, setLogs] = useState<Array<{ timestamp: string; level: string; message: string; room?: string; source?: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logLevel, setLogLevel] = useState("info");
  const [logRoomFilter, setLogRoomFilter] = useState("");

  // Agents state
  const [agents, setAgents] = useState<Array<{ id: string; name: string; status: string; job_count?: number }>>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Test Call state
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgentOption[]>([]);
  const [voiceAgentsLoading, setVoiceAgentsLoading] = useState(false);
  const [testCallPhoneNumber, setTestCallPhoneNumber] = useState("");
  const [testCallAgentId, setTestCallAgentId] = useState("");
  const [testCallLoading, setTestCallLoading] = useState(false);
  const [testCallResult, setTestCallResult] = useState<TestCallResult | null>(null);

  // SIP/Magnus diagnostics state
  const [magnusDiagnostics, setMagnusDiagnostics] = useState<MagnusDiagnostics | null>(null);
  const [magnusDiagnosticsLoading, setMagnusDiagnosticsLoading] = useState(false);
  const [sipValidations, setSipValidations] = useState<SipAccountValidation[]>([]);
  const [sipValidationsLoading, setSipValidationsLoading] = useState(false);

  // Modal states
  const [isCreateTrunkOpen, setIsCreateTrunkOpen] = useState(false);
  const [isCreateRuleOpen, setIsCreateRuleOpen] = useState(false);
  const [isRoomDetailOpen, setIsRoomDetailOpen] = useState(false);
  const [isCallDetailOpen, setIsCallDetailOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const [createTrunkType, setCreateTrunkType] = useState<"inbound" | "outbound">("inbound");
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Form state for creating trunks
  const [trunkForm, setTrunkForm] = useState({
    name: "",
    numbers: "",
    allowed_addresses: "",
    address: "",
    transport: "udp",
    auth_username: "",
    auth_password: "",
    metadata: "",
  });

  // Form state for creating dispatch rules
  const [ruleForm, setRuleForm] = useState({
    name: "",
    agent_name: "epic-voice-agent",
    trunk_ids: "",
    phone_numbers: "",
    room_prefix: "",
    pin: "",
    organization_id: "",
    user_id: "",
    agent_id: "",
  });

  // Clear messages after timeout
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fetch data based on selected tab
  useEffect(() => {
    if (selectedTab === "trunks") {
      fetchTrunks();
    } else if (selectedTab === "dispatch") {
      fetchDispatchRules();
    } else if (selectedTab === "rooms") {
      fetchRooms();
    } else if (selectedTab === "calls") {
      fetchCalls();
    } else if (selectedTab === "logs") {
      fetchLogs();
    } else if (selectedTab === "agents") {
      fetchAgents();
    } else if (selectedTab === "test-call") {
      fetchVoiceAgents();
    } else if (selectedTab === "sip") {
      fetchMagnusDiagnostics(true);
    }
  }, [selectedTab]);

  // Fetch functions
  const fetchTrunks = useCallback(async () => {
    setTrunksLoading(true);
    try {
      const [inboundRes, outboundRes] = await Promise.all([
        fetch("/api/admin/livekit/trunks/inbound"),
        fetch("/api/admin/livekit/trunks/outbound"),
      ]);

      if (inboundRes.ok) {
        const data = await inboundRes.json();
        setInboundTrunks(data.trunks || []);
      }

      if (outboundRes.ok) {
        const data = await outboundRes.json();
        setOutboundTrunks(data.trunks || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching trunks:", err);
      setError("Failed to fetch trunks");
    } finally {
      setTrunksLoading(false);
    }
  }, []);

  const fetchDispatchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/dispatch-rules");
      if (res.ok) {
        const data = await res.json();
        setDispatchRules(data.rules || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching dispatch rules:", err);
      setError("Failed to fetch dispatch rules");
    } finally {
      setRulesLoading(false);
    }
  }, []);

  const fetchRooms = useCallback(async () => {
    setRoomsLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/rooms");
      if (res.ok) {
        const data = await res.json();
        setRooms(data.rooms || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching rooms:", err);
      setError("Failed to fetch rooms");
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  const fetchCalls = useCallback(async () => {
    setCallsLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/calls?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
        setCallsStats(data.stats || null);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching calls:", err);
      setError("Failed to fetch calls");
    } finally {
      setCallsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("level", logLevel);
      params.set("limit", "200");
      if (logRoomFilter) params.set("room", logRoomFilter);

      const res = await fetch(`/api/admin/livekit/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching logs:", err);
      setError("Failed to fetch logs");
    } finally {
      setLogsLoading(false);
    }
  }, [logLevel, logRoomFilter]);

  const fetchAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/agents");
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching agents:", err);
      setError("Failed to fetch agents");
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const fetchVoiceAgents = useCallback(async () => {
    setVoiceAgentsLoading(true);
    try {
      const res = await fetch("/api/admin/voice-agents");
      if (res.ok) {
        const data = await res.json();
        setVoiceAgents(data.agents || []);
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching voice agents:", err);
      // Not critical - agent selection is optional
    } finally {
      setVoiceAgentsLoading(false);
    }
  }, []);

  const handleTestCall = async () => {
    if (!testCallPhoneNumber) {
      setError("Please enter a phone number");
      return;
    }

    setTestCallLoading(true);
    setTestCallResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/livekit/outbound-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: testCallPhoneNumber,
          agentId: testCallAgentId || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setTestCallResult({
          success: true,
          callId: data.callId,
          roomName: data.roomName,
          sipCallId: data.sipCallId,
        });
        setSuccess(`Test call initiated successfully! Call ID: ${data.callId}`);
      } else {
        // Handle details - could be string, array of Zod errors, or object
        let details = data.details || data.message;
        if (typeof details === "object") {
          details = JSON.stringify(details, null, 2);
        }
        setTestCallResult({
          success: false,
          error: data.error || "Failed to initiate call",
          details,
        });
        setError(data.error || "Failed to initiate test call");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to initiate test call";
      setTestCallResult({
        success: false,
        error: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setTestCallLoading(false);
    }
  };

  // Magnus/SIP diagnostics fetch
  const fetchMagnusDiagnostics = useCallback(async (validateSip: boolean = true) => {
    setMagnusDiagnosticsLoading(true);
    if (validateSip) {
      setSipValidationsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (validateSip) {
        params.set("validateSip", "true");
      }

      const res = await fetch(`/api/admin/livekit/magnus-diagnostics?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        setMagnusDiagnostics(data.diagnostics || null);
        if (validateSip && data.sipAccountValidations) {
          setSipValidations(data.sipAccountValidations);
        }
      } else {
        const errorData = await res.json();
        setError(errorData.error || "Failed to fetch Magnus diagnostics");
      }
    } catch (err) {
      console.error("[LiveKit] Error fetching Magnus diagnostics:", err);
      setError("Failed to fetch Magnus diagnostics");
    } finally {
      setMagnusDiagnosticsLoading(false);
      setSipValidationsLoading(false);
    }
  }, []);

  // Fix missing SIP account
  const handleFixSipAccount = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/magnus-diagnostics/fix-sip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(`SIP account created for ${phoneNumber}`);
        // Refresh diagnostics to show updated status
        fetchMagnusDiagnostics(true);
      } else {
        setError(data.error || "Failed to create SIP account");
      }
    } catch (err) {
      setError("Failed to create SIP account");
    } finally {
      setLoading(false);
    }
  };

  // Create trunk
  const handleCreateTrunk = async () => {
    setLoading(true);
    try {
      const endpoint = createTrunkType === "inbound"
        ? "/api/admin/livekit/trunks/inbound"
        : "/api/admin/livekit/trunks/outbound";

      const body = createTrunkType === "inbound"
        ? {
            name: trunkForm.name,
            numbers: trunkForm.numbers.split(",").map((n) => n.trim()).filter(Boolean),
            allowed_addresses: trunkForm.allowed_addresses.split(",").map((a) => a.trim()).filter(Boolean),
            metadata: trunkForm.metadata,
          }
        : {
            name: trunkForm.name,
            address: trunkForm.address,
            transport: trunkForm.transport,
            numbers: trunkForm.numbers.split(",").map((n) => n.trim()).filter(Boolean),
            auth_username: trunkForm.auth_username,
            auth_password: trunkForm.auth_password,
            metadata: trunkForm.metadata,
          };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`${createTrunkType === "inbound" ? "Inbound" : "Outbound"} trunk created successfully`);
        onCloseCreateTrunk();
        resetTrunkForm();
        fetchTrunks();
      } else {
        setError(data.error || "Failed to create trunk");
      }
    } catch (err) {
      setError("Failed to create trunk");
    } finally {
      setLoading(false);
    }
  };

  // Create dispatch rule
  const handleCreateRule = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/livekit/dispatch-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleForm.name,
          agent_name: ruleForm.agent_name,
          trunk_ids: ruleForm.trunk_ids.split(",").map((t) => t.trim()).filter(Boolean),
          phone_numbers: ruleForm.phone_numbers.split(",").map((p) => p.trim()).filter(Boolean),
          room_prefix: ruleForm.room_prefix,
          pin: ruleForm.pin || undefined,
          organization_id: ruleForm.organization_id || undefined,
          user_id: ruleForm.user_id || undefined,
          agent_id: ruleForm.agent_id || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Dispatch rule created successfully");
        onCloseCreateRule();
        resetRuleForm();
        fetchDispatchRules();
      } else {
        setError(data.error || "Failed to create dispatch rule");
      }
    } catch (err) {
      setError("Failed to create dispatch rule");
    } finally {
      setLoading(false);
    }
  };

  // Delete functions
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setLoading(true);
    try {
      let endpoint = "";
      if (deleteTarget.type === "inbound-trunk") {
        endpoint = `/api/admin/livekit/trunks/inbound/${deleteTarget.id}`;
      } else if (deleteTarget.type === "outbound-trunk") {
        endpoint = `/api/admin/livekit/trunks/outbound/${deleteTarget.id}`;
      } else if (deleteTarget.type === "dispatch-rule") {
        endpoint = `/api/admin/livekit/dispatch-rules/${deleteTarget.id}`;
      } else if (deleteTarget.type === "room") {
        endpoint = `/api/admin/livekit/rooms/${encodeURIComponent(deleteTarget.id)}`;
      }

      const res = await fetch(endpoint, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        setSuccess(`${deleteTarget.name} deleted successfully`);
        onCloseDeleteConfirm();
        setDeleteTarget(null);

        // Refresh appropriate data
        if (deleteTarget.type.includes("trunk")) {
          fetchTrunks();
        } else if (deleteTarget.type === "dispatch-rule") {
          fetchDispatchRules();
        } else if (deleteTarget.type === "room") {
          fetchRooms();
        }
      } else {
        setError(data.error || "Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = (type: string, id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    onOpenDeleteConfirm();
  };

  const resetTrunkForm = () => {
    setTrunkForm({
      name: "",
      numbers: "",
      allowed_addresses: "",
      address: "",
      transport: "udp",
      auth_username: "",
      auth_password: "",
      metadata: "",
    });
  };

  const resetRuleForm = () => {
    setRuleForm({
      name: "",
      agent_name: "epic-voice-agent",
      trunk_ids: "",
      phone_numbers: "",
      room_prefix: "",
      pin: "",
      organization_id: "",
      user_id: "",
      agent_id: "",
    });
  };

  const openRoomDetails = (room: Room) => {
    setSelectedRoom(room);
    onOpenRoomDetail();
  };

  const openCallDetails = (call: VoiceCall) => {
    setSelectedCall(call);
    onOpenCallDetail();
  };

  const getCallStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "active":
      case "in_progress":
        return "primary";
      case "failed":
      case "error":
        return "danger";
      case "busy":
      case "no_answer":
        return "warning";
      default:
        return "default";
    }
  };

  const getCallStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="w-3 h-3" />;
      case "active":
      case "in_progress":
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case "failed":
      case "error":
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess("Copied to clipboard");
  };

  const formatTimestamp = (ts: number) => {
    if (!ts) return "N/A";
    return new Date(ts * 1000).toLocaleString();
  };

  const getParticipantStateLabel = (state: number) => {
    switch (state) {
      case 0: return "Joining";
      case 1: return "Joined";
      case 2: return "Active";
      case 3: return "Disconnected";
      default: return "Unknown";
    }
  };

  const getParticipantKindLabel = (kind: number) => {
    switch (kind) {
      case 0: return "Standard";
      case 1: return "Ingress";
      case 2: return "Egress";
      case 3: return "SIP";
      case 4: return "Agent";
      default: return "Unknown";
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {(success || error) && (
        <Card className={error ? "bg-danger-50" : "bg-success-50"}>
          <CardContent className="flex flex-row items-center gap-2 py-2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-danger" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className={error ? "text-danger" : "text-success"}>
              {error || success}
            </span>
          </CardContent>
        </Card>
      )}

      <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as string)}>
        
        <TabsList>
          <TabsTrigger value="trunks">Trunks</TabsTrigger>
          <TabsTrigger value="dispatch">Dispatch Rules</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="calls">Call History</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="test-call">Test Call</TabsTrigger>
          <TabsTrigger value="sip">SIP/Magnus</TabsTrigger>
        </TabsList>

        {/* Trunks Tab */}
        <TabsContent value="trunks">
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                
                onClick={fetchTrunks}
                disabled={trunksLoading}
              ><RefreshCw className="w-4 h-4" /> 
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCreateTrunkType("inbound");
                  resetTrunkForm();
                  onOpenCreateTrunk();
                }}
              >
                <Plus className="w-4 h-4" />
                Add Inbound Trunk
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setCreateTrunkType("outbound");
                  resetTrunkForm();
                  onOpenCreateTrunk();
                }}
              >
                <Plus className="w-4 h-4" />
                Add Outbound Trunk
              </Button>
            </div>

            {/* Inbound Trunks */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneIncoming className="w-5 h-5 text-success" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Inbound Trunks</p>
                  <p className="text-sm text-muted-foreground">
                    {inboundTrunks.length} trunk(s) configured
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {trunksLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : inboundTrunks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No inbound trunks configured</p>
                ) : (
                  <Table aria-label="Inbound trunks">
                    <TableHeader>
                      <TableColumn>ID</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Numbers</TableColumn>
                      <TableColumn>Allowed Addresses</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {inboundTrunks.map((trunk) => (
                        <TableRow key={trunk.sip_trunk_id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs">{trunk.sip_trunk_id?.slice(0, 12) || "N/A"}...</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(trunk.sip_trunk_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{trunk.name || "Unnamed"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.numbers?.map((num, i) => (
                                <Badge key={i}  variant="secondary">{num}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.allowed_addresses?.map((addr, i) => (
                                <Badge key={i} variant="secondary">{addr}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmDelete("inbound-trunk", trunk.sip_trunk_id, trunk.name || "Inbound trunk")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Outbound Trunks */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneOutgoing className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Outbound Trunks</p>
                  <p className="text-sm text-muted-foreground">
                    {outboundTrunks.length} trunk(s) configured
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {trunksLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : outboundTrunks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No outbound trunks configured</p>
                ) : (
                  <Table aria-label="Outbound trunks">
                    <TableHeader>
                      <TableColumn>ID</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Address</TableColumn>
                      <TableColumn>Transport</TableColumn>
                      <TableColumn>Numbers</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {outboundTrunks.map((trunk) => (
                        <TableRow key={trunk.sip_trunk_id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs">{trunk.sip_trunk_id?.slice(0, 12) || "N/A"}...</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(trunk.sip_trunk_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{trunk.name || "Unnamed"}</TableCell>
                          <TableCell><code className="text-xs">{trunk.address}</code></TableCell>
                          <TableCell>
                            <Badge  variant="secondary">{trunk.transport?.toUpperCase() || "UDP"}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.numbers?.map((num, i) => (
                                <Badge key={i}  variant="secondary">{num}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmDelete("outbound-trunk", trunk.sip_trunk_id, trunk.name || "Outbound trunk")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Dispatch Rules Tab */}
        <TabsContent value="dispatch">
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                
                onClick={fetchDispatchRules}
                disabled={rulesLoading}
              ><RefreshCw className="w-4 h-4" /> 
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  resetRuleForm();
                  onOpenCreateRule();
                }}
              >
                <Plus className="w-4 h-4" />
                Add Dispatch Rule
              </Button>
            </div>

            {/* Dispatch Rules Table */}
            <Card>
              <CardHeader className="flex gap-3">
                <Route className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Dispatch Rules</p>
                  <p className="text-sm text-muted-foreground">
                    {dispatchRules.length} rule(s) configured
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {rulesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : dispatchRules.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No dispatch rules configured</p>
                ) : (
                  <Table aria-label="Dispatch rules">
                    <TableHeader>
                      <TableColumn>ID</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Trunk IDs</TableColumn>
                      <TableColumn>Room Prefix</TableColumn>
                      <TableColumn>PIN</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {dispatchRules.map((rule) => (
                        <TableRow key={rule.sip_dispatch_rule_id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs">{rule.sip_dispatch_rule_id?.slice(0, 12) || "N/A"}...</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(rule.sip_dispatch_rule_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{rule.name || "Unnamed"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {rule.trunk_ids?.map((id, i) => (
                                <Badge key={i}  variant="secondary">
                                  {id?.slice(0, 8) || "N/A"}...
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs">
                              {rule.rule?.dispatchRuleIndividual?.roomPrefix || "N/A"}
                            </code>
                          </TableCell>
                          <TableCell>
                            {rule.rule?.dispatchRuleIndividual?.pin ? (
                              <Badge variant="secondary">PIN Set</Badge>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => confirmDelete("dispatch-rule", rule.sip_dispatch_rule_id, rule.name || "Dispatch rule")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms">
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                
                onClick={fetchRooms}
                disabled={roomsLoading}
              ><RefreshCw className="w-4 h-4" /> 
                Refresh
              </Button>
            </div>

            {/* Rooms Table */}
            <Card>
              <CardHeader className="flex gap-3">
                <Radio className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Active Rooms</p>
                  <p className="text-sm text-muted-foreground">
                    {rooms.length} active room(s), {rooms.reduce((sum, r) => sum + (r.participants?.length || 0), 0)} total participants
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {roomsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : rooms.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No active rooms</p>
                ) : (
                  <Table aria-label="Active rooms">
                    <TableHeader>
                      <TableColumn>SID</TableColumn>
                      <TableColumn>Name</TableColumn>
                      <TableColumn>Participants</TableColumn>
                      <TableColumn>Created</TableColumn>
                      <TableColumn>Timeouts</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {rooms.map((room) => (
                        <TableRow key={room.sid}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <code className="text-xs">{room.sid?.slice(0, 12) || "N/A"}...</code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(room.sid)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{room.name}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={room.participants?.length > 0 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : ""}
                            >
                              {room.participants?.length || 0} / {room.maxParticipants || "∞"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(room.creationTime)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>Empty: {room.emptyTimeout || 0}s</span>
                              <span>Departure: {room.departureTimeout || 0}s</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openRoomDetails(room)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => confirmDelete("room", room.name, room.name)}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Close Room</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Calls Tab */}
        <TabsContent value="calls">
          <div className="mt-4 space-y-6">
            {/* Stats Cards */}
            {callsStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Calls</p>
                      <p className="text-lg font-semibold">{callsStats.totalCalls}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-success-100 rounded-lg">
                      <Clock className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Duration</p>
                      <p className="text-lg font-semibold">{formatDuration(callsStats.avgDuration)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-warning-100 rounded-lg">
                      <History className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Minutes</p>
                      <p className="text-lg font-semibold">{callsStats.totalMinutes}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Call History Table */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  <span className="font-semibold">Recent Calls</span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  
                  onClick={fetchCalls}
                  disabled={callsLoading}
                ><RefreshCw className="w-4 h-4" /> 
                  Refresh
                </Button>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {callsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : calls.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No call history found
                  </div>
                ) : (
                  <Table aria-label="Call history table" removeWrapper>
                    <TableHeader>
                      <TableColumn>Direction</TableColumn>
                      <TableColumn>Status</TableColumn>
                      <TableColumn>From</TableColumn>
                      <TableColumn>To</TableColumn>
                      <TableColumn>Agent</TableColumn>
                      <TableColumn>Duration</TableColumn>
                      <TableColumn>Time</TableColumn>
                      <TableColumn>Actions</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {calls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell>
                            <Badge
                              
                              variant="secondary"
                              color={call.direction === "inbound" ? "primary" : "secondary"}
                              
                            >
                              {call.direction}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              
                              variant="secondary"
                              color={getCallStatusColor(call.status) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                              
                            >
                              {call.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono">{call.fromNumber || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono">{call.toNumber || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{call.agentName || "N/A"}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{formatDuration(call.duration)}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {new Date(call.createdAt).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openCallDetails(call)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <div className="mt-4 space-y-6">
            {/* Log Filters */}
            <Card>
              <CardContent>
                <div className="flex flex-wrap gap-4 items-end">
                  <Select value={logLevel} onValueChange={setLogLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Log Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    label="Room Filter"
                    size="sm"
                    className="w-48"
                    placeholder="Filter by room name"
                    value={logRoomFilter}
                    onChange={(e) => setLogRoomFilter(e.target.value)}
                                      />
                  <Button
                    size="sm"
                    variant="secondary"
                    
                    onClick={fetchLogs}
                    disabled={logsLoading}
                  ><RefreshCw className="w-4 h-4" /> 
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs Display */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-semibold">Voice Service Logs</span>
                </div>
                <Badge  variant="secondary">
                  {logs.length} entries
                </Badge>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent className="max-h-[500px] overflow-auto">
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No logs available</p>
                    <p className="text-sm mt-1">Logs endpoint may not be available in voice service</p>
                  </div>
                ) : (
                  <div className="space-y-1 font-mono text-xs">
                    {logs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded ${
                          log.level === "error" ? "bg-danger-50 text-danger" :
                          log.level === "warning" ? "bg-warning-50 text-warning-700" :
                          log.level === "debug" ? "bg-muted/50 text-muted-foreground" :
                          "bg-muted"
                        }`}
                      >
                        <span className="text-muted-foreground">[{log.timestamp}]</span>
                        {" "}
                        <span className={`font-semibold uppercase ${
                          log.level === "error" ? "text-danger" :
                          log.level === "warning" ? "text-warning-600" :
                          log.level === "debug" ? "text-muted-foreground" :
                          "text-primary"
                        }`}>
                          {log.level}
                        </span>
                        {log.room && <span className="text-secondary ml-2">[{log.room}]</span>}
                        {log.source && <span className="text-muted-foreground ml-2">({log.source})</span>}
                        {": "}
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents">
          <div className="mt-4 space-y-6">
            {/* Agents Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-semibold">Voice Agents</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                
                onClick={fetchAgents}
                disabled={agentsLoading}
              ><RefreshCw className="w-4 h-4" /> 
                Refresh
              </Button>
            </div>

            {/* Agents List */}
            <Card>
              <CardContent>
                {agentsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No agents registered</p>
                    <p className="text-sm mt-1">Agents will appear here when the voice service registers them</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <Card key={agent.id} className="bg-muted/50">
                        <CardContent>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-5 h-5" />
                                <span className="font-medium">{agent.name}</span>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>ID: <code>{agent.id}</code></p>
                                {agent.job_count !== undefined && (
                                  <p>Jobs: {agent.job_count}</p>
                                )}
                              </div>
                            </div>
                            <Badge
                              
                              variant="secondary"
                              color={
                                agent.status === "available" ? "success" :
                                agent.status === "busy" ? "warning" :
                                "default"
                              }
                            >
                              {agent.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Call Tab */}
        <TabsContent value="test-call">
          <div className="mt-4 space-y-6">
            {/* Test Call Form */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneCall className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">Initiate Test Outbound Call</p>
                  <p className="text-sm text-muted-foreground">
                    Test the outbound calling functionality by placing a test call
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent className="space-y-4">
                <Input
                  label="Phone Number"
                  placeholder="Enter phone number (e.g., +17672958382)"
                  value={testCallPhoneNumber}
                  onChange={(e) => setTestCallPhoneNumber(e.target.value)}
                                    description="Include country code (e.g., +1 for US)"
                />

                <Select value={testCallAgentId} onValueChange={setTestCallAgentId} disabled={voiceAgentsLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent or leave empty for default" />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} {agent.organizationName ? `(${agent.organizationName})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Button
                    
                    onClick={handleTestCall}
                    disabled={testCallLoading || !testCallPhoneNumber}
                  >testCallLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" /> 
                    Initiate Call
                  </Button>
                  <Button
                    variant="secondary"
                    
                    onClick={fetchVoiceAgents}
                    disabled={voiceAgentsLoading}
                  ><RefreshCw className="w-4 h-4" /> 
                    Refresh Agents
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test Call Result */}
            {testCallResult && (
              <Card className={testCallResult.success ? "bg-success-50" : "bg-danger-50"}>
                <CardHeader className="flex gap-3">
                  {testCallResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-danger" />
                  )}
                  <div className="flex flex-col">
                    <p className="text-base font-semibold">
                      {testCallResult.success ? "Call Initiated Successfully" : "Call Failed"}
                    </p>
                  </div>
                </CardHeader>
                <div className="border-t my-4" />
                <CardContent>
                  {testCallResult.success ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Call ID</p>
                          <div className="flex items-center gap-1">
                            <code className="text-sm">{testCallResult.callId}</code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(testCallResult.callId!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Room Name</p>
                          <code className="text-sm">{testCallResult.roomName}</code>
                        </div>
                        {testCallResult.sipCallId && (
                          <div>
                            <p className="text-xs text-muted-foreground">SIP Call ID</p>
                            <code className="text-sm">{testCallResult.sipCallId}</code>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-success mt-4">
                        The phone should ring shortly. Check the Call History tab to monitor the call status.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-danger font-medium">{testCallResult.error}</p>
                      {testCallResult.details && (
                        <p className="text-sm text-muted-foreground">{testCallResult.details}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-warning" />
                  <span className="font-semibold">Troubleshooting Tips</span>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">1.</span>
                    <p>Ensure you have at least one <strong>Outbound Trunk</strong> configured with valid SIP credentials.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">2.</span>
                    <p>The phone number format should include the country code (e.g., +17672958382 for US numbers).</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">3.</span>
                    <p>Check the <strong>Call History</strong> tab to see the call status and any error messages.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">4.</span>
                    <p>Check the <strong>Logs</strong> tab for detailed voice service logs if the call fails.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">5.</span>
                    <p>Check the <strong>Rooms</strong> tab to see if a LiveKit room was created for the call.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-primary">6.</span>
                    <p>Check the <strong>SIP/Magnus</strong> tab to verify SIP accounts are properly configured.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SIP/Magnus Diagnostics Tab */}
        <TabsContent value="sip">
          <div className="mt-4 space-y-6">
            {/* Magnus Integration Status */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div className="flex gap-3">
                  <Database className="w-5 h-5 text-primary" />
                  <div className="flex flex-col">
                    <p className="text-base font-semibold">Magnus Integration Status</p>
                    <p className="text-sm text-muted-foreground">
                      Connection status and DID usage from Magnus Billing
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  
                  onClick={() => fetchMagnusDiagnostics(true)}
                  disabled={magnusDiagnosticsLoading}
                >
                  {magnusDiagnosticsLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  Refresh
                </Button>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {magnusDiagnosticsLoading && !magnusDiagnostics ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : magnusDiagnostics ? (
                  <div className="space-y-6">
                    {/* Overall Status */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">Overall Status:</span>
                      <Badge
                        color={magnusDiagnostics.overall_status === "healthy" ? "success" : magnusDiagnostics.overall_status === "degraded" ? "warning" : "danger"}
                        variant="secondary"
                        
                      >
                        {magnusDiagnostics.overall_status.toUpperCase()}
                      </Badge>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Magnus API Status */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Link className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">API Connection</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              
                              color={magnusDiagnostics.magnus_integration.status === "connected" ? "success" : "danger"}
                              variant="outline"
                            >
                              {magnusDiagnostics.magnus_integration.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {magnusDiagnostics.magnus_integration.api_response_time_ms}ms
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Total DIDs: {magnusDiagnostics.magnus_integration.total_dids_in_magnus}
                          </p>
                        </CardContent>
                      </Card>

                      {/* DID Usage */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">DID Usage</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">
                              {magnusDiagnostics.did_usage.currently_used}
                            </span>
                            <span className="text-muted-foreground">
                              / {magnusDiagnostics.did_usage.total_capacity}
                            </span>
                          </div>
                          <div className="w-full bg-default-200 rounded-full h-2 mt-2">
                            <div
                              className={`h-2 rounded-full ${
                                magnusDiagnostics.did_usage.utilization_percent > 80 ? "bg-danger" :
                                magnusDiagnostics.did_usage.utilization_percent > 50 ? "bg-warning" : "bg-success"
                              }`}
                              style={{ width: `${magnusDiagnostics.did_usage.utilization_percent}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {magnusDiagnostics.did_usage.utilization_percent.toFixed(1)}% utilized
                          </p>
                        </CardContent>
                      </Card>

                      {/* Health Score */}
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">Health Score</span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-2xl font-bold ${
                              magnusDiagnostics.did_usage.health_score >= 80 ? "text-success" :
                              magnusDiagnostics.did_usage.health_score >= 50 ? "text-warning" : "text-danger"
                            }`}>
                              {magnusDiagnostics.did_usage.health_score}
                            </span>
                            <span className="text-muted-foreground">/ 100</span>
                          </div>
                          <Badge
                            
                            color={magnusDiagnostics.did_usage.status === "healthy" ? "success" : "warning"}
                            variant="secondary"
                            className="mt-2"
                          >
                            {magnusDiagnostics.did_usage.status_message}
                          </Badge>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Configuration */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Settings className="w-4 h-4" /> Configuration
                      </h4>
                      <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs space-y-1">
                        <div><span className="text-muted-foreground">Magnus URL:</span> {magnusDiagnostics.configuration.magnus_url}</div>
                        <div><span className="text-muted-foreground">SIP Server:</span> {magnusDiagnostics.configuration.sip_server}</div>
                        <div><span className="text-muted-foreground">DID Range:</span> {magnusDiagnostics.configuration.did_range}</div>
                      </div>
                    </div>

                    {/* Errors */}
                    {magnusDiagnostics.errors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-danger">
                          <AlertCircle className="w-4 h-4" /> Errors ({magnusDiagnostics.errors.length})
                        </h4>
                        <div className="bg-danger-50 rounded-lg p-3 space-y-1">
                          {magnusDiagnostics.errors.map((err, i) => (
                            <p key={i} className="text-xs text-danger">{err}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No Magnus diagnostics available</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-2"
                      onClick={() => fetchMagnusDiagnostics(true)}
                    >
                      Load Diagnostics
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* SIP Account Validation */}
            <Card>
              <CardHeader className="flex gap-3">
                <Wrench className="w-5 h-5 text-warning" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">SIP Account Validation</p>
                  <p className="text-sm text-muted-foreground">
                    Verify that outbound trunk phone numbers have corresponding SIP accounts in Magnus/Asterisk
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                {sipValidationsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
                  </div>
                ) : sipValidations.length > 0 ? (
                  <Table aria-label="SIP Account Validations">
                    <TableHeader>
                      <TableColumn>TRUNK ID</TableColumn>
                      <TableColumn>PHONE NUMBER</TableColumn>
                      <TableColumn>SIP ACCOUNT STATUS</TableColumn>
                      <TableColumn>DETAILS</TableColumn>
                      <TableColumn>ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody>
                      {sipValidations.map((validation, index) => (
                        <TableRow key={`${validation.trunkId}-${validation.number}-${index}`}>
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-mono text-xs cursor-help">
                                    {validation.trunkId.substring(0, 12)}...
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{validation.trunkId}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono">{validation.number}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={validation.sipAccountExists ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}
                            >
                              {validation.sipAccountExists ? "EXISTS" : "MISSING"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {validation.sipAccountExists && validation.sipAccountDetails ? (
                              <div className="text-xs space-y-0.5">
                                <div><span className="text-muted-foreground">insecure:</span> {validation.sipAccountDetails.insecure}</div>
                                <div><span className="text-muted-foreground">fromdomain:</span> {validation.sipAccountDetails.fromdomain || "N/A"}</div>
                                <div><span className="text-muted-foreground">transport:</span> {validation.sipAccountDetails.transport || "N/A"}</div>
                              </div>
                            ) : validation.error ? (
                              <span className="text-xs text-danger">{validation.error}</span>
                            ) : (
                              <span className="text-xs text-warning">
                                No SIP account found - calls will fail with 403 Forbidden
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {!validation.sipAccountExists && !validation.error && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleFixSipAccount(validation.number)}
                                disabled={loading}
                              >
                                {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Wrench className="w-3 h-3 mr-1" />}
                                Create SIP Account
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No SIP validations yet</p>
                    <p className="text-xs mt-1">Click Refresh above to validate outbound trunk phone numbers</p>
                  </div>
                )}

                {/* Summary Stats */}
                {sipValidations.length > 0 && (
                  <div className="mt-4 flex gap-4 justify-center">
                    <Badge variant="secondary">
                      {sipValidations.filter(v => v.sipAccountExists).length} Valid
                    </Badge>
                    <Badge variant="destructive">
                      {sipValidations.filter(v => !v.sipAccountExists && !v.error).length} Missing
                    </Badge>
                    <Badge variant="secondary">
                      {sipValidations.filter(v => v.error).length} Errors
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Troubleshooting Guide */}
            <Card>
              <CardHeader className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-warning" />
                <div className="flex flex-col">
                  <p className="text-base font-semibold">SIP Call Failure Troubleshooting</p>
                  <p className="text-sm text-muted-foreground">
                    Common issues when outbound calls fail with 401/403 errors
                  </p>
                </div>
              </CardHeader>
              <div className="border-t my-4" />
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="bg-danger-50 rounded-lg p-4">
                    <h4 className="font-semibold text-danger mb-2">403 Forbidden Error</h4>
                    <p className="mb-2">This typically means:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>The SIP account doesn&apos;t exist in Magnus/Asterisk for the outbound number</li>
                      <li>The &apos;insecure&apos; setting is wrong (should be &apos;port,invite&apos; for LiveKit)</li>
                      <li>The &apos;fromdomain&apos; doesn&apos;t match LiveKit&apos;s SIP domain</li>
                    </ul>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Fix: Use the &quot;Create SIP Account&quot; button above to create missing accounts with correct settings
                    </p>
                  </div>

                  <div className="bg-warning-50 rounded-lg p-4">
                    <h4 className="font-semibold text-warning mb-2">401 Unauthorized Error</h4>
                    <p className="mb-2">This typically means:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>SIP credentials (username/password) are incorrect</li>
                      <li>The authentication realm doesn&apos;t match</li>
                      <li>HMAC signature calculation is failing</li>
                    </ul>
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Expected SIP Account Settings</h4>
                    <div className="font-mono text-xs space-y-1 text-muted-foreground">
                      <div>• <span className="text-primary">username:</span> &lt;phone_number_digits_only&gt;</div>
                      <div>• <span className="text-primary">insecure:</span> port,invite</div>
                      <div>• <span className="text-primary">fromdomain:</span> *.sip.livekit.cloud</div>
                      <div>• <span className="text-primary">transport:</span> udp</div>
                      <div>• <span className="text-primary">context:</span> from-internal</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Trunk Modal */}
      <Dialog open={isCreateTrunkOpen} onOpenChange={(open) => { if (!open) onCloseCreateTrunk(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>
            Create {createTrunkType === "inbound" ? "Inbound" : "Outbound"} Trunk
          </DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="Enter trunk name"
                value={trunkForm.name}
                onChange={(e) => setTrunkForm({ ...trunkForm, name: e.target.value })}
              />
              <Input
                label="Phone Numbers"
                placeholder="Comma-separated (e.g., +15551234567, +15559876543)"
                value={trunkForm.numbers}
                onChange={(e) => setTrunkForm({ ...trunkForm, numbers: e.target.value })}
              />

              {createTrunkType === "inbound" ? (
                <Input
                  label="Allowed Addresses"
                  placeholder="Comma-separated IP addresses (e.g., 0.0.0.0/0)"
                  value={trunkForm.allowed_addresses}
                  onChange={(e) => setTrunkForm({ ...trunkForm, allowed_addresses: e.target.value })}
                />
              ) : (
                <>
                  <Input
                    label="SIP Address"
                    placeholder="e.g., sip.provider.com:5060"
                    value={trunkForm.address}
                    onChange={(e) => setTrunkForm({ ...trunkForm, address: e.target.value })}
                  />
                  <Select value={trunkForm.transport} onValueChange={(v) => setTrunkForm({ ...trunkForm, transport: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Transport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="udp">UDP</SelectItem>
                      <SelectItem value="tcp">TCP</SelectItem>
                      <SelectItem value="tls">TLS</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    label="Auth Username"
                    placeholder="SIP username"
                    value={trunkForm.auth_username}
                    onChange={(e) => setTrunkForm({ ...trunkForm, auth_username: e.target.value })}
                  />
                  <Input
                    label="Auth Password"
                    type="password"
                    placeholder="SIP password"
                    value={trunkForm.auth_password}
                    onChange={(e) => setTrunkForm({ ...trunkForm, auth_password: e.target.value })}
                  />
                </>
              )}

              <Textarea
                label="Metadata (JSON)"
                placeholder='{"key": "value"}'
                value={trunkForm.metadata}
                onChange={(e) => setTrunkForm({ ...trunkForm, metadata: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onCloseCreateTrunk}>
              Cancel
            </Button>
            <Button
              disabled={loading || !trunkForm.name || !trunkForm.numbers}
              onClick={handleCreateTrunk}
            >
              Create Trunk
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>

      {/* Create Dispatch Rule Modal */}
      <Dialog open={isCreateRuleOpen} onOpenChange={(open) => { if (!open) onCloseCreateRule(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Dispatch Rule</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="Rule name"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />
              <Input
                label="Agent Name"
                placeholder="epic-voice-agent"
                value={ruleForm.agent_name}
                onChange={(e) => setRuleForm({ ...ruleForm, agent_name: e.target.value })}
              />
              <Input
                label="Trunk IDs"
                placeholder="Comma-separated trunk IDs"
                value={ruleForm.trunk_ids}
                onChange={(e) => setRuleForm({ ...ruleForm, trunk_ids: e.target.value })}
              />
              <Input
                label="Phone Numbers"
                placeholder="Comma-separated phone numbers (optional)"
                value={ruleForm.phone_numbers}
                onChange={(e) => setRuleForm({ ...ruleForm, phone_numbers: e.target.value })}
              />
              <Input
                label="Room Prefix"
                placeholder="call-"
                value={ruleForm.room_prefix}
                onChange={(e) => setRuleForm({ ...ruleForm, room_prefix: e.target.value })}
              />
              <Input
                label="PIN (optional)"
                placeholder="1234"
                value={ruleForm.pin}
                onChange={(e) => setRuleForm({ ...ruleForm, pin: e.target.value })}
              />
              <div className="border-t my-4" />
              <p className="text-sm text-muted-foreground">Optional: Associate with specific resources</p>
              <div className="grid grid-cols-3 gap-4">
                <Input
                  label="Organization ID"
                  placeholder="org-..."
                  size="sm"
                  value={ruleForm.organization_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, organization_id: e.target.value })}
                />
                <Input
                  label="User ID"
                  placeholder="user-..."
                  size="sm"
                  value={ruleForm.user_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, user_id: e.target.value })}
                />
                <Input
                  label="Agent ID"
                  placeholder="agent-..."
                  size="sm"
                  value={ruleForm.agent_id}
                  onChange={(e) => setRuleForm({ ...ruleForm, agent_id: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onCloseCreateRule}>
              Cancel
            </Button>
            <Button
              disabled={loading || !ruleForm.name || !ruleForm.agent_name}
              onClick={handleCreateRule}
            >
              Create Rule
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>

      {/* Room Details Modal */}
      <Dialog open={isRoomDetailOpen} onOpenChange={(open) => { if (!open) onCloseRoomDetail(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>
            Room: {selectedRoom?.name}
          </DialogTitle></DialogHeader>
          <div className="py-4">
            {selectedRoom && (
              <div className="space-y-6">
                {/* Room Info */}
                <Card>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">SID</p>
                        <code className="text-xs">{selectedRoom.sid}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm">{formatTimestamp(selectedRoom.creationTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Empty Timeout</p>
                        <p className="text-sm">{selectedRoom.emptyTimeout || 0}s</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Departure Timeout</p>
                        <p className="text-sm">{selectedRoom.departureTimeout || 0}s</p>
                      </div>
                    </div>
                    {selectedRoom.metadata && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {selectedRoom.metadata}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Participants */}
                <Card>
                  <CardHeader>
                    <Users className="w-5 h-5 mr-2" />
                    <span>Participants ({selectedRoom.participants?.length || 0})</span>
                  </CardHeader>
                  <div className="border-t my-4" />
                  <CardContent>
                    {selectedRoom.participants?.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">No participants</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedRoom.participants?.map((p) => (
                          <Card key={p.sid} className="bg-muted/50">
                            <CardContent>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">{p.name || p.identity}</span>
                                    <Badge  variant="secondary" color={p.state === 2 ? "success" : "default"}>
                                      {getParticipantStateLabel(p.state)}
                                    </Badge>
                                    <Badge  variant="secondary" >
                                      {getParticipantKindLabel(p.kind)}
                                    </Badge>
                                    {p.isPublisher && (
                                      <Badge variant="secondary">Publisher</Badge>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                    <div>SID: <code>{p.sid}</code></div>
                                    <div>Identity: <code>{p.identity}</code></div>
                                    <div>Joined: {formatTimestamp(p.joinedAt)}</div>
                                  </div>

                                  {/* Tracks */}
                                  {p.tracks && p.tracks.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-muted-foreground mb-1">Tracks:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {p.tracks.map((track) => (
                                          <Badge
                                            key={track.sid}
                                            
                                            variant="secondary"
                                            
                                            color={track.muted ? "default" : "success"}
                                          >
                                            {track.name || `Track ${track.type}`}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Attributes */}
                                  {Object.keys(p.attributes || {}).length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-muted-foreground mb-1">Attributes:</p>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {JSON.stringify(p.attributes, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  {p.metadata && (
                                    <div className="mt-3">
                                      <p className="text-xs text-muted-foreground mb-1">Metadata:</p>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                        {p.metadata}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onCloseRoomDetail}>
              Close
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>

      {/* Call Details Modal */}
      <Dialog open={isCallDetailOpen} onOpenChange={(open) => { if (!open) onCloseCallDetail(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>
            Call Details
          </DialogTitle></DialogHeader>
          <div className="py-4">
            {selectedCall && (
              <div className="space-y-6">
                {/* Call Summary */}
                <Card>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Direction</p>
                        <Badge
                          
                          variant="secondary"
                          color={selectedCall.direction === "inbound" ? "primary" : "secondary"}
                          
                        >
                          {selectedCall.direction}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge
                          
                          variant="secondary"
                          color={getCallStatusColor(selectedCall.status) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                          
                        >
                          {selectedCall.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium">{formatDuration(selectedCall.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Created</p>
                        <p className="text-sm">{new Date(selectedCall.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Phone Numbers */}
                <Card>
                  <CardHeader>
                    <Phone className="w-5 h-5 mr-2" />
                    <span>Phone Numbers</span>
                  </CardHeader>
                  <div className="border-t my-4" />
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">From</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{selectedCall.fromNumber || "N/A"}</code>
                          {selectedCall.fromNumber && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(selectedCall.fromNumber!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">To</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{selectedCall.toNumber || "N/A"}</code>
                          {selectedCall.toNumber && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(selectedCall.toNumber!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timing */}
                <Card>
                  <CardHeader>
                    <Clock className="w-5 h-5 mr-2" />
                    <span>Timing</span>
                  </CardHeader>
                  <div className="border-t my-4" />
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Started At</p>
                        <p className="text-sm">{selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ended At</p>
                        <p className="text-sm">{selectedCall.endedAt ? new Date(selectedCall.endedAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm font-medium">{formatDuration(selectedCall.duration)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Details */}
                <Card>
                  <CardHeader>
                    <Server className="w-5 h-5 mr-2" />
                    <span>Technical Details</span>
                  </CardHeader>
                  <div className="border-t my-4" />
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Call ID</p>
                        <code className="text-xs">{selectedCall.id}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Room Name</p>
                        <code className="text-xs">{selectedCall.roomName || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SIP Call ID</p>
                        <code className="text-xs">{selectedCall.sipCallId || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Participant Identity</p>
                        <code className="text-xs">{selectedCall.participantIdentity || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Agent</p>
                        <p className="text-sm">{selectedCall.agentName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Agent ID</p>
                        <code className="text-xs">{selectedCall.agentId || "N/A"}</code>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Error Details (if any) */}
                {selectedCall.errorMessage && (
                  <Card className="border-danger-200 bg-danger-50">
                    <CardHeader>
                      <AlertCircle className="w-5 h-5 mr-2 text-danger" />
                      <span className="text-danger">Error</span>
                    </CardHeader>
                    <div className="border-t my-4" />
                    <CardContent>
                      <p className="text-sm text-danger">{selectedCall.errorMessage}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata (if any) */}
                {selectedCall.metadata && Object.keys(selectedCall.metadata).length > 0 && (
                  <Card>
                    <CardHeader>
                      <span>Metadata</span>
                    </CardHeader>
                    <div className="border-t my-4" />
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                        {JSON.stringify(selectedCall.metadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onCloseCallDetail}>
              Close
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={(open) => { if (!open) onCloseDeleteConfirm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onCloseDeleteConfirm}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={loading} onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter></DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Chip,
  Divider,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Textarea,
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
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

  // Modal states
  const { isOpen: isCreateTrunkOpen, onOpen: onOpenCreateTrunk, onClose: onCloseCreateTrunk } = useDisclosure();
  const { isOpen: isCreateRuleOpen, onOpen: onOpenCreateRule, onClose: onCloseCreateRule } = useDisclosure();
  const { isOpen: isRoomDetailOpen, onOpen: onOpenRoomDetail, onClose: onCloseRoomDetail } = useDisclosure();
  const { isOpen: isCallDetailOpen, onOpen: onOpenCallDetail, onClose: onCloseCallDetail } = useDisclosure();
  const { isOpen: isDeleteConfirmOpen, onOpen: onOpenDeleteConfirm, onClose: onCloseDeleteConfirm } = useDisclosure();

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
          <CardBody className="flex flex-row items-center gap-2 py-2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-danger" />
            ) : (
              <CheckCircle className="w-4 h-4 text-success" />
            )}
            <span className={error ? "text-danger" : "text-success"}>
              {error || success}
            </span>
          </CardBody>
        </Card>
      )}

      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        aria-label="LiveKit management sections"
      >
        {/* Trunks Tab */}
        <Tab key="trunks" title={<div className="flex items-center gap-2"><Phone className="w-4 h-4" />Trunks</div>}>
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={fetchTrunks}
                isLoading={trunksLoading}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  setCreateTrunkType("inbound");
                  resetTrunkForm();
                  onOpenCreateTrunk();
                }}
              >
                Add Inbound Trunk
              </Button>
              <Button
                size="sm"
                color="secondary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  setCreateTrunkType("outbound");
                  resetTrunkForm();
                  onOpenCreateTrunk();
                }}
              >
                Add Outbound Trunk
              </Button>
            </div>

            {/* Inbound Trunks */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneIncoming className="w-5 h-5 text-success" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Inbound Trunks</p>
                  <p className="text-small text-default-500">
                    {inboundTrunks.length} trunk(s) configured
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                {trunksLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : inboundTrunks.length === 0 ? (
                  <p className="text-center text-default-500 py-4">No inbound trunks configured</p>
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
                              <code className="text-xs">{trunk.sip_trunk_id.slice(0, 12)}...</code>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => copyToClipboard(trunk.sip_trunk_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{trunk.name || "Unnamed"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.numbers?.map((num, i) => (
                                <Chip key={i} size="sm" variant="flat">{num}</Chip>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.allowed_addresses?.map((addr, i) => (
                                <Chip key={i} size="sm" variant="flat" color="secondary">{addr}</Chip>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => confirmDelete("inbound-trunk", trunk.sip_trunk_id, trunk.name || "Inbound trunk")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>

            {/* Outbound Trunks */}
            <Card>
              <CardHeader className="flex gap-3">
                <PhoneOutgoing className="w-5 h-5 text-primary" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Outbound Trunks</p>
                  <p className="text-small text-default-500">
                    {outboundTrunks.length} trunk(s) configured
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                {trunksLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : outboundTrunks.length === 0 ? (
                  <p className="text-center text-default-500 py-4">No outbound trunks configured</p>
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
                              <code className="text-xs">{trunk.sip_trunk_id.slice(0, 12)}...</code>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => copyToClipboard(trunk.sip_trunk_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{trunk.name || "Unnamed"}</TableCell>
                          <TableCell><code className="text-xs">{trunk.address}</code></TableCell>
                          <TableCell>
                            <Chip size="sm" variant="flat">{trunk.transport?.toUpperCase() || "UDP"}</Chip>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {trunk.numbers?.map((num, i) => (
                                <Chip key={i} size="sm" variant="flat">{num}</Chip>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => confirmDelete("outbound-trunk", trunk.sip_trunk_id, trunk.name || "Outbound trunk")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Dispatch Rules Tab */}
        <Tab key="dispatch" title={<div className="flex items-center gap-2"><Route className="w-4 h-4" />Dispatch Rules</div>}>
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={fetchDispatchRules}
                isLoading={rulesLoading}
              >
                Refresh
              </Button>
              <Button
                size="sm"
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                onPress={() => {
                  resetRuleForm();
                  onOpenCreateRule();
                }}
              >
                Add Dispatch Rule
              </Button>
            </div>

            {/* Dispatch Rules Table */}
            <Card>
              <CardHeader className="flex gap-3">
                <Route className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Dispatch Rules</p>
                  <p className="text-small text-default-500">
                    {dispatchRules.length} rule(s) configured
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                {rulesLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : dispatchRules.length === 0 ? (
                  <p className="text-center text-default-500 py-4">No dispatch rules configured</p>
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
                              <code className="text-xs">{rule.sip_dispatch_rule_id.slice(0, 12)}...</code>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => copyToClipboard(rule.sip_dispatch_rule_id)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{rule.name || "Unnamed"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {rule.trunk_ids?.map((id, i) => (
                                <Chip key={i} size="sm" variant="flat">
                                  {id.slice(0, 8)}...
                                </Chip>
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
                              <Chip size="sm" color="warning" variant="flat">PIN Set</Chip>
                            ) : (
                              <span className="text-default-400">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              isIconOnly
                              size="sm"
                              color="danger"
                              variant="light"
                              onPress={() => confirmDelete("dispatch-rule", rule.sip_dispatch_rule_id, rule.name || "Dispatch rule")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Rooms Tab */}
        <Tab key="rooms" title={<div className="flex items-center gap-2"><Users className="w-4 h-4" />Rooms</div>}>
          <div className="mt-4 space-y-6">
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={fetchRooms}
                isLoading={roomsLoading}
              >
                Refresh
              </Button>
            </div>

            {/* Rooms Table */}
            <Card>
              <CardHeader className="flex gap-3">
                <Radio className="w-5 h-5" />
                <div className="flex flex-col">
                  <p className="text-md font-semibold">Active Rooms</p>
                  <p className="text-small text-default-500">
                    {rooms.length} active room(s), {rooms.reduce((sum, r) => sum + (r.participants?.length || 0), 0)} total participants
                  </p>
                </div>
              </CardHeader>
              <Divider />
              <CardBody>
                {roomsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner />
                  </div>
                ) : rooms.length === 0 ? (
                  <p className="text-center text-default-500 py-4">No active rooms</p>
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
                              <code className="text-xs">{room.sid.slice(0, 12)}...</code>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => copyToClipboard(room.sid)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{room.name}</span>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              color={room.participants?.length > 0 ? "success" : "default"}
                              variant="flat"
                            >
                              {room.participants?.length || 0} / {room.maxParticipants || "∞"}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-default-500">
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
                              <Tooltip content="View Details">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  onPress={() => openRoomDetails(room)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="Close Room">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  onPress={() => confirmDelete("room", room.name, room.name)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Calls Tab */}
        <Tab key="calls" title={<div className="flex items-center gap-2"><History className="w-4 h-4" />Call History</div>}>
          <div className="mt-4 space-y-6">
            {/* Stats Cards */}
            {callsStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardBody className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-default-500">Total Calls</p>
                      <p className="text-lg font-semibold">{callsStats.totalCalls}</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-success-100 rounded-lg">
                      <Clock className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-default-500">Avg Duration</p>
                      <p className="text-lg font-semibold">{formatDuration(callsStats.avgDuration)}</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="flex flex-row items-center gap-3">
                    <div className="p-2 bg-warning-100 rounded-lg">
                      <History className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-default-500">Total Minutes</p>
                      <p className="text-lg font-semibold">{callsStats.totalMinutes}</p>
                    </div>
                  </CardBody>
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
                  variant="flat"
                  startContent={<RefreshCw className="w-4 h-4" />}
                  onPress={fetchCalls}
                  isLoading={callsLoading}
                >
                  Refresh
                </Button>
              </CardHeader>
              <Divider />
              <CardBody>
                {callsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : calls.length === 0 ? (
                  <div className="text-center py-8 text-default-500">
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
                            <Chip
                              size="sm"
                              variant="flat"
                              color={call.direction === "inbound" ? "primary" : "secondary"}
                              startContent={
                                call.direction === "inbound"
                                  ? <ArrowDownLeft className="w-3 h-3" />
                                  : <ArrowUpRight className="w-3 h-3" />
                              }
                            >
                              {call.direction}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={getCallStatusColor(call.status) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                              startContent={getCallStatusIcon(call.status)}
                            >
                              {call.status}
                            </Chip>
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
                            <span className="text-xs text-default-500">
                              {new Date(call.createdAt).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Tooltip content="View Details">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onPress={() => openCallDetails(call)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Logs Tab */}
        <Tab key="logs" title={<div className="flex items-center gap-2"><FileText className="w-4 h-4" />Logs</div>}>
          <div className="mt-4 space-y-6">
            {/* Log Filters */}
            <Card>
              <CardBody>
                <div className="flex flex-wrap gap-4 items-end">
                  <Select
                    label="Log Level"
                    size="sm"
                    className="w-32"
                    selectedKeys={[logLevel]}
                    onChange={(e) => setLogLevel(e.target.value)}
                  >
                    <SelectItem key="debug">Debug</SelectItem>
                    <SelectItem key="info">Info</SelectItem>
                    <SelectItem key="warning">Warning</SelectItem>
                    <SelectItem key="error">Error</SelectItem>
                  </Select>
                  <Input
                    label="Room Filter"
                    size="sm"
                    className="w-48"
                    placeholder="Filter by room name"
                    value={logRoomFilter}
                    onChange={(e) => setLogRoomFilter(e.target.value)}
                    startContent={<Filter className="w-4 h-4 text-default-400" />}
                  />
                  <Button
                    size="sm"
                    variant="flat"
                    startContent={<RefreshCw className="w-4 h-4" />}
                    onPress={fetchLogs}
                    isLoading={logsLoading}
                  >
                    Refresh
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Logs Display */}
            <Card>
              <CardHeader className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  <span className="font-semibold">Voice Service Logs</span>
                </div>
                <Chip size="sm" variant="flat">
                  {logs.length} entries
                </Chip>
              </CardHeader>
              <Divider />
              <CardBody className="max-h-[500px] overflow-auto">
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-8 text-default-500">
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
                          log.level === "debug" ? "bg-default-50 text-default-500" :
                          "bg-default-100"
                        }`}
                      >
                        <span className="text-default-400">[{log.timestamp}]</span>
                        {" "}
                        <span className={`font-semibold uppercase ${
                          log.level === "error" ? "text-danger" :
                          log.level === "warning" ? "text-warning-600" :
                          log.level === "debug" ? "text-default-400" :
                          "text-primary"
                        }`}>
                          {log.level}
                        </span>
                        {log.room && <span className="text-secondary ml-2">[{log.room}]</span>}
                        {log.source && <span className="text-default-400 ml-2">({log.source})</span>}
                        {": "}
                        <span>{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        {/* Agents Tab */}
        <Tab key="agents" title={<div className="flex items-center gap-2"><Bot className="w-4 h-4" />Agents</div>}>
          <div className="mt-4 space-y-6">
            {/* Agents Header */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-semibold">Voice Agents</span>
              </div>
              <Button
                size="sm"
                variant="flat"
                startContent={<RefreshCw className="w-4 h-4" />}
                onPress={fetchAgents}
                isLoading={agentsLoading}
              >
                Refresh
              </Button>
            </div>

            {/* Agents List */}
            <Card>
              <CardBody>
                {agentsLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="lg" />
                  </div>
                ) : agents.length === 0 ? (
                  <div className="text-center py-8 text-default-500">
                    <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No agents registered</p>
                    <p className="text-sm mt-1">Agents will appear here when the voice service registers them</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <Card key={agent.id} className="bg-default-50">
                        <CardBody>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Bot className="w-5 h-5" />
                                <span className="font-medium">{agent.name}</span>
                              </div>
                              <div className="space-y-1 text-xs text-default-500">
                                <p>ID: <code>{agent.id}</code></p>
                                {agent.job_count !== undefined && (
                                  <p>Jobs: {agent.job_count}</p>
                                )}
                              </div>
                            </div>
                            <Chip
                              size="sm"
                              variant="flat"
                              color={
                                agent.status === "available" ? "success" :
                                agent.status === "busy" ? "warning" :
                                "default"
                              }
                            >
                              {agent.status}
                            </Chip>
                          </div>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* Create Trunk Modal */}
      <Modal isOpen={isCreateTrunkOpen} onClose={onCloseCreateTrunk} size="2xl">
        <ModalContent>
          <ModalHeader>
            Create {createTrunkType === "inbound" ? "Inbound" : "Outbound"} Trunk
          </ModalHeader>
          <ModalBody>
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
                  <Select
                    label="Transport"
                    selectedKeys={[trunkForm.transport]}
                    onChange={(e) => setTrunkForm({ ...trunkForm, transport: e.target.value })}
                  >
                    <SelectItem key="udp">UDP</SelectItem>
                    <SelectItem key="tcp">TCP</SelectItem>
                    <SelectItem key="tls">TLS</SelectItem>
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
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseCreateTrunk}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={loading}
              onPress={handleCreateTrunk}
              isDisabled={!trunkForm.name || !trunkForm.numbers}
            >
              Create Trunk
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Create Dispatch Rule Modal */}
      <Modal isOpen={isCreateRuleOpen} onClose={onCloseCreateRule} size="2xl">
        <ModalContent>
          <ModalHeader>Create Dispatch Rule</ModalHeader>
          <ModalBody>
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
              <Divider />
              <p className="text-sm text-default-500">Optional: Associate with specific resources</p>
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
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseCreateRule}>
              Cancel
            </Button>
            <Button
              color="primary"
              isLoading={loading}
              onPress={handleCreateRule}
              isDisabled={!ruleForm.name || !ruleForm.agent_name}
            >
              Create Rule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Room Details Modal */}
      <Modal isOpen={isRoomDetailOpen} onClose={onCloseRoomDetail} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            Room: {selectedRoom?.name}
          </ModalHeader>
          <ModalBody>
            {selectedRoom && (
              <div className="space-y-6">
                {/* Room Info */}
                <Card>
                  <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-default-500">SID</p>
                        <code className="text-xs">{selectedRoom.sid}</code>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Created</p>
                        <p className="text-sm">{formatTimestamp(selectedRoom.creationTime)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Empty Timeout</p>
                        <p className="text-sm">{selectedRoom.emptyTimeout || 0}s</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Departure Timeout</p>
                        <p className="text-sm">{selectedRoom.departureTimeout || 0}s</p>
                      </div>
                    </div>
                    {selectedRoom.metadata && (
                      <div className="mt-4">
                        <p className="text-xs text-default-500 mb-1">Metadata</p>
                        <pre className="text-xs bg-default-100 p-2 rounded overflow-auto">
                          {selectedRoom.metadata}
                        </pre>
                      </div>
                    )}
                  </CardBody>
                </Card>

                {/* Participants */}
                <Card>
                  <CardHeader>
                    <Users className="w-5 h-5 mr-2" />
                    <span>Participants ({selectedRoom.participants?.length || 0})</span>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    {selectedRoom.participants?.length === 0 ? (
                      <p className="text-center text-default-500 py-4">No participants</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedRoom.participants?.map((p) => (
                          <Card key={p.sid} className="bg-default-50">
                            <CardBody>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-medium">{p.name || p.identity}</span>
                                    <Chip size="sm" variant="flat" color={p.state === 2 ? "success" : "default"}>
                                      {getParticipantStateLabel(p.state)}
                                    </Chip>
                                    <Chip size="sm" variant="flat" color="primary">
                                      {getParticipantKindLabel(p.kind)}
                                    </Chip>
                                    {p.isPublisher && (
                                      <Chip size="sm" variant="flat" color="secondary">Publisher</Chip>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs text-default-500">
                                    <div>SID: <code>{p.sid}</code></div>
                                    <div>Identity: <code>{p.identity}</code></div>
                                    <div>Joined: {formatTimestamp(p.joinedAt)}</div>
                                  </div>

                                  {/* Tracks */}
                                  {p.tracks && p.tracks.length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-default-500 mb-1">Tracks:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {p.tracks.map((track) => (
                                          <Chip
                                            key={track.sid}
                                            size="sm"
                                            variant="flat"
                                            startContent={
                                              track.source === 1 ? (
                                                track.muted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />
                                              ) : (
                                                track.muted ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />
                                              )
                                            }
                                            color={track.muted ? "default" : "success"}
                                          >
                                            {track.name || `Track ${track.type}`}
                                          </Chip>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Attributes */}
                                  {Object.keys(p.attributes || {}).length > 0 && (
                                    <div className="mt-3">
                                      <p className="text-xs text-default-500 mb-1">Attributes:</p>
                                      <pre className="text-xs bg-default-100 p-2 rounded overflow-auto">
                                        {JSON.stringify(p.attributes, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {/* Metadata */}
                                  {p.metadata && (
                                    <div className="mt-3">
                                      <p className="text-xs text-default-500 mb-1">Metadata:</p>
                                      <pre className="text-xs bg-default-100 p-2 rounded overflow-auto">
                                        {p.metadata}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseRoomDetail}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Call Details Modal */}
      <Modal isOpen={isCallDetailOpen} onClose={onCloseCallDetail} size="3xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>
            Call Details
          </ModalHeader>
          <ModalBody>
            {selectedCall && (
              <div className="space-y-6">
                {/* Call Summary */}
                <Card>
                  <CardBody>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-default-500">Direction</p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={selectedCall.direction === "inbound" ? "primary" : "secondary"}
                          startContent={
                            selectedCall.direction === "inbound"
                              ? <ArrowDownLeft className="w-3 h-3" />
                              : <ArrowUpRight className="w-3 h-3" />
                          }
                        >
                          {selectedCall.direction}
                        </Chip>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Status</p>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={getCallStatusColor(selectedCall.status) as "default" | "primary" | "secondary" | "success" | "warning" | "danger"}
                          startContent={getCallStatusIcon(selectedCall.status)}
                        >
                          {selectedCall.status}
                        </Chip>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Duration</p>
                        <p className="text-sm font-medium">{formatDuration(selectedCall.duration)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Created</p>
                        <p className="text-sm">{new Date(selectedCall.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Phone Numbers */}
                <Card>
                  <CardHeader>
                    <Phone className="w-5 h-5 mr-2" />
                    <span>Phone Numbers</span>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-default-500">From</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{selectedCall.fromNumber || "N/A"}</code>
                          {selectedCall.fromNumber && (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => copyToClipboard(selectedCall.fromNumber!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">To</p>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{selectedCall.toNumber || "N/A"}</code>
                          {selectedCall.toNumber && (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              onPress={() => copyToClipboard(selectedCall.toNumber!)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Timing */}
                <Card>
                  <CardHeader>
                    <Clock className="w-5 h-5 mr-2" />
                    <span>Timing</span>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-default-500">Started At</p>
                        <p className="text-sm">{selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Ended At</p>
                        <p className="text-sm">{selectedCall.endedAt ? new Date(selectedCall.endedAt).toLocaleString() : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Duration</p>
                        <p className="text-sm font-medium">{formatDuration(selectedCall.duration)}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Technical Details */}
                <Card>
                  <CardHeader>
                    <Server className="w-5 h-5 mr-2" />
                    <span>Technical Details</span>
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-default-500">Call ID</p>
                        <code className="text-xs">{selectedCall.id}</code>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Room Name</p>
                        <code className="text-xs">{selectedCall.roomName || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">SIP Call ID</p>
                        <code className="text-xs">{selectedCall.sipCallId || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Participant Identity</p>
                        <code className="text-xs">{selectedCall.participantIdentity || "N/A"}</code>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Agent</p>
                        <p className="text-sm">{selectedCall.agentName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-default-500">Agent ID</p>
                        <code className="text-xs">{selectedCall.agentId || "N/A"}</code>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* Error Details (if any) */}
                {selectedCall.errorMessage && (
                  <Card className="border-danger-200 bg-danger-50">
                    <CardHeader>
                      <AlertCircle className="w-5 h-5 mr-2 text-danger" />
                      <span className="text-danger">Error</span>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <p className="text-sm text-danger">{selectedCall.errorMessage}</p>
                    </CardBody>
                  </Card>
                )}

                {/* Metadata (if any) */}
                {selectedCall.metadata && Object.keys(selectedCall.metadata).length > 0 && (
                  <Card>
                    <CardHeader>
                      <span>Metadata</span>
                    </CardHeader>
                    <Divider />
                    <CardBody>
                      <pre className="text-xs bg-default-100 p-3 rounded overflow-auto">
                        {JSON.stringify(selectedCall.metadata, null, 2)}
                      </pre>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseCallDetail}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={onCloseDeleteConfirm}>
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            <p>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            </p>
            <p className="text-sm text-default-500 mt-2">
              This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={onCloseDeleteConfirm}>
              Cancel
            </Button>
            <Button color="danger" isLoading={loading} onPress={handleDelete}>
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

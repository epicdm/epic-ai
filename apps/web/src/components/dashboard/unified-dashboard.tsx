"use client";

/**
 * OpenClaw Agent Dashboard
 * Command center for AI agents — voice, chat, automation
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Progress,
  Tooltip,
  Avatar,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  TrendingUp,
  DollarSign,
  Plus,
  ArrowRight,
  Activity,
  Zap,
  MessageSquare,
  Globe,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  BarChart3,
  Users,
  BookOpen,
  Settings,
  ChevronRight,
  PhoneCall,
  Mic,
  Brain,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AgentSummary {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDeployed: boolean;
  phoneNumbers: { id: string; number: string }[];
  _count: { calls: number };
}

interface VoiceStats {
  totalCalls: number;
  totalMinutes: number;
  successRate: number;
  activeAgents: number;
  phoneNumbers: number;
  totalCost: number;
}

interface RecentCall {
  id: string;
  direction: string;
  status: string;
  duration: number | null;
  callerNumber: string | null;
  calleeNumber: string | null;
  createdAt: string;
  agent?: { name: string };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function statusColor(status: string) {
  switch (status?.toLowerCase()) {
    case "completed": return "success";
    case "in-progress": case "ringing": return "primary";
    case "failed": case "error": return "danger";
    case "missed": case "no-answer": return "warning";
    default: return "default";
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface UnifiedDashboardProps {
  flywheelJustActivated?: boolean;
}

export function UnifiedDashboard({ flywheelJustActivated: _ }: UnifiedDashboardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const [agentsRes, statsRes, callsRes] = await Promise.all([
        fetch("/api/voice/agents"),
        fetch("/api/voice/stats"),
        fetch("/api/voice/calls?limit=8"),
      ]);

      if (agentsRes.ok) {
        const d = await agentsRes.json();
        setAgents(Array.isArray(d.agents) ? d.agents : []);
      }
      if (statsRes.ok) {
        const d = await statsRes.json();
        if (d.success && d.data) setStats(d.data);
      }
      if (callsRes.ok) {
        const d = await callsRes.json();
        setRecentCalls(Array.isArray(d.calls) ? d.calls.slice(0, 8) : []);
      }
    } catch (e) {
      console.error("Dashboard load error:", e);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Spinner size="lg" color="primary" />
          <p className="text-gray-400 text-sm">Loading your agents...</p>
        </div>
      </div>
    );
  }

  /* ---- Error ---- */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Something went wrong</h2>
          <p className="text-gray-400">{error}</p>
          <Button color="primary" variant="flat" onPress={loadDashboard}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.isActive);
  const deployedAgents = agents.filter(a => a.isDeployed);
  const totalCalls = stats?.totalCalls ?? agents.reduce((a, ag) => a + ag._count.calls, 0);
  const totalMinutes = stats?.totalMinutes ?? 0;
  const successRate = stats?.successRate ?? 0;
  const monthlyCost = stats?.totalCost ?? 0;

  /* ---- Empty State ---- */
  if (agents.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Welcome to OpenClaw</h1>
          <p className="text-gray-400 mt-1">Deploy AI agents that handle calls, qualify leads, and automate your business.</p>
        </div>

        {/* Empty Hero */}
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700/50">
          <CardBody className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-sky-500/10 flex items-center justify-center">
              <Bot className="w-10 h-10 text-sky-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Create Your First Agent</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8">
              AI voice agents answer calls, qualify leads, book appointments, and handle support — 24/7, in any language. Start with a template or build from scratch.
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                as={Link}
                href="/dashboard/voice/templates"
                variant="bordered"
                className="border-gray-600 text-gray-300"
                startContent={<Sparkles className="w-4 h-4" />}
              >
                Browse Templates
              </Button>
              <Button
                as={Link}
                href="/dashboard/voice/agents/new"
                color="primary"
                size="lg"
                startContent={<Plus className="w-4 h-4" />}
              >
                Create Agent
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardBody className="p-6">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-4">
                <PhoneCall className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Voice Agents</h3>
              <p className="text-sm text-gray-400">Answer inbound calls, make outbound campaigns, handle any conversation naturally.</p>
            </CardBody>
          </Card>
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardBody className="p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <Brain className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Knowledge Base</h3>
              <p className="text-sm text-gray-400">Upload docs, FAQs, and product info. Your agents learn and answer accurately.</p>
            </CardBody>
          </Card>
          <Card className="bg-gray-900/50 border border-gray-800">
            <CardBody className="p-6">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center mb-4">
                <Zap className="w-5 h-5 text-violet-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">Automations</h3>
              <p className="text-sm text-gray-400">Book appointments, push to CRM, send follow-ups — agents take action, not just talk.</p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  /* ---- Main Dashboard ---- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-0.5">
            {activeAgents.length} active agent{activeAgents.length !== 1 ? "s" : ""} · {deployedAgents.length} deployed
          </p>
        </div>
        <Button
          as={Link}
          href="/dashboard/voice/agents/new"
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
        >
          New Agent
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gray-900/50 border border-gray-800">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                <Bot className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{agents.length}</p>
                <p className="text-xs text-gray-500">Agents</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-900/50 border border-gray-800">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{totalCalls.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Total Calls</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-900/50 border border-gray-800">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`}
                </p>
                <p className="text-xs text-gray-500">Minutes Used</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-900/50 border border-gray-800">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{successRate}%</p>
                <p className="text-xs text-gray-500">Success Rate</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-gray-900/50 border border-gray-800 col-span-2 lg:col-span-1">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">${monthlyCost.toFixed(2)}</p>
                <p className="text-xs text-gray-500">This Month</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Grid: Agents + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents Column (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Agents</h2>
            <Button
              as={Link}
              href="/dashboard/voice/agents"
              variant="light"
              size="sm"
              endContent={<ChevronRight className="w-4 h-4" />}
              className="text-gray-400"
            >
              View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.slice(0, 6).map((agent) => (
              <Link key={agent.id} href={`/dashboard/voice/agents/${agent.id}`}>
                <Card
                  isPressable
                  className="bg-gray-900/50 border border-gray-800 hover:border-sky-500/30 transition-all h-full"
                >
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex gap-1.5">
                        {agent.isDeployed && (
                          <Chip size="sm" color="success" variant="dot" classNames={{ base: "border-none", dot: "bg-emerald-400" }}>
                            Live
                          </Chip>
                        )}
                        <Chip
                          size="sm"
                          color={agent.isActive ? "primary" : "default"}
                          variant="flat"
                          classNames={{ base: agent.isActive ? "bg-sky-500/10 text-sky-400" : "bg-gray-800 text-gray-500" }}
                        >
                          {agent.isActive ? "Active" : "Inactive"}
                        </Chip>
                      </div>
                    </div>

                    <h3 className="font-semibold text-white mb-1">{agent.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-3">
                      {agent.description || "No description"}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {agent._count.calls} calls
                      </span>
                      <span className="flex items-center gap-1">
                        <Mic className="w-3.5 h-3.5" />
                        {agent.phoneNumbers.length} number{agent.phoneNumbers.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity Sidebar (1/3) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent Calls</h2>
            <Button
              as={Link}
              href="/dashboard/voice/calls"
              variant="light"
              size="sm"
              endContent={<ChevronRight className="w-4 h-4" />}
              className="text-gray-400"
            >
              All Calls
            </Button>
          </div>

          <Card className="bg-gray-900/50 border border-gray-800">
            <CardBody className="p-0">
              {recentCalls.length > 0 ? (
                <div className="divide-y divide-gray-800">
                  {recentCalls.map((call) => (
                    <div key={call.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        call.direction === "inbound"
                          ? "bg-emerald-500/10"
                          : "bg-sky-500/10"
                      }`}>
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <PhoneOutgoing className="w-4 h-4 text-sky-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-white truncate">
                            {call.callerNumber || call.calleeNumber || "Unknown"}
                          </p>
                          <Chip size="sm" color={statusColor(call.status)} variant="flat" classNames={{ base: "h-5 text-[10px]" }}>
                            {call.status}
                          </Chip>
                        </div>
                        <p className="text-xs text-gray-500">
                          {call.agent?.name || "Unknown agent"} · {formatDuration(call.duration)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap">
                        {formatTimeAgo(new Date(call.createdAt))}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Phone className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No calls yet</p>
                  <p className="text-xs text-gray-600 mt-1">Deploy an agent to start receiving calls</p>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Quick Links */}
          <div className="space-y-2">
            <Link href="/dashboard/voice/numbers">
              <Card isPressable className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                <CardBody className="p-3 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Phone Numbers</p>
                    <p className="text-xs text-gray-500">{stats?.phoneNumbers || 0} numbers</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </CardBody>
              </Card>
            </Link>

            <Link href="/dashboard/voice/knowledge-bases">
              <Card isPressable className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                <CardBody className="p-3 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Knowledge Bases</p>
                    <p className="text-xs text-gray-500">Train your agents</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </CardBody>
              </Card>
            </Link>

            <Link href="/dashboard/voice/templates">
              <Card isPressable className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                <CardBody className="p-3 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Templates</p>
                    <p className="text-xs text-gray-500">Pre-built agent configs</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </CardBody>
              </Card>
            </Link>

            <Link href="/dashboard/voice/test">
              <Card isPressable className="bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors">
                <CardBody className="p-3 flex flex-row items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">Test Console</p>
                    <p className="text-xs text-gray-500">Try agents in browser</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </CardBody>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

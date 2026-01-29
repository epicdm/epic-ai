"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Spinner,
  Tooltip,
  Checkbox,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  RadioGroup,
  Radio,
  useDisclosure,
} from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoIndicator } from "@/components/demo";
import { useDemo } from "@/lib/demo";
import { PricingTooltip, PRICING } from "@/components/ui/cost-estimator";
import { Phone, Plus, Bot, Clock, TrendingUp, DollarSign, BarChart3, Trash2, AlertTriangle, X, Info } from "lucide-react";

interface VoiceAgent {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDeployed: boolean;
  brand: { id: string; name: string };
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

export function VoiceDashboard() {
  const router = useRouter();
  const { isDemo, data: demoData } = useDemo();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bulk delete state
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletePhoneOption, setDeletePhoneOption] = useState<"pool" | "release">("pool");
  const { isOpen: isBulkDeleteOpen, onOpen: onBulkDeleteOpen, onClose: onBulkDeleteClose } = useDisclosure();

  const selectedAgents = agents.filter(a => selectedAgentIds.has(a.id));
  const totalPhoneNumbers = selectedAgents.reduce((acc, a) => acc + a.phoneNumbers.length, 0);

  const toggleAgentSelection = (agentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedAgentIds(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) {
        next.delete(agentId);
      } else {
        next.add(agentId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedAgentIds.size === agents.length) {
      setSelectedAgentIds(new Set());
    } else {
      setSelectedAgentIds(new Set(agents.map(a => a.id)));
    }
  };

  const clearSelection = () => {
    setSelectedAgentIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedAgentIds.size === 0) return;

    setBulkDeleting(true);
    setError(null);

    try {
      const deletePhoneNumbers = deletePhoneOption === "release";
      const deletePromises = Array.from(selectedAgentIds).map(agentId =>
        fetch(`/api/voice/agents/${agentId}?deletePhoneNumbers=${deletePhoneNumbers}`, {
          method: "DELETE",
        })
      );

      const results = await Promise.all(deletePromises);
      const failures = results.filter(r => !r.ok);

      if (failures.length > 0) {
        setError(`Failed to delete ${failures.length} agent(s)`);
      }

      // Refresh the agent list
      const agentsRes = await fetch("/api/voice/agents");
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(Array.isArray(agentsData.agents) ? agentsData.agents : []);
      }

      setSelectedAgentIds(new Set());
      onBulkDeleteClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete agents");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Hydration-safe mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // If in demo mode, use demo data
    if (isDemo && demoData) {
      const demoAgent = demoData.voiceAgent as unknown as VoiceAgent;
      setAgents(demoAgent ? [demoAgent] : []);
      setStats(demoData.stats?.voice || null);
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        console.log("[VoiceDashboard] Fetching agents and stats...");
        // Fetch agents and stats in parallel
        const [agentsRes, statsRes] = await Promise.all([
          fetch("/api/voice/agents"),
          fetch("/api/voice/stats"),
        ]);

        console.log("[VoiceDashboard] Agents response:", agentsRes.status);
        if (!agentsRes.ok) throw new Error("Failed to fetch agents");
        const agentsData = await agentsRes.json();
        console.log("[VoiceDashboard] Agents data:", {
          count: agentsData.agents?.length || 0,
          agents: agentsData.agents?.map((a: VoiceAgent) => ({ id: a.id, name: a.name })),
        });
        setAgents(Array.isArray(agentsData.agents) ? agentsData.agents : []);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          console.log("[VoiceDashboard] Stats data:", statsData);
          if (statsData.success && statsData.data) {
            setStats(statsData.data);
          }
        }
      } catch (err) {
        console.error("[VoiceDashboard] Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isDemo, demoData]);

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8" suppressHydrationWarning>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Voice AI
            <DemoIndicator />
          </span>
        }
        description="Manage your AI voice agents for automated phone calls."
        actions={
          <Button
            as={Link}
            href="/dashboard/voice/agents/new"
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            isDisabled={isDemo}
          >
            Create Agent
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
        <Card>
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {agents.length}
                </p>
                <p className="text-xs md:text-sm text-gray-500">Agents</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalCalls ?? agents.reduce((acc, a) => acc + a._count.calls, 0)}
                </p>
                <p className="text-xs md:text-sm text-gray-500">Calls</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalMinutes !== undefined
                    ? stats.totalMinutes >= 60
                      ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                      : `${stats.totalMinutes}m`
                    : "0m"}
                </p>
                <p className="text-xs md:text-sm text-gray-500">Minutes</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats?.successRate !== undefined ? `${stats.successRate}%` : "0%"}
                </p>
                <p className="text-xs md:text-sm text-gray-500">Success</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Cost Card */}
        <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <CardBody className="p-4 md:p-6">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-200 dark:bg-amber-900/50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1">
                  <p className="text-xl md:text-2xl font-bold text-amber-800 dark:text-amber-300">
                    ${(stats?.totalCost || 0).toFixed(2)}
                  </p>
                  <Tooltip content={
                    <div className="p-2 space-y-1">
                      <p className="font-medium">Voice AI Pricing</p>
                      <p className="text-sm">${PRICING.voice.perMinute.toFixed(2)}/minute</p>
                      <p className="text-xs text-default-500">Includes STT, LLM, TTS & telephony</p>
                    </div>
                  }>
                    <Info className="w-4 h-4 text-amber-600 cursor-help" />
                  </Tooltip>
                </div>
                <p className="text-xs md:text-sm text-amber-700 dark:text-amber-500">This Month</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Cost Transparency Banner */}
      <Card className="bg-default-50 dark:bg-default-100/10">
        <CardBody className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Voice calls cost ${PRICING.voice.perMinute.toFixed(2)}/minute</p>
                <p className="text-xs text-default-500">
                  View detailed breakdown of your voice AI usage and spending
                </p>
              </div>
            </div>
            <Button
              as={Link}
              href="/dashboard/settings/usage"
              size="sm"
              variant="flat"
              endContent={<DollarSign className="w-4 h-4" />}
            >
              View Usage
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Agents List */}
      {error ? (
        <Card>
          <CardBody className="p-6 text-center">
            <p className="text-red-500">{error}</p>
          </CardBody>
        </Card>
      ) : agents.length === 0 ? (
        <EmptyState
          icon={<Phone className="w-full h-full" />}
          title="Create Your First Voice Agent"
          description="Voice agents can handle inbound and outbound calls, qualify leads, book appointments, and automate your sales and support workflows."
          features={["Outbound calls", "Inbound support", "Campaign automation", "Call analytics"]}
          actions={[
            {
              label: "Create Agent",
              variant: "primary",
              href: "/dashboard/voice/agents/new",
            },
            {
              label: "Browse Templates",
              variant: "secondary",
              href: "/dashboard/voice/templates",
            },
          ]}
          showDemo
          onStartDemo={() => {
            // Navigate to demo mode setup
            window.location.href = "/onboarding?demo=true&goal=voice";
          }}
          variant="card"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Agents
            </h2>
            {agents.length > 1 && (
              <Button
                size="sm"
                variant="flat"
                onPress={toggleSelectAll}
              >
                {selectedAgentIds.size === agents.length ? "Deselect All" : "Select All"}
              </Button>
            )}
          </div>

          {/* Bulk Action Bar */}
          {selectedAgentIds.size > 0 && (
            <Card className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800">
              <CardBody className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-primary-800 dark:text-primary-300">
                      {selectedAgentIds.size} agent{selectedAgentIds.size > 1 ? "s" : ""} selected
                    </span>
                    {totalPhoneNumbers > 0 && (
                      <Chip size="sm" variant="flat" color="warning">
                        {totalPhoneNumbers} phone number{totalPhoneNumbers > 1 ? "s" : ""}
                      </Chip>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={clearSelection}
                      startContent={<X className="w-4 h-4" />}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      color="danger"
                      onPress={onBulkDeleteOpen}
                      startContent={<Trash2 className="w-4 h-4" />}
                      isDisabled={isDemo}
                    >
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="relative">
                {/* Selection Checkbox */}
                <div
                  className="absolute top-4 left-4 z-10"
                  onClick={(e) => toggleAgentSelection(agent.id, e)}
                >
                  <Checkbox
                    isSelected={selectedAgentIds.has(agent.id)}
                    onValueChange={() => {}}
                    classNames={{
                      wrapper: "bg-white/90 dark:bg-gray-800/90 rounded shadow-sm",
                    }}
                  />
                </div>
                <Link href={`/dashboard/voice/agents/${agent.id}`}>
                  <Card
                    isPressable
                    className={`h-full hover:shadow-md transition-shadow ${
                      selectedAgentIds.has(agent.id) ? "ring-2 ring-primary-500" : ""
                    }`}
                  >
                    <CardBody className="p-6 pl-12">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex gap-2">
                          {agent.isDeployed && (
                            <Chip size="sm" color="success" variant="flat">
                              Live
                            </Chip>
                          )}
                          <Chip
                            size="sm"
                            color={agent.isActive ? "primary" : "default"}
                            variant="flat"
                          >
                            {agent.isActive ? "Active" : "Inactive"}
                          </Chip>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {agent.description || "No description"}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{agent._count.calls} calls</span>
                        <span>{agent.phoneNumbers.length} numbers</span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/dashboard/voice/calls">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <Phone className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              <h3 className="font-medium text-gray-900 dark:text-white">
                Call History
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                View all call logs and recordings
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/numbers">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">📞</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Phone Numbers
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Manage your phone numbers
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/knowledge-bases">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">📚</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Knowledge Bases
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                RAG documents for agents
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/flows">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">🔀</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Conversation Flows
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Visual flow designer
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/groups">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">👥</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Agent Groups
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Organize agents for routing
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/routing">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">🔄</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Routing Rules
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure call routing
              </p>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/voice/test">
          <Card isPressable className="hover:shadow-md transition-shadow">
            <CardBody className="p-6 text-center">
              <span className="text-3xl block mb-3">🧪</span>
              <h3 className="font-medium text-gray-900 dark:text-white">
                Test Console
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Test agents in your browser
              </p>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* Bulk Delete Modal */}
      <Modal isOpen={isBulkDeleteOpen} onClose={onBulkDeleteClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Delete {selectedAgentIds.size} Agent{selectedAgentIds.size > 1 ? "s" : ""}</h3>
              <p className="text-sm text-gray-500 font-normal">This action cannot be undone</p>
            </div>
          </ModalHeader>
          <ModalBody>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Are you sure you want to delete the following agent{selectedAgentIds.size > 1 ? "s" : ""}?
            </p>

            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {selectedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  {agent.phoneNumbers.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {agent.phoneNumbers.length} number{agent.phoneNumbers.length > 1 ? "s" : ""}
                    </Chip>
                  )}
                </div>
              ))}
            </div>

            {totalPhoneNumbers > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-300 mb-2">
                    These agents have <strong>{totalPhoneNumbers}</strong> phone number{totalPhoneNumbers > 1 ? "s" : ""} assigned.
                    What should happen to them?
                  </p>
                </div>

                <RadioGroup
                  value={deletePhoneOption}
                  onValueChange={(value) => setDeletePhoneOption(value as "pool" | "release")}
                  className="gap-3"
                >
                  <Radio value="pool" description="Numbers remain available for other agents">
                    Return to pool
                  </Radio>
                  <Radio
                    value="release"
                    description="Delete from LiveKit and release from Magnus (permanent)"
                    classNames={{ label: "text-red-600 dark:text-red-400" }}
                  >
                    Delete &amp; release numbers
                  </Radio>
                </RadioGroup>

                {deletePhoneOption === "release" && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      <strong>Warning:</strong> This will permanently release all {totalPhoneNumbers} phone number{totalPhoneNumbers > 1 ? "s" : ""}.
                      You may not be able to get them back.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Phone className="w-4 h-4" />
                  <p className="text-sm">No phone numbers assigned to selected agents.</p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onPress={onBulkDeleteClose}>
              Cancel
            </Button>
            <Button
              color="danger"
              isLoading={bulkDeleting}
              onPress={handleBulkDelete}
              startContent={!bulkDeleting && <Trash2 className="w-4 h-4" />}
            >
              {totalPhoneNumbers > 0 && deletePhoneOption === "release"
                ? `Delete ${selectedAgentIds.size} Agent${selectedAgentIds.size > 1 ? "s" : ""} & Numbers`
                : `Delete ${selectedAgentIds.size} Agent${selectedAgentIds.size > 1 ? "s" : ""}`}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

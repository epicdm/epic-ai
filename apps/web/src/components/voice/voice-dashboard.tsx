"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, Button, Chip, Spinner, Tooltip } from "@heroui/react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { DemoIndicator } from "@/components/demo";
import { useDemo } from "@/lib/demo";
import { PricingTooltip, PRICING } from "@/components/ui/cost-estimator";
import { Phone, Plus, Bot, Clock, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import { PhoneIcon, SparklesIcon, CurrencyDollarIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

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
  const { isDemo, data: demoData } = useDemo();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [stats, setStats] = useState<VoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If in demo mode, use demo data
    if (isDemo && demoData) {
      const demoAgent = demoData.voiceAgent as VoiceAgent;
      setAgents(demoAgent ? [demoAgent] : []);
      setStats(demoData.stats?.voice || null);
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        // Fetch agents and stats in parallel
        const [agentsRes, statsRes] = await Promise.all([
          fetch("/api/voice/agents"),
          fetch("/api/voice/stats"),
        ]);

        if (!agentsRes.ok) throw new Error("Failed to fetch agents");
        const agentsData = await agentsRes.json();
        setAgents(Array.isArray(agentsData.agents) ? agentsData.agents : []);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success && statsData.data) {
            setStats(statsData.data);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isDemo, demoData]);

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
                    <InformationCircleIcon className="w-4 h-4 text-amber-600 cursor-help" />
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
              endContent={<CurrencyDollarIcon className="w-4 h-4" />}
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
          icon={<PhoneIcon className="w-full h-full" />}
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link key={agent.id} href={`/dashboard/voice/agents/${agent.id}`}>
                <Card isPressable className="h-full hover:shadow-md transition-shadow">
                  <CardBody className="p-6">
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
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
    </div>
  );
}

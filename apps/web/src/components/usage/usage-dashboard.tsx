"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Chip,
  Spinner,
  Button,
  Divider,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  ChartBarIcon,
  PhoneIcon,
  DocumentTextIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";
import { CostSummary, UsageMeter, PRICING } from "@/components/ui/cost-estimator";
import { cn } from "@/lib/utils";

interface UsageData {
  summary: {
    totalCost: number;
    totalCalls: number;
    totalDuration: number;
    averageCostPerCall: number;
    averageCallDuration: number;
    currency: string;
  };
  breakdown: {
    inbound: { calls: number; cost: number; duration: number };
    outbound: { calls: number; cost: number; duration: number };
  };
  byAgent: {
    agentId: string;
    name: string;
    cost: number;
    calls: number;
    duration: number;
  }[];
  byDay: {
    date: string;
    cost: number;
    calls: number;
  }[];
  magnusBalance: number | null;
  period: {
    from: string;
    to: string;
  };
}

interface UsageDashboardProps {
  className?: string;
}

type PeriodType = "day" | "week" | "month" | "year";

export function UsageDashboard({ className }: UsageDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageData | null>(null);
  const [period, setPeriod] = useState<PeriodType>("month");

  useEffect(() => {
    async function fetchUsage() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/cost?period=${period}`);
        if (!response.ok) throw new Error("Failed to fetch usage data");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchUsage();
  }, [period]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const periodLabels: Record<PeriodType, string> = {
    day: "Last 24 Hours",
    week: "Last 7 Days",
    month: "Last 30 Days",
    year: "Last Year",
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardBody className="py-12 text-center">
          <p className="text-danger">{error}</p>
          <Button
            size="sm"
            variant="flat"
            className="mt-4"
            onPress={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardBody>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Usage & Costs</h2>
          <p className="text-sm text-default-500">
            Track your platform usage and spending
          </p>
        </div>
        <Select
          size="sm"
          selectedKeys={[period]}
          onChange={(e) => setPeriod(e.target.value as PeriodType)}
          className="w-40"
          startContent={<CalendarIcon className="w-4 h-4" />}
        >
          <SelectItem key="day">Last 24 Hours</SelectItem>
          <SelectItem key="week">Last 7 Days</SelectItem>
          <SelectItem key="month">Last 30 Days</SelectItem>
          <SelectItem key="year">Last Year</SelectItem>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cost */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-lg flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${data.summary.totalCost.toFixed(2)}
                </p>
                <p className="text-xs text-default-500">Total Cost</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Calls */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <PhoneIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {data.summary.totalCalls.toLocaleString()}
                </p>
                <p className="text-xs text-default-500">Total Calls</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Total Duration */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(data.summary.totalDuration)}
                </p>
                <p className="text-xs text-default-500">Call Time</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Avg Cost Per Call */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${data.summary.averageCostPerCall.toFixed(2)}
                </p>
                <p className="text-xs text-default-500">Avg/Call</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Magnus Balance (if available) */}
      {data.magnusBalance !== null && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                  <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Voice Credits Balance</p>
                  <p className="text-sm text-default-500">
                    Available for voice calls
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-600">
                  ${data.magnusBalance.toFixed(2)}
                </p>
                <Button size="sm" color="primary" variant="flat" className="mt-1">
                  Add Credits
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Direction Breakdown */}
        <Card>
          <CardHeader className="pb-0">
            <h3 className="font-semibold">Call Direction</h3>
          </CardHeader>
          <CardBody className="pt-4">
            <div className="space-y-4">
              {/* Inbound */}
              <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <ArrowTrendingDownIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Inbound</p>
                    <p className="text-xs text-default-500">
                      {data.breakdown.inbound.calls} calls •{" "}
                      {formatDuration(data.breakdown.inbound.duration)}
                    </p>
                  </div>
                </div>
                <p className="font-semibold">
                  ${data.breakdown.inbound.cost.toFixed(2)}
                </p>
              </div>

              {/* Outbound */}
              <div className="flex items-center justify-between p-3 bg-default-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <ArrowTrendingUpIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Outbound</p>
                    <p className="text-xs text-default-500">
                      {data.breakdown.outbound.calls} calls •{" "}
                      {formatDuration(data.breakdown.outbound.duration)}
                    </p>
                  </div>
                </div>
                <p className="font-semibold">
                  ${data.breakdown.outbound.cost.toFixed(2)}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Agent Breakdown */}
        <Card>
          <CardHeader className="pb-0">
            <h3 className="font-semibold">Cost by Agent</h3>
          </CardHeader>
          <CardBody className="pt-4">
            {data.byAgent.length === 0 ? (
              <p className="text-center text-default-500 py-8">
                No agent data yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.byAgent.slice(0, 5).map((agent) => (
                  <div
                    key={agent.agentId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{agent.name}</p>
                        <p className="text-xs text-default-500">
                          {agent.calls} calls
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">${agent.cost.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Daily Chart */}
      {data.byDay.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <h3 className="font-semibold">Daily Usage</h3>
          </CardHeader>
          <CardBody className="pt-4">
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {data.byDay.map((day) => {
                const maxCost = Math.max(...data.byDay.map((d) => d.cost), 0.01);
                const height = Math.max((day.cost / maxCost) * 100, 4);
                return (
                  <div
                    key={day.date}
                    className="flex flex-col items-center min-w-[40px] flex-1"
                  >
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-primary-500 rounded-t-sm transition-all hover:bg-primary-600 cursor-pointer"
                        style={{ height: `${height}%` }}
                        title={`${formatDate(day.date)}: $${day.cost.toFixed(2)} (${day.calls} calls)`}
                      />
                    </div>
                    <p className="text-[10px] text-default-500 mt-1 truncate w-full text-center">
                      {formatDate(day.date)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Pricing Info */}
      <Card className="bg-default-50">
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-default-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-5 h-5 text-default-600" />
            </div>
            <div>
              <h4 className="font-medium mb-1">Understanding Your Costs</h4>
              <p className="text-sm text-default-600 mb-3">
                Voice AI is billed at ${PRICING.voice.perMinute.toFixed(2)}/minute,
                which includes speech recognition, AI processing, voice synthesis,
                and telephony.
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip size="sm" variant="flat">
                  STT: ${PRICING.voice.breakdown.stt.toFixed(2)}/min
                </Chip>
                <Chip size="sm" variant="flat">
                  LLM: ${PRICING.voice.breakdown.llm.toFixed(2)}/min
                </Chip>
                <Chip size="sm" variant="flat">
                  TTS: ${PRICING.voice.breakdown.tts.toFixed(2)}/min
                </Chip>
                <Chip size="sm" variant="flat">
                  Phone: ${PRICING.voice.breakdown.telephony.toFixed(2)}/min
                </Chip>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

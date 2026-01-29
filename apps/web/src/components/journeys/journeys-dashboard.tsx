"use client";

/**
 * Customer Journeys Dashboard Component
 * Displays cross-channel journey analytics and individual journey visualization
 */

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Progress,
} from "@heroui/react";
import {
  GitMerge,
  Waypoints,
  TrendingUp,
  Users,
  CheckCircle,
  DollarSign,
  Phone,
  Mail,
  MessageSquare,
  Globe,
  Megaphone,
  RefreshCw,
  Eye,
  ChevronRight,
} from "lucide-react";
import { Twitter, Linkedin, Facebook, Instagram } from "lucide-react";

interface Journey {
  id: string;
  customerId: string | null;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  status: string;
  isConverted: boolean;
  conversionValue: number | null;
  convertedAt: string | null;
  totalTouchpoints: number;
  uniqueChannels: number;
  firstTouchChannel: string | null;
  firstTouchAt: string | null;
  lastTouchChannel: string | null;
  lastTouchAt: string | null;
  channelBreakdown: Record<string, number> | null;
  startedAt: string;
  touchpoints: Touchpoint[];
  conversionsCount: number;
}

interface Touchpoint {
  id: string;
  channelType: string;
  channelName: string | null;
  action: string;
  actionDetail: string | null;
  engagementScore: number;
  occurredAt: string;
  sourceTitle: string | null;
}

interface Stats {
  totalJourneys: number;
  convertedJourneys: number;
  multiChannelJourneys: number;
  conversionRate: number;
  synergyRate: number;
  avgTouchpoints: number;
  avgChannels: number;
  totalConversionValue: number;
  channelBreakdown: { channel: string; count: number }[];
}

interface JourneysData {
  journeys: Journey[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: Stats;
}

const CHANNEL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  SOCIAL: Twitter,
  VOICE: Phone,
  EMAIL: Mail,
  CHAT: MessageSquare,
  WEBSITE: Globe,
  ADS: Megaphone,
};

const CHANNEL_COLORS: Record<string, string> = {
  SOCIAL: "bg-blue-500",
  VOICE: "bg-purple-500",
  EMAIL: "bg-green-500",
  CHAT: "bg-orange-500",
  WEBSITE: "bg-cyan-500",
  ADS: "bg-pink-500",
};

const CHANNEL_CHIP_COLORS: Record<string, "primary" | "secondary" | "success" | "warning" | "danger" | "default"> = {
  SOCIAL: "primary",
  VOICE: "secondary",
  EMAIL: "success",
  CHAT: "warning",
  WEBSITE: "default",
  ADS: "danger",
};

const STATUS_COLORS: Record<string, "success" | "warning" | "default"> = {
  active: "warning",
  converted: "success",
  dormant: "default",
};

export function JourneysDashboard({ orgId }: { orgId: string }) {
  const [data, setData] = useState<JourneysData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        page: page.toString(),
        limit: "10",
      });
      if (statusFilter) params.append("status", statusFilter);
      if (channelFilter) params.append("channel", channelFilter);

      const response = await fetch(`/api/journeys?${params}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching journeys:", error);
    } finally {
      setLoading(false);
    }
  }, [period, statusFilter, channelFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalJourneys: 0,
    convertedJourneys: 0,
    multiChannelJourneys: 0,
    conversionRate: 0,
    synergyRate: 0,
    avgTouchpoints: 0,
    avgChannels: 0,
    totalConversionValue: 0,
    channelBreakdown: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customer Journeys</h1>
          <p className="text-default-500">
            Track cross-channel customer interactions from first touch to conversion
          </p>
        </div>
        <div className="flex gap-3">
          <Select
            size="sm"
            className="w-32"
            selectedKeys={[period]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              setPeriod(value);
            }}
            aria-label="Time period"
          >
            <SelectItem key="7">7 Days</SelectItem>
            <SelectItem key="30">30 Days</SelectItem>
            <SelectItem key="90">90 Days</SelectItem>
          </Select>
          <Button
            size="sm"
            variant="flat"
            startContent={<RefreshCw className="w-4 h-4" />}
            onPress={fetchData}
            isLoading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="text-center py-4">
            <Waypoints className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalJourneys}</p>
            <p className="text-sm text-default-500">Total Journeys</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-4">
            <GitMerge className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.multiChannelJourneys}</p>
            <p className="text-sm text-default-500">Multi-Channel ({stats.synergyRate}%)</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.convertedJourneys}</p>
            <p className="text-sm text-default-500">Converted ({stats.conversionRate}%)</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center py-4">
            <DollarSign className="w-8 h-8 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold">
              ${stats.totalConversionValue.toLocaleString()}
            </p>
            <p className="text-sm text-default-500">Conversion Value</p>
          </CardBody>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Channel Performance</h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {stats.channelBreakdown.length > 0 ? (
              stats.channelBreakdown.map((ch) => {
                const Icon = CHANNEL_ICONS[ch.channel] || Globe;
                const maxCount = Math.max(...stats.channelBreakdown.map((c) => c.count));
                const percentage = maxCount > 0 ? (ch.count / maxCount) * 100 : 0;
                return (
                  <div key={ch.channel} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${CHANNEL_COLORS[ch.channel] || "bg-default-200"}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{ch.channel}</span>
                        <span className="text-sm text-default-500">{ch.count} touchpoints</span>
                      </div>
                      <Progress
                        value={percentage}
                        color={CHANNEL_CHIP_COLORS[ch.channel] || "default"}
                        size="sm"
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-default-400 text-center py-4">
                No touchpoint data yet. Customer interactions will appear here.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          size="sm"
          className="w-40"
          placeholder="All Statuses"
          selectedKeys={statusFilter ? [statusFilter] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            setStatusFilter(value || "");
            setPage(1);
          }}
          aria-label="Filter by status"
        >
          <SelectItem key="active">Active</SelectItem>
          <SelectItem key="converted">Converted</SelectItem>
          <SelectItem key="dormant">Dormant</SelectItem>
        </Select>

        <Select
          size="sm"
          className="w-40"
          placeholder="All Channels"
          selectedKeys={channelFilter ? [channelFilter] : []}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            setChannelFilter(value || "");
            setPage(1);
          }}
          aria-label="Filter by channel"
        >
          <SelectItem key="SOCIAL">Social</SelectItem>
          <SelectItem key="VOICE">Voice</SelectItem>
          <SelectItem key="EMAIL">Email</SelectItem>
          <SelectItem key="CHAT">Chat</SelectItem>
          <SelectItem key="WEBSITE">Website</SelectItem>
          <SelectItem key="ADS">Ads</SelectItem>
        </Select>
      </div>

      {/* Journeys Table */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Customer Journeys</h3>
        </CardHeader>
        <CardBody>
          {data?.journeys && data.journeys.length > 0 ? (
            <>
              <Table aria-label="Customer journeys table">
                <TableHeader>
                  <TableColumn>CUSTOMER</TableColumn>
                  <TableColumn>STATUS</TableColumn>
                  <TableColumn>CHANNELS</TableColumn>
                  <TableColumn>TOUCHPOINTS</TableColumn>
                  <TableColumn>JOURNEY</TableColumn>
                  <TableColumn>ACTIONS</TableColumn>
                </TableHeader>
                <TableBody>
                  {data.journeys.map((journey) => (
                    <TableRow key={journey.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {journey.fullName || journey.email || journey.phone || "Anonymous"}
                          </p>
                          <p className="text-xs text-default-400">
                            {new Date(journey.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          color={STATUS_COLORS[journey.status] || "default"}
                          variant="flat"
                        >
                          {journey.status}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {journey.channelBreakdown &&
                            Object.keys(journey.channelBreakdown).map((channel) => {
                              const Icon = CHANNEL_ICONS[channel] || Globe;
                              return (
                                <div
                                  key={channel}
                                  className={`p-1 rounded ${CHANNEL_COLORS[channel] || "bg-default-200"}`}
                                  title={`${channel}: ${journey.channelBreakdown![channel]} touchpoints`}
                                >
                                  <Icon className="w-3 h-3 text-white" />
                                </div>
                              );
                            })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{journey.totalTouchpoints}</span>
                          <span className="text-xs text-default-400">
                            ({journey.uniqueChannels} channels)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <JourneyMiniTimeline touchpoints={journey.touchpoints.slice(0, 5)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="light"
                          endContent={<ChevronRight className="w-4 h-4" />}
                          onPress={() => setSelectedJourney(journey)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.pagination.totalPages > 1 && (
                <div className="flex justify-center mt-4">
                  <Pagination
                    total={data.pagination.totalPages}
                    page={page}
                    onChange={setPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Waypoints className="w-16 h-16 text-default-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Journeys Yet</h3>
              <p className="text-default-500">
                Customer journeys will appear here as they interact with your channels.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Journey Detail Modal */}
      {selectedJourney && (
        <JourneyDetailPanel
          journey={selectedJourney}
          onClose={() => setSelectedJourney(null)}
        />
      )}
    </div>
  );
}

function JourneyMiniTimeline({ touchpoints }: { touchpoints: Touchpoint[] }) {
  if (touchpoints.length === 0) return <span className="text-default-400">-</span>;

  return (
    <div className="flex items-center gap-1">
      {touchpoints.map((tp, i) => {
        const Icon = CHANNEL_ICONS[tp.channelType] || Globe;
        return (
          <div key={tp.id} className="flex items-center">
            <div
              className={`p-1 rounded ${CHANNEL_COLORS[tp.channelType] || "bg-default-200"}`}
              title={`${tp.channelType}: ${tp.action}`}
            >
              <Icon className="w-2.5 h-2.5 text-white" />
            </div>
            {i < touchpoints.length - 1 && (
              <div className="w-2 h-0.5 bg-default-200" />
            )}
          </div>
        );
      })}
      {touchpoints.length >= 5 && <span className="text-xs text-default-400 ml-1">...</span>}
    </div>
  );
}

function JourneyDetailPanel({
  journey,
  onClose,
}: {
  journey: Journey;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="w-full max-w-xl bg-content1 h-full overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Journey Details</h2>
          <Button size="sm" variant="light" onPress={onClose}>
            Close
          </Button>
        </div>

        {/* Customer Info */}
        <Card className="mb-4">
          <CardBody>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">
                  {journey.fullName || "Anonymous Customer"}
                </p>
                {journey.email && (
                  <p className="text-sm text-default-500">{journey.email}</p>
                )}
                {journey.phone && (
                  <p className="text-sm text-default-500">{journey.phone}</p>
                )}
              </div>
              <div className="ml-auto">
                <Chip
                  color={STATUS_COLORS[journey.status] || "default"}
                  variant="flat"
                >
                  {journey.status}
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Journey Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-xl font-bold">{journey.totalTouchpoints}</p>
              <p className="text-xs text-default-500">Touchpoints</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-xl font-bold">{journey.uniqueChannels}</p>
              <p className="text-xs text-default-500">Channels</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center py-3">
              <p className="text-xl font-bold">
                {journey.conversionValue ? `$${journey.conversionValue}` : "-"}
              </p>
              <p className="text-xs text-default-500">Value</p>
            </CardBody>
          </Card>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold">Journey Timeline</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {journey.touchpoints.map((tp, i) => {
                const Icon = CHANNEL_ICONS[tp.channelType] || Globe;
                return (
                  <div key={tp.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`p-2 rounded-full ${CHANNEL_COLORS[tp.channelType] || "bg-default-200"}`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      {i < journey.touchpoints.length - 1 && (
                        <div className="w-0.5 h-full bg-default-200 my-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{tp.action}</p>
                          <p className="text-sm text-default-500">
                            {tp.channelName || tp.channelType}
                            {tp.actionDetail && ` - ${tp.actionDetail}`}
                          </p>
                          {tp.sourceTitle && (
                            <p className="text-xs text-default-400 mt-1">
                              {tp.sourceTitle}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-default-400">
                            {new Date(tp.occurredAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-default-400">
                            {new Date(tp.occurredAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      {tp.engagementScore > 0 && (
                        <div className="mt-2">
                          <Progress
                            value={tp.engagementScore}
                            color="primary"
                            size="sm"
                            className="max-w-[200px]"
                          />
                          <p className="text-xs text-default-400 mt-1">
                            Engagement: {tp.engagementScore}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

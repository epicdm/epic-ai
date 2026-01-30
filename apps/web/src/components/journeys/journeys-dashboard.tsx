"use client";

/**
 * Customer Journeys Dashboard Component
 * Displays cross-channel journey analytics and individual journey visualization
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Loader2,
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

const CHANNEL_BADGE_CLASSES: Record<string, string> = {
  SOCIAL: "bg-blue-100 text-blue-700 border-blue-200",
  VOICE: "bg-purple-100 text-purple-700 border-purple-200",
  EMAIL: "bg-green-100 text-green-700 border-green-200",
  CHAT: "bg-orange-100 text-orange-700 border-orange-200",
  WEBSITE: "bg-gray-100 text-gray-700 border-gray-200",
  ADS: "bg-pink-100 text-pink-700 border-pink-200",
};

const STATUS_BADGE_VARIANT: Record<string, "outline" | "default" | "secondary"> = {
  active: "outline",
  converted: "default",
  dormant: "secondary",
};

async function fetchJourneysData(
  period: string,
  page: number,
  statusFilter: string,
  channelFilter: string
): Promise<JourneysData> {
  const params = new URLSearchParams({
    period,
    page: page.toString(),
    limit: "10",
  });
  if (statusFilter) params.append("status", statusFilter);
  if (channelFilter) params.append("channel", channelFilter);

  const response = await fetch(`/api/journeys?${params}`);
  const result = await response.json();
  return result;
}

export function JourneysDashboard({ orgId }: { orgId: string }) {
  const [period, setPeriod] = useState("30");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);

  const { data, isLoading, isRefetching, refetch } = useQuery<JourneysData>({
    queryKey: ["journeys", period, statusFilter, channelFilter, page],
    queryFn: () => fetchJourneysData(period, page, statusFilter, channelFilter),
  });

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Customer Journeys</h1>
          <p className="text-muted-foreground">
            Track cross-channel customer interactions from first touch to conversion
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={(val) => setPeriod(val)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="text-center py-4">
            <Waypoints className="w-8 h-8 text-cyan-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.totalJourneys}</p>
            <p className="text-sm text-muted-foreground">Total Journeys</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-4">
            <GitMerge className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.multiChannelJourneys}</p>
            <p className="text-sm text-muted-foreground">Multi-Channel ({stats.synergyRate}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-4">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.convertedJourneys}</p>
            <p className="text-sm text-muted-foreground">Converted ({stats.conversionRate}%)</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="text-center py-4">
            <DollarSign className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              ${stats.totalConversionValue.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Conversion Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Channel Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.channelBreakdown.length > 0 ? (
              stats.channelBreakdown.map((ch) => {
                const Icon = CHANNEL_ICONS[ch.channel] || Globe;
                const maxCount = Math.max(...stats.channelBreakdown.map((c) => c.count));
                const percentage = maxCount > 0 ? (ch.count / maxCount) * 100 : 0;
                return (
                  <div key={ch.channel} className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${CHANNEL_COLORS[ch.channel] || "bg-muted"}`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{ch.channel}</span>
                        <span className="text-sm text-muted-foreground">{ch.count} touchpoints</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${CHANNEL_COLORS[ch.channel] || "bg-primary"}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground text-center py-4">
                No touchpoint data yet. Customer interactions will appear here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3">
        <Select
          value={statusFilter || "all"}
          onValueChange={(val) => {
            setStatusFilter(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="dormant">Dormant</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={channelFilter || "all"}
          onValueChange={(val) => {
            setChannelFilter(val === "all" ? "" : val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            <SelectItem value="SOCIAL">Social</SelectItem>
            <SelectItem value="VOICE">Voice</SelectItem>
            <SelectItem value="EMAIL">Email</SelectItem>
            <SelectItem value="CHAT">Chat</SelectItem>
            <SelectItem value="WEBSITE">Website</SelectItem>
            <SelectItem value="ADS">Ads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Journeys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Journeys</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.journeys && data.journeys.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CUSTOMER</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>CHANNELS</TableHead>
                    <TableHead>TOUCHPOINTS</TableHead>
                    <TableHead>JOURNEY</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.journeys.map((journey) => (
                    <TableRow key={journey.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {journey.fullName || journey.email || journey.phone || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(journey.startedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={STATUS_BADGE_VARIANT[journey.status] || "secondary"}
                        >
                          {journey.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {journey.channelBreakdown &&
                            Object.keys(journey.channelBreakdown).map((channel) => {
                              const Icon = CHANNEL_ICONS[channel] || Globe;
                              return (
                                <div
                                  key={channel}
                                  className={`p-1 rounded ${CHANNEL_COLORS[channel] || "bg-muted"}`}
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
                          <span className="text-xs text-muted-foreground">
                            ({journey.uniqueChannels} channels)
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <JourneyMiniTimeline touchpoints={journey.touchpoints.slice(0, 5)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedJourney(journey)}
                        >
                          View
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Waypoints className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Journeys Yet</h3>
              <p className="text-muted-foreground">
                Customer journeys will appear here as they interact with your channels.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Journey Detail Sheet */}
      <Sheet
        open={!!selectedJourney}
        onOpenChange={(open) => !open && setSelectedJourney(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Journey Details</SheetTitle>
            <SheetDescription>
              Detailed view of the customer journey timeline and touchpoints.
            </SheetDescription>
          </SheetHeader>
          {selectedJourney && (
            <JourneyDetailPanel journey={selectedJourney} />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function JourneyMiniTimeline({ touchpoints }: { touchpoints: Touchpoint[] }) {
  if (touchpoints.length === 0) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex items-center gap-1">
      {touchpoints.map((tp, i) => {
        const Icon = CHANNEL_ICONS[tp.channelType] || Globe;
        return (
          <div key={tp.id} className="flex items-center">
            <div
              className={`p-1 rounded ${CHANNEL_COLORS[tp.channelType] || "bg-muted"}`}
              title={`${tp.channelType}: ${tp.action}`}
            >
              <Icon className="w-2.5 h-2.5 text-white" />
            </div>
            {i < touchpoints.length - 1 && (
              <div className="w-2 h-0.5 bg-muted" />
            )}
          </div>
        );
      })}
      {touchpoints.length >= 5 && <span className="text-xs text-muted-foreground ml-1">...</span>}
    </div>
  );
}

function JourneyDetailPanel({ journey }: { journey: Journey }) {
  return (
    <div className="mt-6 space-y-4">
      {/* Customer Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {journey.fullName || "Anonymous Customer"}
              </p>
              {journey.email && (
                <p className="text-sm text-muted-foreground">{journey.email}</p>
              )}
              {journey.phone && (
                <p className="text-sm text-muted-foreground">{journey.phone}</p>
              )}
            </div>
            <div className="ml-auto">
              <Badge
                variant={STATUS_BADGE_VARIANT[journey.status] || "secondary"}
              >
                {journey.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Journey Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xl font-bold">{journey.totalTouchpoints}</p>
            <p className="text-xs text-muted-foreground">Touchpoints</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xl font-bold">{journey.uniqueChannels}</p>
            <p className="text-xs text-muted-foreground">Channels</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center py-3">
            <p className="text-xl font-bold">
              {journey.conversionValue ? `$${journey.conversionValue}` : "-"}
            </p>
            <p className="text-xs text-muted-foreground">Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Journey Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {journey.touchpoints.map((tp, i) => {
              const Icon = CHANNEL_ICONS[tp.channelType] || Globe;
              return (
                <div key={tp.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`p-2 rounded-full ${CHANNEL_COLORS[tp.channelType] || "bg-muted"}`}
                    >
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    {i < journey.touchpoints.length - 1 && (
                      <div className="w-0.5 h-full bg-muted my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tp.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {tp.channelName || tp.channelType}
                          {tp.actionDetail && ` - ${tp.actionDetail}`}
                        </p>
                        {tp.sourceTitle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tp.sourceTitle}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {new Date(tp.occurredAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tp.occurredAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    {tp.engagementScore > 0 && (
                      <div className="mt-2">
                        <div className="h-2 w-full max-w-[200px] rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${tp.engagementScore}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Engagement: {tp.engagementScore}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

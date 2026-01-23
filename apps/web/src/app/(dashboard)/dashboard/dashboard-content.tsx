"use client";

import { useState } from "react";
import {
  Phone,
  TrendingUp,
  Users,
  Calendar,
  CheckCircle,
  AlertCircle,
  Target,
  Activity,
  Sparkles,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DashboardContentProps {
  flywheelJustActivated?: boolean;
  userName?: string;
}

// Demo data for charts
const performanceData = [
  { time: "00:00", calls: 12, leads: 8, bookings: 3 },
  { time: "04:00", calls: 8, leads: 5, bookings: 2 },
  { time: "08:00", calls: 45, leads: 32, bookings: 12 },
  { time: "12:00", calls: 67, leads: 48, bookings: 18 },
  { time: "16:00", calls: 89, leads: 62, bookings: 25 },
  { time: "20:00", calls: 54, leads: 38, bookings: 14 },
];

const conversionFunnel = [
  { stage: "Calls", count: 892, percentage: 100 },
  { stage: "Engaged", count: 734, percentage: 82 },
  { stage: "Qualified", count: 456, percentage: 51 },
  { stage: "Booked", count: 234, percentage: 26 },
];

const recentActivity = [
  {
    id: 1,
    agent: "Sarah (Sales)",
    action: "Qualified high-value lead",
    detail: "TechCorp - $50k potential",
    time: "2 min ago",
    type: "success" as const,
    icon: Target,
  },
  {
    id: 2,
    agent: "Alex (Support)",
    action: "Resolved urgent ticket",
    detail: "Customer satisfaction: 5/5",
    time: "8 min ago",
    type: "info" as const,
    icon: CheckCircle,
  },
  {
    id: 3,
    agent: "Sarah (Sales)",
    action: "Booked demo meeting",
    detail: "Tomorrow at 2PM EST",
    time: "15 min ago",
    type: "success" as const,
    icon: Calendar,
  },
  {
    id: 4,
    agent: "Maya (Healthcare)",
    action: "Appointment confirmed",
    detail: "Dr. Smith - Friday 10AM",
    time: "23 min ago",
    type: "info" as const,
    icon: CheckCircle,
  },
  {
    id: 5,
    agent: "Sarah (Sales)",
    action: "Handling objection",
    detail: "Pricing concern - converting",
    time: "31 min ago",
    type: "warning" as const,
    icon: AlertCircle,
  },
];

const aiInsights = [
  {
    id: 1,
    type: "opportunity" as const,
    title: "Peak Performance Detected",
    description:
      "Your agents are 34% more effective between 2-4 PM. Consider scaling up during this window.",
    impact: "high" as const,
    icon: Flame,
  },
  {
    id: 2,
    type: "success" as const,
    title: "Conversion Rate Improving",
    description:
      "Sarah's booking rate increased by 18% this week after recent training updates.",
    impact: "high" as const,
    icon: TrendingUp,
  },
  {
    id: 3,
    type: "alert" as const,
    title: "Health Score Dip",
    description:
      "Alex (Support) experienced a 12% drop in response accuracy. Review recent conversations.",
    impact: "medium" as const,
    icon: AlertCircle,
  },
];

const topPerformers = [
  {
    name: "Sarah",
    role: "Sales Agent",
    conversations: 234,
    conversions: 67,
    rate: 29,
    trend: "up" as const,
  },
  {
    name: "Alex",
    role: "Support Agent",
    conversations: 456,
    conversions: 389,
    rate: 85,
    trend: "up" as const,
  },
  {
    name: "Maya",
    role: "Healthcare Agent",
    conversations: 189,
    conversions: 156,
    rate: 83,
    trend: "stable" as const,
  },
];

export function DashboardContent({
  flywheelJustActivated,
  userName = "there",
}: DashboardContentProps) {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">(
    "today"
  );

  // Placeholder metrics - will be dynamic from API
  const callsToday = 0;
  const totalConversations = 0;
  const liveAgents = 0;
  const totalAgents = 0;
  const activeNow = 0;
  const avgHealth = 100;

  return (
    <div className="space-y-6 px-6 py-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">
              Welcome back, {userName}! 👋
            </h1>
            <p className="text-lg text-purple-100">
              Your AI agents are working hard. Here&apos;s what&apos;s happening
              today.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 rounded-lg bg-white/10 p-1 backdrop-blur-sm">
            {(["today", "week", "month", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-md px-4 py-2 font-medium transition-all ${
                  timeRange === range
                    ? "bg-white text-purple-600 shadow-lg"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics - Enhanced Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Conversations"
          value={callsToday.toString()}
          change="+12%"
          changeType="positive"
          icon={Phone}
          iconBg="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`${totalConversations} all time`}
        />

        <MetricCard
          title="Active Agents"
          value={liveAgents.toString()}
          subtitle={`${totalAgents} total agents`}
          icon={Users}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
          badge={activeNow > 0 ? `${activeNow} calling now` : undefined}
          badgeType="success"
        />

        <MetricCard
          title="Conversion Rate"
          value="26%"
          change="+5%"
          changeType="positive"
          icon={Target}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="From qualified leads"
        />

        <MetricCard
          title="Health Score"
          value={`${avgHealth}%`}
          change="+3%"
          changeType="positive"
          icon={Activity}
          iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
          subtitle={
            avgHealth >= 80
              ? "Excellent"
              : avgHealth >= 60
                ? "Good"
                : "Needs attention"
          }
        />
      </div>

      {/* AI-Powered Insights */}
      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6 dark:border-purple-800 dark:from-purple-950/50 dark:to-blue-950/50">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            AI-Powered Insights
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiInsights.map((insight) => (
            <div
              key={insight.id}
              className="cursor-pointer rounded-xl border-2 border-slate-100 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-purple-600"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    insight.type === "opportunity"
                      ? "bg-orange-100 dark:bg-orange-900/50"
                      : insight.type === "success"
                        ? "bg-green-100 dark:bg-green-900/50"
                        : "bg-yellow-100 dark:bg-yellow-900/50"
                  }`}
                >
                  <insight.icon
                    className={`h-5 w-5 ${
                      insight.type === "opportunity"
                        ? "text-orange-600 dark:text-orange-400"
                        : insight.type === "success"
                          ? "text-green-600 dark:text-green-400"
                          : "text-yellow-600 dark:text-yellow-400"
                    }`}
                  />
                </div>

                <div className="flex-1">
                  <h3 className="mb-1 font-semibold text-slate-900 dark:text-white">
                    {insight.title}
                  </h3>
                  <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
                    {insight.description}
                  </p>
                  <span
                    className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                      insight.impact === "high"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    }`}
                  >
                    {insight.impact === "high" ? "High Impact" : "Medium Impact"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Performance Trend */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-300 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Performance Today
            </h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span className="text-slate-600 dark:text-slate-400">Calls</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-slate-600 dark:text-slate-400">Leads</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-slate-600 dark:text-slate-400">
                  Bookings
                </span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="time"
                stroke="#9CA3AF"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#9CA3AF" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  border: "none",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="calls"
                stroke="#8B5CF6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorCalls)"
              />
              <Area
                type="monotone"
                dataKey="leads"
                stroke="#3B82F6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
              <Area
                type="monotone"
                dataKey="bookings"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBookings)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Conversion Funnel */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-300 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">
            Conversion Funnel
          </h3>

          <div className="space-y-4">
            {conversionFunnel.map((stage, index) => (
              <div key={stage.stage}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {stage.stage}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {stage.count}
                  </span>
                </div>
                <div className="relative h-12 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`absolute inset-y-0 left-0 flex items-center justify-between rounded-lg px-4 transition-all duration-500 ${
                      index === 0
                        ? "bg-gradient-to-r from-purple-500 to-purple-600"
                        : index === 1
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : index === 2
                            ? "bg-gradient-to-r from-green-500 to-green-600"
                            : "bg-gradient-to-r from-amber-500 to-amber-600"
                    }`}
                    style={{ width: `${stage.percentage}%` }}
                  >
                    <span className="font-bold text-white">
                      {stage.percentage}%
                    </span>
                    {index < conversionFunnel.length - 1 && (
                      <span className="text-xs text-white">
                        {Math.round(
                          (conversionFunnel[index + 1].count / stage.count) * 100
                        )}
                        % convert →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Activity Feed & Top Performers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Live Activity Feed
            </h3>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Real-time
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-slate-100 p-4 transition-all hover:border-purple-200 hover:bg-purple-50/50 dark:border-slate-700 dark:hover:border-purple-800 dark:hover:bg-purple-950/20"
              >
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                    activity.type === "success"
                      ? "bg-green-100 dark:bg-green-900/50"
                      : activity.type === "warning"
                        ? "bg-yellow-100 dark:bg-yellow-900/50"
                        : "bg-blue-100 dark:bg-blue-900/50"
                  }`}
                >
                  <activity.icon
                    className={`h-5 w-5 ${
                      activity.type === "success"
                        ? "text-green-600 dark:text-green-400"
                        : activity.type === "warning"
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-blue-600 dark:text-blue-400"
                    }`}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {activity.agent}
                    </p>
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      {activity.time}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {activity.action}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                    {activity.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-4 w-full rounded-lg py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-950/50">
            View All Activity →
          </button>
        </div>

        {/* Top Performers */}
        <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 dark:border-amber-800 dark:from-amber-950/50 dark:to-orange-950/50">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500">
              <Award className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Top Performers
            </h3>
          </div>

          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div
                key={performer.name}
                className="rounded-xl border-2 border-amber-200 bg-white p-4 transition-all hover:border-amber-400 dark:border-amber-700 dark:bg-slate-900 dark:hover:border-amber-500"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-white ${
                      index === 0
                        ? "bg-gradient-to-br from-amber-500 to-orange-500"
                        : index === 1
                          ? "bg-gradient-to-br from-gray-400 to-gray-500"
                          : "bg-gradient-to-br from-orange-400 to-amber-500"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">
                      {performer.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {performer.role}
                    </p>
                  </div>
                  {performer.trend === "up" && (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Conversations
                    </p>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {performer.conversations}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600 dark:text-slate-400">
                      Success Rate
                    </p>
                    <p className="font-bold text-green-600">{performer.rate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  badge?: string;
  badgeType?: "success" | "warning" | "info";
}

function MetricCard({
  title,
  value,
  subtitle,
  change,
  changeType,
  icon: Icon,
  iconBg,
  badge,
  badgeType = "info",
}: MetricCardProps) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 transition-all hover:border-purple-300 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:hover:border-purple-600">
      <div className="mb-4 flex items-start justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-lg ${iconBg}`}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>

        {change && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 ${
              changeType === "positive"
                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
                : changeType === "negative"
                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            {changeType === "positive" && <ArrowUpRight className="h-3 w-3" />}
            {changeType === "negative" && <ArrowDownRight className="h-3 w-3" />}
            <span className="text-xs font-bold">{change}</span>
          </div>
        )}

        {badge && (
          <div
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${
              badgeType === "success"
                ? "bg-green-100 dark:bg-green-900/50"
                : badgeType === "warning"
                  ? "bg-yellow-100 dark:bg-yellow-900/50"
                  : "bg-blue-100 dark:bg-blue-900/50"
            }`}
          >
            <div
              className={`h-1.5 w-1.5 animate-pulse rounded-full ${
                badgeType === "success"
                  ? "bg-green-500"
                  : badgeType === "warning"
                    ? "bg-yellow-500"
                    : "bg-blue-500"
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                badgeType === "success"
                  ? "text-green-700 dark:text-green-400"
                  : badgeType === "warning"
                    ? "text-yellow-700 dark:text-yellow-400"
                    : "text-blue-700 dark:text-blue-400"
              }`}
            >
              {badge}
            </span>
          </div>
        )}
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
          {title}
        </p>
        <p className="mb-1 text-4xl font-bold text-slate-900 dark:text-white">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-500">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

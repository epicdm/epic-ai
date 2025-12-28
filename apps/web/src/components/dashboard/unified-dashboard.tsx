"use client";

/**
 * Unified Dashboard Component - PKG-026
 * Main command center bringing together all modules
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
  Select,
  SelectItem,
  Tooltip,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Sparkles,
  Send,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  Eye,
  Heart,
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  RefreshCw,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  Calendar,
  FileText,
  Zap,
  Activity,
} from "lucide-react";
import { FlywheelSetupGuide } from "./flywheel-setup-guide";
import { LearningLoopCard } from "./learning-loop-card";

interface DashboardData {
  brand: {
    id: string | null;
  };
  brandBrain: {
    isSetup: boolean;
    companyName: string | null;
    audienceCount: number;
    pillarCount: number;
    learningCount: number;
  };
  accounts: {
    total: number;
    totalFollowers: number;
    list: {
      id: string;
      platform: string;
      username: string | null;
      displayName: string | null;
      avatar: string | null;
      followerCount: number | null;
    }[];
  };
  content: {
    draft: number;
    pending: number;
    approved: number;
    scheduled: number;
    published: number;
    total: number;
  };
  organic: {
    posts: number;
    impressions: number;
    engagements: number;
    likes: number;
    comments: number;
    shares: number;
    avgEngagementRate: number;
  };
  paid: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpa: number;
  };
  leads: {
    total: number;
    new: number;
    contacted: number;
    qualified: number;
    converted: number;
    organic: number;
    paid: number;
  };
  roi: {
    totalSpend: number;
    totalLeads: number;
    costPerLead: number;
    conversionRate: number;
  };
  insights: {
    id: string;
    type: string;
    insight: string;
    confidence: number;
  }[];
  flywheel: {
    score: number;
    status: string;
    components: { name: string; active: boolean }[];
  };
  activity: {
    type: string;
    title: string;
    description: string;
    timestamp: string;
    platform?: string;
    status?: string;
  }[];
}

const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  TWITTER: Twitter,
  LINKEDIN: Linkedin,
  FACEBOOK: Facebook,
  INSTAGRAM: Instagram,
};

const PLATFORM_COLORS: Record<string, string> = {
  TWITTER: "bg-black",
  LINKEDIN: "bg-blue-700",
  FACEBOOK: "bg-blue-600",
  INSTAGRAM: "bg-gradient-to-br from-purple-600 to-pink-500",
};

const FLYWHEEL_STATUS_COLORS: Record<string, string> = {
  inactive: "text-default-400",
  starting: "text-warning",
  spinning: "text-primary",
  accelerating: "text-secondary",
  optimal: "text-success",
};

export function UnifiedDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("30");

  // Calculate onboarding progress
  const getOnboardingStatus = (dashboardData: DashboardData) => {
    const steps = [
      { id: 'brand', label: 'Set up Brand Brain', done: dashboardData.brandBrain.isSetup, href: '/dashboard/brand' },
      { id: 'accounts', label: 'Connect social accounts', done: dashboardData.accounts.total > 0, href: '/dashboard/social/accounts' },
      { id: 'content', label: 'Create your first post', done: dashboardData.content.total > 0, href: '/dashboard/content' },
    ];
    const completed = steps.filter(s => s.done).length;
    return { steps, completed, total: steps.length, isComplete: completed === steps.length };
  };

  const loadDashboard = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?period=${period}`);
      if (res.ok) {
        const dashboardData = await res.json();
        setData(dashboardData);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setError(errorData.error || `Failed to load dashboard (${res.status})`);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Unable to load dashboard</h2>
          <p className="text-default-500 mb-6">
            {error || "We couldn't fetch your dashboard data. Please try again."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="bordered" onPress={() => router.push("/onboarding")}>
              Setup Wizard
            </Button>
            <Button color="primary" onPress={() => loadDashboard()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const onboarding = data ? getOnboardingStatus(data) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">
            {data.brandBrain.companyName
              ? `Welcome back, ${data.brandBrain.companyName}`
              : "Welcome to Epic AI"}
          </h1>
          <p className="text-default-500">
            Your AI-powered marketing command center
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            size="sm"
            selectedKeys={[period]}
            onSelectionChange={(keys) =>
              setPeriod(Array.from(keys)[0] as string)
            }
            className="w-32"
          >
            <SelectItem key="7">7 days</SelectItem>
            <SelectItem key="30">30 days</SelectItem>
            <SelectItem key="90">90 days</SelectItem>
          </Select>
          <Button isIconOnly variant="bordered" onPress={() => loadDashboard()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Flywheel Setup Guide - Show prominently for new users */}
      {onboarding && !onboarding.isComplete && (
        <FlywheelSetupGuide
          dashboardData={{
            brandBrain: data.brandBrain,
            accounts: { connected: data.accounts?.total ?? 0, total: data.accounts?.total ?? 0 },
            content: { total: data.content?.total ?? 0, published: data.content?.published ?? 0 },
            publishing: { autoEnabled: data.flywheel?.status === "optimal" },
          }}
        />
      )}

      {/* Compact flywheel guide for returning users who haven't finished setup */}
      {onboarding && onboarding.isComplete && data.flywheel?.status === "inactive" && (
        <FlywheelSetupGuide
          dashboardData={{
            brandBrain: data.brandBrain,
            accounts: { connected: data.accounts?.total ?? 0, total: data.accounts?.total ?? 0 },
            content: { total: data.content?.total ?? 0, published: data.content?.published ?? 0 },
            publishing: { autoEnabled: false },
          }}
          compact
        />
      )}

      {/* Flywheel Status */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div
                  className={`w-20 h-20 rounded-full border-4 ${
                    data.flywheel.status === "optimal"
                      ? "border-success"
                      : data.flywheel.status === "accelerating"
                        ? "border-secondary"
                        : data.flywheel.status === "spinning"
                          ? "border-primary"
                          : "border-default-300"
                  } flex items-center justify-center`}
                >
                  <Zap
                    className={`w-8 h-8 ${FLYWHEEL_STATUS_COLORS[data.flywheel.status]}`}
                  />
                </div>
                {data.flywheel.status !== "inactive" && (
                  <div className="absolute -top-1 -right-1">
                    <span className="relative flex h-4 w-4">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                          data.flywheel.status === "optimal"
                            ? "bg-success"
                            : "bg-primary"
                        } opacity-75`}
                      ></span>
                      <span
                        className={`relative inline-flex rounded-full h-4 w-4 ${
                          data.flywheel.status === "optimal"
                            ? "bg-success"
                            : "bg-primary"
                        }`}
                      ></span>
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold capitalize">
                  Flywheel: {data.flywheel.status}
                </h2>
                <Progress
                  value={data.flywheel.score}
                  className="w-48 mt-2"
                  color={
                    data.flywheel.score >= 90
                      ? "success"
                      : data.flywheel.score >= 60
                        ? "primary"
                        : "warning"
                  }
                />
                <p className="text-sm text-default-500 mt-1">
                  {data.flywheel.score}% complete
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              {data.flywheel.components.map((comp, i) => (
                <Tooltip key={i} content={comp.name}>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      comp.active ? "bg-success" : "bg-default-300"
                    }`}
                  />
                </Tooltip>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Learning Loop - Show for users with active flywheel */}
      {onboarding?.isComplete && data.brand.id && (
        <LearningLoopCard brandId={data.brand.id} compact />
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card isPressable onPress={() => router.push("/dashboard/content")}>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Create Content</p>
              <p className="text-xs text-default-500">AI-powered</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => router.push("/dashboard/calendar")}>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Calendar className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="font-medium">View Calendar</p>
              <p className="text-xs text-default-500">
                {data.content.scheduled} scheduled
              </p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => router.push("/dashboard/leads")}>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-medium">Manage Leads</p>
              <p className="text-xs text-default-500">{data.leads.new} new</p>
            </div>
          </CardBody>
        </Card>

        <Card isPressable onPress={() => router.push("/dashboard/brand")}>
          <CardBody className="flex flex-row items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Brain className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="font-medium">Brand Brain</p>
              <p className="text-xs text-default-500">
                {data.brandBrain.learningCount} learnings
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organic Performance */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-semibold">Organic</span>
            </div>
            <Button
              size="sm"
              variant="light"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={() => router.push("/dashboard/analytics")}
            >
              Details
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <Eye className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">
                  {data.organic.impressions.toLocaleString()}
                </p>
                <p className="text-xs text-default-500">Impressions</p>
              </div>
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <Heart className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">
                  {data.organic.engagements.toLocaleString()}
                </p>
                <p className="text-xs text-default-500">Engagements</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm">Avg Engagement Rate</span>
              <Chip color="primary" variant="flat">
                {data.organic.avgEngagementRate.toFixed(2)}%
              </Chip>
            </div>
          </CardBody>
        </Card>

        {/* Paid Performance */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              <span className="font-semibold">Paid Ads</span>
            </div>
            <Button
              size="sm"
              variant="light"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={() => router.push("/dashboard/ads")}
            >
              Details
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <DollarSign className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">
                  ${data.paid.spend.toLocaleString()}
                </p>
                <p className="text-xs text-default-500">Ad Spend</p>
              </div>
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <Target className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{data.paid.conversions}</p>
                <p className="text-xs text-default-500">Conversions</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-success/5 rounded-lg">
              <span className="text-sm">Cost per Lead</span>
              <Chip color="success" variant="flat">
                ${data.paid.cpa.toFixed(2)}
              </Chip>
            </div>
          </CardBody>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-warning" />
              <span className="font-semibold">Leads</span>
            </div>
            <Button
              size="sm"
              variant="light"
              endContent={<ArrowRight className="w-4 h-4" />}
              onPress={() => router.push("/dashboard/leads")}
            >
              Details
            </Button>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <Users className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{data.leads.total}</p>
                <p className="text-xs text-default-500">Total Leads</p>
              </div>
              <div className="text-center p-3 bg-default-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-default-400 mx-auto mb-1" />
                <p className="text-xl font-bold">{data.leads.qualified}</p>
                <p className="text-xs text-default-500">Qualified</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-warning/5 rounded-lg">
              <span className="text-sm">Conversion Rate</span>
              <Chip color="warning" variant="flat">
                {data.roi.conversionRate.toFixed(1)}%
              </Chip>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* AI Insights & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Insights */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              <span className="font-semibold">AI Insights</span>
            </div>
          </CardHeader>
          <CardBody>
            {data.insights.length > 0 ? (
              <div className="space-y-3">
                {data.insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="p-3 bg-warning/5 border border-warning/20 rounded-lg"
                  >
                    <p className="text-sm">{insight.insight}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Chip size="sm" variant="flat">
                        {insight.type.replace(/_/g, " ")}
                      </Chip>
                      <span className="text-xs text-default-400">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="w-12 h-12 text-default-200 mx-auto mb-3" />
                <p className="text-default-500">
                  No insights yet. Keep posting to unlock AI recommendations!
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-secondary" />
              <span className="font-semibold">Recent Activity</span>
            </div>
          </CardHeader>
          <CardBody>
            {data.activity.length > 0 ? (
              <div className="space-y-3">
                {data.activity.map((item, i) => {
                  const Icon =
                    item.type === "post_published"
                      ? Send
                      : item.type === "lead_created"
                        ? Users
                        : FileText;
                  const PlatformIcon = item.platform
                    ? PLATFORM_ICONS[item.platform]
                    : null;

                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-default-50"
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          item.type === "post_published"
                            ? "bg-success/10"
                            : item.type === "lead_created"
                              ? "bg-primary/10"
                              : "bg-secondary/10"
                        }`}
                      >
                        {PlatformIcon ? (
                          <PlatformIcon className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-default-500 truncate">
                          {item.description}
                        </p>
                      </div>
                      <span className="text-xs text-default-400 whitespace-nowrap">
                        {formatTimeAgo(new Date(item.timestamp))}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-default-200 mx-auto mb-3" />
                <p className="text-default-500">No recent activity</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span className="font-semibold">Connected Accounts</span>
          </div>
          <Button
            size="sm"
            variant="bordered"
            onPress={() => router.push("/dashboard/social/accounts")}
          >
            Manage
          </Button>
        </CardHeader>
        <CardBody>
          {data.accounts.list.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {data.accounts.list.map((account) => {
                const Icon = PLATFORM_ICONS[account.platform];
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-3 p-3 bg-default-50 rounded-lg"
                  >
                    <div
                      className={`w-10 h-10 ${PLATFORM_COLORS[account.platform]} rounded-lg flex items-center justify-center`}
                    >
                      {Icon && <Icon className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium">
                        @{account.username || account.displayName}
                      </p>
                      <p className="text-xs text-default-500">
                        {account.followerCount?.toLocaleString() || 0} followers
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-default-500 mb-3">
                No accounts connected yet
              </p>
              <Button
                color="primary"
                onPress={() => router.push("/dashboard/social/accounts")}
              >
                Connect Account
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Success celebration when onboarding complete */}
      {onboarding?.isComplete && data.content.total <= 3 && (
        <Card className="bg-gradient-to-r from-success to-secondary">
          <CardBody className="text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎉</div>
                <div>
                  <h3 className="text-lg font-semibold">You're all set up!</h3>
                  <p className="text-white/80">
                    Your flywheel is ready. Create content and watch it spin!
                  </p>
                </div>
              </div>
              <Button
                color="default"
                variant="solid"
                onPress={() => router.push("/dashboard/content")}
              >
                Create Post
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/**
 * Format time ago
 */
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

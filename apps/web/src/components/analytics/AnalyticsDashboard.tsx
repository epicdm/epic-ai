"use client";

/**
 * Analytics Dashboard Component - PKG-025
 * Displays social media performance metrics and AI insights
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
} from "@heroui/react";
import {
  BarChart3,
  TrendingUp,
  Eye,
  Heart,
  MessageSquare,
  Share2,
  Users,
  Lightbulb,
  RefreshCw,
  Clock,
  Calendar,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
} from "lucide-react";

interface AnalyticsStats {
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
  avgEngagementRate: number;
  avgImpressions: number;
  avgEngagements: number;
  topHashtags: string[];
  bestDayOfWeek: number | null;
  bestHourOfDay: number | null;
}

interface PostAnalytics {
  id: string;
  platform: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  publishedAt: string;
  variation: {
    id: string;
    text: string;
    postUrl: string | null;
    platform: string;
  };
}

interface Learning {
  id: string;
  type: string;
  insight: string;
  confidence: number;
  createdAt: string;
}

interface Account {
  id: string;
  platform: string;
  username: string;
  avatar: string | null;
  followerCount: number | null;
}

interface Props {
  orgId: string;
  brandId?: string;
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

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function AnalyticsDashboard({ orgId, brandId }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<PostAnalytics[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [period, setPeriod] = useState("30");
  const [platform, setPlatform] = useState<string>("");

  // Load analytics
  const loadAnalytics = useCallback(async () => {
    try {
      const params = new URLSearchParams({ period });
      if (platform) params.set("platform", platform);
      if (brandId) params.set("brandId", brandId);

      const res = await fetch(`/api/analytics?${params}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentPosts(data.recentPosts || []);
        setAccounts(data.accounts || []);
        setLearnings(data.learnings || []);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, platform, brandId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const refresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  const totalFollowers = accounts.reduce((sum, a) => sum + (a.followerCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-gray-500 mt-1">
            Track your social media performance and discover what works
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            size="sm"
            selectedKeys={platform ? [platform] : []}
            onSelectionChange={(keys) => setPlatform(Array.from(keys)[0] as string || "")}
            placeholder="All Platforms"
            className="w-40"
          >
            <SelectItem key="TWITTER">Twitter</SelectItem>
            <SelectItem key="LINKEDIN">LinkedIn</SelectItem>
            <SelectItem key="FACEBOOK">Facebook</SelectItem>
            <SelectItem key="INSTAGRAM">Instagram</SelectItem>
          </Select>
          <Select
            size="sm"
            selectedKeys={[period]}
            onSelectionChange={(keys) => setPeriod(Array.from(keys)[0] as string)}
            className="w-32"
          >
            <SelectItem key="7">7 days</SelectItem>
            <SelectItem key="30">30 days</SelectItem>
            <SelectItem key="90">90 days</SelectItem>
          </Select>
          <Button
            isIconOnly
            variant="bordered"
            onPress={refresh}
            isLoading={refreshing}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Impressions</p>
              <p className="text-2xl font-bold">
                {stats?.totalImpressions?.toLocaleString() || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Heart className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Engagements</p>
              <p className="text-2xl font-bold">
                {stats?.totalEngagements?.toLocaleString() || 0}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Engagement</p>
              <p className="text-2xl font-bold">
                {stats?.avgEngagementRate?.toFixed(2) || 0}%
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Users className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Followers</p>
              <p className="text-2xl font-bold">
                {totalFollowers.toLocaleString()}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Best Posting Times */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-semibold">Best Posting Times</span>
            </div>
          </CardHeader>
          <CardBody>
            {stats && stats.bestDayOfWeek !== null && stats.bestHourOfDay !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <span>Best Day</span>
                  </div>
                  <span className="font-bold">{DAYS[stats.bestDayOfWeek]}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Best Time</span>
                  </div>
                  <span className="font-bold">{stats.bestHourOfDay}:00</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Not enough data yet
              </p>
            )}
          </CardBody>
        </Card>

        {/* Top Hashtags */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">Top Hashtags</span>
            </div>
          </CardHeader>
          <CardBody>
            {stats?.topHashtags && stats.topHashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {stats.topHashtags.slice(0, 10).map((tag, i) => (
                  <Chip
                    key={i}
                    variant="flat"
                    color={i < 3 ? "success" : "default"}
                  >
                    {tag}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No hashtag data yet
              </p>
            )}
          </CardBody>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              <span className="font-semibold">Accounts</span>
            </div>
          </CardHeader>
          <CardBody>
            {accounts.length > 0 ? (
              <div className="space-y-3">
                {accounts.map((account) => {
                  const Icon = PLATFORM_ICONS[account.platform];
                  return (
                    <div
                      key={account.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 ${
                            PLATFORM_COLORS[account.platform]
                          } rounded flex items-center justify-center`}
                        >
                          {Icon && <Icon className="w-4 h-4 text-white" />}
                        </div>
                        <span className="text-sm">@{account.username}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {account.followerCount?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-gray-400">followers</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No accounts connected
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      {/* AI Learnings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold">AI-Powered Insights</span>
          </div>
        </CardHeader>
        <CardBody>
          {learnings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learnings.map((learning) => (
                <div
                  key={learning.id}
                  className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm">{learning.insight}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Chip size="sm" variant="flat">
                          {learning.type.replace(/_/g, " ")}
                        </Chip>
                        <span className="text-xs text-gray-400">
                          {(learning.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No insights generated yet. Post more content to unlock AI-powered
              recommendations!
            </p>
          )}
        </CardBody>
      </Card>

      {/* Recent Posts Performance */}
      <Card>
        <CardHeader>
          <span className="font-semibold">Recent Posts Performance</span>
        </CardHeader>
        <CardBody>
          {recentPosts.length > 0 ? (
            <div className="space-y-4">
              {recentPosts.slice(0, 10).map((analytics) => {
                const Icon = PLATFORM_ICONS[analytics.platform];
                return (
                  <div
                    key={analytics.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={`w-10 h-10 ${
                          PLATFORM_COLORS[analytics.platform]
                        } rounded flex items-center justify-center flex-shrink-0`}
                      >
                        {Icon && <Icon className="w-5 h-5 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm truncate">
                          {analytics.variation?.text?.substring(0, 80)}...
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(analytics.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {analytics.impressions.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">views</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{analytics.likes}</p>
                        <p className="text-xs text-gray-400">likes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">
                          {analytics.comments}
                        </p>
                        <p className="text-xs text-gray-400">comments</p>
                      </div>
                      <div className="text-center">
                        <Chip
                          size="sm"
                          color={
                            analytics.engagementRate > 3 ? "success" : "default"
                          }
                        >
                          {analytics.engagementRate.toFixed(2)}%
                        </Chip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No published posts yet. Start publishing to see performance data!
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

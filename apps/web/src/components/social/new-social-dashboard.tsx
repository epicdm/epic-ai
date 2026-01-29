"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient, endpoints, queryKeys, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SectionCard } from "@/components/ui/section-card";
import { MetricCard, MetricCardGrid } from "@/components/ui/metric-card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  Share2,
  Link2,
  Plus,
  Twitter,
  Linkedin,
  Facebook,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Send,
  TrendingUp,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SocialAccount {
  id: string;
  platform: string;
  accountName: string;
  profileImageUrl: string | null;
  isActive: boolean;
  lastSyncedAt: string | null;
}

interface RecentPost {
  id: string;
  content: string;
  platform: string;
  status: string;
  publishedAt: string | null;
  impressions: number | null;
  engagements: number | null;
}

interface SocialStats {
  connectedAccounts: number;
  totalPosts: number;
  totalImpressions: number;
  totalEngagements: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PLATFORM_ICONS: Record<string, typeof Twitter> = {
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
};

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const Icon = PLATFORM_ICONS[platform.toLowerCase()] ?? Share2;
  return <Icon className={className} />;
}

const postColumns: DataTableColumn<RecentPost>[] = [
  {
    key: "content",
    header: "Content",
    cell: (r) => (
      <div className="max-w-xs truncate text-sm">{r.content}</div>
    ),
  },
  {
    key: "platform",
    header: "Platform",
    cell: (r) => (
      <div className="flex items-center gap-1.5">
        <PlatformIcon platform={r.platform} className="h-3.5 w-3.5" />
        <span className="text-sm capitalize">{r.platform}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => (
      <Badge
        variant={r.status === "published" ? "default" : "secondary"}
        className="capitalize"
      >
        {r.status}
      </Badge>
    ),
  },
  {
    key: "impressions",
    header: "Impressions",
    cell: (r) => (
      <span className="text-sm tabular-nums">
        {r.impressions?.toLocaleString() ?? "–"}
      </span>
    ),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
  {
    key: "engagements",
    header: "Engagements",
    cell: (r) => (
      <span className="text-sm tabular-nums">
        {r.engagements?.toLocaleString() ?? "–"}
      </span>
    ),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewSocialDashboard() {
  const { data: accounts, isLoading: loadingAccounts } = useQuery({
    queryKey: queryKeys.social.integrations(),
    queryFn: async () => {
      const res = await apiClient.get<SocialAccount[] | { data: SocialAccount[] | null }>(
        endpoints.social.integrations()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<SocialAccount>(res.data);
    },
  });

  const { data: posts, isLoading: loadingPosts } = useQuery({
    queryKey: queryKeys.social.posts(),
    queryFn: async () => {
      const res = await apiClient.get<RecentPost[] | { data: RecentPost[] | null }>(
        endpoints.social.posts()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<RecentPost>(res.data);
    },
  });

  const activeAccounts = (accounts ?? []).filter((a) => a.isActive);

  const stats: SocialStats = {
    connectedAccounts: activeAccounts.length,
    totalPosts: (posts ?? []).length,
    totalImpressions: (posts ?? []).reduce(
      (sum, p) => sum + (p.impressions ?? 0),
      0
    ),
    totalEngagements: (posts ?? []).reduce(
      (sum, p) => sum + (p.engagements ?? 0),
      0
    ),
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Social</h1>
          <p className="text-muted-foreground">
            Manage connected accounts and published content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/social/accounts">
              <Link2 className="mr-2 h-4 w-4" />
              Manage Accounts
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/social/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <MetricCardGrid>
        <MetricCard
          label="Connected Accounts"
          value={stats.connectedAccounts}
          icon={<Link2 className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Posts"
          value={stats.totalPosts}
          icon={<Send className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Impressions"
          value={stats.totalImpressions.toLocaleString()}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Engagements"
          value={stats.totalEngagements.toLocaleString()}
          icon={<Users className="h-5 w-5" />}
        />
      </MetricCardGrid>

      {/* Tabs: Accounts + Posts */}
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts">
            Connected Accounts ({activeAccounts.length})
          </TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
          {loadingAccounts ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : activeAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Share2 className="mb-4 h-10 w-10 text-muted-foreground/50" />
                <h3 className="font-semibold">No Accounts Connected</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect your social accounts to start publishing
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link href="/dashboard/social/accounts">
                    Connect Account
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl",
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        )}
                      >
                        <PlatformIcon
                          platform={account.platform}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {account.accountName}
                        </p>
                        <p className="text-xs capitalize text-muted-foreground">
                          {account.platform}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    {account.lastSyncedAt && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Last synced{" "}
                        {new Date(account.lastSyncedAt).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <DataTable
            columns={postColumns}
            data={posts ?? []}
            rowKey={(r) => r.id}
            isLoading={loadingPosts}
            emptyMessage="No posts published yet"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

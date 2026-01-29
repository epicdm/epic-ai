"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, endpoints, queryKeys, unwrapArray } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { MetricCard, MetricCardGrid } from "@/components/ui/metric-card";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  Send,
  Sparkles,
  Eye,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ContentItem {
  id: string;
  content: string;
  contentType: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "PUBLISHED" | "SCHEDULED";
  platform: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface ContentStats {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  published: number;
  scheduled: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
  DRAFT: { variant: "secondary", label: "Draft" },
  PENDING: { variant: "outline", label: "Pending" },
  APPROVED: { variant: "default", label: "Approved" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  PUBLISHED: { variant: "default", label: "Published" },
  SCHEDULED: { variant: "outline", label: "Scheduled" },
};

const contentColumns: DataTableColumn<ContentItem>[] = [
  {
    key: "content",
    header: "Content",
    cell: (r) => (
      <div className="max-w-sm">
        <p className="truncate text-sm font-medium">{r.content}</p>
        <p className="text-xs text-muted-foreground capitalize">{r.contentType}</p>
      </div>
    ),
  },
  {
    key: "platform",
    header: "Platform",
    cell: (r) =>
      r.platform ? (
        <Badge variant="outline" className="capitalize">
          {r.platform}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">–</span>
      ),
  },
  {
    key: "status",
    header: "Status",
    cell: (r) => {
      const cfg = STATUS_BADGE[r.status] ?? STATUS_BADGE.DRAFT;
      return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    key: "date",
    header: "Date",
    cell: (r) => (
      <span className="text-xs text-muted-foreground">
        {r.publishedAt
          ? new Date(r.publishedAt).toLocaleDateString()
          : r.scheduledAt
            ? `Scheduled ${new Date(r.scheduledAt).toLocaleDateString()}`
            : new Date(r.createdAt).toLocaleDateString()}
      </span>
    ),
    headerClassName: "text-right",
    cellClassName: "text-right",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewContentQueue() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const { data: items, isLoading } = useQuery({
    queryKey: queryKeys.content.queue.all(),
    queryFn: async () => {
      const res = await apiClient.get<ContentItem[] | { data: ContentItem[] | null }>(
        endpoints.content.queue.list()
      );
      if (res.error) throw new Error(res.error.message);
      return unwrapArray<ContentItem>(res.data);
    },
  });

  const allItems = items ?? [];

  const filtered = allItems.filter((item) => {
    const matchesSearch =
      !search || item.content.toLowerCase().includes(search.toLowerCase());
    const matchesTab =
      tab === "all" ||
      item.status.toLowerCase() === tab;
    return matchesSearch && matchesTab;
  });

  const stats: ContentStats = {
    total: allItems.length,
    draft: allItems.filter((i) => i.status === "DRAFT").length,
    pending: allItems.filter((i) => i.status === "PENDING").length,
    approved: allItems.filter((i) => i.status === "APPROVED").length,
    published: allItems.filter((i) => i.status === "PUBLISHED").length,
    scheduled: allItems.filter((i) => i.status === "SCHEDULED").length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Queue</h1>
          <p className="text-muted-foreground">
            Manage your AI-generated content pipeline
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/content/generate">
            <Plus className="mr-2 h-4 w-4" />
            Generate Content
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <MetricCardGrid>
        <MetricCard
          label="Total Content"
          value={stats.total}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          label="Pending Review"
          value={stats.pending}
          icon={<Clock className="h-5 w-5" />}
        />
        <MetricCard
          label="Approved"
          value={stats.approved}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <MetricCard
          label="Published"
          value={stats.published}
          icon={<Send className="h-5 w-5" />}
        />
      </MetricCardGrid>

      {/* Search + filter tabs */}
      <div className="space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
            <TabsTrigger value="approved">Approved ({stats.approved})</TabsTrigger>
            <TabsTrigger value="published">Published ({stats.published})</TabsTrigger>
            <TabsTrigger value="draft">Drafts ({stats.draft})</TabsTrigger>
          </TabsList>
        </Tabs>

        <DataTable
          columns={contentColumns}
          data={filtered}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          emptyMessage={
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-8 w-8 text-muted-foreground/50" />
              <p>No content yet</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/content/generate">Generate Content</Link>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}

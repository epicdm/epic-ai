"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Send,
  BarChart3,
  Users,
  Phone,
  Brain,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard, MetricCardGrid } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { cn } from "@/lib/utils";
import { apiClient, endpoints, queryKeys } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  brandCount: number;
  postCount: number;
  callCount: number;
  leadCount: number;
  pendingContent: number;
  scheduledContent: number;
  brainCompleteness: number;
}

/**
 * Shape returned by the /api/dashboard endpoint.
 * We only type the fields we consume here; the full payload is larger.
 */
interface DashboardApiResponse {
  brand: { id: string | null };
  brandBrain: {
    isSetup: boolean;
    companyName: string | null;
    audienceCount: number;
    pillarCount: number;
    learningCount: number;
  };
  accounts: { total: number };
  content: {
    pending: number;
    scheduled: number;
    published: number;
    total: number;
  };
  leads: { total: number };
  voice: { totalCalls: number };
  flywheel: {
    score: number;
    status: string;
    components: { name: string; active: boolean }[];
  };
}

/** Map the raw API response into the flattened stats shape. */
function toStats(raw: DashboardApiResponse): DashboardStats {
  // Brain completeness: count which brand-brain components are set up
  const brainParts = [
    raw.brandBrain.isSetup,
    raw.brandBrain.audienceCount > 0,
    raw.brandBrain.pillarCount > 0,
    raw.brandBrain.learningCount > 0,
  ];
  const completedParts = brainParts.filter(Boolean).length;
  const brainCompleteness = Math.round((completedParts / brainParts.length) * 100);

  return {
    brandCount: raw.brand.id ? 1 : 0,
    postCount: raw.content.published,
    callCount: raw.voice.totalCalls,
    leadCount: raw.leads.total,
    pendingContent: raw.content.pending,
    scheduledContent: raw.content.scheduled,
    brainCompleteness,
  };
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const quickActions = [
  {
    title: "Generate Content",
    description: "Create AI-powered posts",
    label: "Create",
    href: "/dashboard/content/generate",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    title: "Review Queue",
    description: "Approve pending content",
    label: "Review",
    href: "/dashboard/content/approval",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    title: "View Analytics",
    description: "Track performance",
    label: "Analyze",
    href: "/dashboard/analytics",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Manage Agents",
    description: "Configure AI agents",
    label: "Manage",
    href: "/dashboard/agents",
    icon: <Users className="h-5 w-5" />,
  },
];

const checklistItems = [
  { step: 1, label: "Set up your brand", done: false },
  { step: 2, label: "Connect social accounts", done: false },
  { step: 3, label: "Generate first content", done: false },
  { step: 4, label: "Schedule first post", done: false },
  { step: 5, label: "Review analytics", done: false },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface DashboardContentProps {
  firstName: string | null;
  organizationName: string | null;
}

export function NewDashboardContent({
  firstName,
  organizationName,
}: DashboardContentProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: async () => {
      const res = await apiClient.get<DashboardApiResponse>(endpoints.dashboard());
      if (res.error) throw new Error(res.error.message);
      return toStats(res.data);
    },
  });

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        </h1>
        <p className="text-muted-foreground">
          {organizationName
            ? `${organizationName} Dashboard`
            : "Your AI Marketing Dashboard"}
        </p>
      </div>

      {/* Metrics row - 4 cards */}
      <MetricCardGrid>
        <MetricCard
          label="Content Queue"
          value={isLoading ? "--" : (stats?.pendingContent ?? 0)}
          icon={<FileText className="h-5 w-5" />}
          subtitle={
            stats?.scheduledContent
              ? `${stats.scheduledContent} scheduled`
              : undefined
          }
        />
        <MetricCard
          label="Published"
          value={isLoading ? "--" : (stats?.postCount ?? 0)}
          icon={<Send className="h-5 w-5" />}
        />
        <MetricCard
          label="Leads"
          value={isLoading ? "--" : (stats?.leadCount ?? 0)}
          icon={<Users className="h-5 w-5" />}
        />
        <MetricCard
          label="Voice Calls"
          value={isLoading ? "--" : (stats?.callCount ?? 0)}
          icon={<Phone className="h-5 w-5" />}
        />
      </MetricCardGrid>

      {/* Quick Actions grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Card
              key={action.href}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{action.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {action.description}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full mt-4"
                >
                  <Link href={action.href}>
                    {action.label}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Two-column: Brand Brain + Getting Started checklist */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Brand Brain"
          description="Your AI brain's knowledge status"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Completeness
              </span>
              <span className="text-sm font-medium">
                {isLoading ? "--" : `${stats?.brainCompleteness ?? 0}%`}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${stats?.brainCompleteness ?? 0}%` }}
              />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/dashboard/brand">
                <Brain className="mr-2 h-4 w-4" />
                Configure Brand Brain
              </Link>
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="Getting Started"
          description="Complete these steps to activate your flywheel"
        >
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                    item.done
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {item.done ? "✓" : item.step}
                </div>
                <span
                  className={cn(
                    "text-sm",
                    item.done && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  TrendingUp,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  BarChart3,
  Zap,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  status: string;
  dailyBudget: number | null;
  metrics: {
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
    ctr: number | null;
    cpl: number | null;
  } | null;
  adCreatives: { imageUrl: string | null }[];
}

interface Recommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  impact: string;
  campaignId: string | null;
}

interface Totals {
  impressions: number;
  clicks: number;
  leads: number;
  spend: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  META: "bg-blue-500",
  GOOGLE: "bg-red-500",
  LINKEDIN: "bg-blue-700",
  TIKTOK: "bg-black",
  TWITTER: "bg-sky-500",
};

const STATUS_COLORS: Record<string, "success" | "warning" | "danger" | "default"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  DRAFT: "default",
  COMPLETED: "default",
};

export function AdsDashboard() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totals, setTotals] = useState<Totals>({ impressions: 0, clicks: 0, leads: 0, spend: 0 });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campaignsRes, recsRes] = await Promise.all([
        fetch("/api/ads/campaigns"),
        fetch("/api/ads/recommendations"),
      ]);

      if (campaignsRes.ok) {
        const data = await campaignsRes.json();
        setCampaigns(data.campaigns || []);
        setTotals(data.totals || { impressions: 0, clicks: 0, leads: 0, spend: 0 });
      }

      if (recsRes.ok) {
        const data = await recsRes.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Error loading ads data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRecommendation(id: string, action: "apply" | "dismiss") {
    try {
      await fetch(`/api/ads/recommendations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      loadData();
    } catch (error) {
      console.error("Error handling recommendation:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const avgCPL = totals.leads > 0 ? totals.spend / totals.leads : 0;
  const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ads"
        description="Manage your advertising campaigns across platforms."
        actions={
          <Link href="/dashboard/ads/create">
            <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
              Create Campaign
            </Button>
          </Link>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Total Spend</p>
              <p className="text-2xl font-bold">${totals.spend.toLocaleString()}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <Users className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Leads</p>
              <p className="text-2xl font-bold">{totals.leads.toLocaleString()}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-lg">
              <MousePointer className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">Avg CPL</p>
              <p className="text-2xl font-bold">${avgCPL.toFixed(2)}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-secondary/10 rounded-lg">
              <Eye className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Avg CTR</p>
              <p className="text-2xl font-bold">{avgCTR.toFixed(2)}%</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <h2 className="text-lg font-semibold">AI Recommendations</h2>
            </div>
            <Button
              size="sm"
              variant="light"
              onClick={() => fetch("/api/ads/recommendations", { method: "POST" }).then(loadData)}
            >
              Refresh
            </Button>
          </CardHeader>
          <CardBody className="space-y-3">
            {recommendations.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/20"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                  <div>
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-default-500">{rec.description}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => handleRecommendation(rec.id, "dismiss")}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    color="warning"
                    onClick={() => handleRecommendation(rec.id, "apply")}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Campaigns */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <div className="flex gap-2">
            <Link href="/dashboard/ads/accounts">
              <Button size="sm" variant="bordered">
                Ad Accounts
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-default-200 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
              <p className="text-default-500 mb-6">
                Create your first ad campaign to start driving leads.
              </p>
              <Link href="/dashboard/ads/create">
                <Button color="primary" startContent={<Plus className="w-4 h-4" />}>
                  Create Campaign
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/dashboard/ads/campaigns/${campaign.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-default-200 hover:border-primary hover:bg-primary/5 transition-colors">
                    <div
                      className={`w-10 h-10 ${PLATFORM_COLORS[campaign.platform]} rounded-lg flex items-center justify-center text-white text-xs font-bold`}
                    >
                      {campaign.platform.slice(0, 2)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <Chip
                          size="sm"
                          color={STATUS_COLORS[campaign.status]}
                          variant="flat"
                        >
                          {campaign.status}
                        </Chip>
                      </div>
                      <p className="text-sm text-default-500">
                        {campaign.dailyBudget
                          ? `$${campaign.dailyBudget}/day`
                          : "No budget set"}
                      </p>
                    </div>

                    {campaign.metrics && (
                      <div className="hidden md:flex gap-6 text-sm">
                        <div className="text-center">
                          <p className="text-default-500">Impressions</p>
                          <p className="font-medium">
                            {campaign.metrics.impressions.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-default-500">Clicks</p>
                          <p className="font-medium">
                            {campaign.metrics.clicks.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-default-500">Leads</p>
                          <p className="font-medium">{campaign.metrics.leads}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-default-500">Spend</p>
                          <p className="font-medium">
                            ${Number(campaign.metrics.spend).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/dashboard/ads/create">
          <Card isPressable className="h-full">
            <CardBody className="flex flex-col items-center justify-center gap-2 py-6">
              <Plus className="w-8 h-8 text-primary" />
              <span className="font-medium">New Campaign</span>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/ads/create">
          <Card isPressable className="h-full">
            <CardBody className="flex flex-col items-center justify-center gap-2 py-6">
              <Zap className="w-8 h-8 text-warning" />
              <span className="font-medium">AI Ad Generator</span>
            </CardBody>
          </Card>
        </Link>

        <Link href="/dashboard/ads/accounts">
          <Card isPressable className="h-full">
            <CardBody className="flex flex-col items-center justify-center gap-2 py-6">
              <BarChart3 className="w-8 h-8 text-success" />
              <span className="font-medium">Ad Accounts</span>
            </CardBody>
          </Card>
        </Link>

        <Card isPressable className="h-full opacity-50">
          <CardBody className="flex flex-col items-center justify-center gap-2 py-6">
            <TrendingUp className="w-8 h-8 text-secondary" />
            <span className="font-medium">Analytics</span>
            <span className="text-xs text-default-400">Coming Soon</span>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

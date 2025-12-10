"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Spinner,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Select,
  SelectItem,
} from "@heroui/react";
import { PageHeader } from "@/components/layout/page-header";
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Users,
  MousePointer,
  Eye,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Campaign {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  dailyBudget: number | null;
  totalBudget: number | null;
  targeting: { audience?: string } | null;
  startDate: string | null;
  endDate: string | null;
  adCreatives: {
    id: string;
    headline: string;
    primaryText: string;
    imageUrl: string | null;
    callToAction: string;
  }[];
  metrics: {
    impressions: number;
    clicks: number;
    leads: number;
    conversions: number;
    spend: number;
    ctr: number | null;
    cpc: number | null;
    cpl: number | null;
  } | null;
  dailyMetrics: {
    date: string;
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
  }[];
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
];

interface CampaignDetailPageProps {
  campaignId: string;
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const { isOpen: isMetricsOpen, onOpen: onMetricsOpen, onClose: onMetricsClose } = useDisclosure();
  const [saving, setSaving] = useState(false);

  // Metrics form
  const [metricsForm, setMetricsForm] = useState({
    impressions: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    spend: 0,
  });

  const loadCampaign = useCallback(async () => {
    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setCampaign(data.campaign);
        if (data.campaign.metrics) {
          setMetricsForm({
            impressions: data.campaign.metrics.impressions || 0,
            clicks: data.campaign.metrics.clicks || 0,
            leads: data.campaign.metrics.leads || 0,
            conversions: data.campaign.metrics.conversions || 0,
            spend: Number(data.campaign.metrics.spend) || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading campaign:", error);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  async function updateStatus(newStatus: string) {
    try {
      await fetch(`/api/ads/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      loadCampaign();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }

  async function saveMetrics() {
    setSaving(true);
    try {
      await fetch(`/api/ads/campaigns/${campaignId}/metrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metricsForm),
      });
      onMetricsClose();
      loadCampaign();
    } catch (error) {
      console.error("Error saving metrics:", error);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCampaign() {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;

    try {
      await fetch(`/api/ads/campaigns/${campaignId}`, { method: "DELETE" });
      router.push("/dashboard/ads");
    } catch (error) {
      console.error("Error deleting campaign:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-default-500">Campaign not found</p>
        <Link href="/dashboard/ads">
          <Button className="mt-4">Back to Ads</Button>
        </Link>
      </div>
    );
  }

  const metrics = campaign.metrics;
  const ctr = metrics?.ctr ? Number(metrics.ctr) * 100 : 0;
  const cpc = metrics?.cpc ? Number(metrics.cpc) : 0;
  const cpl = metrics?.cpl ? Number(metrics.cpl) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description={`${campaign.platform} - ${campaign.objective.replace("_", " ")}`}
        actions={
          <div className="flex gap-2">
            <Link href="/dashboard/ads">
              <Button variant="bordered" startContent={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            <Button
              color="danger"
              variant="light"
              startContent={<Trash2 className="w-4 h-4" />}
              onClick={deleteCampaign}
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* Status and Actions */}
      <Card>
        <CardBody className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <Chip
              size="lg"
              color={campaign.status === "ACTIVE" ? "success" : campaign.status === "PAUSED" ? "warning" : "default"}
              variant="flat"
            >
              {campaign.status}
            </Chip>
            <Select
              size="sm"
              className="w-40"
              selectedKeys={[campaign.status]}
              onSelectionChange={(keys) => updateStatus(Array.from(keys)[0] as string)}
            >
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Button
            color="primary"
            startContent={<Edit className="w-4 h-4" />}
            onClick={onMetricsOpen}
          >
            Update Metrics
          </Button>
        </CardBody>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">Impressions</p>
              <p className="text-2xl font-bold">{metrics?.impressions?.toLocaleString() || 0}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-success/10 rounded-lg">
              <MousePointer className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">Clicks</p>
              <p className="text-2xl font-bold">{metrics?.clicks?.toLocaleString() || 0}</p>
              <p className="text-xs text-default-400">{ctr.toFixed(2)}% CTR</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-warning/10 rounded-lg">
              <Users className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">Leads</p>
              <p className="text-2xl font-bold">{metrics?.leads || 0}</p>
              <p className="text-xs text-default-400">${cpl.toFixed(2)} CPL</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-3 bg-danger/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-danger" />
            </div>
            <div>
              <p className="text-sm text-default-500">Spend</p>
              <p className="text-2xl font-bold">${Number(metrics?.spend || 0).toFixed(2)}</p>
              <p className="text-xs text-default-400">${cpc.toFixed(2)} CPC</p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Campaign Details</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-default-500">Platform</p>
                <p className="font-medium">{campaign.platform}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Objective</p>
                <p className="font-medium">{campaign.objective.replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-sm text-default-500">Daily Budget</p>
                <p className="font-medium">
                  {campaign.dailyBudget ? `$${campaign.dailyBudget}` : "Not set"}
                </p>
              </div>
              <div>
                <p className="text-sm text-default-500">Total Budget</p>
                <p className="font-medium">
                  {campaign.totalBudget ? `$${campaign.totalBudget}` : "Not set"}
                </p>
              </div>
            </div>
            {campaign.targeting?.audience && (
              <div>
                <p className="text-sm text-default-500">Target Audience</p>
                <p className="font-medium">{campaign.targeting.audience}</p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Ad Creative */}
        {campaign.adCreatives.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Ad Creative</h2>
            </CardHeader>
            <CardBody>
              {campaign.adCreatives.map((creative) => (
                <div key={creative.id} className="space-y-4">
                  {creative.imageUrl && (
                    <img
                      src={creative.imageUrl}
                      alt="Ad"
                      className="w-full max-w-xs rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-bold text-lg">{creative.headline}</p>
                    <p className="text-default-600 mt-2">{creative.primaryText}</p>
                    <Button size="sm" color="primary" className="mt-4">
                      {creative.callToAction}
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Daily Performance */}
      {campaign.dailyMetrics.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-lg font-semibold">Daily Performance</h2>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-right py-2">Impressions</th>
                    <th className="text-right py-2">Clicks</th>
                    <th className="text-right py-2">Leads</th>
                    <th className="text-right py-2">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.dailyMetrics.map((day) => (
                    <tr key={day.date} className="border-b">
                      <td className="py-2">{new Date(day.date).toLocaleDateString()}</td>
                      <td className="text-right py-2">{day.impressions.toLocaleString()}</td>
                      <td className="text-right py-2">{day.clicks.toLocaleString()}</td>
                      <td className="text-right py-2">{day.leads}</td>
                      <td className="text-right py-2">${Number(day.spend).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Update Metrics Modal */}
      <Modal isOpen={isMetricsOpen} onClose={onMetricsClose}>
        <ModalContent>
          <ModalHeader>Update Campaign Metrics</ModalHeader>
          <ModalBody className="space-y-4">
            <p className="text-sm text-default-500">
              Enter the current metrics from your ad platform dashboard.
            </p>
            <Input
              type="number"
              label="Impressions"
              value={metricsForm.impressions.toString()}
              onChange={(e) => setMetricsForm({ ...metricsForm, impressions: parseInt(e.target.value) || 0 })}
            />
            <Input
              type="number"
              label="Clicks"
              value={metricsForm.clicks.toString()}
              onChange={(e) => setMetricsForm({ ...metricsForm, clicks: parseInt(e.target.value) || 0 })}
            />
            <Input
              type="number"
              label="Leads"
              value={metricsForm.leads.toString()}
              onChange={(e) => setMetricsForm({ ...metricsForm, leads: parseInt(e.target.value) || 0 })}
            />
            <Input
              type="number"
              label="Conversions"
              value={metricsForm.conversions.toString()}
              onChange={(e) => setMetricsForm({ ...metricsForm, conversions: parseInt(e.target.value) || 0 })}
            />
            <Input
              type="number"
              label="Spend ($)"
              value={metricsForm.spend.toString()}
              onChange={(e) => setMetricsForm({ ...metricsForm, spend: parseFloat(e.target.value) || 0 })}
              startContent={<span className="text-default-400">$</span>}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="bordered" onClick={onMetricsClose}>
              Cancel
            </Button>
            <Button color="primary" onClick={saveMetrics} isLoading={saving}>
              Save Metrics
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

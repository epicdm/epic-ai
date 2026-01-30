"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/page-header";
import {
  Zap,
  Plus,
  PlayCircle,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Mail,
  Share2,
  Phone,
  MessageCircle,
  Sparkles,
  Target,
} from "lucide-react";
import {
  CHANNEL_LABELS,
  getEstimatedDuration,
  TRIGGER_LABELS as HUMANIZER_TRIGGERS,
} from "@/lib/workflow-labels";
import { AIConfidence } from "@/components/ui/ai-confidence";
import { humanizeWorkflow } from "@/lib/services/cross-channel/step-humanizer";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  runCount: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  channel?: ChannelType;
  config?: Record<string, unknown>;
  branches?: Array<{
    condition: {
      field: string;
      operator: string;
      value: unknown;
    };
    nextStepId: string;
  }>;
  onSuccess?: string;
  onFailure?: string;
  delayMinutes?: number;
  useBrandVoice?: boolean;
}

interface Template {
  id: string;
  name: string;
  description: string;
  trigger: string;
  conditions: unknown[];
  actions: unknown[];
  steps?: WorkflowStep[];
  channels?: string[];
  category?: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  ...HUMANIZER_TRIGGERS,
  LEAD_CREATED: "New Lead Created",
  LEAD_STATUS_CHANGED: "Lead Status Changed",
  CALL_COMPLETED: "Call Completed",
  CALL_FAILED: "Call Failed",
  SOCIAL_ENGAGEMENT: "Social Engagement",
  MANUAL: "Manual Trigger",
};

// Channel icon and color mapping
const CHANNEL_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  EMAIL: {
    icon: <Mail className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    label: "Email",
  },
  SOCIAL: {
    icon: <Share2 className="w-3 h-3" />,
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    label: "Social",
  },
  VOICE: {
    icon: <Phone className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    label: "Voice",
  },
  CHAT: {
    icon: <MessageCircle className="w-3 h-3" />,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    label: "Chat",
  },
  SMS: {
    icon: <Phone className="w-3 h-3" />,
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
    label: "SMS",
  },
};

// Category color mapping
const CATEGORY_COLORS: Record<string, string> = {
  LEAD_NURTURE: "primary",
  CUSTOMER_ONBOARDING: "success",
  RE_ENGAGEMENT: "warning",
  EVENT_PROMOTION: "secondary",
  SALES_OUTREACH: "primary",
  RETENTION: "success",
  FEEDBACK: "default",
  CUSTOM: "default",
};

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case "SUCCESS":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "FAILED":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "SKIPPED":
      return <Clock className="w-4 h-4 text-gray-400" />;
    default:
      return null;
  }
};

// Helper function to determine recommended workflow templates
function getRecommendedWorkflows(params: {
  connectedChannels?: string[];
  industry?: string;
  hasVoiceCapability?: boolean;
}): {
  templateId: string;
  confidence: number;
  reason: string;
}[] {
  const recommendations: { templateId: string; confidence: number; reason: string }[] = [];
  const { connectedChannels = [], industry = "", hasVoiceCapability = false } = params;

  const hasEmail = connectedChannels.includes("email");
  const hasSocial = connectedChannels.some(ch => ["twitter", "linkedin", "facebook", "instagram"].includes(ch));
  const isBtoB = industry.toLowerCase().includes("b2b") || industry.toLowerCase().includes("saas");
  const isService = industry.toLowerCase().includes("service") || industry.toLowerCase().includes("consulting");
  const isEvent = industry.toLowerCase().includes("event") || industry.toLowerCase().includes("conference");

  // Lead Nurture Workflow - High confidence for B2B/SaaS with email+social
  if (hasEmail && hasSocial && isBtoB) {
    recommendations.push({
      templateId: "lead-nurture",
      confidence: 95,
      reason: "Perfect for B2B lead nurturing with email and social touchpoints"
    });
  } else if (hasEmail && hasSocial) {
    recommendations.push({
      templateId: "lead-nurture",
      confidence: 88,
      reason: "Great multi-channel approach for warming up leads"
    });
  } else if (hasEmail || hasSocial) {
    recommendations.push({
      templateId: "lead-nurture",
      confidence: 75,
      reason: "Effective for nurturing leads with available channels"
    });
  }

  // Customer Onboarding Workflow - High for service businesses with email
  if (isService && hasEmail) {
    recommendations.push({
      templateId: "customer-onboarding",
      confidence: 93,
      reason: "Essential for service businesses to onboard clients smoothly"
    });
  } else if (hasEmail) {
    recommendations.push({
      templateId: "customer-onboarding",
      confidence: 85,
      reason: "Reduces churn with automated welcome sequence"
    });
  }

  // Re-engagement Workflow - Medium confidence for all (useful but not primary)
  if (hasEmail && hasSocial) {
    recommendations.push({
      templateId: "re-engagement",
      confidence: 82,
      reason: "Win back inactive customers across multiple channels"
    });
  } else if (hasEmail || hasSocial) {
    recommendations.push({
      templateId: "re-engagement",
      confidence: 70,
      reason: "Helps reactivate dormant leads and customers"
    });
  }

  // Event Promotion Workflow - High if events/webinars mentioned
  if (isEvent && (hasEmail || hasSocial)) {
    recommendations.push({
      templateId: "event-promotion",
      confidence: 94,
      reason: "Optimized for driving event registrations and attendance"
    });
  } else if (hasEmail && hasSocial) {
    recommendations.push({
      templateId: "event-promotion",
      confidence: 78,
      reason: "Great for webinars, launches, or special promotions"
    });
  }

  // Sales Outreach Workflow - High for B2B with voice capability
  if (isBtoB && hasVoiceCapability && (hasEmail || hasSocial)) {
    recommendations.push({
      templateId: "sales-outreach",
      confidence: 92,
      reason: "Multi-touch B2B outreach with voice calls drives conversions"
    });
  } else if (hasVoiceCapability && hasEmail) {
    recommendations.push({
      templateId: "sales-outreach",
      confidence: 85,
      reason: "Voice + email combo increases response rates significantly"
    });
  } else if (isBtoB && (hasEmail || hasSocial)) {
    recommendations.push({
      templateId: "sales-outreach",
      confidence: 76,
      reason: "Effective B2B outreach even without voice capability"
    });
  }

  return recommendations;
}

// --- React Query fetch functions ---

async function fetchAutomations(): Promise<Automation[]> {
  const response = await fetch("/api/automations");
  if (!response.ok) {
    throw new Error("Failed to fetch automations");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function fetchTemplates(): Promise<Template[]> {
  const response = await fetch("/api/automations/templates");
  if (!response.ok) {
    throw new Error("Failed to fetch templates");
  }
  const data = await response.json();
  const templatesArray = data?.templates || data;
  return Array.isArray(templatesArray) ? templatesArray : [];
}

export function AutomationsDashboard() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    data: automations = [],
    isLoading,
  } = useQuery({
    queryKey: ["automations"],
    queryFn: fetchAutomations,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["automations-templates"],
    queryFn: fetchTemplates,
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/automations/${id}/toggle`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to toggle automation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete automation");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  const createFromTemplateMutation = useMutation({
    mutationFn: async (template: Template) => {
      const response = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          name: template.name,
          description: template.description,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error || "Failed to create automation");
      }
    },
    onSuccess: () => {
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["automations"] });
    },
  });

  function deleteAutomation(id: string) {
    if (!confirm("Are you sure you want to delete this automation?")) return;
    deleteMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Automations"
        description="Create workflows that connect social media, voice calls, and leads."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Automation
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.length}
                </p>
                <p className="text-sm text-gray-500">Total Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.filter((a) => a.isActive).length}
                </p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {automations.reduce((sum, a) => sum + a.runCount, 0)}
                </p>
                <p className="text-sm text-gray-500">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Automations List */}
      {automations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Automations Yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Create your first automation to connect your social media, voice calls,
              and leads into a seamless workflow.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              Create Your First Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {automations.map((automation) => (
            <Card key={automation.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        automation.isActive
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Zap
                        className={`w-5 h-5 ${
                          automation.isActive
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-400"
                        }`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {automation.name}
                        </h3>
                        <Badge
                          variant={automation.isActive ? "default" : "secondary"}
                        >
                          {automation.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {automation.description ||
                          TRIGGER_LABELS[automation.trigger] ||
                          automation.trigger}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        {getStatusIcon(automation.lastRunStatus)}
                        <span>{automation.runCount} runs</span>
                      </div>
                      {automation.lastRunAt && (
                        <span>
                          Last: {new Date(automation.lastRunAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.isActive}
                        onCheckedChange={() => toggleMutation.mutate(automation.id)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAutomation(automation.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button asChild variant="ghost" size="icon">
                        <Link href={`/dashboard/automations/${automation.id}`}>
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog with Rich Template Previews */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Automation</DialogTitle>
            <DialogDescription>
              Choose a template to get started quickly
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {templates.map((template) => {
              const steps = template.steps || [];
              const humanizedSteps = humanizeWorkflow(steps);
              const estimatedDuration = getEstimatedDuration(steps.length);
              const channels = template.channels || [];
              const categoryColor = CATEGORY_COLORS[template.category || "CUSTOM"] || "default";

              return (
                <Card
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 hover:border-primary/50 dark:hover:border-primary/50 transition-colors"
                >
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {template.name}
                            </h4>
                            {/* AI Confidence Indicator */}
                            {(() => {
                              const recommendations = getRecommendedWorkflows({
                                connectedChannels: [], // TODO: Pass actual connected channels when available
                                industry: "", // TODO: Pass actual industry from Brand Brain
                                hasVoiceCapability: false, // TODO: Check for voice capability
                              });
                              const recommendation = recommendations.find(r => r.templateId === template.id);
                              return recommendation ? (
                                <AIConfidence
                                  score={recommendation.confidence}
                                  variant="dots"
                                />
                              ) : null;
                            })()}
                          </div>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      {template.category && (
                        <Badge
                          variant={
                            categoryColor === "primary" || categoryColor === "success"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {template.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                    </div>

                    {/* Workflow Steps Preview */}
                    {humanizedSteps.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                        <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                          Workflow Steps
                        </p>
                        <div className="space-y-2">
                          {humanizedSteps.slice(0, 5).map((step, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm"
                            >
                              <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                                {index + 1}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {step.description}
                              </span>
                              {step.channel && (
                                <Badge variant="secondary" className="ml-auto">
                                  {step.channel}
                                </Badge>
                              )}
                            </div>
                          ))}
                          {humanizedSteps.length > 5 && (
                            <p className="text-xs text-gray-500 pl-7">
                              +{humanizedSteps.length - 5} more steps
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metadata Row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        {/* Channels */}
                        {channels.length > 0 && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5">
                                  {channels.map((channel) => {
                                    const config = CHANNEL_CONFIG[channel];
                                    if (!config) return null;
                                    return (
                                      <span
                                        key={channel}
                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}
                                      >
                                        {config.icon}
                                        {config.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Channels used in this workflow</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Duration */}
                        {estimatedDuration !== "Instant" && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  {estimatedDuration}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Estimated workflow duration</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}

                        {/* Trigger */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant="secondary">
                                  {TRIGGER_LABELS[template.trigger] || template.trigger}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>When this automation triggers</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button
                        onClick={() => createFromTemplateMutation.mutate(template)}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Use This Template
                      </Button>
                      <Button asChild variant="outline">
                        <Link href={`/dashboard/automations/new?template=${template.id}`}>
                          Customize First
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Custom Automation Card */}
            <Card className="border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <Plus className="w-5 h-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Create Custom Automation
                      </h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Build your own workflow from scratch with full control
                      </p>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/dashboard/automations/new">
                      Start Building
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

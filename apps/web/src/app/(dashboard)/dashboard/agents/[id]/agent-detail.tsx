"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, endpoints, queryKeys } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BookOpen,
  Brain,
  CheckCircle2,
  Copy,
  DollarSign,
  GitBranch,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  User,
  Wrench,
} from "lucide-react";

// --- Types ---

interface Agent {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  channels: string[];
  templateSlug?: string;
  companyName?: string;
  voiceAgentId?: string;
  roleCard?: Record<string, unknown>;
  brainConfig?: Record<string, unknown>;
  personalityConfig?: Record<string, unknown>;
  toolConfig?: Record<string, unknown>;
  knowledgeConfig?: Record<string, unknown>;
  governanceConfig?: Record<string, unknown>;
  economicsConfig?: Record<string, unknown>;
  flowConfig?: Record<string, unknown>;
  configConfidence?: Record<string, number>;
  configGaps?: Array<{ field: string; reason: string }>;
  createdAt: string;
  updatedAt: string;
}

const MODULE_TABS = [
  { key: "overview", label: "Overview", icon: Bot },
  { key: "role-card", label: "Role Card", icon: User },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "personality", label: "Personality", icon: Sparkles },
  { key: "tools", label: "Tools", icon: Wrench },
  { key: "knowledge", label: "Knowledge", icon: BookOpen },
  { key: "governance", label: "Governance", icon: Shield },
  { key: "economics", label: "Economics", icon: DollarSign },
  { key: "flow", label: "Flow", icon: GitBranch },
] as const;

type ModuleKey = (typeof MODULE_TABS)[number]["key"];

const CONFIG_FIELD_MAP: Record<string, keyof Agent> = {
  "role-card": "roleCard",
  brain: "brainConfig",
  personality: "personalityConfig",
  tools: "toolConfig",
  knowledge: "knowledgeConfig",
  governance: "governanceConfig",
  economics: "economicsConfig",
  flow: "flowConfig",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
  ERROR: "destructive",
};

// --- Main Component ---

export function AgentDetail({ agentId }: { agentId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ModuleKey>("overview");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: agentRes, isLoading } = useQuery({
    queryKey: queryKeys.agents.detail(agentId),
    queryFn: () => apiClient.get<Agent>(endpoints.agents.get(agentId)),
  });

  const agent = agentRes?.data ?? null;

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
  }, []);

  const cloneMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ id: string }>(endpoints.agents.cloneDraft(agentId), {}),
    onSuccess: (res) => {
      if (res.data) {
        router.push(`/dashboard/agents/${res.data.id}`);
      }
    },
    onError: () => showError("Failed to clone agent"),
  });

  const deployMutation = useMutation({
    mutationFn: () =>
      apiClient.post<Agent>(endpoints.agents.deploy(agentId), {}),
    onSuccess: () => {
      showSuccess("Agent deployed to voice!");
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
    },
    onError: () => showError("Failed to deploy agent"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <h2 className="text-lg font-semibold">Agent not found</h2>
        <p className="text-sm text-muted-foreground mb-4">
          This agent may have been deleted or you don't have access.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Agents
          </Link>
        </Button>
      </div>
    );
  }

  const isEditable = agent.status !== "PUBLISHED" && agent.status !== "ARCHIVED";
  const isSaving = cloneMutation.isPending || deployMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/agents">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <Badge variant={statusVariant[agent.status] ?? "outline"}>
                {agent.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {agent.slug}
              {agent.companyName && ` · ${agent.companyName}`}
              {agent.templateSlug && ` · Template: ${agent.templateSlug}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: queryKeys.agents.detail(agentId),
              })
            }
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {agent.status === "PUBLISHED" && (
            <Button
              variant="outline"
              onClick={() => cloneMutation.mutate()}
              disabled={isSaving}
            >
              {cloneMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Copy className="mr-2 h-4 w-4" />
              Clone to Draft
            </Button>
          )}
          {isEditable && (
            <Button
              onClick={() => deployMutation.mutate()}
              disabled={isSaving}
            >
              {deployMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Play className="mr-2 h-4 w-4" />
              Deploy
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Confidence overview */}
      {agent.configConfidence && Object.keys(agent.configConfidence).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Configuration Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(agent.configConfidence).map(([key, value]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round((value as number) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">
                      {Math.round((value as number) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Config gaps */}
      {agent.configGaps && agent.configGaps.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Configuration Gaps ({agent.configGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {agent.configGaps.map((gap, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  <span className="font-medium">{gap.field}</span>: {gap.reason}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ModuleKey)}>
        <TabsList className="flex-wrap h-auto gap-1">
          {MODULE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab agent={agent} />
        </TabsContent>

        {Object.keys(CONFIG_FIELD_MAP).map((moduleKey) => (
          <TabsContent key={moduleKey} value={moduleKey} className="mt-6">
            <ModuleEditor
              agentId={agentId}
              moduleKey={moduleKey}
              configField={CONFIG_FIELD_MAP[moduleKey]}
              agent={agent}
              isEditable={isEditable}
              onSuccess={showSuccess}
              onError={showError}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// --- Overview Tab ---

function OverviewTab({ agent }: { agent: Agent }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Agent Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InfoRow label="Name" value={agent.name} />
          <InfoRow label="Slug" value={agent.slug} />
          <InfoRow label="Status" value={agent.status} />
          <InfoRow label="Template" value={agent.templateSlug ?? "None"} />
          <InfoRow label="Company" value={agent.companyName ?? "None"} />
          <InfoRow
            label="Channel"
            value={agent.voiceAgentId ? "Voice (Active)" : "Not deployed"}
          />
          <Separator />
          <InfoRow
            label="Created"
            value={new Date(agent.createdAt).toLocaleDateString()}
          />
          <InfoRow
            label="Updated"
            value={new Date(agent.updatedAt).toLocaleDateString()}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Module Status</CardTitle>
          <CardDescription>
            Configuration status for each of the 9 agent modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {MODULE_TABS.filter((t) => t.key !== "overview").map((tab) => {
            const fieldKey = CONFIG_FIELD_MAP[tab.key];
            const config = fieldKey ? (agent[fieldKey] as Record<string, unknown> | undefined) : undefined;
            const hasData = config && Object.keys(config).length > 0;
            const confidence = agent.configConfidence?.[tab.key.replace("-", "_")];
            const Icon = tab.icon;

            return (
              <div
                key={tab.key}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {confidence != null && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(confidence * 100)}%
                    </span>
                  )}
                  <Badge variant={hasData ? "default" : "outline"}>
                    {hasData ? "Configured" : "Empty"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {agent.description && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// --- Module Editor ---

function ModuleEditor({
  agentId,
  moduleKey,
  configField,
  agent,
  isEditable,
  onSuccess,
  onError,
}: {
  agentId: string;
  moduleKey: string;
  configField: keyof Agent;
  agent: Agent;
  isEditable: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const config = (agent[configField] as Record<string, unknown>) ?? {};
  const [jsonText, setJsonText] = useState(JSON.stringify(config, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  // Module-specific query for per-module data with confidence/gaps
  const { data: moduleData } = useQuery({
    queryKey: queryKeys.agents.module(agentId, moduleKey),
    queryFn: () => {
      const endpointFn = (endpoints.agents as Record<string, (id: string) => string>)[
        toCamelCase(moduleKey)
      ];
      if (!endpointFn) return null;
      return apiClient.get<Record<string, unknown>>(endpointFn(agentId));
    },
    enabled: !!agentId,
  });

  const moduleResponse = moduleData?.data ?? null;
  const moduleConfidence = (moduleData as Record<string, unknown>)?.confidence as Record<string, number> | undefined;
  const moduleGaps = (moduleData as Record<string, unknown>)?.gaps as Array<{ field: string; reason: string }> | undefined;

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const endpointFn = (endpoints.agents as Record<string, (id: string) => string>)[
        toCamelCase(moduleKey)
      ];
      if (!endpointFn) throw new Error("Unknown module");
      return apiClient.patch<Agent>(endpointFn(agentId), body);
    },
    onSuccess: (res) => {
      if (res.error) {
        onError(res.error.message);
      } else {
        onSuccess(`${moduleKey} saved!`);
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.module(agentId, moduleKey) });
      }
    },
    onError: () => onError(`Failed to save ${moduleKey}`),
  });

  const autoFillMutation = useMutation({
    mutationFn: () =>
      apiClient.post<Record<string, unknown>>(
        endpoints.agents.autoFillNextStep(agentId),
        { targetModule: moduleKey }
      ),
    onSuccess: () => {
      onSuccess(`Auto-fill started for ${moduleKey}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(agentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.module(agentId, moduleKey) });
    },
    onError: () => onError(`Failed to auto-fill ${moduleKey}`),
  });

  function handleSave() {
    try {
      const parsed = JSON.parse(jsonText);
      setParseError(null);
      saveMutation.mutate(parsed);
    } catch {
      setParseError("Invalid JSON. Please fix the syntax and try again.");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">
                {moduleKey.replace("-", " ")} Configuration
              </CardTitle>
              <CardDescription>
                {isEditable
                  ? "Edit the JSON configuration for this module."
                  : "This agent is published. Clone to draft to edit."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isEditable && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => autoFillMutation.mutate()}
                  disabled={autoFillMutation.isPending}
                >
                  {autoFillMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Auto-fill
                </Button>
              )}
              {isEditable && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Module-level confidence */}
          {moduleConfidence && Object.keys(moduleConfidence).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(moduleConfidence).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <div className="h-1.5 w-12 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round(value * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium">
                    {Math.round(value * 100)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Module-level gaps */}
          {moduleGaps && moduleGaps.length > 0 && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                Gaps in this module
              </p>
              <ul className="space-y-0.5">
                {moduleGaps.map((gap, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium">{gap.field}</span>: {gap.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {parseError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {parseError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`${moduleKey}-editor`}>JSON Configuration</Label>
            <Textarea
              id={`${moduleKey}-editor`}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setParseError(null);
              }}
              disabled={!isEditable}
              className="font-mono text-sm min-h-[300px]"
              placeholder="{}"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Helpers ---

/** Convert kebab-case to camelCase: "role-card" → "roleCard" */
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Bot,
  Brain,
  BookOpen,
  Copy,
  Edit2,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Sparkles,
  User,
  Wrench,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { KnowledgeAutoFillButton } from "@/components/agent-os";

interface Agent {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  channels: string[];
  roleCard?: Record<string, unknown>;
  brainConfig?: Record<string, unknown>;
  personalityConfig?: Record<string, unknown>;
  toolConfig?: Record<string, unknown>;
  knowledgeConfig?: Record<string, unknown>;
  governanceConfig?: Record<string, unknown>;
  configConfidence?: Record<string, number>;
  configGaps?: Array<{ field: string; reason: string }>;
  createdAt: string;
  updatedAt: string;
}

interface AgentDetailContentProps {
  agentId: string;
}

export function AgentDetailContent({ agentId }: AgentDetailContentProps) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Editable state for each config
  const [roleCardEdit, setRoleCardEdit] = useState("");
  const [brainEdit, setBrainEdit] = useState("");
  const [personalityEdit, setPersonalityEdit] = useState("");

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  async function loadAgent() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-os/agents/${agentId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to load agent");
      } else {
        setAgent(data.data);
        setRoleCardEdit(JSON.stringify(data.data.roleCard || {}, null, 2));
        setBrainEdit(JSON.stringify(data.data.brainConfig || {}, null, 2));
        setPersonalityEdit(JSON.stringify(data.data.personalityConfig || {}, null, 2));
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig(configType: string, jsonStr: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const parsed = JSON.parse(jsonStr);
      const res = await fetch(`/api/agent-os/agents/${agentId}/${configType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to save");
      } else {
        setSuccess(`${configType} saved!`);
        loadAgent();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Invalid JSON");
      } else {
        setError("Network error");
      }
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function cloneToDraft() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-os/agents/${agentId}/clone-draft`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to clone");
      } else {
        setSuccess("Cloned to draft!");
        router.push(`/dashboard/agent-os/agents/${data.data.id}`);
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function publishAgent() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/agent-os/agents/${agentId}/publish`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to publish");
      } else {
        setSuccess("Agent published!");
        loadAgent();
      }
    } catch (err) {
      setError("Network error");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Agent not found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{error}</p>
        <Link
          href="/dashboard/agent-os"
          className="text-purple-600 hover:underline"
        >
          ← Back to Agent OS
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "Overview", icon: Bot },
    { key: "role-card", label: "Role Card", icon: User },
    { key: "brain", label: "Brain", icon: Brain },
    { key: "personality", label: "Personality", icon: Sparkles },
    { key: "tools", label: "Tools", icon: Wrench },
    { key: "knowledge", label: "Knowledge", icon: BookOpen },
    { key: "governance", label: "Governance", icon: Shield },
  ];

  const isEditable = agent.status !== "PUBLISHED" && agent.status !== "ARCHIVED";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/agent-os"
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {agent.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {agent.slug} ·{" "}
              <span
                className={`font-medium ${
                  agent.status === "PUBLISHED"
                    ? "text-green-600"
                    : agent.status === "DRAFT"
                      ? "text-yellow-600"
                      : "text-slate-600"
                }`}
              >
                {agent.status}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAgent}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          {agent.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={cloneToDraft}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              <Copy className="h-4 w-4" />
              Clone to Draft
            </button>
          )}
          {isEditable && (
            <button
              type="button"
              onClick={publishAgent}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50 text-green-700">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">ID</p>
                <p className="font-mono text-sm">{agent.id}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Status</p>
                <p className="font-medium">{agent.status}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Channels</p>
                <p>{agent.channels.join(", ") || "None"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Created</p>
                <p>{new Date(agent.createdAt).toLocaleString()}</p>
              </div>
            </div>
            {agent.description && (
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Description</p>
                <p>{agent.description}</p>
              </div>
            )}
            {agent.configGaps && agent.configGaps.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-amber-600 mb-2">
                  Configuration Gaps ({agent.configGaps.length})
                </p>
                <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400">
                  {agent.configGaps.map((gap, i) => (
                    <li key={i}>
                      <strong>{gap.field}:</strong> {gap.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {agent.configConfidence && (
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confidence Scores
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(agent.configConfidence).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-800"
                    >
                      <span className="text-sm text-slate-600 dark:text-slate-400">{key}</span>
                      <span className="text-sm font-medium">{((value as number) * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "role-card" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Role Card Configuration</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => saveConfig("role-card", roleCardEdit)}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              )}
            </div>
            {!isEditable && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                Agent is {agent.status}. Clone to draft to edit.
              </p>
            )}
            <textarea
              value={roleCardEdit}
              onChange={(e) => setRoleCardEdit(e.target.value)}
              disabled={!isEditable}
              className="w-full h-80 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm disabled:opacity-60"
            />
          </div>
        )}

        {activeTab === "brain" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Brain Configuration</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => saveConfig("brain", brainEdit)}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              )}
            </div>
            {!isEditable && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                Agent is {agent.status}. Clone to draft to edit.
              </p>
            )}
            <textarea
              value={brainEdit}
              onChange={(e) => setBrainEdit(e.target.value)}
              disabled={!isEditable}
              className="w-full h-80 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm disabled:opacity-60"
            />
          </div>
        )}

        {activeTab === "personality" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Personality Configuration</h3>
              {isEditable && (
                <button
                  type="button"
                  onClick={() => saveConfig("personality", personalityEdit)}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              )}
            </div>
            {!isEditable && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                Agent is {agent.status}. Clone to draft to edit.
              </p>
            )}
            <textarea
              value={personalityEdit}
              onChange={(e) => setPersonalityEdit(e.target.value)}
              disabled={!isEditable}
              className="w-full h-80 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm disabled:opacity-60"
            />
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Tools Configuration</h3>
            <pre className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-auto text-sm">
              {JSON.stringify(agent.toolConfig || {}, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Knowledge Configuration</h3>
            </div>

            {/* Auto-Fill Knowledge Button */}
            {isEditable && (
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 border border-teal-200 dark:border-teal-700 rounded-xl p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-teal-100 dark:bg-teal-800 rounded-lg">
                    <BookOpen className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Auto-Fill Knowledge
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Extract knowledge from company profile: FAQs → quick answers,
                      services → knowledge sources, detect gaps for missing info.
                    </p>
                    <KnowledgeAutoFillButton
                      agentId={agentId}
                      onAfter={() => {
                        setSuccess("Knowledge auto-filled successfully!");
                        loadAgent();
                      }}
                      variant="default"
                    />
                  </div>
                </div>
              </div>
            )}

            {!isEditable && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                Agent is {agent.status}. Clone to draft to edit.
              </p>
            )}

            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Current Configuration
              </h4>
              <pre className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-auto text-sm max-h-96">
                {JSON.stringify(agent.knowledgeConfig || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === "governance" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Governance Configuration</h3>
            <pre className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 overflow-auto text-sm">
              {JSON.stringify(agent.governanceConfig || {}, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

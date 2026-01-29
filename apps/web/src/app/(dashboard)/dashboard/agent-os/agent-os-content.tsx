"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bot,
  Building2,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";

interface Agent {
  id: string;
  name: string;
  slug: string;
  status: string;
  description?: string;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  enrichedAt?: string;
}

export function AgentOSContent() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [agentsRes, companyRes] = await Promise.all([
        fetch("/api/agent-os/agents"),
        fetch("/api/agent-os/companies"),
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData.data || []);
      }

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.data);
      }
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
              Agent OS
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Create and manage AI agents with the Agent OS framework
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/dashboard/agent-os/wizard"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Agent Wizard
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Company Profile Status */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Company Profile
          </h2>
        </div>
        {company ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Name:</strong> {company.name}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              <strong>Enriched:</strong>{" "}
              {company.enrichedAt
                ? new Date(company.enrichedAt).toLocaleString()
                : "Not enriched"}
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/dashboard/agent-os/wizard?step=enrich"
                className="text-sm text-purple-600 hover:underline"
              >
                Re-enrich from website →
              </Link>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              No company profile found. Create one to get started.
            </p>
            <Link
              href="/dashboard/agent-os/wizard?step=company"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Create Company Profile
            </Link>
          </div>
        )}
      </section>

      {/* Agents List */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Agents ({agents.length})
            </h2>
          </div>
          <Link
            href="/dashboard/agent-os/wizard?step=agent"
            className="text-sm text-purple-600 hover:underline"
          >
            Create new →
          </Link>
        </div>

        {agents.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              No agents created yet
            </p>
            <Link
              href="/dashboard/agent-os/wizard"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-purple-600 px-4 text-sm font-medium text-white hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Agent
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/dashboard/agent-os/agents/${agent.id}`}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-white">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {agent.slug} · {agent.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      agent.status === "PUBLISHED"
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : agent.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {agent.status}
                  </span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

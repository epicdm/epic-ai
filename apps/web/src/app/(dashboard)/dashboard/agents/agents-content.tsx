"use client";

import Link from "next/link";
import {
  BarChart3,
  Bot,
  Gauge,
  LineChart,
  Phone,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";

const tabs = [
  "All Agents",
  "Sales Voice Agent",
  "Receptionist Agent",
  "Dental Intake Agent",
  "Survey Agent",
];

const metrics = [
  {
    label: "Total Agents",
    value: "0",
    icon: Phone,
  },
  {
    label: "Live Agents",
    value: "0",
    icon: Bot,
  },
  {
    label: "Total Conversations",
    value: "0",
    icon: BarChart3,
  },
  {
    label: "Avg Health Score",
    value: "0%",
    icon: Gauge,
  },
];

const highlights = [
  "Lead qualified - TechCorp",
  "Call completed - 8 min duration",
  "Demo booked for tomorrow",
  "API response time optimal",
];

export function AgentsContent() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Agent Hub</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Manage and monitor all your AI agents
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] px-4 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Agent
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <div className="relative w-full max-w-md flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search agents..."
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-4 text-sm text-slate-600 dark:text-slate-300 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  index === 0
                    ? "bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25">
          <Phone className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No agents yet</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create your first AI agent to get started
        </p>
        <Link
          href="/sign-up"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] px-6 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all"
        >
          Create Your First Agent
        </Link>
      </section>

      {/* System Status */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            <p className="text-base font-semibold text-slate-900 dark:text-white">System Status</p>
          </div>
          <LineChart className="h-4 w-4 text-purple-600" />
        </div>
        <div className="mt-4 grid gap-3 text-sm">
          {["API Status", "Voice Services", "Calendar Sync", "CRM Integration"].map((label) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2"
            >
              <span className="text-slate-600 dark:text-slate-400">{label}</span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Operational</span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-purple-600" />
          <p className="text-base font-semibold text-slate-900 dark:text-white">Recent Activity</p>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          {highlights.map((item) => (
            <div key={item} className="rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2">
              <p className="text-sm text-slate-900 dark:text-white">{item}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

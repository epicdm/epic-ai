"use client";

import {
  Gauge,
  LineChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";

interface DashboardContentProps {
  flywheelJustActivated?: boolean;
}

const metrics = [
  { label: "Total Calls", value: "0", delta: "+12%" },
  { label: "Conversions", value: "0", delta: "+8%" },
  { label: "Avg Call Time", value: "2m 34s", delta: "-5%" },
  { label: "Health Score", value: "100%", delta: "+3%" },
];

const highlights = [
  "Lead qualified - TechCorp",
  "Call completed - 8 min duration",
  "Demo booked for tomorrow",
  "API response time optimal",
];

export function DashboardContent({ flywheelJustActivated }: DashboardContentProps) {
  return (
    <div className="px-6 py-6">
      <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
        <div className="space-y-6">
          {/* AI Insights Card - Gradient Design */}
          <section className="rounded-2xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] p-6 text-white shadow-lg shadow-purple-500/25">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-white/90">
                  AI Insights: Next Best Action
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Your agent is performing well. Consider enabling SMS follow-ups to
                  increase conversion by 23%.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-purple-700 hover:bg-white/90 transition-colors"
              >
                Enable SMS Follow-ups
              </button>
            </div>
          </section>

          {/* Primary Goal Progress */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  Primary Goal Progress
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Book demo/meeting</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] bg-clip-text text-transparent">0</p>
                <p className="text-xs text-slate-400">This month</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>Progress to goal (50)</span>
                <span>0%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 w-0 rounded-full bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)]" />
              </div>
            </div>
          </section>

          {/* Performance Overview */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  Performance Overview
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Live data from your agent
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <LineChart className="h-4 w-4 text-purple-600" />
                Updated moments ago
              </div>
            </div>
            <div className="mt-6">
              <UnifiedDashboard flywheelJustActivated={flywheelJustActivated} />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Metrics Cards */}
          <section className="grid gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{metric.delta}</span>
                </div>
                <p className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{metric.label}</p>
              </div>
            ))}
          </section>

          {/* System Status */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <p className="text-base font-semibold text-slate-900 dark:text-white">System Status</p>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {["API Status", "Voice Services", "Calendar Sync", "CRM Integration"].map(
                (label) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2"
                  >
                    <span className="text-slate-600 dark:text-slate-400">{label}</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Operational</span>
                  </div>
                )
              )}
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
      </div>
    </div>
  );
}

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Activity,
  Calendar,
  Gauge,
  LineChart,
  ShieldCheck,
  Users,
} from "lucide-react";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";
import { V2HeaderControls } from "@/app/v2/_components/v2-header-controls";
import { V2Sidebar } from "@/app/v2/_components/v2-sidebar";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export const dynamic = "force-dynamic";

export default async function V2DashboardPage() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

  if (!userId && !isUATBypassEnabled) {
    redirect("/v2/sign-in");
  }

  const displayName =
    user?.firstName || user?.lastName
      ? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim()
      : user?.username ?? "Signed out";
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? "No email available";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-default-50 text-default-900">
      <div className="flex min-h-screen">
        <V2Sidebar
          active="dashboard"
          user={{
            name: displayName,
            email: primaryEmail,
            initials: initials || "—",
          }}
        />

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-default-200 bg-white px-6 py-5">
            <div>
              <div className="text-xl font-semibold text-default-900">Dashboard</div>
              <div className="text-sm text-default-500">Sales Voice Agent</div>
            </div>
            <V2HeaderControls />
          </header>

          <div className="px-6 py-6">
            <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
              <div className="space-y-6">
                <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <p className="text-sm font-semibold text-primary">
                        AI Insights: Next Best Action
                      </p>
                      <p className="mt-2 text-sm text-default-600">
                        Your agent is performing well. Consider enabling SMS follow-ups
                        to increase conversion by 23%.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white"
                    >
                      Enable SMS Follow-ups
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-default-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-default-900">
                        Primary Goal Progress
                      </p>
                      <p className="text-sm text-default-500">Book demo/meeting</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-primary">0</p>
                      <p className="text-xs text-default-400">This month</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex items-center justify-between text-sm text-default-500">
                      <span>Progress to goal (50)</span>
                      <span>0%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-default-200">
                      <div className="h-2 w-0 rounded-full bg-primary" />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-default-200 bg-white p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-default-900">
                        Performance Overview
                      </p>
                      <p className="text-sm text-default-500">
                        Live data from your agent
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-default-500">
                      <LineChart className="h-4 w-4 text-primary" />
                      Updated moments ago
                    </div>
                  </div>
                  <div className="mt-6">
                    <UnifiedDashboard />
                  </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="grid gap-4">
                  {[
                    { label: "Total Calls", value: "0", delta: "+12%" },
                    { label: "Conversions", value: "0", delta: "+8%" },
                    { label: "Avg Call Time", value: "2m 34s", delta: "-5%" },
                    { label: "Health Score", value: "100%", delta: "+3%" },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-default-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Gauge className="h-5 w-5" />
                        </div>
                        <span className="text-xs text-success">{metric.delta}</span>
                      </div>
                      <p className="mt-4 text-2xl font-semibold text-default-900">
                        {metric.value}
                      </p>
                      <p className="mt-1 text-sm text-default-500">{metric.label}</p>
                    </div>
                  ))}
                </section>

                <section className="rounded-2xl border border-default-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <p className="text-base font-semibold text-default-900">
                      System Status
                    </p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-default-600">
                    {[
                      "API Status",
                      "Voice Services",
                      "Calendar Sync",
                      "CRM Integration",
                    ].map((label) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-xl bg-default-50 px-3 py-2"
                      >
                        <span>{label}</span>
                        <span className="text-xs text-success">Operational</span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-default-200 bg-white p-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <p className="text-base font-semibold text-default-900">
                      Recent Activity
                    </p>
                  </div>
                  <div className="mt-4 space-y-3 text-sm text-default-600">
                    {[
                      "Lead qualified - TechCorp",
                      "Call completed - 8 min duration",
                      "Demo booked for tomorrow",
                      "API response time optimal",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="rounded-xl bg-default-50 px-3 py-2"
                      >
                        <p className="text-sm text-default-900">{item}</p>
                        <p className="text-xs text-default-400">
                          {index === 0 ? "5 min ago" : `${index * 7 + 12} min ago`}
                        </p>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-4 text-sm font-semibold text-primary"
                  >
                    View All Activity
                  </button>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

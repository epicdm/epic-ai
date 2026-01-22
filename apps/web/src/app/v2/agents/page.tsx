import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Bot,
  Gauge,
  LineChart,
  Phone,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { V2HeaderControls } from "@/app/v2/_components/v2-header-controls";
import { V2Sidebar } from "@/app/v2/_components/v2-sidebar";
import { VoiceDashboardSection } from "@/app/v2/agents/voice-dashboard-section";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

const tabs = [
  "All Agents",
  "Sales Voice Agent",
  "Receptionist Agent",
  "Dental Intake Agent",
  "Survey Agent",
];

export const dynamic = "force-dynamic";

export default async function V2AgentsPage() {
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
          active="agents"
          user={{
            name: displayName,
            email: primaryEmail,
            initials: initials || "—",
          }}
        />

        <main className="flex-1">
          <header className="border-b border-default-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400" />
                <input
                  type="search"
                  placeholder="Search agents, conversations, or analytics..."
                  className="h-11 w-full rounded-xl border border-default-200 bg-default-50 pl-11 pr-4 text-sm text-default-600 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>
              <V2HeaderControls showGoLive={false} />
            </div>
          </header>

          <div className="bg-default-50 px-6 py-6">
            <section className="rounded-2xl border border-default-200 bg-white px-6 py-6">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-semibold text-default-900">
                    Agent Hub
                  </h1>
                  <p className="mt-2 text-sm text-default-500">
                    Manage and monitor all your AI agents
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-default-200 px-4 text-sm font-semibold text-default-600 hover:bg-default-100"
                  >
                    <Shield className="h-4 w-4" />
                    Admin Panel
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow hover:shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    Create Agent
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="relative w-full max-w-md flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-default-400" />
                  <input
                    type="search"
                    placeholder="Search agents..."
                    className="h-11 w-full rounded-xl border border-default-200 bg-white pl-11 pr-4 text-sm text-default-600 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab}
                      type="button"
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        index === 0
                          ? "bg-purple-100 text-purple-700"
                          : "bg-white text-default-500 hover:bg-default-100"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "Total Agents",
                  value: "0",
                  icon: Phone,
                  accent: "bg-purple-100 text-purple-600",
                },
                {
                  label: "Live Agents",
                  value: "0",
                  icon: Bot,
                  accent: "bg-green-100 text-green-600",
                },
                {
                  label: "Total Conversations",
                  value: "0",
                  icon: BarChart3,
                  accent: "bg-blue-100 text-blue-600",
                },
                {
                  label: "Avg Health Score",
                  value: "0%",
                  icon: Gauge,
                  accent: "bg-yellow-100 text-yellow-700",
                },
              ].map(({ label, value, icon: Icon, accent }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-default-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-default-500">{label}</p>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-semibold text-default-900">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <section className="mt-6 rounded-2xl border border-default-200 bg-white p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Phone className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-default-900">
                No agents yet
              </h2>
              <p className="mt-2 text-sm text-default-500">
                Create your first AI agent to get started
              </p>
              <Link
                href="/v2/sign-up"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow"
              >
                Create Your First Agent
              </Link>
            </section>

            <section className="mt-8 rounded-2xl border border-default-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold text-default-900">
                    Agent Performance
                  </div>
                  <p className="mt-1 text-sm text-default-500">
                    Live agent data powered by your existing voice dashboard.
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-default-200 px-4 py-2 text-sm font-semibold text-default-600 hover:bg-default-100"
                >
                  <BarChart3 className="h-4 w-4" />
                  View reports
                </button>
              </div>

              <div className="mt-6">
                <VoiceDashboardSection />
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

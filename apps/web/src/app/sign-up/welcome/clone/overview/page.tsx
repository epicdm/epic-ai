import Link from "next/link";
import {
  Activity,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  PhoneCall,
  Rocket,
  Send,
  ShieldCheck,
  Target,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Visual Orchestration", icon: WandSparkles },
  { label: "Behavior & Script", icon: MessageSquareText },
  { label: "CRM & Leads", icon: UsersRound },
  { label: "Calendar", icon: CalendarCheck },
  { label: "Follow-ups", icon: Send },
  { label: "Activity & Logs", icon: ClipboardList },
  { label: "Launch", icon: Rocket },
];

const metrics = [
  { label: "Total Calls", value: "0", trend: "+12%" },
  { label: "Conversions", value: "0", trend: "+8%" },
  { label: "Avg Call Time", value: "2m 34s", trend: "-5%" },
  { label: "Health Score", value: "100%", trend: "+3%" },
];

export default function CloneSarahOverviewPage() {
  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-slate-600"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-xs">
                ←
              </span>
              Back to Agent Hub
            </Link>
            <div className="mt-4">
              <div className="text-base font-semibold text-slate-900">
                Test - Sales Qualifier
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <span className="inline-flex h-2 w-2 rounded-full bg-slate-400" />
                draft
                <span className="text-slate-300">•</span>
                <span>
                  Health: <span className="font-semibold">100%</span>
                </span>
              </div>
            </div>
          </div>
          <nav className="px-4 py-4">
            <div className="space-y-1">
              {navItems.map(({ label, icon: Icon, active }) => (
                <button
                  key={label}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    active
                      ? "bg-purple-50 text-purple-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </nav>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <div className="text-lg font-semibold text-slate-900">Overview</div>
              <div className="text-sm text-slate-500">Sales Voice Agent</div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/setup?mode=guided"
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
              >
                <Zap className="h-4 w-4" />
                Go Live
              </Link>
              <button
                type="button"
                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500"
                aria-label="Notifications"
              >
                <Activity className="mx-auto h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-9 w-9 rounded-xl border border-slate-200 text-slate-500"
                aria-label="Settings"
              >
                <ShieldCheck className="mx-auto h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="space-y-6 px-6 py-6">
            <section className="rounded-2xl border border-purple-100 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-white">
                  <PhoneCall className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-purple-800">
                    AI Insights: Next Best Action
                  </div>
                  <div className="mt-2 text-sm text-purple-700">
                    Your agent is performing well! Consider enabling SMS follow-ups
                    to increase conversion by 23%.
                  </div>
                  <Link
                    href="/setup?mode=guided"
                    className="mt-4 inline-flex items-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Enable SMS Follow-ups
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">
                    Primary Goal Progress
                  </div>
                  <div className="text-sm text-slate-500">
                    Book demo/meeting
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-semibold text-purple-600">0</div>
                  <div className="text-xs text-slate-400">This month</div>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Progress to goal (50)</span>
                  <span>0%</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-100">
                  <div className="h-3 w-0 rounded-full bg-gradient-to-r from-purple-600 to-blue-600" />
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { label: "Qualify leads", value: "--" },
                  { label: "Convert to opportunity", value: "--" },
                  { label: "Book demos", value: "--" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500"
                  >
                    <div>{label}</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-4">
              {metrics.map(({ label, value, trend }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5"
                >
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <span className="text-emerald-600">{trend}</span>
                  </div>
                  <div className="mt-4 text-2xl font-semibold text-slate-900">
                    {value}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">{label}</div>
                </div>
              ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-base font-semibold text-slate-900">
                Recent Activity
              </div>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 text-center text-sm text-slate-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>No activity yet. Launch your agent to start tracking.</div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

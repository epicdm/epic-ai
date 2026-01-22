import Link from "next/link";
import {
  BarChart3,
  Compass,
  LayoutDashboard,
  LifeBuoy,
  Plug,
  Rocket,
  Settings,
  Users,
  WandSparkles,
} from "lucide-react";

type SidebarProps = {
  active: "dashboard" | "agents" | "analytics" | "conversations" | "integrations" | "settings";
  user?: {
    name: string;
    email: string;
    initials: string;
  } | null;
};

const navItems = [
  { label: "Dashboard", key: "dashboard", icon: LayoutDashboard, href: "/v2/dashboard" },
  { label: "My Agents", key: "agents", icon: WandSparkles, href: "/v2/agents" },
  { label: "Analytics", key: "analytics", icon: BarChart3, href: "/v2/analytics" },
  { label: "Conversations", key: "conversations", icon: Users, href: "/v2/conversations", badge: "12" },
  { label: "Integrations", key: "integrations", icon: Plug, href: "/v2/integrations" },
  { label: "Settings", key: "settings", icon: Settings, href: "/v2/settings" },
];

const secondaryItems = [
  { label: "Help & Support", icon: LifeBuoy, href: "/v2/help" },
  { label: "Billing", icon: Compass, href: "/v2/billing" },
];

export function V2Sidebar({ active, user }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-default-200 bg-white">
      <div className="flex items-center justify-between border-b border-default-200 px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white">
            <Rocket className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-default-900">Epic AI</span>
        </div>
        <button
          type="button"
          className="h-8 w-8 rounded-lg border border-default-200 text-default-500"
          aria-label="Collapse sidebar"
        >
          <span className="sr-only">Collapse sidebar</span>
          <div className="mx-auto h-4 w-4">
            <div className="h-0.5 w-full bg-default-400" />
            <div className="mt-1 h-0.5 w-2/3 bg-default-400" />
          </div>
        </button>
      </div>

      <nav className="space-y-4 px-3 py-4">
        <div className="space-y-1">
          {navItems.map(({ label, key, icon: Icon, href, badge }) => {
            const isActive = active === key;
            return (
              <Link
                key={label}
                href={href}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                  isActive
                    ? "bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow"
                    : "text-default-600 hover:bg-default-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {badge ? (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <div className="border-t border-default-200 pt-4">
          {secondaryItems.map(({ label, icon: Icon, href }) => (
            <Link
              key={label}
              href={href}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-default-600 hover:bg-default-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="border-t border-default-200 px-4 py-4">
        <div className="flex items-center gap-3 rounded-2xl border border-default-200 px-3 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ad46ff_0%,#2b7fff_100%)] text-sm font-semibold text-white">
            {user?.initials ?? "—"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-default-900">
              {user?.name ?? "Signed out"}
            </div>
            <div className="truncate text-xs text-default-500">
              {user?.email ?? "No email available"}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="rounded-2xl bg-[linear-gradient(145deg,#9810fa_0%,#155dfc_100%)] p-4 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="h-4 w-4" />
            Upgrade to Pro
          </div>
          <p className="mt-2 text-xs text-white/90">
            Unlock unlimited agents and advanced features.
          </p>
          <Link
            href="/v2/billing"
            className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-white text-xs font-semibold text-purple-700"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </aside>
  );
}

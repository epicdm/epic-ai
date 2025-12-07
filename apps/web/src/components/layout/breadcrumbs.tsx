"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  social: "Social Media",
  voice: "Voice AI",
  leads: "Leads",
  settings: "Settings",
  automations: "Automations",
  analytics: "Analytics",
  create: "Create Post",
  accounts: "Accounts",
  agents: "Agents",
  calls: "Calls",
  numbers: "Phone Numbers",
  onboarding: "Onboarding",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on root dashboard
  if (segments.length <= 1) {
    return null;
  }

  const breadcrumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || segment;
    const isLast = index === segments.length - 1;

    return {
      href,
      label,
      isLast,
    };
  });

  return (
    <nav className="hidden md:flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <Home className="w-4 h-4" />
      </Link>

      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
          {crumb.isLast ? (
            <span className="px-1 text-gray-700 dark:text-gray-300 font-medium">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="px-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}

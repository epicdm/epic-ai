"use client";

import React from "react";
import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { MobileSidebarTrigger } from "./app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Check for UAT bypass mode
const isUATBypassEnabled =
  process.env.NEXT_PUBLIC_E2E_UAT_BYPASS === "true" ||
  process.env.NEXT_PUBLIC_UAT_AUTH_BYPASS === "true";

/**
 * Simple breadcrumb generation from pathname.
 * Maps known path segments to readable labels.
 */
const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  agents: "Agents",
  new: "Create Agent",
  templates: "Templates",
  phone: "Phone",
  calls: "Calls",
  numbers: "Numbers",
  routing: "Routing",
  flows: "Flows",
  brand: "Brand",
  voice: "Voice & Style",
  strategy: "Strategy",
  context: "Context",
  content: "Content",
  generate: "Generate",
  approval: "Approval",
  published: "Published",
  social: "Social",
  accounts: "Accounts",
  suggestions: "AI Suggestions",
  analytics: "Analytics",
  settings: "Settings",
  webhooks: "Webhooks",
  usage: "Usage",
  leads: "Leads",
  automations: "Automations",
  ads: "Ads",
  calendar: "Calendar",
};

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string; isLast: boolean }[] = [];

  let currentPath = "";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip dynamic segments like [id]
    if (segment.startsWith("[") || /^[a-f0-9-]{20,}$/.test(segment)) continue;

    const label = segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    crumbs.push({
      label,
      href: currentPath,
      isLast: i === segments.length - 1,
    });
  }

  return crumbs;
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <MobileSidebarTrigger />

      <Separator orientation="vertical" className="h-6 lg:hidden" />

      {/* Breadcrumbs */}
      <Breadcrumb className="hidden md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href}>
              {idx > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User */}
      {isUATBypassEnabled ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <span className="text-xs font-medium text-muted-foreground">T</span>
        </div>
      ) : (
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: { avatarBox: "w-8 h-8" },
          }}
        />
      )}
    </header>
  );
}

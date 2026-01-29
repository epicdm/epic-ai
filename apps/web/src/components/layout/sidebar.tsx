"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Rocket,
  Sparkles,
} from "lucide-react";
import { ROUTE_CONFIG, getRoutesBySection, type RouteConfig } from "@/lib/routes/route-config";

interface NavSection {
  title: string;
  subtitle: string;
  items: RouteConfig[];
}

// Build navigation from centralized route config
const navigationSections: NavSection[] = [
  {
    title: "",
    subtitle: "",
    items: ROUTE_CONFIG.filter((r) => r.id === "dashboard"),
  },
  {
    title: "Understand",
    subtitle: "Your brand identity",
    items: getRoutesBySection("understand"),
  },
  {
    title: "Create",
    subtitle: "Content factory",
    items: getRoutesBySection("create"),
  },
  {
    title: "Distribute",
    subtitle: "Reach your audience",
    items: getRoutesBySection("distribute"),
  },
  {
    title: "Learn",
    subtitle: "Measure & improve",
    items: getRoutesBySection("learn"),
  },
  {
    title: "Automate",
    subtitle: "Set it & forget it",
    items: getRoutesBySection("automate"),
  },
];

// Flatten for auto-expand logic
const allNavItems = navigationSections.flatMap((section) => section.items);

// Settings at bottom
const bottomNavigation: RouteConfig[] = getRoutesBySection("settings");

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();

  // In E2E test mode, ClerkProvider may not be available
  let user: any = null;
  try {
    const userInfo = useUser();
    user = userInfo.user;
  } catch {
    // ClerkProvider not available (E2E test mode)
    user = null;
  }

  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[] | null>(null);
  const [toolsLoaded, setToolsLoaded] = useState(false);

  // User display info
  const userName = user?.fullName || user?.firstName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Auto-expand parent when child is active
  useEffect(() => {
    allNavItems.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setExpandedItems((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

  useEffect(() => {
    let isMounted = true;
    const loadToolAccess = async () => {
      try {
        const res = await fetch("/api/onboarding/progress");
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted) {
          setEnabledTools(Array.isArray(data.enabledTools) ? data.enabledTools : null);
          setToolsLoaded(true);
        }
      } catch {
        if (isMounted) setToolsLoaded(true);
      }
    };
    loadToolAccess();
    return () => {
      isMounted = false;
    };
  }, []);

  const filterByTools = (items: RouteConfig[]) => {
    if (!toolsLoaded || !enabledTools || enabledTools.length === 0) return items;
    return items.filter((item) => {
      if (!item.tools || item.tools.length === 0) return true;
      return item.tools.some((tool) => enabledTools.includes(tool));
    });
  };

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  const renderNavItem = (item: RouteConfig) => {
    const active = isActive(item.href);
    const expanded = expandedItems.includes(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const Icon = item.icon;

    return (
      <div key={item.href}>
        <Link
          href={hasChildren ? "#" : item.href}
          onClick={(e) => {
            if (hasChildren) {
              e.preventDefault();
              toggleExpanded(item.href);
            }
          }}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            active
              ? "bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] text-white shadow-lg shadow-purple-500/25"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50",
            collapsed && "justify-center px-2"
          )}
        >
          {Icon && (
            <Icon
              className={cn(
                "flex-shrink-0",
                collapsed ? "w-6 h-6" : "w-5 h-5",
                active ? "text-white" : "text-slate-500 dark:text-slate-500"
              )}
            />
          )}
          {!collapsed && (
            <>
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-semibold rounded-full",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    expanded && "rotate-90"
                  )}
                />
              )}
            </>
          )}
        </Link>

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block px-3 py-2 rounded-xl text-sm transition-all duration-200",
                  pathname === child.href
                    ? "text-purple-700 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/20"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50"
                )}
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: filterByTools(section.items),
    }))
    .filter((section) => section.items.length > 0);

  const filteredBottomNavigation = filterByTools(bottomNavigation);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center justify-between h-16 border-b border-slate-200 dark:border-slate-800",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[linear-gradient(135deg,#9810fa_0%,#155dfc_100%)] rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-xl text-slate-900 dark:text-white">
              Epic AI
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredSections.map((section, sectionIndex) => (
            <div key={section.title || sectionIndex}>
              {/* Section Header */}
              {section.title && !collapsed && (
                <div className="pt-5 pb-2 first:pt-0">
                  <div className="flex items-center gap-2 px-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {section.title}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
                  </div>
                  {section.subtitle && (
                    <span className="px-2 text-[10px] text-slate-400 dark:text-slate-600">
                      {section.subtitle}
                    </span>
                  )}
                </div>
              )}
              {/* Section Items */}
              <div className="space-y-1">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 space-y-1 border-t border-slate-200 dark:border-slate-800 pt-4">
          {filteredBottomNavigation.map(renderNavItem)}
        </div>

        {/* User Profile Card */}
        {!collapsed && (
          <div className="px-3 pt-4 pb-2">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-3 bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ad46ff_0%,#2b7fff_100%)] text-sm font-semibold text-white shadow-lg shadow-purple-500/25">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {userName}
                </div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {userEmail}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade CTA */}
        {!collapsed && (
          <div className="px-3 pb-4">
            <div className="rounded-2xl bg-[linear-gradient(145deg,#9810fa_0%,#155dfc_100%)] p-4 text-white shadow-lg shadow-purple-500/25">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                Upgrade to Pro
              </div>
              <p className="mt-2 text-xs text-white/80">
                Unlock unlimited agents and advanced features.
              </p>
              <Link
                href="/dashboard/settings/billing"
                className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-xl bg-white text-xs font-semibold text-purple-700 hover:bg-white/90 transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {/* Collapse Toggle (when collapsed) */}
        {collapsed && (
          <div className="px-3 py-4">
            <button
              onClick={() => onCollapsedChange(!collapsed)}
              className="flex items-center justify-center w-full px-3 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

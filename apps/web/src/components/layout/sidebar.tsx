"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Share2,
  Phone,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BarChart3,
  Zap,
  FlaskConical,
  Megaphone,
  Brain,
  FileText,
  CheckSquare,
  Globe,
  Database,
  Calendar,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Brand Brain",
    href: "/dashboard/brand",
    icon: Brain,
    children: [
      { name: "Overview", href: "/dashboard/brand" },
      { name: "Voice & Style", href: "/dashboard/brand/voice" },
      { name: "Strategy", href: "/dashboard/brand/strategy" },
    ],
  },
  {
    name: "Context Engine",
    href: "/dashboard/context",
    icon: Database,
    children: [
      { name: "Sources", href: "/dashboard/context" },
      { name: "Documents", href: "/dashboard/context?tab=documents" },
      { name: "Search", href: "/dashboard/context?tab=search" },
    ],
  },
  {
    name: "Content",
    href: "/dashboard/content",
    icon: FileText,
    children: [
      { name: "Queue", href: "/dashboard/content" },
      { name: "Approval Queue", href: "/dashboard/content/approval" },
      { name: "Generate", href: "/dashboard/content/generate" },
      { name: "Published", href: "/dashboard/content/published" },
    ],
  },
  {
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
  },
  {
    name: "Social Accounts",
    href: "/dashboard/social",
    icon: Share2,
    children: [
      { name: "Overview", href: "/dashboard/social" },
      { name: "AI Suggestions", href: "/dashboard/social/suggestions" },
      { name: "Autopilot Settings", href: "/dashboard/social/settings" },
      { name: "Create Post", href: "/dashboard/social/create" },
      { name: "Accounts", href: "/dashboard/social/accounts" },
    ],
  },
  {
    name: "Voice AI",
    href: "/dashboard/voice",
    icon: Phone,
    children: [
      { name: "Agents", href: "/dashboard/voice" },
      { name: "Calls", href: "/dashboard/voice/calls" },
      { name: "Phone Numbers", href: "/dashboard/voice/numbers" },
    ],
  },
  {
    name: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    name: "Ads",
    href: "/dashboard/ads",
    icon: Megaphone,
    children: [
      { name: "Dashboard", href: "/dashboard/ads" },
      { name: "Create Campaign", href: "/dashboard/ads/create" },
      { name: "Ad Accounts", href: "/dashboard/ads/accounts" },
    ],
  },
  {
    name: "Automations",
    href: "/dashboard/automations",
    icon: Zap,
  },
  {
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    name: "Integration Tests",
    href: "/dashboard/test",
    icon: FlaskConical,
    badge: "Dev",
  },
];

const bottomNavigation: NavItem[] = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    children: [
      { name: "General", href: "/dashboard/settings" },
      { name: "Publishing", href: "/dashboard/settings/publishing" },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Auto-expand parent when child is active
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href))) {
        setExpandedItems((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

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

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const expanded = expandedItems.includes(item.href);
    const hasChildren = item.children && item.children.length > 0;

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
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            active
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
            collapsed && "justify-center px-2"
          )}
        >
          <item.icon
            className={cn(
              "flex-shrink-0",
              collapsed ? "w-6 h-6" : "w-5 h-5",
              active
                ? "text-brand-600 dark:text-brand-400"
                : "text-gray-500 dark:text-gray-500"
            )}
          />
          {!collapsed && (
            <>
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    "w-4 h-4 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
              )}
            </>
          )}
        </Link>

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <div className="ml-4 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === child.href
                    ? "text-brand-700 dark:text-brand-400 font-medium"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
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

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-gray-200 dark:border-gray-800",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-xl bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              Epic AI
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-[calc(100vh-4rem)] py-4">
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navigation.map(renderNavItem)}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-3 space-y-1 border-t border-gray-200 dark:border-gray-800 pt-4">
          {bottomNavigation.map(renderNavItem)}
        </div>

        {/* Collapse Toggle */}
        <div className="px-3 pt-4">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

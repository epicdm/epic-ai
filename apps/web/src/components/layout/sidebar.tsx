"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Zap,
  BookOpen,
  PhoneCall,
  MessageSquare,
  FileText,
  Share2,
  Brain,
  CreditCard,
  Key,
  Megaphone,
  Calendar,
  Database,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: { name: string; href: string }[];
}

interface NavSection {
  title: string;
  subtitle: string;
  items: NavItem[];
}

// Agent-centric navigation
const navigationSections: NavSection[] = [
  {
    title: "",
    subtitle: "",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Agents",
    subtitle: "Build & manage",
    items: [
      {
        name: "My Agents",
        href: "/dashboard/voice",
        icon: Bot,
        children: [
          { name: "All Agents", href: "/dashboard/voice" },
          { name: "Create Agent", href: "/dashboard/voice/agents/new" },
        ],
      },
      {
        name: "Templates",
        href: "/dashboard/voice/templates",
        icon: BookOpen,
      },
      {
        name: "Knowledge Bases",
        href: "/dashboard/voice/knowledge-bases",
        icon: Brain,
      },
    ],
  },
  {
    title: "Channels",
    subtitle: "Connect & communicate",
    items: [
      {
        name: "Phone Numbers",
        href: "/dashboard/voice/numbers",
        icon: Phone,
      },
      {
        name: "Calls",
        href: "/dashboard/voice/calls",
        icon: PhoneCall,
        children: [
          { name: "History", href: "/dashboard/voice/calls" },
          { name: "Campaigns", href: "/dashboard/voice/campaigns" },
        ],
      },
      {
        name: "Social",
        href: "/dashboard/social",
        icon: Share2,
        children: [
          { name: "Accounts", href: "/dashboard/social" },
          { name: "Create Post", href: "/dashboard/content/generate" },
        ],
      },
    ],
  },
  {
    title: "Business",
    subtitle: "Grow & measure",
    items: [
      {
        name: "Leads",
        href: "/dashboard/leads",
        icon: Users,
      },
      {
        name: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
      {
        name: "Content",
        href: "/dashboard/content",
        icon: FileText,
        children: [
          { name: "Queue", href: "/dashboard/content" },
          { name: "Generate", href: "/dashboard/content/generate" },
          { name: "Published", href: "/dashboard/content/published" },
          { name: "Calendar", href: "/dashboard/calendar" },
        ],
      },
    ],
  },
  {
    title: "Automate",
    subtitle: "Workflows & campaigns",
    items: [
      {
        name: "Automations",
        href: "/dashboard/automations",
        icon: Zap,
      },
    ],
  },
];

// Flatten for auto-expand logic
const allNavItems = navigationSections.flatMap((section) => section.items);

const bottomNavigation: NavItem[] = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    children: [
      { name: "Organization", href: "/dashboard/settings" },
      { name: "Brand & Voice", href: "/dashboard/brand" },
      { name: "Billing & Usage", href: "/dashboard/settings/billing" },
      { name: "API Keys", href: "/dashboard/settings/api" },
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
    allNavItems.forEach((item) => {
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
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            active
              ? "bg-sky-500/10 text-sky-400"
              : "text-gray-400 hover:bg-white/5 hover:text-gray-200",
            collapsed && "justify-center px-2"
          )}
        >
          <item.icon
            className={cn(
              "flex-shrink-0",
              collapsed ? "w-5 h-5" : "w-[18px] h-[18px]",
              active ? "text-sky-400" : "text-gray-500"
            )}
          />
          {!collapsed && (
            <>
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] bg-white/10 text-gray-400 rounded font-normal">
                  {item.badge}
                </span>
              )}
              {hasChildren && (
                <ChevronRight
                  className={cn(
                    "w-3.5 h-3.5 text-gray-600 transition-transform",
                    expanded && "rotate-90"
                  )}
                />
              )}
            </>
          )}
        </Link>

        {/* Children */}
        {hasChildren && expanded && !collapsed && (
          <div className="ml-5 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block px-3 py-1.5 rounded-md text-[13px] transition-colors",
                  pathname === child.href
                    ? "text-sky-400 font-medium"
                    : "text-gray-500 hover:text-gray-300"
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
        "fixed left-0 top-0 z-40 h-screen bg-gray-950 border-r border-white/5 transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center h-14 border-b border-white/5",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="text-xl">🐾</span>
          {!collapsed && (
            <span className="font-bold text-lg text-white tracking-tight">
              OpenClaw
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-col h-[calc(100vh-3.5rem)] py-3">
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {navigationSections.map((section, sectionIndex) => (
            <div key={section.title || sectionIndex}>
              {/* Section Header */}
              {section.title && !collapsed && (
                <div className="pt-5 pb-1.5 first:pt-0">
                  <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
                    {section.title}
                  </span>
                </div>
              )}
              {collapsed && section.title && (
                <div className="pt-4 pb-1">
                  <div className="mx-auto w-6 h-px bg-white/10" />
                </div>
              )}
              {/* Section Items */}
              <div className="space-y-0.5">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Navigation */}
        <div className="px-2 space-y-0.5 border-t border-white/5 pt-3">
          {bottomNavigation.map(renderNavItem)}
        </div>

        {/* Collapse Toggle */}
        <div className="px-2 pt-2">
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-400 rounded-lg hover:bg-white/5 transition-colors",
              collapsed && "justify-center"
            )}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-xs">Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

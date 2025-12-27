"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDemo } from "@/lib/demo";
import { DemoIndicator } from "@/components/demo";
import {
  Menu,
  X,
  LayoutDashboard,
  Share2,
  Phone,
  Users,
  Settings,
  Sparkles,
  Zap,
  BarChart3,
  FlaskConical,
  Megaphone,
  Brain,
  FileText,
  Database,
  Calendar,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  HelpCircle,
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const { isDemo, exitDemoMode } = useDemo();

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Auto-expand parent when child is active
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href.split("?")[0]))) {
        setExpandedItems((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    const cleanHref = href.split("?")[0];
    if (cleanHref === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(cleanHref);
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const expanded = expandedItems.includes(item.href);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.href}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpanded(item.href)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-base font-medium transition-all active:scale-[0.98]",
              active
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0",
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 dark:text-gray-500"
              )}
            />
            <span className="flex-1 text-left">{item.name}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {item.badge}
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform duration-200",
                expanded && "rotate-180"
              )}
            />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-all active:scale-[0.98]",
              active
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <item.icon
              className={cn(
                "w-5 h-5 flex-shrink-0",
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-gray-500 dark:text-gray-500"
              )}
            />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                {item.badge}
              </span>
            )}
          </Link>
        )}

        {/* Children */}
        {hasChildren && (
          <div
            className={cn(
              "overflow-hidden transition-all duration-200",
              expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="ml-6 mt-1 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4 py-1">
              {item.children!.map((child) => {
                const childActive = pathname === child.href.split("?")[0];
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "block px-3 py-2.5 rounded-lg text-sm transition-all active:scale-[0.98]",
                      childActive
                        ? "text-brand-700 dark:text-brand-400 font-medium bg-brand-50/50 dark:bg-brand-900/20"
                        : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                    )}
                  >
                    {child.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lg:hidden">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Menu */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-white dark:bg-gray-900 z-50 transform transition-transform duration-300 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            onClick={() => setIsOpen(false)}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              Epic AI
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Demo Mode Indicator */}
        {isDemo && (
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                  Demo Mode
                </span>
              </div>
              <button
                onClick={() => {
                  exitDemoMode();
                  setIsOpen(false);
                }}
                className="text-xs text-orange-600 dark:text-orange-400 hover:underline"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map(renderNavItem)}
        </nav>

        {/* Bottom Navigation */}
        <div className="flex-shrink-0 px-3 space-y-1 border-t border-gray-200 dark:border-gray-800 pt-4 pb-2">
          {bottomNavigation.map(renderNavItem)}
        </div>

        {/* Help & Support */}
        <div className="flex-shrink-0 px-3 pb-4 space-y-2">
          <Link
            href="/help"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Help & Support</span>
            <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
          </Link>
        </div>

        {/* Safe Area Padding for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </div>
    </div>
  );
}

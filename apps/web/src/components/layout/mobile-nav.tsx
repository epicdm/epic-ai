"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDemo } from "@/lib/demo";
import {
  Menu,
  X,
  LayoutDashboard,
  Bot,
  Phone,
  Users,
  Settings,
  Zap,
  BarChart3,
  BookOpen,
  PhoneCall,
  Share2,
  Brain,
  FileText,
  ChevronDown,
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

// Agent-centric navigation (matches sidebar)
const navigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
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
  {
    name: "Phone Numbers",
    href: "/dashboard/voice/numbers",
    icon: Phone,
  },
  {
    name: "Calls",
    href: "/dashboard/voice/calls",
    icon: PhoneCall,
  },
  {
    name: "Social",
    href: "/dashboard/social",
    icon: Share2,
  },
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
  },
  {
    name: "Automations",
    href: "/dashboard/automations",
    icon: Zap,
  },
];

const bottomNavigation: NavItem[] = [
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    children: [
      { name: "Organization", href: "/dashboard/settings" },
      { name: "Brand & Voice", href: "/dashboard/brand" },
    ],
  },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const { isDemo, exitDemoMode } = useDemo();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    navigation.forEach((item) => {
      if (item.children?.some((child) => pathname.startsWith(child.href.split("?")[0]))) {
        setExpandedItems((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

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
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]",
              active
                ? "bg-sky-500/10 text-sky-400"
                : "text-gray-300 hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-sky-400" : "text-gray-500")} />
            <span className="flex-1 text-left">{item.name}</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", expanded && "rotate-180")} />
          </button>
        ) : (
          <Link
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all active:scale-[0.98]",
              active
                ? "bg-sky-500/10 text-sky-400"
                : "text-gray-300 hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-sky-400" : "text-gray-500")} />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-400 rounded-full">{item.badge}</span>
            )}
          </Link>
        )}

        {hasChildren && (
          <div className={cn("overflow-hidden transition-all duration-200", expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0")}>
            <div className="ml-6 mt-1 space-y-1 border-l border-white/10 pl-4 py-1">
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-3 py-2.5 rounded-lg text-sm transition-all",
                    pathname === child.href.split("?")[0]
                      ? "text-sky-400 font-medium"
                      : "text-gray-500 hover:text-gray-300"
                  )}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      <div
        className={cn("fixed inset-0 bg-black/60 z-50 transition-opacity duration-300", isOpen ? "opacity-100" : "opacity-0 pointer-events-none")}
        onClick={() => setIsOpen(false)}
      />

      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[85%] max-w-xs bg-gray-950 z-50 transform transition-transform duration-300 ease-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/5 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setIsOpen(false)}>
            <span className="text-xl">🐾</span>
            <span className="font-bold text-lg text-white tracking-tight">OpenClaw</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDemo && (
          <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-orange-400">Demo Mode</span>
              </div>
              <button onClick={() => { exitDemoMode(); setIsOpen(false); }} className="text-xs text-orange-400 hover:underline">Exit</button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navigation.map(renderNavItem)}
        </nav>

        <div className="flex-shrink-0 px-3 space-y-0.5 border-t border-white/5 pt-3 pb-2">
          {bottomNavigation.map(renderNavItem)}
        </div>

        <div className="flex-shrink-0 px-3 pb-4">
          <a
            href="https://docs.openclaw.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:bg-white/5 transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
            <span>Documentation</span>
            <ExternalLink className="w-4 h-4 ml-auto opacity-50" />
          </a>
        </div>
      </div>
    </div>
  );
}

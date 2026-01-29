"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/stores/sidebar-store";
import {
  LayoutDashboard,
  Bot,
  Phone,
  Brain,
  FileText,
  Share2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
  Sparkles,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  children?: { id: string; name: string; href: string }[];
  badge?: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: "",
    items: [
      {
        id: "dashboard",
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Build",
    items: [
      {
        id: "agents",
        name: "Agents",
        href: "/dashboard/agents",
        icon: Bot,
        children: [
          { id: "agents-all", name: "All Agents", href: "/dashboard/agents" },
          { id: "agents-new", name: "Create Agent", href: "/dashboard/agents/new" },
          { id: "agents-templates", name: "Templates", href: "/dashboard/agents/templates" },
        ],
      },
      {
        id: "phone",
        name: "Phone",
        href: "/dashboard/phone",
        icon: Phone,
        children: [
          { id: "phone-calls", name: "Calls", href: "/dashboard/phone/calls" },
          { id: "phone-numbers", name: "Numbers", href: "/dashboard/phone/numbers" },
          { id: "phone-routing", name: "Routing", href: "/dashboard/phone/routing" },
          { id: "phone-flows", name: "Flows", href: "/dashboard/phone/flows" },
        ],
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      {
        id: "brand",
        name: "Brand",
        href: "/dashboard/brand",
        icon: Brain,
        children: [
          { id: "brand-overview", name: "Overview", href: "/dashboard/brand" },
          { id: "brand-voice", name: "Voice & Style", href: "/dashboard/brand/voice" },
          { id: "brand-strategy", name: "Strategy", href: "/dashboard/brand/strategy" },
          { id: "brand-context", name: "Context", href: "/dashboard/brand/context" },
        ],
      },
      {
        id: "content",
        name: "Content",
        href: "/dashboard/content",
        icon: FileText,
        children: [
          { id: "content-queue", name: "Queue", href: "/dashboard/content" },
          { id: "content-generate", name: "Generate", href: "/dashboard/content/generate" },
          { id: "content-approval", name: "Approval", href: "/dashboard/content/approval" },
          { id: "content-published", name: "Published", href: "/dashboard/content/published" },
        ],
      },
      {
        id: "social",
        name: "Social",
        href: "/dashboard/social",
        icon: Share2,
        children: [
          { id: "social-overview", name: "Overview", href: "/dashboard/social" },
          { id: "social-accounts", name: "Accounts", href: "/dashboard/social/accounts" },
          { id: "social-suggestions", name: "AI Suggestions", href: "/dashboard/social/suggestions" },
        ],
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        id: "analytics",
        name: "Analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
      },
    ],
  },
];

const bottomNav: NavItem[] = [
  {
    id: "settings",
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

function SidebarContent() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarStore();

  let user: { fullName?: string | null; firstName?: string | null; primaryEmailAddress?: { emailAddress: string } | null } | null = null;
  try {
    const userInfo = useUser();
    user = userInfo.user;
  } catch {
    user = null;
  }

  const userName = user?.fullName || user?.firstName || "User";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isChildActive = (item: NavItem) =>
    item.children?.some((child) => pathname === child.href || pathname.startsWith(child.href + "/")) ?? false;

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);
    const childActive = isChildActive(item);
    const showChildren = (active || childActive) && item.children;
    const Icon = item.icon;

    if (collapsed) {
      return (
        <Tooltip key={item.id} delayDuration={0}>
          <TooltipTrigger asChild>
            <Link
              href={item.children?.[0]?.href ?? item.href}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
                active || childActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="sr-only">{item.name}</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-4">
            {item.name}
            {item.badge && (
              <span className="ml-auto text-muted-foreground text-xs">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={item.id}>
        <Link
          href={item.children?.[0]?.href ?? item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            active || childActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1">{item.name}</span>
          {item.badge && (
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              active || childActive
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}>
              {item.badge}
            </span>
          )}
          {item.children && (
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform",
                showChildren && "rotate-90"
              )}
            />
          )}
        </Link>
        {showChildren && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
            {item.children!.map((child) => (
              <Link
                key={child.id}
                href={child.href}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname === child.href || (child.href !== item.href && pathname.startsWith(child.href + "/"))
                    ? "font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
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
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-14 items-center border-b",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Rocket className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg">Epic AI</span>
          )}
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleCollapsed}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Collapse sidebar</span>
          </Button>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="space-y-1">
          {navSections.map((section, idx) => (
            <div key={section.label || idx}>
              {section.label && !collapsed && (
                <div className="mb-1 mt-4 first:mt-0">
                  <span className="px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {section.label}
                  </span>
                </div>
              )}
              {collapsed && section.label && <Separator className="my-2" />}
              <div className="space-y-0.5">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom */}
      <div className="border-t px-3 py-3 space-y-1">
        {bottomNav.map(renderNavItem)}
      </div>

      {/* User Card */}
      {!collapsed && (
        <div className="border-t px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="border-t px-3 py-3 flex justify-center">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleCollapsed}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Expand sidebar</span>
          </Button>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { collapsed, mobileOpen, setMobileOpen } = useSidebarStore();

  return (
    <TooltipProvider delayDuration={0}>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r bg-sidebar lg:block transition-all duration-200",
          collapsed ? "w-[52px]" : "w-60"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

export function MobileSidebarTrigger() {
  const { toggleMobile } = useSidebarStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={toggleMobile}
    >
      <PanelLeft className="h-5 w-5" />
      <span className="sr-only">Toggle navigation</span>
    </Button>
  );
}

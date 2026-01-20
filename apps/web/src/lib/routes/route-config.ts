import {
  LayoutDashboard,
  Brain,
  Database,
  FileText,
  Calendar,
  Share2,
  MicIcon,
  Megaphone,
  BarChart3,
  Users,
  Zap,
  Settings,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

/**
 * Route definition interface
 */
export interface RouteConfig {
  /** Unique route identifier */
  id: string;
  /** Display name in navigation */
  name: string;
  /** URL path */
  href: string;
  /** Icon component */
  icon?: LucideIcon;
  /** Parent route ID (for nested routes) */
  parent?: string;
  /** Child routes */
  children?: RouteConfig[];
  /** Flywheel section */
  section?: "understand" | "create" | "distribute" | "learn" | "automate" | "settings";
  /** Auth requirements */
  auth: {
    /** Requires authentication */
    required: boolean;
    /** Requires onboarding completion */
    onboardingRequired: boolean;
    /** Role restrictions */
    roles?: string[];
  };
  /** Badge label (e.g., "Dev", "Beta") */
  badge?: string;
  /** Tool gating (hide if tool not enabled) */
  tools?: string[];
  /** Hide from navigation */
  hidden?: boolean;
  /** Is this the default child route? */
  isDefault?: boolean;
}

/**
 * Complete route hierarchy
 */
export const ROUTE_CONFIG: RouteConfig[] = [
  // Public routes
  {
    id: "landing",
    name: "Home",
    href: "/",
    auth: { required: false, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "sign-in",
    name: "Sign In",
    href: "/sign-in",
    auth: { required: false, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "sign-up",
    name: "Sign Up",
    href: "/sign-up",
    auth: { required: false, onboardingRequired: false },
    hidden: true,
  },

  // Dashboard
  {
    id: "dashboard",
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    auth: { required: true, onboardingRequired: true },
  },

  // Onboarding
  {
    id: "onboarding",
    name: "Onboarding",
    href: "/onboarding",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },

  // UNDERSTAND section
  {
    id: "brand",
    name: "Brand Brain",
    href: "/dashboard/brand",
    icon: Brain,
    section: "understand",
    tools: ["brand"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "brand-overview",
        name: "Overview",
        href: "/dashboard/brand",
        parent: "brand",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "brand-voice",
        name: "Voice & Style",
        href: "/dashboard/brand/voice",
        parent: "brand",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "brand-strategy",
        name: "Strategy",
        href: "/dashboard/brand/strategy",
        parent: "brand",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },
  {
    id: "context",
    name: "Context Engine",
    href: "/dashboard/context",
    icon: Database,
    section: "understand",
    tools: ["context"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "context-sources",
        name: "Sources",
        href: "/dashboard/context",
        parent: "context",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "context-documents",
        name: "Documents",
        href: "/dashboard/context/documents",
        parent: "context",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "context-search",
        name: "Search",
        href: "/dashboard/context/search",
        parent: "context",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },

  // CREATE section
  {
    id: "content",
    name: "Content",
    href: "/dashboard/content",
    icon: FileText,
    section: "create",
    tools: ["content"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "content-queue",
        name: "Queue",
        href: "/dashboard/content",
        parent: "content",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "content-approval",
        name: "Approval Queue",
        href: "/dashboard/content/approval",
        parent: "content",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "content-generate",
        name: "Generate",
        href: "/dashboard/content/generate",
        parent: "content",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "content-published",
        name: "Published",
        href: "/dashboard/content/published",
        parent: "content",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },
  {
    id: "calendar",
    name: "Calendar",
    href: "/dashboard/calendar",
    icon: Calendar,
    section: "create",
    tools: ["calendar"],
    auth: { required: true, onboardingRequired: true },
  },

  // DISTRIBUTE section
  {
    id: "social",
    name: "Social Accounts",
    href: "/dashboard/social",
    icon: Share2,
    section: "distribute",
    tools: ["social"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "social-overview",
        name: "Overview",
        href: "/dashboard/social",
        parent: "social",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "social-suggestions",
        name: "AI Suggestions",
        href: "/dashboard/social/suggestions",
        parent: "social",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "social-settings",
        name: "Autopilot Settings",
        href: "/dashboard/social/settings",
        parent: "social",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "social-accounts",
        name: "Accounts",
        href: "/dashboard/social/accounts",
        parent: "social",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },
  {
    id: "voice",
    name: "Voice AI",
    href: "/dashboard/voice",
    icon: MicIcon,
    section: "distribute",
    tools: ["voice"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "voice-overview",
        name: "Overview",
        href: "/dashboard/voice",
        parent: "voice",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "voice-calls",
        name: "Call Logs",
        href: "/dashboard/voice/calls",
        parent: "voice",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "voice-numbers",
        name: "Phone Numbers",
        href: "/dashboard/voice/numbers",
        parent: "voice",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },
  {
    id: "ads",
    name: "Ads",
    href: "/dashboard/ads",
    icon: Megaphone,
    section: "distribute",
    tools: ["ads"],
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "ads-overview",
        name: "Overview",
        href: "/dashboard/ads",
        parent: "ads",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "ads-create",
        name: "Create Campaign",
        href: "/dashboard/ads/create",
        parent: "ads",
        auth: { required: true, onboardingRequired: true },
      },
      {
        id: "ads-accounts",
        name: "Ad Accounts",
        href: "/dashboard/ads/accounts",
        parent: "ads",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },

  // LEARN section
  {
    id: "analytics",
    name: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    section: "learn",
    tools: ["analytics"],
    auth: { required: true, onboardingRequired: true },
  },
  {
    id: "leads",
    name: "Leads",
    href: "/dashboard/leads",
    icon: Users,
    section: "learn",
    tools: ["leads"],
    auth: { required: true, onboardingRequired: true },
  },

  // AUTOMATE section
  {
    id: "automations",
    name: "Automations",
    href: "/dashboard/automations",
    icon: Zap,
    section: "automate",
    tools: ["automations"],
    auth: { required: true, onboardingRequired: true },
  },
  {
    id: "test",
    name: "Integration Tests",
    href: "/dashboard/test",
    icon: FlaskConical,
    section: "automate",
    auth: { required: true, onboardingRequired: false },
    badge: "Dev",
  },

  // SETTINGS section
  {
    id: "settings",
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    section: "settings",
    auth: { required: true, onboardingRequired: true },
    children: [
      {
        id: "settings-general",
        name: "General",
        href: "/dashboard/settings",
        parent: "settings",
        auth: { required: true, onboardingRequired: true },
        isDefault: true,
      },
      {
        id: "settings-publishing",
        name: "Publishing",
        href: "/dashboard/settings/publishing",
        parent: "settings",
        auth: { required: true, onboardingRequired: true },
      },
    ],
  },

  // SETUP FLOWS
  {
    id: "setup",
    name: "Setup",
    href: "/setup",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "setup-ai",
    name: "AI Setup",
    href: "/setup/ai",
    parent: "setup",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "setup-ai-social",
    name: "Social-First Setup",
    href: "/setup/ai-social",
    parent: "setup",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "setup-voice",
    name: "Voice Setup",
    href: "/setup/voice",
    parent: "setup",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },
  {
    id: "setup-guided",
    name: "Guided Setup",
    href: "/setup/guided",
    parent: "setup",
    auth: { required: true, onboardingRequired: false },
    hidden: true,
  },
];

/**
 * Utility functions
 */
export function getRouteById(id: string): RouteConfig | undefined {
  const findRoute = (routes: RouteConfig[]): RouteConfig | undefined => {
    for (const route of routes) {
      if (route.id === id) return route;
      if (route.children) {
        const found = findRoute(route.children);
        if (found) return found;
      }
    }
  };
  return findRoute(ROUTE_CONFIG);
}

export function getRoutesBySection(section: RouteConfig["section"]): RouteConfig[] {
  return ROUTE_CONFIG.filter((r) => r.section === section && !r.hidden);
}

export function canAccessRoute(
  route: RouteConfig,
  context: {
    isAuthenticated: boolean;
    hasCompletedOnboarding: boolean;
    userRoles: string[];
  }
): boolean {
  if (route.auth.required && !context.isAuthenticated) return false;
  if (route.auth.onboardingRequired && !context.hasCompletedOnboarding) return false;
  if (route.auth.roles && !route.auth.roles.some((r) => context.userRoles.includes(r)))
    return false;
  return true;
}

export function getFlatRoutes(): RouteConfig[] {
  const flatten = (routes: RouteConfig[]): RouteConfig[] => {
    return routes.flatMap((route) => [
      route,
      ...(route.children ? flatten(route.children) : []),
    ]);
  };
  return flatten(ROUTE_CONFIG);
}

export function getBreadcrumbs(currentHref: string): RouteConfig[] {
  const allRoutes = getFlatRoutes();
  const current = allRoutes.find((r) => r.href === currentHref);
  if (!current) return [];

  const breadcrumbs: RouteConfig[] = [current];
  let route = current;

  while (route.parent) {
    const parent = getRouteById(route.parent);
    if (!parent) break;
    breadcrumbs.unshift(parent);
    route = parent;
  }

  return breadcrumbs;
}

/**
 * Type-safe route paths
 * Automatically generated from ROUTE_CONFIG
 */
export type RoutePath =
  | "/dashboard"
  | "/dashboard/brand"
  | "/dashboard/brand/voice"
  | "/dashboard/brand/strategy"
  | "/dashboard/context"
  | "/dashboard/context/documents"
  | "/dashboard/context/search"
  | "/dashboard/content"
  | "/dashboard/content/approval"
  | "/dashboard/content/generate"
  | "/dashboard/content/published"
  | "/dashboard/calendar"
  | "/dashboard/social"
  | "/dashboard/social/suggestions"
  | "/dashboard/social/settings"
  | "/dashboard/social/accounts"
  | "/dashboard/voice"
  | "/dashboard/voice/calls"
  | "/dashboard/voice/numbers"
  | "/dashboard/voice/agents"
  | "/dashboard/voice/flows"
  | "/dashboard/voice/flows/new"
  | "/dashboard/voice/templates"
  | "/dashboard/voice/test"
  | "/dashboard/ads"
  | "/dashboard/ads/create"
  | "/dashboard/ads/accounts"
  | "/dashboard/analytics"
  | "/dashboard/leads"
  | "/dashboard/automations"
  | "/dashboard/test"
  | "/dashboard/settings"
  | "/dashboard/settings/publishing"
  | "/onboarding"
  | "/setup"
  | "/setup/ai"
  | "/setup/ai-setup"
  | "/setup/ai-social"
  | "/setup/voice"
  | "/setup/guided"
  | "/setup/understand"
  | "/setup/create"
  | "/setup/distribute"
  | "/setup/learn"
  | "/setup/automate";

/**
 * Extract route ID type from config
 */
export type RouteId =
  | "dashboard"
  | "brand"
  | "brand-voice"
  | "brand-strategy"
  | "context"
  | "context-documents"
  | "context-search"
  | "content"
  | "content-approval"
  | "content-generate"
  | "content-published"
  | "calendar"
  | "social"
  | "social-suggestions"
  | "social-settings"
  | "social-accounts"
  | "voice"
  | "voice-calls"
  | "voice-numbers"
  | "voice-agents"
  | "voice-flows"
  | "voice-flows-new"
  | "voice-templates"
  | "voice-test"
  | "ads"
  | "ads-create"
  | "ads-accounts"
  | "analytics"
  | "leads"
  | "automations"
  | "test"
  | "settings"
  | "settings-publishing"
  | "onboarding"
  | "setup"
  | "setup-ai"
  | "setup-ai-setup"
  | "setup-ai-social"
  | "setup-voice"
  | "setup-guided"
  | "setup-understand"
  | "setup-create"
  | "setup-distribute"
  | "setup-learn"
  | "setup-automate";

/**
 * Type-safe navigation helper
 * Ensures route path exists in config
 */
export function getTypedRoute(path: RoutePath): RouteConfig | undefined {
  return getFlatRoutes().find((r) => r.href === path);
}

/**
 * Type-safe navigation helper with ID
 * Ensures route ID exists in config
 */
export function getTypedRouteById(id: RouteId): RouteConfig | undefined {
  return getRouteById(id);
}

/**
 * Check if a path is a valid route
 */
export function isValidRoute(path: string): path is RoutePath {
  return getFlatRoutes().some((r) => r.href === path);
}

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ROUTE_CONFIG, getFlatRoutes } from "@/lib/routes/route-config";

// Build public routes list from route config
const publicRoutes = [
  "/",
  "/v2",
  "/v2/sign-in(.*)",
  "/v2/sign-up(.*)",
  "/v2/demo",
  "/v2/help",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/voice/webhook(.*)",  // LiveKit webhooks for call tracking
  "/api/health",
  "/api/public(.*)",
  "/api/cron(.*)",
];

// Add routes from config that don't require auth
const configRoutes = getFlatRoutes();
configRoutes.forEach((route) => {
  if (!route.auth.required && !route.hidden) {
    publicRoutes.push(route.href);
  }
});

const isPublicRoute = createRouteMatcher(publicRoutes);

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";
const useV2Ui = process.env.NEXT_PUBLIC_UI_VERSION === "v2";
const v2Redirects = [
  { from: "/", to: "/v2" },
  { from: "/sign-in", to: "/v2/sign-in" },
  { from: "/sign-up", to: "/v2/sign-up" },
  { from: "/demo", to: "/v2/demo" },
  { from: "/help", to: "/v2/help" },
  { from: "/dashboard", to: "/v2/dashboard" },
];

/**
 * Helper to check for and apply route redirects for backward compatibility
 * Redirects old query-based navigation to new nested routes
 */
function handleRouteRedirects(pathname: string, searchParams: URLSearchParams, requestUrl: string): NextResponse | null {
  if (useV2Ui && !pathname.startsWith("/v2")) {
    for (const redirect of v2Redirects) {
      if (pathname === redirect.from || pathname.startsWith(`${redirect.from}/`)) {
        const nextPath = `${redirect.to}${pathname.slice(redirect.from.length)}`;
        const url = new URL(nextPath, requestUrl);
        url.search = searchParams.toString();
        return NextResponse.redirect(url);
      }
    }
  }

  // Redirect old context query tabs to nested routes
  if (pathname === "/dashboard/context" && searchParams.has("tab")) {
    const tab = searchParams.get("tab");
    return NextResponse.redirect(new URL(`/dashboard/context/${tab}`, requestUrl));
  }

  // Redirect old setup mode query param to nested route
  if (pathname === "/setup" && searchParams.get("mode") === "guided") {
    return NextResponse.redirect(new URL("/setup/guided", requestUrl));
  }

  return null;
}

// Always use clerkMiddleware (required for auth() to work in components)
// Auth requirements are now driven by the centralized route config
export default clerkMiddleware(async (auth, request) => {
  const { pathname, searchParams } = new URL(request.url);

  // Check for route redirects (backward compatibility)
  const redirect = handleRouteRedirects(pathname, searchParams, request.url);
  if (redirect) {
    return redirect;
  }

  // In UAT bypass mode, don't protect any routes
  if (isUATBypassEnabled) {
    return;
  }

  // Protect routes based on auth requirements from route config
  // Note: Onboarding checks are handled at the layout level for better UX
  if (!isPublicRoute(request)) {
    await auth.protect({
      unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
    });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

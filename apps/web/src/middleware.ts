import { NextResponse, NextRequest } from "next/server";
import { getFlatRoutes } from "@/lib/routes/route-config";

// Build public routes list from route config
const publicRoutes = [
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/voice/webhook(.*)",  // LiveKit webhooks for call tracking
  "/api/health",
  "/api/public(.*)",
  "/api/cron(.*)",
  "/api/analytics(.*)",  // Analytics API - has its own auth checks
  "/api/dashboard(.*)",  // Dashboard API - has its own auth checks
  "/api/brand-brain(.*)",  // Brand Brain API - has its own auth checks
];

// Add routes from config that don't require auth
const configRoutes = getFlatRoutes();
configRoutes.forEach((route) => {
  if (!route.auth.required && !route.hidden) {
    publicRoutes.push(route.href);
  }
});


// UAT bypass - allows testing without auth when explicitly enabled
// Works in both development and production (when E2E_UAT_BYPASS is set)
// Supports both UAT_AUTH_BYPASS (canonical) and E2E_UAT_BYPASS (for Playwright E2E tests)
// NOTE: Evaluated at request time (not build time) to support runtime env var changes
function isUATBypassEnabledAtRequest() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

/**
 * Helper to check for and apply route redirects for backward compatibility
 * Redirects old query-based navigation to new nested routes
 */
function handleRouteRedirects(pathname: string, searchParams: URLSearchParams, requestUrl: string): NextResponse | null {
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

// Middleware export with Clerk integration
export default async function middleware(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);

  // Check for route redirects (backward compatibility) - run before auth
  const redirect = handleRouteRedirects(pathname, searchParams, request.url);
  if (redirect) {
    return redirect;
  }

  // Always use Clerk middleware to set up auth context (required for auth() calls in pages)
  // But conditionally skip auth protection when UAT bypass is enabled
  const { clerkMiddleware, createRouteMatcher } = await import("@clerk/nextjs/server");
  const isPublicRouteMatcher = createRouteMatcher(publicRoutes);
  const uatBypassEnabled = isUATBypassEnabledAtRequest();

  return clerkMiddleware(async (auth, request) => {
    // UAT/E2E bypass: Skip auth protection but still set up Clerk context
    // This allows auth() calls in pages to work (returning null userId)
    if (uatBypassEnabled) {
      return;
    }

    // Normal flow: Protect routes based on auth requirements
    if (!isPublicRouteMatcher(request)) {
      await auth.protect({
        unauthenticatedUrl: new URL("/sign-in", request.url).toString(),
      });
    }
  })(request);
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

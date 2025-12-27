import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/api/health",
  "/api/public(.*)",
  "/api/cron(.*)",
]);

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

// Always use clerkMiddleware (required for auth() to work in components)
// but conditionally protect routes based on UAT bypass setting
export default clerkMiddleware(async (auth, request) => {
  // In UAT bypass mode, don't protect any routes
  if (isUATBypassEnabled) {
    return;
  }

  if (!isPublicRoute(request)) {
    // Protect route and redirect unauthenticated users to sign-in
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

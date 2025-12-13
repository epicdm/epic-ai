/**
 * Dashboard Page - PKG-026
 * Main command center with unified dashboard
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";

export const metadata = {
  title: "Dashboard | Epic AI",
  description: "Your AI-powered marketing command center",
};

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding - use syncUser directly to avoid double calls
  // and handle errors more gracefully
  let needsOnboarding = false;

  try {
    const user = await syncUser();
    // Only redirect if we successfully verified user has no memberships
    // If syncUser fails (returns null), render dashboard anyway to avoid redirect loop
    if (user && user.memberships.length === 0) {
      needsOnboarding = true;
    }
  } catch (e) {
    console.error("Error checking onboarding status:", e);
    // On error, DON'T redirect - render dashboard to avoid redirect loop
    // The UnifiedDashboard will handle missing data gracefully
  }

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  return (
    <div className="p-6">
      <UnifiedDashboard />
    </div>
  );
}

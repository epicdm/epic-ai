/**
 * Dashboard Page - PKG-026
 * Main command center with unified dashboard
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { needsOnboarding } from "@/lib/sync-user";
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

  // Check if user needs onboarding
  try {
    const needs = await needsOnboarding();
    if (needs) {
      redirect("/onboarding");
    }
  } catch (e) {
    console.error("Error checking onboarding status:", e);
    // If we can't check, redirect to onboarding to be safe
    redirect("/onboarding");
  }

  return (
    <div className="p-6">
      <UnifiedDashboard />
    </div>
  );
}

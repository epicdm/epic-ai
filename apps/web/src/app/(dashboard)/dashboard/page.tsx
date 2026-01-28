/**
 * Dashboard Page - PKG-026
 * Main command center with unified dashboard
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/app/(dashboard)/dashboard/dashboard-content";

// UAT bypass - allows testing without auth when explicitly enabled
// Supports both UAT_AUTH_BYPASS (canonical) and E2E_UAT_BYPASS (for Playwright E2E tests)
// NOTE: Must be a function (not module-level const) to ensure evaluation at request time.
function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Dashboard | Epic AI",
  description: "Your AI-powered marketing command center",
};

interface DashboardPageProps {
  searchParams: Promise<{ flywheel?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;

  // Check UAT bypass FIRST, before calling any Clerk functions
  if (isUATBypassEnabled()) {
    return (
      <DashboardContent
        userName="UAT Tester"
        showFlywheelModal={params?.flywheel === "show"}
      />
    );
  }

  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user details for personalization
  const user = await currentUser();
  const userName = user?.firstName || "there";

  // Note: Onboarding gate is now handled at the layout level
  // If user reaches this page, they have completed onboarding

  // Check if flywheel was just activated
  const flywheelJustActivated = params.flywheel === "activated";

  return <DashboardContent flywheelJustActivated={flywheelJustActivated} userName={userName} />;
}

/**
 * Dashboard Page - PKG-026
 * Main command center with unified dashboard
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { syncUser } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { UnifiedDashboard } from "@/components/dashboard/unified-dashboard";
import { MasterOnboardingWizard } from "@/components/onboarding/master-onboarding-wizard";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export const metadata = {
  title: "Dashboard | Epic AI",
  description: "Your AI-powered marketing command center",
};

interface DashboardPageProps {
  searchParams: Promise<{ showOnboarding?: string; flywheel?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth();
  const params = await searchParams;

  // UAT bypass: Skip auth check in development testing mode
  if (!userId && !isUATBypassEnabled) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding - use syncUser directly to avoid double calls
  // and handle errors more gracefully
  let needsOnboarding = false;
  let showOnboardingWizard = params.showOnboarding === "true";
  let userName = "";
  let userEmail = "";

  // Skip syncUser in UAT bypass mode (no real user to sync)
  if (userId) {
    try {
      const [user, clerkUser, onboardingProgress] = await Promise.all([
        syncUser(),
        currentUser(),
        prisma.userOnboardingProgress.findUnique({
          where: { userId },
        }),
      ]);

      userName = clerkUser?.firstName || clerkUser?.emailAddresses?.[0]?.emailAddress || "there";
      userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";

      // Only redirect if we successfully verified user has no memberships
      // If syncUser fails (returns null), render dashboard anyway to avoid redirect loop
      if (user && user.memberships.length === 0) {
        needsOnboarding = true;
      }

      // Check if onboarding hasn't been completed yet (and wasn't forced via query param)
      if (!showOnboardingWizard && onboardingProgress && !onboardingProgress.onboardingCompletedAt) {
        // User has an org but hasn't completed onboarding - show wizard
        showOnboardingWizard = true;
      }
    } catch (e) {
      console.error("Error checking onboarding status:", e);
      // On error, DON'T redirect - render dashboard to avoid redirect loop
      // The UnifiedDashboard will handle missing data gracefully
    }
  }

  if (needsOnboarding) {
    redirect("/onboarding");
  }

  // Show onboarding wizard if triggered
  if (showOnboardingWizard) {
    return (
      <div className="p-6">
        <MasterOnboardingWizard
          userName={userName}
          userEmail={userEmail}
        />
      </div>
    );
  }

  // Check if flywheel was just activated
  const flywheelJustActivated = params.flywheel === "activated";

  return (
    <div className="p-6">
      <UnifiedDashboard flywheelJustActivated={flywheelJustActivated} />
    </div>
  );
}

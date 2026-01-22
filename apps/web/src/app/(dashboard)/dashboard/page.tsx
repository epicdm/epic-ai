/**
 * Dashboard Page - PKG-026
 * Main command center with unified dashboard
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardContent } from "@/app/(dashboard)/dashboard/dashboard-content";

// Development UAT bypass - allows testing without auth in development mode
const isUATBypassEnabled =
  process.env.NODE_ENV === "development" &&
  process.env.UAT_AUTH_BYPASS === "true";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Dashboard | Epic AI",
  description: "Your AI-powered marketing command center",
};

interface DashboardPageProps {
  searchParams: Promise<{ flywheel?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { userId } = await auth();
  const params = await searchParams;

  // UAT bypass: Skip auth check in development testing mode
  if (!userId && !isUATBypassEnabled) {
    redirect("/sign-in");
  }

  // Note: Onboarding gate is now handled at the layout level
  // If user reaches this page, they have completed onboarding

  // Check if flywheel was just activated
  const flywheelJustActivated = params.flywheel === "activated";

  return <DashboardContent flywheelJustActivated={flywheelJustActivated} />;
}

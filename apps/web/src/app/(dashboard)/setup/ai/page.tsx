/**
 * AI Express Setup Page
 *
 * Entry point for users who chose "AI Express Setup" in onboarding.
 * Routes to BirdEyeWizard for automated flywheel configuration.
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { BirdEyeWizard } from "@/components/flywheel/shared/birdeye-wizard";

export const metadata = {
  title: "AI Express Setup | Epic AI",
  description: "Let AI configure your entire marketing flywheel in under 5 minutes",
};

export default async function AIExpressSetupPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding and get brand data
  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: {
      organization: {
        include: {
          brands: {
            take: 1,
            include: {
              socialAccounts: {
                where: { status: "CONNECTED" },
                select: { platform: true, username: true, displayName: true },
              },
            },
          },
        },
      },
    },
  });

  if (!membership) {
    // No organization - redirect to onboarding
    redirect("/onboarding");
  }

  // Get the brand's website URL if available (from onboarding)
  const brand = membership.organization?.brands[0];
  const initialWebsiteUrl = brand?.website || "";
  const connectedFacebookPage = brand?.socialAccounts?.find(
    (acc: { platform: string; username: string | null; displayName: string | null }) =>
      acc.platform === "FACEBOOK" || acc.platform === "META"
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            AI Express Setup
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Let AI Configure Your Flywheel
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Our AI will analyze your website and automatically configure all 5 phases
            of your marketing flywheel. This typically takes under 60 seconds.
          </p>
        </div>

        {/* Wizard */}
        <BirdEyeWizard
          initialWebsiteUrl={initialWebsiteUrl}
          connectedFacebookPage={connectedFacebookPage ? {
            name: connectedFacebookPage.displayName || connectedFacebookPage.username || "",
          } : undefined}
        />
      </div>
    </div>
  );
}

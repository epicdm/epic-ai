/**
 * AI Social Setup Page
 *
 * Entry point for users who chose "AI Social Setup" in onboarding.
 * Analyzes connected social accounts to auto-configure Brand Brain.
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { AIBrandSetup } from "@/components/brand/ai-brand-setup";

export const metadata = {
  title: "AI Social Setup | Epic AI",
  description: "Let AI learn your brand voice from your social media posts",
};

export default async function AISocialSetupPage() {
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

  if (!membership?.organization) {
    // No organization - redirect to onboarding
    redirect("/onboarding");
  }

  const organization = membership.organization;

  // Get existing brand or create one if needed
  let brand = organization.brands[0];

  if (!brand) {
    // Auto-create a brand so users can proceed with AI Setup
    const orgName = organization.name || "My Brand";
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "my-brand";

    const createdBrand = await prisma.brand.create({
      data: {
        organizationId: organization.id,
        name: orgName,
        slug,
      },
      include: {
        socialAccounts: {
          where: { status: "CONNECTED" },
          select: { platform: true, username: true, displayName: true },
        },
      },
    });
    brand = createdBrand;
  }

  const connectedAccounts = brand?.socialAccounts || [];
  const hasConnectedAccounts = connectedAccounts.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 text-purple-600 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
            AI Social Setup
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Learn Your Brand from Social Posts
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            {hasConnectedAccounts
              ? `Our AI will analyze your ${connectedAccounts.length} connected account${connectedAccounts.length > 1 ? "s" : ""} to understand your brand voice, content themes, and engagement patterns.`
              : "Connect your social accounts to let AI learn your brand voice from your existing posts."}
          </p>
        </div>

        {/* Connected Accounts Summary */}
        {hasConnectedAccounts && (
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {connectedAccounts.map((account: { platform: string; displayName: string | null; username: string | null }) => (
              <div
                key={account.platform}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm"
              >
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {account.displayName || account.username || account.platform}
              </div>
            ))}
          </div>
        )}

        {/* AI Setup Component */}
        <AIBrandSetup
          brandId={brand.id}
          onComplete={() => {
            // Redirect to dashboard on complete
            window.location.href = "/dashboard";
          }}
          onSkip={() => {
            // Redirect to manual setup
            window.location.href = "/setup";
          }}
          showSkip={true}
        />

        {/* No accounts warning */}
        {!hasConnectedAccounts && (
          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
            <p className="text-amber-800 dark:text-amber-200 mb-3">
              No social accounts connected yet. Connect your accounts to enable AI analysis.
            </p>
            <a
              href="/dashboard/social"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Connect Accounts
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

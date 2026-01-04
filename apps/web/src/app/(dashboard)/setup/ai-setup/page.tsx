/**
 * Bird's Eye AI Setup Page
 * Unified AI-powered setup for all 5 flywheel phases
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { BirdEyeWizard } from "@/components/flywheel/shared/birdeye-wizard";

export const metadata = {
  title: "AI Setup - Configure Your Flywheel | Epic AI",
  description: "Let AI configure your entire marketing flywheel in one go",
};

export default async function AISetupPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's organization and brand for Facebook OAuth
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: {
                select: { id: true, website: true, name: true },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const organization = user?.memberships[0]?.organization;

  // If no organization, redirect to onboarding
  if (!organization) {
    redirect("/onboarding");
  }

  // Get existing brand or create one if needed (for users after data reset)
  let brand = organization.brands[0];

  if (!brand) {
    // Auto-create a brand so users can proceed with AI Setup
    const orgName = organization.name || "My Brand";
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "my-brand";

    brand = await prisma.brand.create({
      data: {
        organizationId: organization.id,
        name: orgName,
        slug,
      },
      select: { id: true, website: true, name: true },
    });
  }

  // Check if Facebook is already connected for this brand
  let connectedFacebookPage: { name: string } | undefined;
  if (brand?.id) {
    const fbAccount = await prisma.socialAccount.findFirst({
      where: {
        brandId: brand.id,
        platform: "FACEBOOK",
        status: "CONNECTED",
      },
      select: { displayName: true, username: true },
    });
    if (fbAccount) {
      connectedFacebookPage = { name: fbAccount.displayName || fbAccount.username || "Facebook Page" };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <BirdEyeWizard
        brandId={brand?.id}
        initialWebsiteUrl={brand?.website || undefined}
        connectedFacebookPage={connectedFacebookPage}
      />
    </div>
  );
}

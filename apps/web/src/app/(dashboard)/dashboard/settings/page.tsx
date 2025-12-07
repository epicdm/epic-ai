import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization, needsOnboarding } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding
  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  const user = await currentUser();
  const organization = await getUserOrganization();

  if (!organization) {
    redirect("/onboarding");
  }

  // Get organization's brands
  const brands = await prisma.brand.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  // Get subscription info
  const subscription = await prisma.subscription.findFirst({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <SettingsContent
      organization={organization}
      brands={brands}
      subscription={subscription}
      userEmail={user?.emailAddresses[0]?.emailAddress || null}
    />
  );
}

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

  // Get organization's brands - wrapped in try-catch for resilience
  let brands: Awaited<ReturnType<typeof prisma.brand.findMany>> = [];
  try {
    brands = await prisma.brand.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching brands for settings:", error);
  }

  // Get subscription info - wrapped in try-catch
  let subscription: Awaited<ReturnType<typeof prisma.subscription.findFirst>> = null;
  try {
    subscription = await prisma.subscription.findFirst({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
  }

  return (
    <SettingsContent
      organization={organization}
      brands={brands}
      subscription={subscription}
      userEmail={user?.emailAddresses[0]?.emailAddress || null}
    />
  );
}

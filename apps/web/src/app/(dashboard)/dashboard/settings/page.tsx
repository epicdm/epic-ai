import { getAuthWithBypass } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization, needsOnboarding } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { SettingsContent } from "@/components/settings/settings-content";

export default async function SettingsPage() {
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding (skip for UAT bypass)
  if (!isUATBypass) {
    const needs = await needsOnboarding();
    if (needs) {
      redirect("/onboarding");
    }
  }

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

  // For UAT bypass, use a placeholder email
  const userEmail = isUATBypass ? "uat-test@epic.dm" : null;

  return (
    <SettingsContent
      organization={organization}
      brands={brands}
      subscription={subscription}
      userEmail={userEmail}
    />
  );
}

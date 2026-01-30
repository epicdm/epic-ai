import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { NewSettingsContent } from "@/components/settings/settings-content";

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { userId, isUATBypass } = await getAuthWithBypass();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getCurrentOrganization();

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

  const organizationData = {
    ...organization,
    createdAt: organization.createdAt.toISOString(),
  };

  const brandsData = brands.map((brand) => ({
    ...brand,
    createdAt: brand.createdAt.toISOString(),
  }));

  const subscriptionData = subscription
    ? {
        ...subscription,
        trialEnd: subscription.trialEnd ? subscription.trialEnd.toISOString() : null,
        currentPeriodEnd: subscription.currentPeriodEnd
          ? subscription.currentPeriodEnd.toISOString()
          : null,
      }
    : null;

  return (
    <NewSettingsContent
      organization={organizationData}
      brands={brandsData}
      subscription={subscriptionData}
      userEmail={userEmail}
    />
  );
}

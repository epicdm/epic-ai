import { redirect } from "next/navigation";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { ContentFactoryPage } from "@/components/content/content-factory-page";

// UAT bypass - allows testing without database when explicitly enabled
function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "Content Factory | Epic AI",
};

export default async function Page() {
  // In UAT bypass mode, return mock data without database queries
  if (isUATBypassEnabled()) {
    return (
      <ContentFactoryPage
        brandId="uat_test_brand_001"
        brandName="UAT Test Brand"
        connectedAccounts={[]}
      />
    );
  }

  const { userId } = await getAuthWithBypass();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getCurrentOrganization();
  if (!organization) {
    throw new Error("Organization not found - please contact support");
  }

  // Fetch brand with error handling for resilience
  let brand = null;
  try {
    brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
      include: {
        socialAccounts: {
          where: { status: "CONNECTED" },
          select: {
            id: true,
            platform: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("Error fetching brand for content:", error);
  }

  if (!brand) {
    redirect("/dashboard/brand");
  }

  // Transform data to match component interface
  const connectedAccounts = brand.socialAccounts.map(acc => ({
    id: acc.id,
    platform: acc.platform,
    username: acc.username || "",
    displayName: acc.displayName,
    avatar: acc.avatar,
  }));

  return (
    <ContentFactoryPage
      brandId={brand.id}
      brandName={brand.name}
      connectedAccounts={connectedAccounts}
    />
  );
}

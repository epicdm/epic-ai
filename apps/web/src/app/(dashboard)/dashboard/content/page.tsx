import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContentFactoryPage } from "@/components/content/content-factory-page";

export const metadata = {
  title: "Content Factory | Epic AI",
};

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();
  if (!organization) {
    redirect("/onboarding");
  }

  const brand = await prisma.brand.findFirst({
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

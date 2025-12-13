import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContentGeneratePage } from "@/components/content/content-generate-page";

export const metadata = {
  title: "Generate Content | Epic AI",
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
      brandBrain: {
        include: {
          pillars: true,
        },
      },
      socialAccounts: {
        where: { status: "CONNECTED" },
      },
    },
  });

  if (!brand) {
    redirect("/dashboard/brand");
  }

  // Transform data to match component interface
  const brain = brand.brandBrain ? {
    id: brand.brandBrain.id,
    voiceTone: brand.brandBrain.voiceTone,
    writingStyle: brand.brandBrain.writingStyle,
    contentPillars: brand.brandBrain.pillars.map(p => p.name),
    keyTopics: brand.brandBrain.keyMessages || [],
  } : null;

  const socialAccounts = brand.socialAccounts.map(acc => ({
    id: acc.id,
    platform: acc.platform,
    accountName: acc.displayName || acc.username || "Unknown",
    profileImageUrl: acc.avatar,
  }));

  return (
    <ContentGeneratePage
      brandId={brand.id}
      brain={brain}
      socialAccounts={socialAccounts}
    />
  );
}

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
      brain: true,
      socialAccounts: {
        where: { isActive: true },
      },
    },
  });

  if (!brand) {
    redirect("/dashboard/brand");
  }

  return (
    <ContentGeneratePage
      brandId={brand.id}
      brain={brand.brain}
      socialAccounts={brand.socialAccounts}
    />
  );
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContextSourcesPage } from "@/components/brand/context-sources-page";

export const metadata = {
  title: "Context Sources | Epic AI",
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
      contextSources: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!brand) {
    redirect("/dashboard/brand");
  }

  return <ContextSourcesPage brandId={brand.id} sources={brand.contextSources} />;
}

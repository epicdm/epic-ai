import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContextSourcesPage } from "@/components/brand/context-sources-page";

export const metadata = {
  title: "Context Sources | Epic AI",
};

export default async function Page() {
  const { userId } = await getAuth();

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

  // Transform Prisma data to match component interface
  const sources = brand.contextSources.map(s => ({
    id: s.id,
    type: s.type,
    name: s.name,
    config: (s.config as { url?: string } & Record<string, unknown>) || {},
    status: s.status,
    lastSync: s.lastSync,
    syncError: s.syncError,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  return <ContextSourcesPage brandId={brand.id} sources={sources} />;
}

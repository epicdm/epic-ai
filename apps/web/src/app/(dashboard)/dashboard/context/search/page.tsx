import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { ContextSearchPage } from "@/components/context/context-search-page";

export const metadata = {
  title: "Search | Context Engine | Epic AI",
};

export default async function SearchPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const organization = await getUserOrganization();
  if (!organization) {
    redirect("/onboarding");
  }

  // Get brand
  let brand = null;
  try {
    brand = await prisma.brand.findFirst({
      where: { organizationId: organization.id },
    });
  } catch (error) {
    console.error("Error fetching brand for search:", error);
  }

  if (!brand) {
    redirect("/dashboard/brand");
  }

  return (
    <ContextSearchPage
      brandId={brand.id}
      brandName={brand.name}
    />
  );
}

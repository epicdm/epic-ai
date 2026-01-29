import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { LeadForm } from "@/components/leads/lead-form";

export const dynamic = 'force-dynamic';

export default async function NewLeadPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  const org = await getUserOrganization();
  const brands = org
    ? await prisma.brand.findMany({
        where: { organizationId: org.id },
        select: { id: true, name: true },
      })
    : [];

  return <LeadForm brands={brands} />;
}

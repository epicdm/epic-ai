import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { needsOnboarding, getUserOrganization } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { LeadForm } from "@/components/leads/lead-form";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  if (await needsOnboarding()) {
    redirect("/onboarding");
  }

  const { id } = await params;
  const org = await getUserOrganization();

  if (!org) {
    redirect("/onboarding");
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      organizationId: org.id,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      company: true,
      jobTitle: true,
      status: true,
      source: true,
      sourceDetails: true,
      estimatedValue: true,
      notes: true,
      brandId: true,
    },
  });

  if (!lead) {
    notFound();
  }

  const brands = await prisma.brand.findMany({
    where: { organizationId: org.id },
    select: { id: true, name: true },
  });

  return <LeadForm brands={brands} initialData={lead} />;
}

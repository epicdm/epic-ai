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
      sourcePlatform: true,
      score: true,
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

  // Transform lead data to match LeadForm interface
  const formData = {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    status: lead.status,
    source: lead.source,
    sourceDetails: lead.sourcePlatform, // Map sourcePlatform to sourceDetails
    estimatedValue: lead.score, // Map score to estimatedValue for display
    notes: lead.notes,
    brandId: lead.brandId,
  };

  return <LeadForm brands={brands} initialData={formData} />;
}

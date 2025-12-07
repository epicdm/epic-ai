import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization, needsOnboarding } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user needs onboarding
  const needs = await needsOnboarding();
  if (needs) {
    redirect("/onboarding");
  }

  const user = await currentUser();
  const organization = await getUserOrganization();

  // Get stats
  const stats = organization
    ? await Promise.all([
        prisma.brand.count({ where: { organizationId: organization.id } }),
        prisma.socialPost.count({
          where: { brand: { organizationId: organization.id } },
        }),
        prisma.call.count({
          where: { brand: { organizationId: organization.id } },
        }),
        prisma.lead.count({ where: { organizationId: organization.id } }),
      ])
    : [0, 0, 0, 0];

  const [brandCount, postCount, callCount, leadCount] = stats;

  return (
    <DashboardContent
      firstName={user?.firstName || null}
      organizationName={organization?.name || null}
      stats={{ brandCount, postCount, callCount, leadCount }}
    />
  );
}

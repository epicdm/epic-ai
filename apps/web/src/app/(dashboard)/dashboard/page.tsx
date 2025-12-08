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

  // Get stats - use try/catch for tables that may not exist yet
  let brandCount = 0;
  let postCount = 0;
  let callCount = 0;
  let leadCount = 0;

  if (organization) {
    try {
      brandCount = await prisma.brand.count({ where: { organizationId: organization.id } });
    } catch {
      brandCount = 0;
    }

    try {
      postCount = await prisma.socialPost.count({
        where: { brand: { organizationId: organization.id } },
      });
    } catch {
      postCount = 0;
    }

    try {
      callCount = await prisma.call.count({
        where: { brand: { organizationId: organization.id } },
      });
    } catch {
      callCount = 0;
    }

    try {
      leadCount = await prisma.lead.count({ where: { organizationId: organization.id } });
    } catch {
      leadCount = 0;
    }
  }

  return (
    <DashboardContent
      firstName={user?.firstName || null}
      organizationName={organization?.name || null}
      stats={{ brandCount, postCount, callCount, leadCount }}
    />
  );
}

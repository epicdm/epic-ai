import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrganization, needsOnboarding } from "@/lib/sync-user";
import { prisma } from "@epic-ai/database";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  try {
    const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    // Check if user needs onboarding
    let needs = false;
    try {
      needs = await needsOnboarding();
    } catch (e) {
      console.error("Error checking onboarding status:", e);
      // If we can't check, assume they need onboarding
      needs = true;
    }

    if (needs) {
      redirect("/onboarding");
    }

    const user = await currentUser();

    let organization = null;
    try {
      organization = await getUserOrganization();
    } catch (e) {
      console.error("Error getting organization:", e);
    }

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
  } catch (error) {
    console.error("Dashboard page error:", error);
    // Re-throw redirects
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    // For other errors, show a fallback
    return (
      <DashboardContent
        firstName={null}
        organizationName={null}
        stats={{ brandCount: 0, postCount: 0, callCount: 0, leadCount: 0 }}
      />
    );
  }
}

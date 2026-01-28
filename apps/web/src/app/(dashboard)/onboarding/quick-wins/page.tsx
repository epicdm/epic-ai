import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { QuickWinsWizard } from "@/components/onboarding/quick-wins-wizard";
import { prisma } from "@epic-ai/database";

type SetupPath = "social_first" | "voice_first" | "hybrid" | "guided";

function isUATBypassEnabled() {
  return process.env.UAT_AUTH_BYPASS === "true" || process.env.E2E_UAT_BYPASS === "true";
}

export const dynamic = 'force-dynamic';

export default async function QuickWinsPage({
  searchParams,
}: {
  searchParams: { path?: string };
}) {
  // Check UAT bypass FIRST, before calling any Clerk functions
  let userId: string | null = null;
  if (isUATBypassEnabled()) {
    userId = "test_user_uat_001";
  } else {
    const authResult = await auth();
    userId = authResult.userId;
  }

  if (!userId) {
    redirect("/sign-in");
  }

  // Get path from URL
  const path = searchParams.path as SetupPath | undefined;

  // Validate path
  if (!path || !["social_first", "voice_first", "hybrid", "guided"].includes(path)) {
    // If no valid path, skip quick wins and go to dashboard
    redirect("/dashboard");
  }

  // Get user's organization and brand
  const syncedUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const organization = syncedUser?.memberships?.[0]?.organization;
  const brand = organization?.brands?.[0];

  // Check if quick wins already completed
  const onboardingProgress = await prisma.userOnboardingProgress.findUnique({
    where: { userId },
  });

  if (onboardingProgress?.quickWinsCompletedAt) {
    // Already completed quick wins, go to dashboard
    redirect("/dashboard");
  }

  return (
    <QuickWinsWizard
      path={path}
      brandId={brand?.id}
      organizationId={organization?.id}
    />
  );
}

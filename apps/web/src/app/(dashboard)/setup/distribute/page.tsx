import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { DistributeWizard } from "@/components/flywheel/wizards/distribute-wizard";

export const metadata = {
  title: "Publishing Engine Setup | Epic AI",
  description: "Connect your social accounts and set up your publishing schedule",
};

interface PageProps {
  searchParams: Promise<{ review?: string; step?: string }>;
}

export default async function DistributeSetupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isReviewMode = params.review === "true";
  const stepParam = params.step ? parseInt(params.step, 10) : undefined;

  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get flywheel progress
  const progress = await prisma.flywheelProgress.findUnique({
    where: { userId },
  });

  // Check if CREATE phase is completed (dependency)
  if (!progress || progress.createPhase !== "COMPLETED") {
    redirect("/setup/create");
  }

  // Get brand for brandId
  // Note: User.id IS the Clerk user ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: {
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  const brand = user?.memberships?.[0]?.organization?.brands?.[0];
  const brandId = brand?.id;

  // Load existing data
  const initialData = (progress?.distributeData as Record<string, unknown>) || {};
  // Review step is the last step (index 5 for distribute wizard)
  const REVIEW_STEP = 5;
  let initialStep = stepParam ?? 0;

  // If in review mode and we have data, jump to review step
  if (isReviewMode && Object.keys(initialData).length > 0) {
    initialStep = REVIEW_STEP;
  } else if (stepParam === undefined) {
    initialStep = progress?.distributeStep ?? 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DistributeWizard
        initialData={initialData}
        initialStep={initialStep >= 0 ? initialStep : 0}
        brandId={brandId}
      />
    </div>
  );
}

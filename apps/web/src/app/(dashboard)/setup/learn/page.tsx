import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { LearnWizard } from "@/components/flywheel/wizards/learn-wizard";
import type { LearnWizardData } from "@/lib/flywheel/types";

interface PageProps {
  searchParams: Promise<{ review?: string; step?: string }>;
}

export default async function LearnSetupPage({ searchParams }: PageProps) {
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
    select: {
      distributePhase: true,
      learnPhase: true,
      learnStep: true,
      learnData: true,
      brandId: true,
    },
  });

  // Check DISTRIBUTE dependency
  if (!progress || progress.distributePhase !== "COMPLETED") {
    redirect("/setup/distribute?required=true");
  }

  // Initialize data
  const initialData: LearnWizardData = {
    seenIntro: false,
    priorityMetrics: [],
    reportFrequency: undefined,
    reportDay: undefined,
    reportEmail: true,
    optimizationGoals: [],
    confirmed: false,
    ...(progress?.learnData as Partial<LearnWizardData> || {}),
  };

  // Review step is the last step (index 4 for learn wizard)
  const REVIEW_STEP = 4;
  let initialStep = stepParam ?? 0;

  // If in review mode and we have data, jump to review step
  if (isReviewMode && (progress?.learnData && Object.keys(progress.learnData as object).length > 0)) {
    initialStep = REVIEW_STEP;
  } else if (stepParam === undefined) {
    initialStep = progress?.learnStep ?? 0;
  }

  return (
    <LearnWizard
      initialData={initialData}
      initialStep={initialStep >= 0 ? initialStep : 0}
      brandId={progress?.brandId || undefined}
    />
  );
}

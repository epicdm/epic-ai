import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { AutomateWizard } from "@/components/flywheel/wizards/automate-wizard";
import type { AutomateWizardData } from "@/lib/flywheel/types";

interface PageProps {
  searchParams: Promise<{ review?: string; step?: string }>;
}

export default async function AutomateSetupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isReviewMode = params.review === "true";
  const stepParam = params.step ? parseInt(params.step, 10) : undefined;

  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if LEARN phase is completed (dependency)
  const progress = await prisma.flywheelProgress.findUnique({
    where: { userId },
    select: {
      learnPhase: true,
      automateStep: true,
      automateData: true,
    },
  });

  // Redirect if LEARN not completed
  if (!progress || progress.learnPhase !== "COMPLETED") {
    redirect("/setup/learn?required=true");
  }

  // Initialize wizard data with defaults or saved data
  const savedData = progress.automateData as Partial<AutomateWizardData> | null;

  const initialData: AutomateWizardData = {
    seenIntro: savedData?.seenIntro ?? false,
    approvalMode: savedData?.approvalMode,
    contentMix: savedData?.contentMix ?? {
      educational: 40,
      promotional: 20,
      entertaining: 20,
      engaging: 20,
    },
    postsPerWeek: savedData?.postsPerWeek ?? 5,
    platformFrequency: savedData?.platformFrequency ?? {},
    notifications: savedData?.notifications ?? {
      email: true,
      inApp: true,
      contentGenerated: true,
      postPublished: true,
      weeklyReport: true,
      performanceAlerts: true,
    },
    confirmed: savedData?.confirmed ?? false,
  };

  // Review step is the last step (index 5 for automate wizard)
  const REVIEW_STEP = 5;
  let initialStep = stepParam ?? 0;

  // If in review mode and we have data, jump to review step
  if (isReviewMode && (progress.automateData && Object.keys(progress.automateData as object).length > 0)) {
    initialStep = REVIEW_STEP;
  } else if (stepParam === undefined) {
    initialStep = progress.automateStep >= 0 ? progress.automateStep : 0;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutomateWizard initialData={initialData} initialStep={initialStep} />
    </div>
  );
}

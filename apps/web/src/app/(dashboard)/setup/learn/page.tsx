import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { LearnWizard } from "@/components/flywheel/wizards/learn-wizard";
import type { LearnWizardData } from "@/lib/flywheel/types";

export default async function LearnSetupPage() {
  const { userId } = await auth();

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

  const initialStep = progress?.learnStep ?? 0;

  return (
    <LearnWizard
      initialData={initialData}
      initialStep={initialStep >= 0 ? initialStep : 0}
      brandId={progress?.brandId || undefined}
    />
  );
}

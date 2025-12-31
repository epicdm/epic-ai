import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { AutomateWizard } from "@/components/flywheel/wizards/automate-wizard";
import type { AutomateWizardData } from "@/lib/flywheel/types";

export default async function AutomateSetupPage() {
  const { userId } = await auth();

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

  const initialStep = progress.automateStep >= 0 ? progress.automateStep : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AutomateWizard initialData={initialData} initialStep={initialStep} />
    </div>
  );
}

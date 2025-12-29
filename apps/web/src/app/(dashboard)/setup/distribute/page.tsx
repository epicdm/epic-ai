import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { DistributeWizard } from "@/components/flywheel/wizards/distribute-wizard";

export const metadata = {
  title: "Publishing Engine Setup | Epic AI",
  description: "Connect your social accounts and set up your publishing schedule",
};

export default async function DistributeSetupPage() {
  const { userId } = await auth();

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
  const initialStep = progress?.distributeStep ?? 0;

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

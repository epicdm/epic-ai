/**
 * Guided Setup Page - Streamlined Flywheel Wizard
 *
 * Streamlined 12-step wizard for guided setup mode.
 */

import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma, PhaseStatus } from "@epic-ai/database";
import { StreamlinedFlywheelWizard } from "@/components/flywheel/streamlined-flywheel-wizard";

export const metadata = {
  title: "Guided Setup | Epic AI",
  description: "Streamlined wizard for guided setup",
};

export const dynamic = 'force-dynamic';

export default async function GuidedSetupPage() {
  const { userId } = await getAuth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's organization and brand
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: {
                take: 1,
                orderBy: { createdAt: "desc" },
                include: {
                  brandBrain: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user || user.memberships.length === 0) {
    throw new Error("Organization membership not found - please contact support");
  }

  const organization = user.memberships[0].organization;
  const brand = organization.brands[0];

  // Guided mode requires a brand
  if (!brand) {
    throw new Error("Brand not found - please contact support");
  }

  // Get or create flywheel progress
  let progress = await prisma.flywheelProgress.findUnique({
    where: { userId },
  });

  if (!progress) {
    progress = await prisma.flywheelProgress.create({
      data: {
        userId,
        understandPhase: PhaseStatus.NOT_STARTED,
        createPhase: PhaseStatus.NOT_STARTED,
        distributePhase: PhaseStatus.NOT_STARTED,
        learnPhase: PhaseStatus.NOT_STARTED,
        automatePhase: PhaseStatus.NOT_STARTED,
      },
    });
  }

  // Build initial data for streamlined wizard from existing progress
  const initialData = {
    // From UNDERSTAND phase data
    ...(progress.understandData as Record<string, unknown> || {}),
    // From CREATE phase data
    ...(progress.createData as Record<string, unknown> || {}),
    // From DISTRIBUTE phase data
    ...(progress.distributeData as Record<string, unknown> || {}),
    // From LEARN phase data
    ...(progress.learnData as Record<string, unknown> || {}),
    // From AUTOMATE phase data
    ...(progress.automateData as Record<string, unknown> || {}),
    // Pre-fill from brand if available
    brandName: brand.name || undefined,
    brandDescription: brand.brandBrain?.description || undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <StreamlinedFlywheelWizard
        initialData={initialData}
        brandId={brand.id}
      />
    </div>
  );
}

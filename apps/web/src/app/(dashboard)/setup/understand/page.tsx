/**
 * UNDERSTAND Phase Wizard Page
 * Builds the Brand Brain: voice, tone, audiences, and content pillars
 */

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@epic-ai/database";
import { UnderstandWizard } from "@/components/flywheel/wizards/understand-wizard";
import type { UnderstandWizardData } from "@/lib/flywheel/types";

export const metadata = {
  title: "Understand - Build Your Brand Brain | Epic AI",
  description: "Define your brand voice, audiences, and content strategy",
};

export default async function UnderstandPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's organization and brand
  // Note: User.id IS the Clerk user ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          organization: {
            include: {
              brands: true,
            },
          },
        },
      },
      flywheelProgress: true,
    },
  });

  if (!user) {
    redirect("/onboarding");
  }

  // Get or create flywheel progress
  let progress = user.flywheelProgress;

  if (!progress) {
    progress = await prisma.flywheelProgress.create({
      data: {
        userId: user.id,
      },
    });
  }

  // Get the user's first brand (if any)
  const firstOrg = user.memberships[0]?.organization;
  const brand = firstOrg?.brands[0];

  // Extract initial data from progress or brand brain
  let initialData: UnderstandWizardData = {};
  let initialStep = 0;

  if (progress.understandData) {
    initialData = progress.understandData as UnderstandWizardData;
    initialStep = progress.understandStep >= 0 ? progress.understandStep : 0;
  } else if (brand) {
    // Try to pull existing brand brain data
    const brandBrain = await prisma.brandBrain.findUnique({
      where: { brandId: brand.id },
      include: {
        audiences: true,
        pillars: true,
        brandCompetitors: true,
      },
    });

    if (brandBrain) {
      initialData = {
        brandName: brand.name,
        brandDescription: brandBrain.description ?? undefined,
        mission: brandBrain.mission ?? undefined,
        formality: brandBrain.formalityLevel ?? 3,
        personality: [], // Personality traits not stored in BrandBrain
        writingStyle: brandBrain.writingStyle ?? undefined,
        audiences: brandBrain.audiences.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description ?? "",
          demographics: a.demographics ?? undefined,
          painPoints: a.painPoints ?? [],
          goals: a.goals ?? [],
        })),
        contentPillars: brandBrain.pillars.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description ?? "",
          topics: p.topics ?? [],
        })),
        competitors: brandBrain.brandCompetitors.map((c) => ({
          id: c.id,
          name: c.name,
          website: c.website ?? undefined,
          notes: c.notes ?? undefined,
        })),
      };
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <UnderstandWizard
          initialData={initialData}
          initialStep={initialStep}
          brandId={brand?.id}
        />
      </div>
    </div>
  );
}

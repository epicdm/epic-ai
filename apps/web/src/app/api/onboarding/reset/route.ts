import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for options
    let removeBrand = false;
    try {
      const body = await request.json();
      removeBrand = body.removeBrand === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // If removeBrand is requested, delete all brands for the user's organization
    if (removeBrand) {
      // Get user's organization
      const membership = await prisma.membership.findFirst({
        where: { userId },
        select: { organizationId: true },
      });

      if (membership) {
        // Delete all brands and related data for this organization
        // BrandBrain, BrandAudience, ContentPillar, etc. will cascade delete
        await prisma.brand.deleteMany({
          where: { organizationId: membership.organizationId },
        });
      }
    }

    // Reset the onboarding progress for this user
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasSeenWelcome: false,
        hasChosenGoal: null,
        hasCreatedBrand: false,
        hasCompletedQuickWin: false,
        hasSeenDashboardTour: false,
        hasCreatedVoiceAgent: false,
        hasConnectedSocial: false,
        hasCreatedCampaign: false,
        hasGeneratedContent: false,
        completionPercentage: 0,
        currentStep: null,
        isDemoMode: false,
        onboardingCompletedAt: null,
      },
      update: {
        hasSeenWelcome: false,
        hasChosenGoal: null,
        hasCreatedBrand: false,
        hasCompletedQuickWin: false,
        hasSeenDashboardTour: false,
        hasCreatedVoiceAgent: false,
        hasConnectedSocial: false,
        hasCreatedCampaign: false,
        hasGeneratedContent: false,
        completionPercentage: 0,
        currentStep: null,
        isDemoMode: false,
        onboardingCompletedAt: null,
      },
    });

    // Also reset any active wizard sessions
    await prisma.wizardSession.deleteMany({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: "Onboarding reset successfully. Refresh the page to start onboarding again."
    });
  } catch (error) {
    console.error("Error resetting onboarding:", error);
    return NextResponse.json(
      { error: "Failed to reset onboarding" },
      { status: 500 }
    );
  }
}

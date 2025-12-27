/**
 * Onboarding Progress API - Track and update user onboarding state
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// GET - Retrieve onboarding progress
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.userOnboardingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      // Return default state for new users
      return NextResponse.json({
        isNew: true,
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
        currentStep: "welcome",
        isDemoMode: false,
        onboardingCompleted: false,
      });
    }

    return NextResponse.json({
      isNew: false,
      ...progress,
      onboardingCompleted: progress.onboardingCompletedAt !== null,
    });
  } catch (error) {
    console.error("Error fetching onboarding progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// PATCH - Update onboarding progress
const updateSchema = z.object({
  hasSeenWelcome: z.boolean().optional(),
  hasChosenGoal: z.string().optional(),
  hasCreatedBrand: z.boolean().optional(),
  hasCompletedQuickWin: z.boolean().optional(),
  hasSeenDashboardTour: z.boolean().optional(),
  hasCreatedVoiceAgent: z.boolean().optional(),
  hasConnectedSocial: z.boolean().optional(),
  hasCreatedCampaign: z.boolean().optional(),
  hasGeneratedContent: z.boolean().optional(),
  currentStep: z.string().optional(),
  isDemoMode: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    // Calculate completion percentage based on completed steps
    const calculateCompletionPercentage = (data: typeof validated & {
      hasSeenWelcome?: boolean;
      hasCreatedBrand?: boolean;
      hasCompletedQuickWin?: boolean;
      hasSeenDashboardTour?: boolean;
    }) => {
      const steps = [
        data.hasSeenWelcome,
        data.hasCreatedBrand,
        data.hasCompletedQuickWin,
        data.hasSeenDashboardTour,
      ];
      const completed = steps.filter(Boolean).length;
      return Math.round((completed / steps.length) * 100);
    };

    const progress = await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        ...validated,
        completionPercentage: calculateCompletionPercentage(validated),
        lastActiveAt: new Date(),
      },
      update: {
        ...validated,
        completionPercentage: calculateCompletionPercentage(validated),
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating onboarding progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

// POST - Initialize onboarding for a user
export async function POST() {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create or reset onboarding progress
    const progress = await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasSeenWelcome: true,
        onboardingStartedAt: new Date(),
        lastActiveAt: new Date(),
      },
      update: {
        hasSeenWelcome: true,
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Error initializing onboarding:", error);
    return NextResponse.json({ error: "Failed to initialize onboarding" }, { status: 500 });
  }
}

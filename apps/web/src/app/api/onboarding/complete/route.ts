import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const completeSchema = z.object({
  goal: z.enum(["content", "voice", "campaigns", "explore"]).optional(),
  isDemoMode: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    let goal: string | undefined;
    let isDemoMode = false;

    try {
      const body = await request.json();
      const validated = completeSchema.parse(body);
      goal = validated.goal;
      isDemoMode = validated.isDemoMode || false;
    } catch {
      // Body is optional for backwards compatibility
    }

    // Verify user has at least one organization
    const membership = await prisma.membership.findFirst({
      where: { userId },
      include: {
        organization: {
          include: {
            brands: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Please create an organization first" },
        { status: 400 }
      );
    }

    // Update or create onboarding progress
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasSeenWelcome: true,
        hasChosenGoal: goal,
        hasCreatedBrand: membership.organization.brands.length > 0,
        hasSeenDashboardTour: true,
        isDemoMode,
        completionPercentage: 100,
        onboardingCompletedAt: new Date(),
        lastActiveAt: new Date(),
      },
      update: {
        hasSeenDashboardTour: true,
        completionPercentage: 100,
        onboardingCompletedAt: new Date(),
        lastActiveAt: new Date(),
      },
    });

    // Optional: Create a default subscription record
    const existingSubscription = await prisma.subscription.findFirst({
      where: { organizationId: membership.organizationId },
    });

    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          organizationId: membership.organizationId,
          plan: "starter",
          status: "trialing",
          socialAccountsLimit: 5,
          voiceMinutesLimit: 250,
          brandsLimit: 1,
          usersLimit: 1,
          trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      });
    }

    return NextResponse.json({
      success: true,
      organizationId: membership.organizationId,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

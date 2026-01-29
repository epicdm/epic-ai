import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { path } = body;

    // Update or create onboarding progress with quick wins completion
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      update: {
        quickWinsCompletedAt: new Date(),
        setupPath: path,
      },
      create: {
        userId,
        quickWinsCompletedAt: new Date(),
        setupPath: path,
        currentStep: 5, // Assume main onboarding is complete
        completedSteps: [0, 1, 2, 3, 4],
        onboardingCompletedAt: new Date(), // Mark main onboarding as complete too
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error completing quick wins:", error);
    return NextResponse.json(
      { error: "Failed to complete quick wins" },
      { status: 500 }
    );
  }
}

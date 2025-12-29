import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      return NextResponse.json({
        status: "NOT_STARTED",
        currentStep: -1,
        data: {},
      });
    }

    return NextResponse.json({
      status: progress.distributePhase,
      currentStep: progress.distributeStep,
      data: progress.distributeData || {},
    });
  } catch (error) {
    console.error("Error fetching DISTRIBUTE progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status, currentStep, data } = body;

    const progress = await prisma.flywheelProgress.upsert({
      where: { userId },
      update: {
        distributePhase: status,
        distributeStep: currentStep,
        distributeData: data,
        lastActivePhase: "DISTRIBUTE",
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        distributePhase: status,
        distributeStep: currentStep,
        distributeData: data,
        lastActivePhase: "DISTRIBUTE",
      },
    });

    // Recalculate overall progress
    const phases = [
      progress.understandPhase,
      progress.createPhase,
      progress.distributePhase,
      progress.learnPhase,
      progress.automatePhase,
    ];
    const completedCount = phases.filter((p) => p === "COMPLETED").length;
    const overallProgress = Math.round((completedCount / phases.length) * 100);

    await prisma.flywheelProgress.update({
      where: { userId },
      data: { overallProgress },
    });

    return NextResponse.json({
      success: true,
      status: progress.distributePhase,
      currentStep: progress.distributeStep,
      overallProgress,
    });
  } catch (error) {
    console.error("Error updating DISTRIBUTE progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

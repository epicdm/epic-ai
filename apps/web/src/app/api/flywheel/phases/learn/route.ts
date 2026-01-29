import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
      select: {
        learnPhase: true,
        learnStep: true,
        learnData: true,
        brandId: true,
      },
    });

    if (!progress) {
      return NextResponse.json({
        phase: "learn",
        status: "NOT_STARTED",
        currentStep: -1,
        data: null,
      });
    }

    return NextResponse.json({
      phase: "learn",
      status: progress.learnPhase,
      currentStep: progress.learnStep,
      data: progress.learnData,
      brandId: progress.brandId,
    });
  } catch (error) {
    console.error("Error fetching LEARN phase:", error);
    return NextResponse.json(
      { error: "Failed to fetch phase data" },
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

    // Build update object
    const updateData: Record<string, unknown> = {
      lastActivePhase: "learn",
      lastActiveAt: new Date(),
    };

    if (status !== undefined) {
      updateData.learnPhase = status;
    }

    if (currentStep !== undefined) {
      updateData.learnStep = currentStep;
    }

    if (data !== undefined) {
      // Get existing data and merge
      const existing = await prisma.flywheelProgress.findUnique({
        where: { userId },
        select: { learnData: true },
      });

      const existingData = (existing?.learnData as Record<string, unknown>) || {};
      updateData.learnData = { ...existingData, ...data };
    }

    // Calculate overall progress
    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
      select: {
        understandPhase: true,
        createPhase: true,
        distributePhase: true,
        learnPhase: true,
        automatePhase: true,
      },
    });

    if (progress) {
      const phases = [
        progress.understandPhase,
        progress.createPhase,
        progress.distributePhase,
        status || progress.learnPhase,
        progress.automatePhase,
      ];

      const completedPhases = phases.filter((p) => p === "COMPLETED").length;
      const inProgressPhases = phases.filter((p) => p === "IN_PROGRESS").length;
      updateData.overallProgress = Math.round(
        (completedPhases * 20) + (inProgressPhases * 10)
      );
    }

    const updated = await prisma.flywheelProgress.update({
      where: { userId },
      data: updateData,
    });

    return NextResponse.json({
      phase: "learn",
      status: updated.learnPhase,
      currentStep: updated.learnStep,
      data: updated.learnData,
      overallProgress: updated.overallProgress,
    });
  } catch (error) {
    console.error("Error updating LEARN phase:", error);
    return NextResponse.json(
      { error: "Failed to update phase" },
      { status: 500 }
    );
  }
}

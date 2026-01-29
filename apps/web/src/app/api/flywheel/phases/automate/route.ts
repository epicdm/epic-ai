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
        automatePhase: true,
        automateStep: true,
        automateData: true,
      },
    });

    if (!progress) {
      return NextResponse.json({
        status: "NOT_STARTED",
        step: -1,
        data: null,
      });
    }

    return NextResponse.json({
      status: progress.automatePhase,
      step: progress.automateStep,
      data: progress.automateData,
    });
  } catch (error) {
    console.error("Error fetching automate phase:", error);
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
    const { status, step, data } = body;

    // Calculate overall progress based on all phases
    const currentProgress = await prisma.flywheelProgress.findUnique({
      where: { userId },
      select: {
        understandPhase: true,
        createPhase: true,
        distributePhase: true,
        learnPhase: true,
        automatePhase: true,
      },
    });

    // Each phase is worth 20%
    let overallProgress = 0;
    const phases = currentProgress
      ? [
          currentProgress.understandPhase,
          currentProgress.createPhase,
          currentProgress.distributePhase,
          currentProgress.learnPhase,
          status || currentProgress.automatePhase,
        ]
      : ["NOT_STARTED", "NOT_STARTED", "NOT_STARTED", "NOT_STARTED", status || "NOT_STARTED"];

    phases.forEach((phase) => {
      if (phase === "COMPLETED") overallProgress += 20;
      else if (phase === "IN_PROGRESS") overallProgress += 10;
    });

    const progress = await prisma.flywheelProgress.upsert({
      where: { userId },
      update: {
        automatePhase: status,
        automateStep: step,
        automateData: data,
        overallProgress,
        lastActivePhase: "AUTOMATE",
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        automatePhase: status || "NOT_STARTED",
        automateStep: step ?? -1,
        automateData: data,
        overallProgress,
        lastActivePhase: "AUTOMATE",
      },
    });

    return NextResponse.json({
      status: progress.automatePhase,
      step: progress.automateStep,
      data: progress.automateData,
      overallProgress: progress.overallProgress,
    });
  } catch (error) {
    console.error("Error updating automate phase:", error);
    return NextResponse.json(
      { error: "Failed to update phase data" },
      { status: 500 }
    );
  }
}

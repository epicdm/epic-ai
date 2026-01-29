/**
 * CREATE Phase API
 * Handles saving and loading Content Factory settings
 */

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
        data: null,
      });
    }

    return NextResponse.json({
      status: progress.createPhase,
      currentStep: progress.createStep,
      data: progress.createData,
    });
  } catch (error) {
    console.error("Error fetching CREATE phase:", error);
    return NextResponse.json(
      { error: "Failed to fetch CREATE phase data" },
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
        createPhase: status,
        createStep: currentStep,
        createData: data,
        lastActivePhase: "CREATE",
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        userId,
        createPhase: status || "IN_PROGRESS",
        createStep: currentStep ?? 0,
        createData: data,
        lastActivePhase: "CREATE",
      },
    });

    return NextResponse.json({
      success: true,
      status: progress.createPhase,
      currentStep: progress.createStep,
    });
  } catch (error) {
    console.error("Error updating CREATE phase:", error);
    return NextResponse.json(
      { error: "Failed to update CREATE phase" },
      { status: 500 }
    );
  }
}

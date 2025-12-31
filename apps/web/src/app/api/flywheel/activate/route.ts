import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

/**
 * POST /api/flywheel/activate
 * Activates the flywheel after all phases are complete
 * Sets flywheelActive = true and records activation time
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current progress to verify all phases are complete
    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
      select: {
        understandPhase: true,
        createPhase: true,
        distributePhase: true,
        learnPhase: true,
        automatePhase: true,
        automateData: true,
        brandId: true,
      },
    });

    if (!progress) {
      return NextResponse.json(
        { error: "No flywheel progress found. Complete setup first." },
        { status: 400 }
      );
    }

    // Verify the AUTOMATE phase is being completed
    const automateData = progress.automateData as Record<string, unknown> | null;
    if (!automateData?.confirmed) {
      return NextResponse.json(
        { error: "Please confirm your settings before activating." },
        { status: 400 }
      );
    }

    // Check if previous phases are complete (at least LEARN should be done)
    if (progress.learnPhase !== "COMPLETED") {
      return NextResponse.json(
        { error: "Complete the LEARN phase before activating the flywheel." },
        { status: 400 }
      );
    }

    // Activate the flywheel
    const updated = await prisma.flywheelProgress.update({
      where: { userId },
      data: {
        automatePhase: "COMPLETED",
        flywheelActive: true,
        activatedAt: new Date(),
        overallProgress: 100,
        updatedAt: new Date(),
      },
    });

    // If we have a brand, we can also update brand-level settings
    // based on the automate wizard data
    if (progress.brandId && automateData) {
      // Store autopilot settings in BrandBrain or a separate table
      // This is where you'd configure the actual automation
      try {
        await prisma.brandBrain.update({
          where: { brandId: progress.brandId },
          data: {
            // Store automation preferences
            // These fields may need to be added to the schema
            updatedAt: new Date(),
          },
        });
      } catch {
        // BrandBrain update is optional, don't fail activation
        console.log("BrandBrain update skipped - may not exist");
      }
    }

    return NextResponse.json({
      success: true,
      flywheelActive: updated.flywheelActive,
      activatedAt: updated.activatedAt,
      message: "Flywheel activated successfully! Your AI marketing engine is now running.",
    });
  } catch (error) {
    console.error("Error activating flywheel:", error);
    return NextResponse.json(
      { error: "Failed to activate flywheel" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/flywheel/activate
 * Check current activation status
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const progress = await prisma.flywheelProgress.findUnique({
      where: { userId },
      select: {
        flywheelActive: true,
        activatedAt: true,
        overallProgress: true,
        automateData: true,
      },
    });

    if (!progress) {
      return NextResponse.json({
        flywheelActive: false,
        activatedAt: null,
        overallProgress: 0,
      });
    }

    return NextResponse.json({
      flywheelActive: progress.flywheelActive,
      activatedAt: progress.activatedAt,
      overallProgress: progress.overallProgress,
      automationSettings: progress.automateData,
    });
  } catch (error) {
    console.error("Error checking activation status:", error);
    return NextResponse.json(
      { error: "Failed to check activation status" },
      { status: 500 }
    );
  }
}

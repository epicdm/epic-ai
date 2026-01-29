/**
 * Exit Demo Mode API - Exit demo mode and optionally clear demo data
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const exitDemoSchema = z.object({
  clearData: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { clearData } = exitDemoSchema.parse(body);

    // Update onboarding progress to exit demo mode
    await prisma.userOnboardingProgress.update({
      where: { userId },
      data: {
        isDemoMode: false,
        lastActiveAt: new Date(),
      },
    });

    // Optionally clear demo data
    if (clearData) {
      await prisma.demoModeData.deleteMany({
        where: { userId },
      });
    }

    return NextResponse.json({
      success: true,
      isDemo: false,
      message: "Successfully exited demo mode",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error exiting demo mode:", error);
    return NextResponse.json({ error: "Failed to exit demo mode" }, { status: 500 });
  }
}

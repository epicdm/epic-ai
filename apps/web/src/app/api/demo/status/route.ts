/**
 * Demo Mode Status API - Check if user is in demo mode
 */

import { NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ isDemo: false });
    }

    // Check onboarding progress for demo mode flag
    const progress = await prisma.userOnboardingProgress.findUnique({
      where: { userId },
      select: { isDemoMode: true },
    });

    if (!progress?.isDemoMode) {
      return NextResponse.json({ isDemo: false });
    }

    // Fetch demo data if in demo mode
    const demoData = await prisma.demoModeData.findUnique({
      where: { userId },
    });

    return NextResponse.json({
      isDemo: true,
      brandName: demoData?.demoVoiceAgent
        ? (demoData.demoVoiceAgent as Record<string, unknown>).brandName || "Demo Company"
        : "Demo Company",
      demoData: demoData ? {
        voiceAgent: demoData.demoVoiceAgent,
        campaign: demoData.demoCampaign,
        leads: demoData.demoLeads,
        callLogs: demoData.demoCallLogs,
        content: demoData.demoContent,
      } : null,
    });
  } catch (error) {
    console.error("Error checking demo status:", error);
    return NextResponse.json({ isDemo: false });
  }
}

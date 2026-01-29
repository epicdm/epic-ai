/**
 * Enter Demo Mode API - Initialize demo mode for user
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { generateFullDemoData } from "@/lib/demo/sample-data";
import { z } from "zod";

const enterDemoSchema = z.object({
  brandName: z.string().optional().default("Demo Company"),
  goal: z.enum(["content", "voice", "campaigns", "explore"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { brandName, goal } = enterDemoSchema.parse(body);

    // Generate demo data
    const demoData = generateFullDemoData(brandName);

    // Update onboarding progress to demo mode
    await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        isDemoMode: true,
        hasSeenWelcome: true,
        hasChosenGoal: goal || "explore",
        currentStep: "quick-win",
        lastActiveAt: new Date(),
      },
      update: {
        isDemoMode: true,
        hasChosenGoal: goal || "explore",
        lastActiveAt: new Date(),
      },
    });

    // Store demo data
    await prisma.demoModeData.upsert({
      where: { userId },
      create: {
        userId,
        demoVoiceAgent: { ...demoData.voiceAgent, brandName },
        demoCampaign: demoData.campaign,
        demoLeads: demoData.leads,
        demoCallLogs: demoData.callLogs,
        demoContent: demoData.content,
      },
      update: {
        demoVoiceAgent: { ...demoData.voiceAgent, brandName },
        demoCampaign: demoData.campaign,
        demoLeads: demoData.leads,
        demoCallLogs: demoData.callLogs,
        demoContent: demoData.content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      isDemo: true,
      brandName,
      demoData: {
        voiceAgent: demoData.voiceAgent,
        campaign: demoData.campaign,
        leads: demoData.leads,
        callLogs: demoData.callLogs,
        content: demoData.content,
        stats: demoData.stats,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error entering demo mode:", error);
    return NextResponse.json({ error: "Failed to enter demo mode" }, { status: 500 });
  }
}

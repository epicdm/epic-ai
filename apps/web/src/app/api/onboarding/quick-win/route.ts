/**
 * Quick Win API - Handles first-time user actions during onboarding
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

const quickWinSchema = z.object({
  goal: z.enum(["content", "voice", "campaigns", "explore"]),
  brandId: z.string().optional(),
  isDemoMode: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = quickWinSchema.parse(body);

    // Update onboarding progress
    const progress = await prisma.userOnboardingProgress.upsert({
      where: { userId },
      create: {
        userId,
        hasSeenWelcome: true,
        hasChosenGoal: validated.goal,
        hasCompletedQuickWin: true,
        isDemoMode: validated.isDemoMode,
        completionPercentage: 60,
        lastActiveAt: new Date(),
      },
      update: {
        hasCompletedQuickWin: true,
        completionPercentage: 60,
        lastActiveAt: new Date(),
      },
    });

    // If in demo mode, create demo data
    if (validated.isDemoMode) {
      await prisma.demoModeData.upsert({
        where: { userId },
        create: {
          userId,
          demoVoiceAgent: validated.goal === "voice" ? getDemoVoiceAgent() : null,
          demoCampaign: validated.goal === "campaigns" ? getDemoCampaign() : null,
          demoContent: validated.goal === "content" ? getDemoContent() : null,
          demoLeads: getDemoLeads(),
          demoCallLogs: getDemoCallLogs(),
        },
        update: {
          demoVoiceAgent: validated.goal === "voice" ? getDemoVoiceAgent() : undefined,
          demoCampaign: validated.goal === "campaigns" ? getDemoCampaign() : undefined,
          demoContent: validated.goal === "content" ? getDemoContent() : undefined,
        },
      });
    }

    // Track the quick win action based on goal
    let quickWinResult = {};

    switch (validated.goal) {
      case "content":
        quickWinResult = {
          action: "content_generated",
          message: "Generated your first AI content",
          nextStep: "/dashboard/content",
        };
        await prisma.userOnboardingProgress.update({
          where: { userId },
          data: { hasGeneratedContent: true },
        });
        break;

      case "voice":
        quickWinResult = {
          action: "voice_agent_preview",
          message: "Previewed a voice agent",
          nextStep: "/dashboard/voice/agents",
        };
        break;

      case "campaigns":
        quickWinResult = {
          action: "campaign_preview",
          message: "Previewed a campaign setup",
          nextStep: "/dashboard/voice/campaigns",
        };
        break;

      case "explore":
        quickWinResult = {
          action: "dashboard_tour",
          message: "Completed dashboard exploration",
          nextStep: "/dashboard",
        };
        break;
    }

    return NextResponse.json({
      success: true,
      progress,
      ...quickWinResult,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error processing quick win:", error);
    return NextResponse.json({ error: "Failed to process quick win" }, { status: 500 });
  }
}

// Demo data generators
function getDemoVoiceAgent() {
  return {
    id: "demo-agent-1",
    name: "Sarah - Sales Assistant",
    type: "OUTBOUND",
    status: "ACTIVE",
    voiceModel: "eleven_labs_rachel",
    greeting: "Hi! This is Sarah from Acme Inc. How can I help you today?",
    stats: {
      totalCalls: 47,
      avgDuration: 185,
      successRate: 78,
    },
  };
}

function getDemoCampaign() {
  return {
    id: "demo-campaign-1",
    name: "Q4 Lead Qualification",
    status: "ACTIVE",
    totalLeads: 150,
    contacted: 89,
    qualified: 34,
    scheduled: 12,
    startDate: new Date().toISOString(),
  };
}

function getDemoContent() {
  return {
    id: "demo-content-1",
    content: "🚀 Excited to announce our latest AI-powered marketing tools! Transform your outreach with intelligent automation. #AI #Marketing #Innovation",
    platform: "LINKEDIN",
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };
}

function getDemoLeads() {
  return [
    { id: "demo-lead-1", name: "John Smith", company: "TechCorp", email: "john@techcorp.com", status: "NEW" },
    { id: "demo-lead-2", name: "Sarah Johnson", company: "StartupXYZ", email: "sarah@startupxyz.com", status: "CONTACTED" },
    { id: "demo-lead-3", name: "Mike Chen", company: "Enterprise Inc", email: "mike@enterprise.com", status: "QUALIFIED" },
  ];
}

function getDemoCallLogs() {
  return [
    {
      id: "demo-call-1",
      leadName: "John Smith",
      duration: 180,
      outcome: "INTERESTED",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "demo-call-2",
      leadName: "Sarah Johnson",
      duration: 240,
      outcome: "SCHEDULED",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

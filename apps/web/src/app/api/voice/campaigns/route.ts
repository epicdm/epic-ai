/**
 * Voice Campaigns API
 * GET - List all voice campaigns for organization
 * POST - Create a new voice campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, CampaignVoiceStatus } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for creating campaign
const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  agentId: z.string(),

  // Schedule
  timezone: z.string().default("America/New_York"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  callWindowStart: z.string().optional(), // "09:00"
  callWindowEnd: z.string().optional(), // "17:00"
  callDays: z.array(z.number().min(1).max(7)).default([1, 2, 3, 4, 5]),

  // Dialing Settings
  maxConcurrentCalls: z.number().min(1).max(50).default(1),
  callsPerHour: z.number().min(1).max(120).default(30),
  retryAttempts: z.number().min(0).max(5).default(2),
  retryDelayMinutes: z.number().min(5).max(1440).default(60),
});

/**
 * GET /api/voice/campaigns - List voice campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as CampaignVoiceStatus | null;
    const agentId = searchParams.get("agentId");

    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const campaigns = await prisma.voiceCampaign.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        _count: { select: { leads: true, callLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/campaigns - Create a new voice campaign
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    // Verify agent belongs to org
    const agent = await prisma.voiceAgent.findFirst({
      where: { id: validated.agentId, organizationId: org.id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const campaign = await prisma.voiceCampaign.create({
      data: {
        organizationId: org.id,
        name: validated.name,
        description: validated.description,
        agentId: validated.agentId,
        status: "DRAFT",
        timezone: validated.timezone,
        startDate: validated.startDate ? new Date(validated.startDate) : null,
        endDate: validated.endDate ? new Date(validated.endDate) : null,
        callWindowStart: validated.callWindowStart,
        callWindowEnd: validated.callWindowEnd,
        callDays: validated.callDays,
        maxConcurrentCalls: validated.maxConcurrentCalls,
        callsPerHour: validated.callsPerHour,
        retryAttempts: validated.retryAttempts,
        retryDelayMinutes: validated.retryDelayMinutes,
      },
      include: {
        agent: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}

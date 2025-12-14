/**
 * Voice Calls API
 * GET - List all call logs for organization
 * POST - Create a new call record (typically from webhook)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, CallDirection, CallStatus, CallOutcome } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for creating call log
const createCallSchema = z.object({
  agentId: z.string().optional(),
  phoneMappingId: z.string().optional(),
  campaignId: z.string().optional(),
  livekitRoomName: z.string().optional(),
  livekitRoomSid: z.string().optional(),
  sipCallId: z.string().optional(),
  direction: z.nativeEnum(CallDirection),
  phoneNumber: z.string().optional(),
  callerNumber: z.string().optional(),
  status: z.nativeEnum(CallStatus).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// GET all calls
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");
    const agentId = searchParams.get("agentId");
    const direction = searchParams.get("direction") as CallDirection | null;
    const status = searchParams.get("status") as CallStatus | null;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (agentId) where.agentId = agentId;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.startedAt = {};
      if (dateFrom) (where.startedAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.startedAt as Record<string, unknown>).lte = new Date(dateTo);
    }

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true } },
          phoneMapping: { select: { id: true, phoneNumber: true } },
          campaign: { select: { id: true, name: true } },
          transcript: { select: { id: true, summary: true, sentiment: true } },
        },
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.callLog.count({ where }),
    ]);

    return NextResponse.json({ calls, total, limit, offset });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch calls" },
      { status: 500 }
    );
  }
}

// POST create a new call record
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const validated = createCallSchema.parse(body);

    // Verify agent belongs to org if provided
    if (validated.agentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: validated.agentId, organizationId: org.id },
      });
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const call = await prisma.callLog.create({
      data: {
        organizationId: org.id,
        ...validated,
      },
      include: {
        agent: { select: { id: true, name: true } },
        phoneMapping: { select: { id: true, phoneNumber: true } },
      },
    });

    return NextResponse.json({ call }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}

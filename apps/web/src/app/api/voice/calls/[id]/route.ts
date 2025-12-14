/**
 * Call Log Detail API
 * GET - Get single call with transcript
 * PATCH - Update call status/outcome
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, CallStatus, CallOutcome } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Schema for updating call
const updateCallSchema = z.object({
  status: z.nativeEnum(CallStatus).optional(),
  outcome: z.nativeEnum(CallOutcome).optional(),
  endedAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  recordingUrl: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * GET /api/voice/calls/[id] - Get call details with transcript
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    const call = await prisma.callLog.findFirst({
      where: { id, organizationId: org.id },
      include: {
        agent: { select: { id: true, name: true, agentType: true } },
        phoneMapping: { select: { id: true, phoneNumber: true } },
        campaign: { select: { id: true, name: true } },
        transcript: {
          include: {
            segments: {
              orderBy: { sequenceNumber: "asc" },
            },
          },
        },
        events: {
          orderBy: { timestamp: "asc" },
          take: 100,
        },
      },
    });

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    return NextResponse.json({ call });
  } catch (error) {
    console.error("Error fetching call:", error);
    return NextResponse.json(
      { error: "Failed to fetch call" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/calls/[id] - Update call log
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateCallSchema.parse(body);

    // Verify ownership
    const existing = await prisma.callLog.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { ...validated };
    if (validated.endedAt) {
      updateData.endedAt = new Date(validated.endedAt);
    }

    const call = await prisma.callLog.update({
      where: { id },
      data: updateData,
      include: {
        agent: { select: { id: true, name: true } },
        phoneMapping: { select: { id: true, phoneNumber: true } },
      },
    });

    return NextResponse.json({ call });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}

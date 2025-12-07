import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { emitCallCompleted, emitCallFailed } from "@/lib/events/emit-lead-events";

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
    const agentId = searchParams.get("agentId");
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const where: {
      brand: { organizationId: string };
      agentId?: string;
      status?: string;
    } = {
      brand: {
        organizationId: org.id,
      },
    };

    if (agentId) where.agentId = agentId;
    if (status) where.status = status;

    const [calls, total] = await Promise.all([
      prisma.call.findMany({
        where,
        include: {
          agent: {
            select: { id: true, name: true },
          },
          brand: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.call.count({ where }),
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
    const {
      agentId,
      brandId,
      leadId,
      phoneNumber,
      direction = "INBOUND",
      status = "IN_PROGRESS",
    } = body;

    if (!agentId || !brandId) {
      return NextResponse.json(
        { error: "Agent ID and Brand ID are required" },
        { status: 400 }
      );
    }

    // Verify agent and brand belong to this org
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        brand: { organizationId: org.id },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const call = await prisma.call.create({
      data: {
        agentId,
        brandId,
        leadId,
        phoneNumber,
        direction,
        status,
      },
      include: {
        agent: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, organizationId: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json(call, { status: 201 });
  } catch (error) {
    console.error("Error creating call:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}

// PATCH update call status (complete or fail)
export async function PATCH(request: NextRequest) {
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
    const { callId, status, duration, summary, transcript, sentiment, error: callError } = body;

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 });
    }

    // Verify call belongs to this org
    const existingCall = await prisma.call.findFirst({
      where: {
        id: callId,
        brand: { organizationId: org.id },
      },
      include: {
        brand: { select: { organizationId: true } },
        lead: { select: { id: true } },
      },
    });

    if (!existingCall) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (duration !== undefined) updateData.duration = duration;
    if (summary) updateData.summary = summary;
    if (transcript) updateData.transcript = transcript;
    if (sentiment) updateData.sentiment = sentiment;

    // Set endedAt if completing or failing
    if (status === "COMPLETED" || status === "FAILED") {
      updateData.endedAt = new Date();
    }

    const call = await prisma.call.update({
      where: { id: callId },
      data: updateData,
      include: {
        agent: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true, organizationId: true } },
        lead: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Emit events for automations
    if (status === "COMPLETED") {
      emitCallCompleted(call, call.lead).catch(console.error);
    } else if (status === "FAILED") {
      emitCallFailed(call, call.lead).catch(console.error);
    }

    return NextResponse.json(call);
  } catch (error) {
    console.error("Error updating call:", error);
    return NextResponse.json(
      { error: "Failed to update call" },
      { status: 500 }
    );
  }
}

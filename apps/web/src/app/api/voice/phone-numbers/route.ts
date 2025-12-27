/**
 * Voice Phone Numbers API (PhoneMapping)
 * GET - List all phone numbers/DIDs for organization
 * POST - Purchase a new phone number via Magnus Billing
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Voice service URL for Magnus Billing integration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

// Schema for purchasing a phone number
const purchaseNumberSchema = z.object({
  phoneNumber: z.string(),
  countryCode: z.string().optional(),
  areaCode: z.string().optional(),
  agentId: z.string().optional(),
  sipConfigId: z.string().optional(),
});

// Schema for assigning phone number to agent
const assignNumberSchema = z.object({
  phoneNumberId: z.string(),
  agentId: z.string().nullable(),
  routingType: z.enum(["agent", "ivr", "forward"]).optional(),
  forwardTo: z.string().optional(),
});

/**
 * GET /api/voice/phone-numbers - List phone numbers for the organization
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
    const isActive = searchParams.get("isActive");
    const agentId = searchParams.get("agentId");

    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (isActive !== null) {
      where.isActive = isActive === "true";
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const phoneNumbers = await prisma.phoneMapping.findMany({
      where,
      include: {
        agent: { select: { id: true, name: true } },
        sipConfig: { select: { id: true, name: true, provider: true } },
        _count: { select: { callLogs: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check if Magnus is configured
    const sipConfig = await prisma.sIPConfig.findFirst({
      where: { organizationId: org.id, provider: "magnus" },
    });

    return NextResponse.json({
      phoneNumbers,
      magnusConfigured: !!sipConfig,
    });
  } catch (error) {
    console.error("Error fetching phone numbers:", error);
    return NextResponse.json(
      { error: "Failed to fetch phone numbers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/phone-numbers - Purchase a new phone number via Magnus
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
    const validated = purchaseNumberSchema.parse(body);

    // Check if number already exists
    const existing = await prisma.phoneMapping.findUnique({
      where: { phoneNumber: validated.phoneNumber },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Phone number already in use" },
        { status: 400 }
      );
    }

    // Call voice service to purchase via Magnus
    let magnusDidId = null;
    let magnusStatus = "pending";

    try {
      const magnusResponse = await fetch(`${VOICE_SERVICE_URL}/api/magnus/dids/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          did_number: validated.phoneNumber,
          organization_id: org.id,
        }),
      });

      if (magnusResponse.ok) {
        const magnusData = await magnusResponse.json();
        magnusDidId = magnusData.did_id;
        magnusStatus = "active";
      }
    } catch (error) {
      console.warn("Magnus purchase failed, creating local mapping only:", error);
    }

    // Verify agent if provided
    if (validated.agentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: validated.agentId, organizationId: org.id },
      });
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    // Create phone mapping
    const phoneMapping = await prisma.phoneMapping.create({
      data: {
        organizationId: org.id,
        phoneNumber: validated.phoneNumber,
        countryCode: validated.countryCode,
        areaCode: validated.areaCode,
        agentId: validated.agentId,
        sipConfigId: validated.sipConfigId,
        magnusDidId,
        magnusStatus,
        isActive: true,
        isVerified: magnusStatus === "active",
      },
      include: {
        agent: { select: { id: true, name: true } },
        sipConfig: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ phoneNumber: phoneMapping }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error purchasing phone number:", error);
    return NextResponse.json(
      { error: "Failed to purchase phone number" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/phone-numbers - Assign phone number to agent
 */
export async function PATCH(request: NextRequest) {
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
    const validated = assignNumberSchema.parse(body);

    // Verify phone mapping belongs to org
    const existing = await prisma.phoneMapping.findFirst({
      where: {
        id: validated.phoneNumberId,
        organizationId: org.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // Verify agent if provided
    if (validated.agentId) {
      const agent = await prisma.voiceAgent.findFirst({
        where: { id: validated.agentId, organizationId: org.id },
      });
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const phoneMapping = await prisma.phoneMapping.update({
      where: { id: validated.phoneNumberId },
      data: {
        agentId: validated.agentId,
        routingType: validated.routingType,
        forwardTo: validated.forwardTo,
      },
      include: {
        agent: { select: { id: true, name: true } },
        sipConfig: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ phoneNumber: phoneMapping });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error assigning phone number:", error);
    return NextResponse.json(
      { error: "Failed to assign phone number" },
      { status: 500 }
    );
  }
}

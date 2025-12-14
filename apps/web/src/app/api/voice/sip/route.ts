/**
 * SIP Configuration API
 * GET - List all SIP configs for organization
 * POST - Create a new SIP configuration (Magnus Billing integration)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { z } from "zod";

// Voice service URL for SIP operations
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

// Schema for creating SIP config
const createSIPConfigSchema = z.object({
  name: z.string().min(1),
  provider: z.string().default("magnus"),
  sipUrl: z.string().url(),
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),
  sipTransport: z.enum(["tcp", "udp", "tls"]).default("tcp"),
  inboundEnabled: z.boolean().default(true),
  outboundEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  magnusTrunkId: z.string().optional(),
  magnusAccountId: z.string().optional(),
});

// Schema for updating SIP config
const updateSIPConfigSchema = z.object({
  name: z.string().optional(),
  sipUrl: z.string().url().optional(),
  sipUsername: z.string().optional(),
  sipPassword: z.string().optional(),
  sipTransport: z.enum(["tcp", "udp", "tls"]).optional(),
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  status: z.enum(["pending", "active", "error"]).optional(),
});

/**
 * GET /api/voice/sip - List SIP configurations
 */
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
    const provider = searchParams.get("provider");

    const where: Record<string, unknown> = {
      organizationId: org.id,
    };

    if (provider) {
      where.provider = provider;
    }

    const sipConfigs = await prisma.sIPConfig.findMany({
      where,
      include: {
        phoneMappings: {
          select: { id: true, phoneNumber: true, isActive: true },
        },
        _count: { select: { phoneMappings: true } },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    // Mask passwords in response
    const maskedConfigs = sipConfigs.map((config) => ({
      ...config,
      sipPassword: config.sipPassword ? "********" : null,
    }));

    return NextResponse.json({ sipConfigs: maskedConfigs });
  } catch (error) {
    console.error("Error fetching SIP configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch SIP configurations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/voice/sip - Create a new SIP configuration
 */
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
    const validated = createSIPConfigSchema.parse(body);

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.sIPConfig.updateMany({
        where: { organizationId: org.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create SIP config
    const sipConfig = await prisma.sIPConfig.create({
      data: {
        organizationId: org.id,
        ...validated,
        status: "pending",
      },
    });

    // Try to verify connection with voice service
    try {
      const verifyResponse = await fetch(`${VOICE_SERVICE_URL}/api/telephony/verify-sip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sip_url: validated.sipUrl,
          username: validated.sipUsername,
          password: validated.sipPassword,
          organization_id: org.id,
        }),
      });

      if (verifyResponse.ok) {
        await prisma.sIPConfig.update({
          where: { id: sipConfig.id },
          data: { status: "active", lastChecked: new Date() },
        });
      }
    } catch {
      console.warn("SIP verification skipped - voice service unavailable");
    }

    // Refetch with updated status
    const updatedConfig = await prisma.sIPConfig.findUnique({
      where: { id: sipConfig.id },
    });

    return NextResponse.json(
      {
        sipConfig: {
          ...updatedConfig,
          sipPassword: updatedConfig?.sipPassword ? "********" : null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error creating SIP config:", error);
    return NextResponse.json(
      { error: "Failed to create SIP configuration" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/voice/sip - Update SIP configuration
 */
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
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "SIP config ID required" }, { status: 400 });
    }

    const validated = updateSIPConfigSchema.parse(updates);

    // Verify ownership
    const existing = await prisma.sIPConfig.findFirst({
      where: { id, organizationId: org.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "SIP config not found" }, { status: 404 });
    }

    // If setting as default, unset other defaults
    if (validated.isDefault) {
      await prisma.sIPConfig.updateMany({
        where: { organizationId: org.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const sipConfig = await prisma.sIPConfig.update({
      where: { id },
      data: validated,
    });

    return NextResponse.json({
      sipConfig: {
        ...sipConfig,
        sipPassword: sipConfig.sipPassword ? "********" : null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("Error updating SIP config:", error);
    return NextResponse.json(
      { error: "Failed to update SIP configuration" },
      { status: 500 }
    );
  }
}

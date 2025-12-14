/**
 * SIP Configuration Detail API
 * GET - Get single SIP config
 * DELETE - Delete SIP config
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

/**
 * GET /api/voice/sip/[id] - Get single SIP configuration
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

    const sipConfig = await prisma.sIPConfig.findFirst({
      where: { id, organizationId: org.id },
      include: {
        phoneMappings: {
          select: { id: true, phoneNumber: true, isActive: true },
        },
      },
    });

    if (!sipConfig) {
      return NextResponse.json({ error: "SIP config not found" }, { status: 404 });
    }

    return NextResponse.json({
      sipConfig: {
        ...sipConfig,
        sipPassword: sipConfig.sipPassword ? "********" : null,
      },
    });
  } catch (error) {
    console.error("Error fetching SIP config:", error);
    return NextResponse.json(
      { error: "Failed to fetch SIP configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/sip/[id] - Delete SIP configuration
 */
export async function DELETE(
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

    // Verify ownership
    const existing = await prisma.sIPConfig.findFirst({
      where: { id, organizationId: org.id },
      include: { _count: { select: { phoneMappings: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "SIP config not found" }, { status: 404 });
    }

    // Check if any phone numbers are using this config
    if (existing._count.phoneMappings > 0) {
      return NextResponse.json(
        { error: "Cannot delete SIP config with assigned phone numbers" },
        { status: 400 }
      );
    }

    await prisma.sIPConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting SIP config:", error);
    return NextResponse.json(
      { error: "Failed to delete SIP configuration" },
      { status: 500 }
    );
  }
}

/**
 * Individual Phone Number API
 * GET - Get a specific phone number
 * DELETE - Release/delete a phone number
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// Voice service URL for Magnus Billing integration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

/**
 * GET /api/voice/phone-numbers/[id] - Get a specific phone number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    const phoneNumber = await prisma.phoneMapping.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        agent: { select: { id: true, name: true } },
        sipConfig: { select: { id: true, name: true, provider: true } },
        _count: { select: { callLogs: true } },
      },
    });

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    return NextResponse.json({ phoneNumber });
  } catch (error) {
    console.error("Error fetching phone number:", error);
    return NextResponse.json(
      { error: "Failed to fetch phone number" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/voice/phone-numbers/[id] - Release a phone number
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Find the phone mapping
    const phoneMapping = await prisma.phoneMapping.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!phoneMapping) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    // If it has a Magnus DID ID, try to release it from Magnus
    if (phoneMapping.magnusDidId) {
      try {
        const magnusResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/magnus/dids/${encodeURIComponent(phoneMapping.phoneNumber)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!magnusResponse.ok) {
          console.warn("Failed to release DID from Magnus:", await magnusResponse.text());
          // Continue with local deletion even if Magnus fails
        }
      } catch (error) {
        console.warn("Error releasing DID from Magnus:", error);
        // Continue with local deletion even if Magnus fails
      }
    }

    // Delete the phone mapping
    await prisma.phoneMapping.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting phone number:", error);
    return NextResponse.json(
      { error: "Failed to delete phone number" },
      { status: 500 }
    );
  }
}

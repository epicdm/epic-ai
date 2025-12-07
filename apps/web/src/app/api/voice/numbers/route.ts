import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import {
  isMagnusConfigured,
  provisionDIDForUser,
} from "@/lib/voice/magnus-billing";

/**
 * GET /api/voice/numbers - List phone numbers for the organization
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get phone numbers from our database that are linked to this org
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: {
        brand: { organizationId: org.id },
      },
      include: {
        brand: { select: { name: true } },
        agent: { select: { id: true, name: true } },
      },
      orderBy: { acquiredAt: "desc" },
    });

    return NextResponse.json({
      phoneNumbers,
      magnusConfigured: isMagnusConfigured(),
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
 * POST /api/voice/numbers - Provision a new phone number
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

    if (!isMagnusConfigured()) {
      return NextResponse.json(
        { error: "Magnus Billing is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { brandId, agentId, magnusUserId, magnusUsername } = body;

    if (!brandId) {
      return NextResponse.json(
        { error: "Brand ID is required" },
        { status: 400 }
      );
    }

    // Verify brand belongs to this org
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organizationId: org.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // If Magnus user credentials provided, provision DID
    if (magnusUserId && magnusUsername) {
      const result = await provisionDIDForUser(magnusUserId, magnusUsername);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to provision DID" },
          { status: 500 }
        );
      }

      // Save to our database using existing schema fields
      // providerId stores Magnus DID ID, capabilities stores SIP ID as JSON
      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          number: result.did!,
          brandId,
          agentId: agentId || null,
          provider: "magnus",
          providerId: result.didId, // Store Magnus DID ID
          capabilities: {
            voice: true,
            sms: false,
            sip: true,
            magnusSipId: result.sipId, // Store SIP ID in capabilities JSON
          },
          isActive: true,
        },
      });

      return NextResponse.json({
        success: true,
        phoneNumber,
        magnusResult: result,
      });
    }

    // Otherwise, just create a placeholder for manual setup
    return NextResponse.json(
      { error: "Magnus user credentials required for DID provisioning" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error provisioning phone number:", error);
    return NextResponse.json(
      { error: "Failed to provision phone number" },
      { status: 500 }
    );
  }
}

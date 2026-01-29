/**
 * Individual Phone Number API
 * GET - Get a specific phone number
 * DELETE - Release/delete a phone number
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { prisma } from "@epic-ai/database";

// Voice service URL - auto-detects production (Vercel) vs development
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL ||
  (process.env.VERCEL ? "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice" : "http://localhost:5000");

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

    const org = await getCurrentOrganization();
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
 *
 * This endpoint performs a full cleanup of all associated resources:
 * 1. LiveKit dispatch rule (for inbound call routing)
 * 2. LiveKit inbound trunk (for receiving calls)
 * 3. LiveKit outbound trunk (for making calls)
 * 4. Magnus resources (DID destination + DID itself via comprehensive deprovision)
 * 5. Database record
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

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Find the phone mapping with all resource IDs
    const phoneMapping = await prisma.phoneMapping.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
    });

    if (!phoneMapping) {
      return NextResponse.json({ error: "Phone number not found" }, { status: 404 });
    }

    const cleanupErrors: string[] = [];

    // 1. Delete LiveKit dispatch rule first (depends on trunk)
    if (phoneMapping.livekitDispatchRuleId) {
      try {
        const dispatchResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules/${encodeURIComponent(phoneMapping.livekitDispatchRuleId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!dispatchResponse.ok) {
          const errorText = await dispatchResponse.text();
          console.warn("Failed to delete LiveKit dispatch rule:", errorText);
          cleanupErrors.push(`dispatch_rule: ${errorText}`);
        } else {
          console.log(`Deleted LiveKit dispatch rule: ${phoneMapping.livekitDispatchRuleId}`);
        }
      } catch (error) {
        console.warn("Error deleting LiveKit dispatch rule:", error);
        cleanupErrors.push(`dispatch_rule: ${error}`);
      }
    }

    // 2. Delete LiveKit inbound trunk
    if (phoneMapping.livekitTrunkId) {
      try {
        const inboundResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/telephony/trunks/${encodeURIComponent(phoneMapping.livekitTrunkId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!inboundResponse.ok) {
          const errorText = await inboundResponse.text();
          console.warn("Failed to delete LiveKit inbound trunk:", errorText);
          cleanupErrors.push(`inbound_trunk: ${errorText}`);
        } else {
          console.log(`Deleted LiveKit inbound trunk: ${phoneMapping.livekitTrunkId}`);
        }
      } catch (error) {
        console.warn("Error deleting LiveKit inbound trunk:", error);
        cleanupErrors.push(`inbound_trunk: ${error}`);
      }
    }

    // 3. Delete LiveKit outbound trunk
    if (phoneMapping.livekitOutboundTrunkId) {
      try {
        const outboundResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/telephony/trunks/${encodeURIComponent(phoneMapping.livekitOutboundTrunkId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!outboundResponse.ok) {
          const errorText = await outboundResponse.text();
          console.warn("Failed to delete LiveKit outbound trunk:", errorText);
          cleanupErrors.push(`outbound_trunk: ${errorText}`);
        } else {
          console.log(`Deleted LiveKit outbound trunk: ${phoneMapping.livekitOutboundTrunkId}`);
        }
      } catch (error) {
        console.warn("Error deleting LiveKit outbound trunk:", error);
        cleanupErrors.push(`outbound_trunk: ${error}`);
      }
    }

    // 4. Release Magnus DID (using comprehensive deprovision method)
    // This deletes the DID destination AND the DID itself
    if (phoneMapping.magnusDidId) {
      try {
        const magnusResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/magnus/deprovision-sip-did`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              magnus_did_id: phoneMapping.magnusDidId,
              // magnus_sip_id would go here if we stored it
            }),
          }
        );

        if (!magnusResponse.ok) {
          const errorText = await magnusResponse.text();
          console.warn("Failed to deprovision Magnus DID:", errorText);
          cleanupErrors.push(`magnus_did: ${errorText}`);
        } else {
          const result = await magnusResponse.json();
          if (result.success) {
            console.log(`Deprovisioned Magnus DID: ${phoneMapping.magnusDidId}`);
          } else {
            console.warn(`Magnus DID deprovision may have partially failed: ${phoneMapping.magnusDidId}`);
            cleanupErrors.push(`magnus_did: partial failure`);
          }
        }
      } catch (error) {
        console.warn("Error deprovisioning Magnus DID:", error);
        cleanupErrors.push(`magnus_did: ${error}`);
      }
    }

    // 5. Delete the phone mapping from database
    await prisma.phoneMapping.delete({
      where: { id },
    });

    console.log(`Deleted phone number ${phoneMapping.phoneNumber} (id: ${id})`);

    // Return success with any cleanup warnings
    return NextResponse.json({
      success: true,
      cleanupWarnings: cleanupErrors.length > 0 ? cleanupErrors : undefined
    });
  } catch (error) {
    console.error("Error deleting phone number:", error);
    return NextResponse.json(
      { error: "Failed to delete phone number" },
      { status: 500 }
    );
  }
}

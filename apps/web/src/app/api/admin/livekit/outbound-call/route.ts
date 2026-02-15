/**
 * Admin Test Outbound Call API
 * POST - Initiate a test outbound call (admin only)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma, CallDirection, CallStatus, CallOutcome, Prisma } from "@epic-ai/database";
import { AccessToken, SipClient } from "livekit-server-sdk";
import { z } from "zod";

// Voice service URL with fallback
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://openclaw-platform-zcjiu.ondigitalocean.app/voice";

/**
 * Normalize phone number to digits only for comparison
 */
function normalizePhoneDigits(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Find an outbound trunk to use for the call
 * Returns the first available outbound trunk with a phone number
 */
async function findAvailableOutboundTrunk(): Promise<{
  trunkId: string;
  callerNumber: string;
} | null> {
  try {
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`
    );
    if (!response.ok) {
      console.error(`[Admin Voice] Failed to fetch outbound trunks: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.trunks) {
      return null;
    }

    // Find first trunk with phone numbers
    for (const trunk of data.trunks) {
      if (trunk.numbers?.length > 0) {
        console.log(`[Admin Voice] Using outbound trunk ${trunk.trunk_id} with number ${trunk.numbers[0]}`);
        return {
          trunkId: trunk.trunk_id,
          callerNumber: trunk.numbers[0],
        };
      }
    }

    console.warn("[Admin Voice] No outbound trunk with phone numbers found");
    return null;
  } catch (error) {
    console.error("[Admin Voice] Error fetching outbound trunks:", error);
    return null;
  }
}

const adminOutboundCallSchema = z.object({
  // Required: phone number to call
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  // Optional: Voice agent ID to use (will use a default if not provided)
  agentId: z.string().optional(),
});

/**
 * POST /api/admin/livekit/outbound-call
 * Initiate a test outbound call (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check LiveKit configuration
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parseResult = adminOutboundCallSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { phoneNumber, agentId } = parseResult.data;

    // Find the agent to use
    let agent;
    if (agentId) {
      // Use specified agent
      agent = await prisma.voiceAgent.findFirst({
        where: {
          id: agentId,
          isActive: true,
        },
      });

      if (!agent) {
        return NextResponse.json(
          { error: "Agent not found or inactive" },
          { status: 404 }
        );
      }
    } else {
      // Find any active agent for testing
      agent = await prisma.voiceAgent.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
      });

      if (!agent) {
        return NextResponse.json(
          { error: "No active voice agents available" },
          { status: 404 }
        );
      }
    }

    // Clean phone number format
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const formattedNumber = cleanedNumber.startsWith("+")
      ? cleanedNumber
      : `+1${cleanedNumber}`;

    // Generate unique room name for this call
    const roomName = `admin-test-${Date.now()}`;

    // Find an available outbound trunk
    const trunkInfo = await findAvailableOutboundTrunk();

    // Create call log record
    const callLog = await prisma.callLog.create({
      data: {
        organizationId: agent.organizationId,
        agentId: agent.id,
        direction: CallDirection.OUTBOUND,
        phoneNumber: formattedNumber,
        callerNumber: trunkInfo?.callerNumber || undefined,
        livekitRoomName: roomName,
        status: CallStatus.ACTIVE,
        metadata: {
          isAdminTest: true,
          initiatedBy: userId,
        } as Prisma.InputJsonValue,
      },
    });

    // If no SIP trunk configured, return early with mock mode
    if (!trunkInfo) {
      console.log(`[Admin Voice] Mock mode: No outbound SIP trunk found. Would call ${formattedNumber} using agent ${agent.name}`);

      // Update call to in-progress for mock mode
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: { status: CallStatus.IN_PROGRESS, startedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        callId: callLog.id,
        roomName,
        status: "mock",
        message: "SIP trunk not configured - running in mock mode",
        call: {
          id: callLog.id,
          phoneNumber: formattedNumber,
          agentName: agent.name,
          status: "IN_PROGRESS",
        },
      });
    }

    // Create LiveKit SIP client for outbound call
    const sipClient = new SipClient(livekitUrl, apiKey, apiSecret);

    // Generate token for the AI agent participant
    const agentToken = new AccessToken(apiKey, apiSecret, {
      identity: `agent-${agent.id}`,
      name: agent.name,
      ttl: 3600, // 1 hour
      metadata: JSON.stringify({
        agentId: agent.id,
        callId: callLog.id,
        brandId: agent.brandId,
        isAdminTest: true,
      }),
    });

    agentToken.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Create SIP outbound call
    try {
      const sipParticipant = await sipClient.createSipParticipant(
        trunkInfo.trunkId,
        formattedNumber,
        roomName,
        {
          participantIdentity: `sip-${formattedNumber}`,
          participantName: formattedNumber,
          playDialtone: true,
        }
      );

      // Update call log with SIP details
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          sipCallId: sipParticipant.sipCallId || undefined,
          livekitRoomSid: sipParticipant.participantId || undefined,
          status: CallStatus.RINGING,
          startedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        callId: callLog.id,
        roomName,
        sipCallId: sipParticipant.sipCallId,
        status: "ringing",
        call: {
          id: callLog.id,
          phoneNumber: formattedNumber,
          agentName: agent.name,
          status: "RINGING",
        },
        agentToken: await agentToken.toJwt(),
      });
    } catch (sipError) {
      console.error("[Admin Voice] SIP call initiation failed:", sipError);

      // Update call log with failure
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: CallStatus.ENDED,
          outcome: CallOutcome.FAILED,
          endedAt: new Date(),
          metadata: {
            isAdminTest: true,
            initiatedBy: userId,
            error: sipError instanceof Error ? sipError.message : "SIP call failed",
          } as Prisma.InputJsonValue,
        },
      });

      return NextResponse.json(
        {
          error: "Failed to initiate call",
          details: sipError instanceof Error ? sipError.message : "Unknown error",
          callId: callLog.id,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[Admin Voice] Error initiating outbound call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}

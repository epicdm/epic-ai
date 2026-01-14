/**
 * Outbound Call Initiation API
 * POST - Initiate an outbound call using LiveKit SIP
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma, CallDirection, CallStatus } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";
import { AccessToken, SipClient } from "livekit-server-sdk";
import { z } from "zod";

/**
 * Find the outbound trunk ID for a given phone number
 * Queries the voice service API to find the matching outbound trunk
 */
async function findOutboundTrunkByPhone(
  phoneNumber: string
): Promise<string | null> {
  const voiceServiceUrl = process.env.VOICE_SERVICE_URL;
  if (!voiceServiceUrl) {
    console.warn("[Voice] VOICE_SERVICE_URL not configured");
    return null;
  }

  try {
    const response = await fetch(
      `${voiceServiceUrl}/api/telephony/trunks/outbound`
    );
    if (!response.ok) {
      console.error(`[Voice] Failed to fetch outbound trunks: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data.success || !data.trunks) {
      return null;
    }

    // Normalize the phone number for comparison
    const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, "");

    // Find trunk that has this phone number
    for (const trunk of data.trunks) {
      if (trunk.numbers?.some((n: string) => n === normalizedPhone)) {
        console.log(`[Voice] Found outbound trunk ${trunk.trunk_id} for ${normalizedPhone}`);
        return trunk.trunk_id;
      }
    }

    console.warn(`[Voice] No outbound trunk found for ${normalizedPhone}`);
    return null;
  } catch (error) {
    console.error("[Voice] Error fetching outbound trunks:", error);
    return null;
  }
}

const outboundCallSchema = z.object({
  // Required: phone number to call
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  // Required: Voice agent to use
  agentId: z.string(),
  // Optional: Campaign ID for tracking
  campaignId: z.string().optional(),
  // Optional: Custom metadata
  metadata: z.record(z.unknown()).optional(),
});

/**
 * POST /api/voice/calls/outbound
 * Initiate an outbound call
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
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

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const body = await request.json();
    const parseResult = outboundCallSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.errors },
        { status: 400 }
      );
    }

    const { phoneNumber, agentId, campaignId, metadata } = parseResult.data;

    // Verify agent belongs to organization
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: org.id,
        isActive: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get phone mapping for outbound calls (organization's outbound number)
    const phoneMapping = await prisma.phoneMapping.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Clean phone number format
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, "");
    const formattedNumber = cleanedNumber.startsWith("+")
      ? cleanedNumber
      : `+1${cleanedNumber}`;

    // Generate unique room name for this call
    const roomName = `call-${org.id.slice(0, 8)}-${Date.now()}`;

    // Create call log record
    const callLog = await prisma.callLog.create({
      data: {
        organizationId: org.id,
        agentId: agent.id,
        phoneMappingId: phoneMapping?.id,
        campaignId,
        direction: CallDirection.OUTBOUND,
        phoneNumber: formattedNumber,
        callerNumber: phoneMapping?.phoneNumber || undefined,
        livekitRoomName: roomName,
        status: CallStatus.QUEUED,
        metadata: metadata || {},
      },
    });

    // Look up the outbound trunk for the organization's phone number
    // Note: Outbound trunks are different from inbound trunks - we need to find the right one
    let sipTrunkId: string | null = null;
    const callerNumber = phoneMapping?.phoneNumber;

    if (callerNumber) {
      sipTrunkId = await findOutboundTrunkByPhone(callerNumber);
    }

    // If no SIP trunk configured, return early with mock mode
    if (!sipTrunkId) {
      console.log(`[Voice] Mock mode: No outbound SIP trunk found for ${callerNumber || 'unknown'}. Would call ${formattedNumber} from agent ${agent.name}`);

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
        sipTrunkId,
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
          livekitRoomSid: sipParticipant.participantSid || undefined,
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
        // Include agent token for monitoring/joining
        agentToken: await agentToken.toJwt(),
      });
    } catch (sipError) {
      console.error("SIP call initiation failed:", sipError);

      // Update call log with failure
      await prisma.callLog.update({
        where: { id: callLog.id },
        data: {
          status: CallStatus.FAILED,
          endedAt: new Date(),
          metadata: {
            ...(metadata || {}),
            error: sipError instanceof Error ? sipError.message : "SIP call failed",
          },
        },
      });

      return NextResponse.json(
        { error: "Failed to initiate call", callId: callLog.id },
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
    console.error("Error initiating outbound call:", error);
    return NextResponse.json(
      { error: "Failed to initiate call" },
      { status: 500 }
    );
  }
}

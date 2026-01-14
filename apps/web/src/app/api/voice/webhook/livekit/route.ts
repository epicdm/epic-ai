/**
 * LiveKit Webhook Handler
 * POST - Receive and process LiveKit webhook events for call tracking
 *
 * This endpoint receives webhook events from LiveKit Cloud and logs
 * call events to the database for analytics and tracking.
 *
 * Configure this URL in LiveKit Cloud Dashboard:
 * https://cloud.livekit.io -> Project Settings -> Webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { WebhookReceiver, WebhookEvent } from "livekit-server-sdk";
import { prisma, CallDirection, CallStatus, CallOutcome, Prisma } from "@epic-ai/database";

// LiveKit credentials for webhook verification
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";

/**
 * Parse phone number from SIP participant identity
 * SIP participants typically have identity like: sip_+17678189145
 */
function parsePhoneFromSipIdentity(identity: string): string | null {
  if (!identity.startsWith("sip_")) return null;
  return identity.replace("sip_", "");
}

/**
 * Extract metadata from participant or room
 */
function extractMetadata(data: string | undefined): Record<string, unknown> {
  if (!data) return {};
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

/**
 * Find phone mapping and agent by phone number for inbound calls
 */
async function findCallContext(phoneNumber: string) {
  // Normalize phone number for lookup
  const normalizedPhone = phoneNumber.replace(/[^0-9+]/g, "");

  // Try to find phone mapping with this number
  const phoneMapping = await prisma.phoneMapping.findFirst({
    where: {
      phoneNumber: normalizedPhone,
      isActive: true,
    },
    include: {
      agent: true,
      organization: true,
    },
  });

  if (phoneMapping) {
    return {
      organizationId: phoneMapping.organizationId,
      agentId: phoneMapping.agentId,
      phoneMappingId: phoneMapping.id,
      agent: phoneMapping.agent,
    };
  }

  // Also try without the + prefix
  const phoneWithoutPlus = normalizedPhone.replace(/^\+/, "");
  const phoneMappingAlt = await prisma.phoneMapping.findFirst({
    where: {
      phoneNumber: phoneWithoutPlus,
      isActive: true,
    },
    include: {
      agent: true,
      organization: true,
    },
  });

  if (phoneMappingAlt) {
    return {
      organizationId: phoneMappingAlt.organizationId,
      agentId: phoneMappingAlt.agentId,
      phoneMappingId: phoneMappingAlt.id,
      agent: phoneMappingAlt.agent,
    };
  }

  return null;
}

/**
 * Handle participant_joined event (potential inbound call)
 */
async function handleParticipantJoined(event: WebhookEvent) {
  const participant = event.participant;
  const room = event.room;

  if (!participant || !room) {
    console.log("[Webhook] participant_joined: Missing participant or room data");
    return;
  }

  const identity = participant.identity;
  const roomName = room.name;

  console.log(`[Webhook] participant_joined: ${identity} in room ${roomName}`);

  // Debug: Log all available data to understand LiveKit's payload
  console.log(`[Webhook] DEBUG - Participant:`, JSON.stringify({
    identity: participant.identity,
    name: participant.name,
    sid: participant.sid,
    metadata: participant.metadata,
    attributes: participant.attributes,
  }));
  console.log(`[Webhook] DEBUG - Room:`, JSON.stringify({
    name: room.name,
    sid: room.sid,
    metadata: room.metadata,
  }));

  // Check if this is a SIP participant (phone call)
  const phoneNumber = parsePhoneFromSipIdentity(identity);
  if (!phoneNumber) {
    console.log(`[Webhook] participant_joined: Not a SIP participant (${identity})`);
    return;
  }

  // This is a SIP call - check if it's inbound
  // Inbound calls: SIP participant joins a room that was created for them
  // Outbound calls: We already log these when initiating

  // Check if we already have a call log for this room (outbound would already exist)
  const existingCall = await prisma.callLog.findFirst({
    where: {
      livekitRoomName: roomName,
    },
  });

  if (existingCall) {
    // This room already has a call log - might be outbound call answered
    console.log(`[Webhook] Call log already exists for room ${roomName}, updating status`);

    // Update to IN_PROGRESS if it was RINGING or ACTIVE
    if (existingCall.status === CallStatus.RINGING || existingCall.status === CallStatus.ACTIVE) {
      await prisma.callLog.update({
        where: { id: existingCall.id },
        data: {
          status: CallStatus.IN_PROGRESS,
          startedAt: existingCall.startedAt || new Date(),
          livekitRoomSid: room.sid || undefined,
        },
      });
      console.log(`[Webhook] Updated call ${existingCall.id} to IN_PROGRESS`);
    }
    return;
  }

  // This is a new inbound call - find the context
  // For inbound calls, we need to find which phone number was called
  // The room metadata might contain this info, or we need to look it up

  const roomMetadata = extractMetadata(room.metadata);
  const participantMetadata = extractMetadata(participant.metadata);

  // Try to find called number from metadata or attributes
  const calledNumber =
    (roomMetadata.calledNumber as string) ||
    (participantMetadata.calledNumber as string) ||
    (participant.attributes?.["sip.calledNumber"] as string) ||
    (participant.attributes?.["sip.trunkPhoneNumber"] as string);

  // The caller number is the SIP participant's phone
  const callerNumber = phoneNumber;

  console.log(`[Webhook] Inbound call from ${callerNumber} to ${calledNumber || "unknown"}`);

  // Find the organization and agent for this inbound call
  let callContext = null;
  if (calledNumber) {
    callContext = await findCallContext(calledNumber);
  }

  if (!callContext) {
    console.warn(`[Webhook] No phone mapping found for inbound call to ${calledNumber}. Cannot log call without organization.`);
    return; // Can't create call log without organization
  }

  // Create the inbound call log
  const callLog = await prisma.callLog.create({
    data: {
      organizationId: callContext.organizationId,
      agentId: callContext.agentId ?? undefined,
      phoneMappingId: callContext.phoneMappingId,
      direction: CallDirection.INBOUND,
      phoneNumber: callerNumber, // Caller's phone number
      callerNumber: callerNumber,
      livekitRoomName: roomName,
      livekitRoomSid: room.sid ?? undefined,
      status: CallStatus.IN_PROGRESS,
      startedAt: new Date(),
      metadata: {
        calledNumber,
        participantSid: participant.sid,
        ...roomMetadata,
      } as Prisma.InputJsonValue,
    },
  });

  console.log(`[Webhook] Created inbound call log ${callLog.id} for ${callerNumber}`);
}

/**
 * Handle participant_left event (call ended)
 */
async function handleParticipantLeft(event: WebhookEvent) {
  const participant = event.participant;
  const room = event.room;

  if (!participant || !room) {
    console.log("[Webhook] participant_left: Missing participant or room data");
    return;
  }

  const identity = participant.identity;
  const roomName = room.name;

  console.log(`[Webhook] participant_left: ${identity} from room ${roomName}`);

  // Check if this is a SIP participant
  const phoneNumber = parsePhoneFromSipIdentity(identity);
  if (!phoneNumber) {
    return; // Not a phone call participant
  }

  // Find the call log for this room
  const callLog = await prisma.callLog.findFirst({
    where: {
      livekitRoomName: roomName,
      status: {
        in: [CallStatus.IN_PROGRESS, CallStatus.RINGING, CallStatus.ACTIVE],
      },
    },
  });

  if (!callLog) {
    console.log(`[Webhook] No active call found for room ${roomName}`);
    return;
  }

  // Calculate duration
  const startTime = callLog.startedAt || callLog.createdAt;
  const endTime = new Date();
  const durationSeconds = Math.round(
    (endTime.getTime() - startTime.getTime()) / 1000
  );

  // Update call log with completion info
  await prisma.callLog.update({
    where: { id: callLog.id },
    data: {
      status: CallStatus.ENDED,
      outcome: CallOutcome.COMPLETED,
      endedAt: endTime,
      duration: durationSeconds,
    },
  });

  console.log(
    `[Webhook] Call ${callLog.id} ended, duration: ${durationSeconds}s`
  );
}

/**
 * Handle room_finished event (all participants left)
 */
async function handleRoomFinished(event: WebhookEvent) {
  const room = event.room;
  if (!room) return;

  const roomName = room.name;
  console.log(`[Webhook] room_finished: ${roomName}`);

  // Find any active calls in this room and mark them ended
  const activeCalls = await prisma.callLog.findMany({
    where: {
      livekitRoomName: roomName,
      status: {
        in: [CallStatus.IN_PROGRESS, CallStatus.RINGING, CallStatus.ACTIVE],
      },
    },
  });

  for (const call of activeCalls) {
    const startTime = call.startedAt || call.createdAt;
    const endTime = new Date();
    const durationSeconds = Math.round(
      (endTime.getTime() - startTime.getTime()) / 1000
    );

    await prisma.callLog.update({
      where: { id: call.id },
      data: {
        status: CallStatus.ENDED,
        outcome: CallOutcome.COMPLETED,
        endedAt: endTime,
        duration: durationSeconds,
      },
    });

    console.log(`[Webhook] Marked call ${call.id} as ended (room finished)`);
  }
}

/**
 * POST /api/voice/webhook/livekit
 * Receive LiveKit webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Verify LiveKit is configured
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error("[Webhook] LiveKit not configured");
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 503 }
      );
    }

    // Get raw body and authorization header
    const body = await request.text();
    const authHeader = request.headers.get("Authorization") || "";

    // Create webhook receiver and verify the event
    const receiver = new WebhookReceiver(LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

    let event: WebhookEvent;
    try {
      // In development, we might want to skip auth for testing
      const skipAuth = process.env.NODE_ENV === "development" && !authHeader;
      event = await receiver.receive(body, authHeader, skipAuth);
    } catch (verifyError) {
      console.error("[Webhook] Verification failed:", verifyError);
      return NextResponse.json(
        { error: "Webhook verification failed" },
        { status: 401 }
      );
    }

    console.log(`[Webhook] Received event: ${event.event}`);

    // Process the event based on type
    switch (event.event) {
      case "participant_joined":
        await handleParticipantJoined(event);
        break;

      case "participant_left":
        await handleParticipantLeft(event);
        break;

      case "room_finished":
        await handleRoomFinished(event);
        break;

      case "room_started":
        console.log(`[Webhook] Room started: ${event.room?.name}`);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.event}`);
    }

    return NextResponse.json({ success: true, event: event.event });
  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/voice/webhook/livekit
 * Health check and documentation
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "LiveKit Webhook Handler",
    description: "Receives LiveKit webhook events for call tracking",
    events: [
      "participant_joined - Log inbound calls",
      "participant_left - Mark calls as completed",
      "room_finished - Cleanup any remaining active calls",
    ],
    configured: !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET),
  });
}

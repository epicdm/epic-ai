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
 * Extract called number from various sources
 * Tries multiple methods to find the phone number that was called
 */
async function extractCalledNumber(
  participant: NonNullable<WebhookEvent["participant"]>,
  room: NonNullable<WebhookEvent["room"]>,
  roomMetadata: Record<string, unknown>,
  participantMetadata: Record<string, unknown>
): Promise<{ calledNumber: string | null; agentId: string | null; organizationId: string | null }> {
  // Method 1: Check participant attributes (set by dispatch rule)
  const sipPhoneNumber = participant.attributes?.["sip.phoneNumber"] as string;
  const sipTrunkPhoneNumber = participant.attributes?.["sip.trunkPhoneNumber"] as string;
  const agentIdFromAttributes = participant.attributes?.["agent_id"] as string;

  // Method 2: Check room/participant metadata
  const calledNumberFromMeta =
    (roomMetadata.calledNumber as string) ||
    (roomMetadata.phone_number as string) ||
    (participantMetadata.calledNumber as string) ||
    (participantMetadata.phone_number as string);

  const agentIdFromMeta =
    (roomMetadata.agent_id as string) ||
    (participantMetadata.agent_id as string);

  const orgIdFromMeta =
    (roomMetadata.org_id as string) ||
    (participantMetadata.org_id as string);

  // Method 3: Parse from room name (format: sip-{calledNumber}___{callerNumber}_{id})
  let calledNumberFromRoomName: string | null = null;
  const roomName = room.name;
  if (roomName.startsWith("sip-")) {
    const match = roomName.match(/^sip-(\d+)___/);
    if (match && match[1] && match[1] !== "unknown") {
      calledNumberFromRoomName = `+${match[1]}`;
    }
  }

  // Method 4: If we have agent_id, look up the phone mapping
  const agentId = agentIdFromAttributes || agentIdFromMeta;
  if (agentId && agentId !== "unknown") {
    const phoneMapping = await prisma.phoneMapping.findFirst({
      where: {
        agentId: agentId,
        isActive: true,
      },
    });
    if (phoneMapping) {
      return {
        calledNumber: phoneMapping.phoneNumber,
        agentId: agentId,
        organizationId: phoneMapping.organizationId,
      };
    }
  }

  // Return best available called number
  const calledNumber =
    sipTrunkPhoneNumber ||
    sipPhoneNumber ||
    calledNumberFromMeta ||
    calledNumberFromRoomName;

  return {
    calledNumber,
    agentId: agentId || null,
    organizationId: orgIdFromMeta || null,
  };
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

  // Log attributes for debugging (will remove after confirming fix)
  if (participant.attributes && Object.keys(participant.attributes).length > 0) {
    console.log(`[Webhook] Participant attributes:`, JSON.stringify(participant.attributes));
  }

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
  const roomMetadata = extractMetadata(room.metadata);
  const participantMetadata = extractMetadata(participant.metadata);

  // Extract the called number using multiple methods
  const { calledNumber, agentId, organizationId: orgIdFromMeta } = await extractCalledNumber(
    participant,
    room,
    roomMetadata,
    participantMetadata
  );

  // The caller number is the SIP participant's phone
  const callerNumber = phoneNumber;

  console.log(`[Webhook] Inbound call from ${callerNumber} to ${calledNumber || "unknown"} (agent: ${agentId || "unknown"})`);

  // Find the organization and agent for this inbound call
  let callContext = null;

  // Try finding by called number first
  if (calledNumber) {
    callContext = await findCallContext(calledNumber);
  }

  // If not found by called number, try by agent ID
  if (!callContext && agentId && agentId !== "unknown") {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      include: {
        phoneMappings: {
          where: { isActive: true },
          take: 1,
        },
      },
    });
    if (agent) {
      callContext = {
        organizationId: agent.organizationId,
        agentId: agent.id,
        phoneMappingId: agent.phoneMappings[0]?.id ?? null,
        agent: agent,
      };
    }
  }

  // Last resort: try by organization ID from metadata
  if (!callContext && orgIdFromMeta && orgIdFromMeta !== "unknown") {
    const org = await prisma.organization.findUnique({
      where: { id: orgIdFromMeta },
    });
    if (org) {
      callContext = {
        organizationId: org.id,
        agentId: agentId !== "unknown" ? agentId : null,
        phoneMappingId: null,
        agent: null,
      };
    }
  }

  if (!callContext) {
    console.warn(`[Webhook] No context found for inbound call. calledNumber=${calledNumber}, agentId=${agentId}. Cannot log call without organization.`);
    return;
  }

  // Create the inbound call log
  const callLog = await prisma.callLog.create({
    data: {
      organizationId: callContext.organizationId,
      agentId: callContext.agentId ?? undefined,
      phoneMappingId: callContext.phoneMappingId ?? undefined,
      direction: CallDirection.INBOUND,
      phoneNumber: calledNumber || undefined, // Epic AI's number that was dialed
      callerNumber: callerNumber, // The customer's number who called in
      livekitRoomName: roomName,
      livekitRoomSid: room.sid ?? undefined,
      status: CallStatus.IN_PROGRESS,
      startedAt: new Date(),
      metadata: {
        calledNumber: calledNumber || "unknown",
        participantSid: participant.sid,
        agentId: agentId || undefined,
        ...roomMetadata,
      } as Prisma.InputJsonValue,
    },
  });

  console.log(`[Webhook] Created inbound call log ${callLog.id} for ${callerNumber} -> ${calledNumber || "unknown"}`);
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
 *
 * This handles various scenarios:
 * - Call was answered and completed (IN_PROGRESS -> COMPLETED)
 * - Call was rejected/no answer (RINGING -> NO_ANSWER)
 * - Call failed early (ACTIVE -> FAILED)
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

    // Determine the appropriate outcome based on the call's current status
    // - RINGING: Call was never answered (rejected, busy, no answer)
    // - ACTIVE: Call was initiated but failed before connecting
    // - IN_PROGRESS: Call was actually connected and completed normally
    let outcome: CallOutcome;
    let outcomeReason: string;

    if (call.status === CallStatus.RINGING) {
      // Call never connected - was rejected or not answered
      outcome = CallOutcome.NO_ANSWER;
      outcomeReason = "Call was not answered or was rejected";
    } else if (call.status === CallStatus.ACTIVE) {
      // Call was initiated but never progressed to in_progress
      outcome = CallOutcome.FAILED;
      outcomeReason = "Call failed before connecting";
    } else {
      // Call was in progress - completed normally
      outcome = CallOutcome.COMPLETED;
      outcomeReason = "Call completed";
    }

    await prisma.callLog.update({
      where: { id: call.id },
      data: {
        status: CallStatus.ENDED,
        outcome: outcome,
        endedAt: endTime,
        duration: durationSeconds,
        metadata: {
          ...(call.metadata as Record<string, unknown> || {}),
          endReason: outcomeReason,
        } as Prisma.InputJsonValue,
      },
    });

    console.log(`[Webhook] Marked call ${call.id} as ended (${outcome}, was ${call.status})`);
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
 *
 * Query params:
 * - cleanup=true: Mark stuck calls (older than 2 hours) as ended
 * - cleanup_minutes=N: Override the age threshold (default 120 minutes)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cleanup = searchParams.get("cleanup") === "true";
  const cleanupMinutes = parseInt(searchParams.get("cleanup_minutes") || "120", 10);

  // Handle cleanup request
  if (cleanup) {
    try {
      const cutoffTime = new Date(Date.now() - cleanupMinutes * 60 * 1000);

      // Find stuck calls that are older than the cutoff
      const stuckCalls = await prisma.callLog.findMany({
        where: {
          status: {
            in: [CallStatus.IN_PROGRESS, CallStatus.RINGING, CallStatus.ACTIVE],
          },
          createdAt: {
            lt: cutoffTime,
          },
        },
      });

      console.log(`[Webhook] Cleanup: Found ${stuckCalls.length} stuck calls older than ${cleanupMinutes} minutes`);

      // Mark each stuck call as ended
      const cleanedCalls = [];
      for (const call of stuckCalls) {
        const startTime = call.startedAt || call.createdAt;
        const endTime = new Date();
        const durationSeconds = Math.round(
          (endTime.getTime() - startTime.getTime()) / 1000
        );

        await prisma.callLog.update({
          where: { id: call.id },
          data: {
            status: CallStatus.ENDED,
            outcome: CallOutcome.UNKNOWN, // Unknown since we don't know what happened
            endedAt: endTime,
            duration: durationSeconds,
            metadata: {
              ...(call.metadata as Record<string, unknown> || {}),
              cleanedUp: true,
              cleanedUpAt: new Date().toISOString(),
              cleanupReason: "Stuck call cleanup - webhook events may have been missed",
            } as Prisma.InputJsonValue,
          },
        });

        cleanedCalls.push({
          id: call.id,
          direction: call.direction,
          phoneNumber: call.phoneNumber,
          duration: durationSeconds,
        });

        console.log(`[Webhook] Cleanup: Marked call ${call.id} as ended (was stuck for ${durationSeconds}s)`);
      }

      return NextResponse.json({
        status: "ok",
        cleanup: {
          performed: true,
          cutoffMinutes: cleanupMinutes,
          cutoffTime: cutoffTime.toISOString(),
          stuckCallsFound: stuckCalls.length,
          callsCleaned: cleanedCalls,
        },
      });
    } catch (error) {
      console.error("[Webhook] Cleanup error:", error);
      return NextResponse.json(
        { error: "Cleanup failed", details: String(error) },
        { status: 500 }
      );
    }
  }

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
    cleanup: {
      available: true,
      usage: "GET /api/voice/webhook/livekit?cleanup=true&cleanup_minutes=120",
      description: "Mark stuck calls older than N minutes as ended",
    },
  });
}

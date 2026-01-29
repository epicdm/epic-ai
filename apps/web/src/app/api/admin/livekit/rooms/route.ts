/**
 * LiveKit Rooms Admin API
 * GET - List all active rooms with participants
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * GET /api/admin/livekit/rooms
 * List all active rooms with participant details
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawUrl = process.env.LIVEKIT_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    if (!rawUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 500 }
      );
    }

    // Convert WebSocket URL to HTTP URL
    const livekitUrl = rawUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const rooms = await roomService.listRooms();

    // Get participants for each room
    const roomsWithParticipants = await Promise.all(
      rooms.map(async (room) => {
        try {
          const participants = await roomService.listParticipants(room.name);
          return {
            sid: room.sid,
            name: room.name,
            numParticipants: room.numParticipants,
            maxParticipants: room.maxParticipants,
            creationTime: Number(room.creationTime) || 0,
            metadata: room.metadata,
            emptyTimeout: room.emptyTimeout,
            departureTimeout: room.departureTimeout,
            participants: participants.map((p) => ({
              sid: p.sid,
              identity: p.identity,
              name: p.name,
              state: p.state,
              joinedAt: Number(p.joinedAt) || 0,
              metadata: p.metadata,
              isPublisher: p.isPublisher,
              permission: p.permission,
              kind: p.kind,
              attributes: p.attributes || {},
              tracks: p.tracks?.map((t) => ({
                sid: t.sid,
                type: t.type,
                name: t.name,
                muted: t.muted,
                source: t.source,
              })) || [],
            })),
          };
        } catch (err) {
          console.error(`[Admin LiveKit] Error fetching participants for room ${room.name}:`, err);
          return {
            sid: room.sid,
            name: room.name,
            numParticipants: room.numParticipants,
            maxParticipants: room.maxParticipants,
            creationTime: Number(room.creationTime) || 0,
            metadata: room.metadata,
            participants: [],
            error: "Failed to fetch participants",
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      rooms: roomsWithParticipants,
      totalRooms: roomsWithParticipants.length,
      totalParticipants: roomsWithParticipants.reduce(
        (sum, room) => sum + (room.participants?.length || 0),
        0
      ),
    });
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching rooms:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

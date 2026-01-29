/**
 * LiveKit Room by Name Admin API
 * GET - Get specific room details with participants
 * DELETE - Close/delete a room
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

/**
 * GET /api/admin/livekit/rooms/[name]
 * Get a specific room with participant details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name: roomName } = await params;

    const rawUrl = process.env.LIVEKIT_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    if (!rawUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 500 }
      );
    }

    const livekitUrl = rawUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    // Get all rooms and find the one we're looking for
    const rooms = await roomService.listRooms();
    const room = rooms.find((r) => r.name === roomName);

    if (!room) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    // Get participants
    const participants = await roomService.listParticipants(roomName);

    return NextResponse.json({
      success: true,
      room: {
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
      },
    });
  } catch (error) {
    console.error("[Admin LiveKit] Error fetching room:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch room" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/livekit/rooms/[name]
 * Close/delete a room
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name: roomName } = await params;

    const rawUrl = process.env.LIVEKIT_URL?.trim();
    const apiKey = process.env.LIVEKIT_API_KEY?.trim();
    const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

    if (!rawUrl || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit not configured" },
        { status: 500 }
      );
    }

    const livekitUrl = rawUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);

    await roomService.deleteRoom(roomName);

    return NextResponse.json({
      success: true,
      message: `Room '${roomName}' deleted successfully`,
    });
  } catch (error) {
    console.error("[Admin LiveKit] Error deleting room:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete room" },
      { status: 500 }
    );
  }
}

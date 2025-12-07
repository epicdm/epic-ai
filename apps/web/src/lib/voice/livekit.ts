import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || "";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || "";
const LIVEKIT_URL = process.env.LIVEKIT_URL || "";

/**
 * Generate a LiveKit access token for a participant
 */
export async function generateToken(
  roomName: string,
  participantName: string,
  options?: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
  }
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
    ttl: "1h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: options?.canPublish ?? true,
    canSubscribe: options?.canSubscribe ?? true,
    canPublishData: options?.canPublishData ?? true,
  });

  return await at.toJwt();
}

/**
 * Generate a token for an AI agent
 */
export async function generateAgentToken(
  roomName: string,
  agentId: string
): Promise<string> {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: `agent-${agentId}`,
    ttl: "2h",
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    agent: true,
  });

  return await at.toJwt();
}

/**
 * Get room service client
 */
export function getRoomService(): RoomServiceClient {
  return new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);
}

/**
 * Create a room
 */
export async function createRoom(roomName: string) {
  const roomService = getRoomService();
  return await roomService.createRoom({
    name: roomName,
    emptyTimeout: 60 * 10, // 10 minutes
    maxParticipants: 10,
  });
}

/**
 * List active rooms
 */
export async function listRooms() {
  const roomService = getRoomService();
  return await roomService.listRooms();
}

/**
 * Get LiveKit WebSocket URL (for client)
 */
export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

/**
 * Check if LiveKit is configured
 */
export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET && LIVEKIT_URL);
}

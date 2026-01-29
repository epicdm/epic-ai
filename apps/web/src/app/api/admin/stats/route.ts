/**
 * Admin Stats API
 * GET - Fetch platform-wide statistics from various services
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma, CallStatus } from "@epic-ai/database";
import { auth } from "@clerk/nextjs/server";
import { RoomServiceClient } from "livekit-server-sdk";

// Voice service URL
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

interface LiveKitStats {
  activeRooms: number;
  totalParticipants: number;
  rooms: Array<{
    name: string;
    numParticipants: number;
    creationTime: number;
  }>;
  connected: boolean;
  error?: string;
}

interface MagnusStats {
  connected: boolean;
  totalDIDs: number;
  activeTrunks: {
    inbound: number;
    outbound: number;
  };
  recentCalls: number;
  error?: string;
}

interface VoiceStats {
  totalAgents: number;
  activeAgents: number;
  totalCalls: number;
  callsToday: number;
  callsThisWeek: number;
  callsByStatus: Record<string, number>;
  totalMinutes: number;
  avgCallDuration: number;
}

interface PlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalBrands: number;
  totalLeads: number;
}

/**
 * Fetch LiveKit statistics
 */
async function getLiveKitStats(): Promise<LiveKitStats> {
  // Trim whitespace/newlines from env vars
  const rawUrl = process.env.LIVEKIT_URL?.trim();
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!rawUrl || !apiKey || !apiSecret) {
    return {
      connected: false,
      activeRooms: 0,
      totalParticipants: 0,
      rooms: [],
      error: "LiveKit not configured",
    };
  }

  // RoomServiceClient needs HTTP URL, not WebSocket
  // Convert wss:// to https:// and ws:// to http://
  const livekitUrl = rawUrl.replace(/^wss:\/\//, "https://").replace(/^ws:\/\//, "http://");

  try {
    const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret);
    const rooms = await roomService.listRooms();

    const totalParticipants = rooms.reduce(
      (sum, room) => sum + room.numParticipants,
      0
    );

    return {
      connected: true,
      activeRooms: rooms.length,
      totalParticipants,
      rooms: rooms.map((room) => ({
        name: room.name,
        numParticipants: room.numParticipants,
        creationTime: Number(room.creationTime) || 0,
      })),
    };
  } catch (error) {
    console.error("[Admin Stats] LiveKit error:", error);
    return {
      connected: false,
      activeRooms: 0,
      totalParticipants: 0,
      rooms: [],
      error: error instanceof Error ? error.message : "Failed to connect",
    };
  }
}

/**
 * Fetch MagnusBilling/Voice Service statistics
 */
async function getMagnusStats(): Promise<MagnusStats> {
  try {
    // Fetch trunks from voice service
    const [inboundRes, outboundRes] = await Promise.all([
      fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/inbound`).catch(
        () => null
      ),
      fetch(`${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`).catch(
        () => null
      ),
    ]);

    let inboundTrunks = 0;
    let outboundTrunks = 0;
    let totalDIDs = 0;

    if (inboundRes?.ok) {
      const data = await inboundRes.json();
      inboundTrunks = data.trunks?.length || 0;
      // Count DIDs from inbound trunks
      totalDIDs = data.trunks?.reduce(
        (sum: number, trunk: { numbers?: string[] }) =>
          sum + (trunk.numbers?.length || 0),
        0
      );
    }

    if (outboundRes?.ok) {
      const data = await outboundRes.json();
      outboundTrunks = data.trunks?.length || 0;
    }

    // Get recent calls count from database
    const recentCallsCount = await prisma.callLog.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return {
      connected: true,
      totalDIDs,
      activeTrunks: {
        inbound: inboundTrunks,
        outbound: outboundTrunks,
      },
      recentCalls: recentCallsCount,
    };
  } catch (error) {
    console.error("[Admin Stats] Magnus/Voice error:", error);
    return {
      connected: false,
      totalDIDs: 0,
      activeTrunks: { inbound: 0, outbound: 0 },
      recentCalls: 0,
      error: error instanceof Error ? error.message : "Failed to fetch",
    };
  }
}

/**
 * Fetch voice usage statistics from database
 */
async function getVoiceStats(): Promise<VoiceStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

  const [
    totalAgents,
    activeAgents,
    totalCalls,
    callsToday,
    callsThisWeek,
    callsByStatus,
    callDurations,
  ] = await Promise.all([
    // Total agents
    prisma.voiceAgent.count(),
    // Active agents
    prisma.voiceAgent.count({ where: { isActive: true } }),
    // Total calls
    prisma.callLog.count(),
    // Calls today
    prisma.callLog.count({ where: { createdAt: { gte: startOfDay } } }),
    // Calls this week
    prisma.callLog.count({ where: { createdAt: { gte: startOfWeek } } }),
    // Calls by status
    prisma.callLog.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    // Get duration stats
    prisma.callLog.aggregate({
      _sum: { duration: true },
      _avg: { duration: true },
    }),
  ]);

  // Convert status counts to record
  const statusCounts: Record<string, number> = {};
  for (const item of callsByStatus) {
    statusCounts[item.status] = item._count._all;
  }

  return {
    totalAgents,
    activeAgents,
    totalCalls,
    callsToday,
    callsThisWeek,
    callsByStatus: statusCounts,
    totalMinutes: Math.round((callDurations._sum.duration || 0) / 60),
    avgCallDuration: Math.round(callDurations._avg.duration || 0),
  };
}

/**
 * Fetch platform-wide statistics
 */
async function getPlatformStats(): Promise<PlatformStats> {
  const [totalOrganizations, totalUsers, totalBrands, totalLeads] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.brand.count(),
      prisma.lead.count(),
    ]);

  return {
    totalOrganizations,
    totalUsers,
    totalBrands,
    totalLeads,
  };
}

/**
 * GET /api/admin/stats
 * Fetch all platform statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    // Fetch specific section or all
    if (section) {
      switch (section) {
        case "livekit":
          return NextResponse.json({
            success: true,
            livekit: await getLiveKitStats(),
          });
        case "magnus":
          return NextResponse.json({
            success: true,
            magnus: await getMagnusStats(),
          });
        case "voice":
          return NextResponse.json({
            success: true,
            voice: await getVoiceStats(),
          });
        case "platform":
          return NextResponse.json({
            success: true,
            platform: await getPlatformStats(),
          });
        default:
          return NextResponse.json(
            { error: "Invalid section" },
            { status: 400 }
          );
      }
    }

    // Fetch all stats in parallel
    const [livekit, magnus, voice, platform] = await Promise.all([
      getLiveKitStats(),
      getMagnusStats(),
      getVoiceStats(),
      getPlatformStats(),
    ]);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        livekit,
        magnus,
        voice,
        platform,
      },
    });
  } catch (error) {
    console.error("[Admin Stats] Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

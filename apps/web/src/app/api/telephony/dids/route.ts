/**
 * List DIDs API
 *
 * Returns all DID mappings for the current organization.
 * Used for dropdowns and DID management UI.
 *
 * @module api/telephony/dids
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";

// ============================================================================
// Types
// ============================================================================

interface DidListItem {
  id: string;
  phoneNumber: string;
  agentId: string | null;
  agentName: string | null;
  routingType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ListDidsResponse {
  dids: DidListItem[];
  total: number;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json<ErrorResponse>(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 2. Get user's organization via membership
    const membership = await prisma.membership.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership?.organizationId) {
      return NextResponse.json<ErrorResponse>(
        { error: "User has no organization", code: "NO_ORGANIZATION" },
        { status: 403 }
      );
    }

    // 3. Parse query parameters
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const unassignedOnly = searchParams.get("unassignedOnly") === "true";
    const agentId = searchParams.get("agentId");

    // 4. Build filter
    const where: {
      organizationId: string;
      isActive?: boolean;
      agentId?: string | null;
    } = {
      organizationId: membership.organizationId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (unassignedOnly) {
      where.agentId = null;
    } else if (agentId) {
      where.agentId = agentId;
    }

    // 5. Fetch DIDs with agent info
    const mappings = await prisma.phoneMapping.findMany({
      where,
      select: {
        id: true,
        phoneNumber: true,
        agentId: true,
        routingType: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        agent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { isActive: "desc" },
        { createdAt: "desc" },
      ],
    });

    // 6. Transform to response format
    const dids: DidListItem[] = mappings.map((m) => ({
      id: m.id,
      phoneNumber: m.phoneNumber,
      agentId: m.agentId,
      agentName: m.agent?.name ?? null,
      routingType: m.routingType,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));

    return NextResponse.json<ListDidsResponse>({
      dids,
      total: dids.length,
    });
  } catch (error) {
    console.error("[list-dids] Error:", error);

    return NextResponse.json<ErrorResponse>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

/**
 * Assign Agent to DID API
 *
 * Reassigns an existing DID mapping to a different agent.
 * Safer than provision-did because it requires the DID to exist first.
 *
 * @module api/telephony/dids/[did]/assign-agent
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// ============================================================================
// Types & Validation
// ============================================================================

const AssignAgentSchema = z.object({
  agentId: z.string().cuid("Invalid agent ID format"),
});

type AssignAgentRequest = z.infer<typeof AssignAgentSchema>;

interface AssignAgentResponse {
  id: string;
  phoneNumber: string;
  agentId: string;
  previousAgentId: string | null;
  organizationId: string;
}

interface ErrorResponse {
  error: string;
  code: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize phone number to E.164 format.
 */
function normalizePhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (hasPlus) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

/**
 * Generate phone number variants for flexible lookup.
 */
function getPhoneVariants(did: string): string[] {
  const normalized = normalizePhoneNumber(did);
  const digits = did.replace(/\D/g, "");

  const variants = new Set<string>([
    normalized,
    did,
    digits,
    `+${digits}`,
  ]);

  if (digits.length === 10) {
    variants.add(`+1${digits}`);
    variants.add(`1${digits}`);
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    variants.add(`+${digits}`);
    variants.add(digits.slice(1));
    variants.add(`+1${digits.slice(1)}`);
  }

  return Array.from(variants);
}

// ============================================================================
// PATCH Handler
// ============================================================================

interface RouteParams {
  params: Promise<{ did: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    // 3. Get DID from URL params
    const { did } = await params;
    if (!did) {
      return NextResponse.json<ErrorResponse>(
        { error: "DID parameter is required", code: "MISSING_DID" },
        { status: 400 }
      );
    }

    const decodedDid = decodeURIComponent(did);
    const phoneVariants = getPhoneVariants(decodedDid);

    // 4. Parse and validate body
    const body = await request.json();
    const parseResult = AssignAgentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json<ErrorResponse>(
        {
          error: parseResult.error.issues[0]?.message || "Validation failed",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const { agentId } = parseResult.data;

    // 5. Find the DID mapping
    const mapping = await prisma.phoneMapping.findFirst({
      where: {
        phoneNumber: { in: phoneVariants },
        organizationId: membership.organizationId,
      },
      select: {
        id: true,
        phoneNumber: true,
        agentId: true,
        organizationId: true,
      },
    });

    if (!mapping) {
      return NextResponse.json<ErrorResponse>(
        {
          error: `DID ${decodedDid} not found in your organization`,
          code: "DID_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 6. Verify new agent exists and belongs to this organization
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        organizationId: membership.organizationId,
      },
      select: { id: true, name: true, status: true },
    });

    if (!agent) {
      return NextResponse.json<ErrorResponse>(
        {
          error: `Agent ${agentId} not found or not accessible`,
          code: "AGENT_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 7. Check if agent is in draft status
    if (agent.status === "DRAFT") {
      return NextResponse.json<ErrorResponse>(
        {
          error: `Agent "${agent.name}" is in draft status. Publish it before assigning a DID.`,
          code: "AGENT_DRAFT",
        },
        { status: 400 }
      );
    }

    // 8. Check if already assigned to this agent
    if (mapping.agentId === agentId) {
      return NextResponse.json<AssignAgentResponse>({
        id: mapping.id,
        phoneNumber: mapping.phoneNumber,
        agentId,
        previousAgentId: mapping.agentId,
        organizationId: mapping.organizationId,
      });
    }

    const previousAgentId = mapping.agentId;

    // 9. Update the mapping
    const updated = await prisma.phoneMapping.update({
      where: { id: mapping.id },
      data: {
        agentId,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    console.log(
      `[assign-agent] Reassigned DID ${mapping.phoneNumber}: ${previousAgentId} -> ${agentId}`
    );

    return NextResponse.json<AssignAgentResponse>({
      id: updated.id,
      phoneNumber: updated.phoneNumber,
      agentId: updated.agentId!,
      previousAgentId,
      organizationId: updated.organizationId,
    });
  } catch (error) {
    console.error("[assign-agent] Error:", error);

    return NextResponse.json<ErrorResponse>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

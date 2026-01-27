/**
 * Provision DID Mapping API
 *
 * Creates or updates a DID → VoiceAgent mapping in PhoneMapping table.
 * Blocks reassignment unless explicitly allowed via allowReassign flag.
 *
 * Live-Only Enforcement (Inbound Call Guard v1):
 * - Agent must be isActive: true
 * - Agent status must be "PUBLISHED" or "READY"
 * - Archived/Draft/Testing agents are rejected
 *
 * @module api/telephony/provision-did
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@epic-ai/database";
import { z } from "zod";

// ============================================================================
// Types & Validation
// ============================================================================

const ProvisionDidSchema = z.object({
  did: z.string().min(10, "DID must be at least 10 digits"),
  agentId: z.string().cuid("Invalid agent ID format"),
  routingType: z.enum(["agent", "ivr", "queue"]).default("agent"),
  allowReassign: z.boolean().default(false),
  action: z.enum(["activate", "deactivate"]).default("activate"),
});

type ProvisionDidRequest = z.infer<typeof ProvisionDidSchema>;

interface ProvisionDidResponse {
  id: string;
  phoneNumber: string;
  agentId: string;
  organizationId: string;
  routingType: string;
  created: boolean;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, string>;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Normalize phone number to E.164 format for consistent storage.
 */
function normalizePhoneNumber(phone: string): string {
  const hasPlus = phone.startsWith("+");
  const digits = phone.replace(/\D/g, "");

  if (hasPlus) {
    return `+${digits}`;
  }

  // Assume US number if 10 digits
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If 11 digits starting with 1, treat as US
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return `+${digits}`;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
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

    // 3. Parse and validate body
    const body = await request.json();
    const parseResult = ProvisionDidSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return NextResponse.json<ErrorResponse>(
        {
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: fieldErrors,
        },
        { status: 400 }
      );
    }

    const { did, agentId, routingType, allowReassign, action } =
      parseResult.data;
    const normalizedDid = normalizePhoneNumber(did);
    const isActivating = action === "activate";

    // 4. Verify agent exists and belongs to this organization
    // NOTE: Using VoiceAgent (not Agent) to match PhoneMapping schema relation
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id: agentId,
        organizationId: membership.organizationId,
      },
      select: { id: true, name: true, status: true, isActive: true },
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

    // 5. Check if agent is live-eligible (only when activating)
    // When deactivating, skip live-eligibility checks
    if (isActivating) {
      // VoiceAgent.status is a String field, check uppercase for consistency
      const statusUpper = (agent.status || "").toUpperCase();
      const isLiveEligible =
        statusUpper === "PUBLISHED" || statusUpper === "READY";

      if (!agent.isActive) {
        return NextResponse.json<ErrorResponse>(
          {
            error: `Agent "${agent.name}" is inactive. Activate it before assigning a DID.`,
            code: "AGENT_INACTIVE",
          },
          { status: 400 }
        );
      }

      if (statusUpper === "ARCHIVED") {
        return NextResponse.json<ErrorResponse>(
          {
            error: `Agent "${agent.name}" is archived. Restore it before assigning a DID.`,
            code: "AGENT_ARCHIVED",
          },
          { status: 400 }
        );
      }

      if (!isLiveEligible) {
        return NextResponse.json<ErrorResponse>(
          {
            error: `Agent "${agent.name}" must be PUBLISHED or READY to receive calls. Current status: ${agent.status}`,
            code: "AGENT_NOT_LIVE",
          },
          { status: 400 }
        );
      }
    }

    // 6. Check for existing mapping
    const existing = await prisma.phoneMapping.findUnique({
      where: { phoneNumber: normalizedDid },
      select: {
        id: true,
        agentId: true,
        organizationId: true,
      },
    });

    // 7. Handle existing mapping
    if (existing) {
      // Check if it belongs to another organization
      if (existing.organizationId !== membership.organizationId) {
        return NextResponse.json<ErrorResponse>(
          {
            error: "This DID is already provisioned to another organization",
            code: "DID_OWNED_BY_OTHER",
          },
          { status: 409 }
        );
      }

      // Check if reassignment is allowed
      if (existing.agentId && existing.agentId !== agentId && !allowReassign) {
        return NextResponse.json<ErrorResponse>(
          {
            error: `DID is already assigned to another agent. Set allowReassign=true to override.`,
            code: "REASSIGN_BLOCKED",
            details: { currentAgentId: existing.agentId },
          },
          { status: 409 }
        );
      }

      // Update existing mapping
      const updated = await prisma.phoneMapping.update({
        where: { id: existing.id },
        data: {
          agentId,
          routingType,
          isActive: isActivating,
          updatedAt: new Date(),
        },
      });

      // Audit log (optional - uncomment if AuditLog model exists)
      // await prisma.auditLog.create({
      //   data: {
      //     action: "DID_REASSIGNED",
      //     entityType: "PhoneMapping",
      //     entityId: updated.id,
      //     userId,
      //     organizationId: user.organizationId,
      //     metadata: {
      //       did: normalizedDid,
      //       previousAgentId: existing.agentId,
      //       newAgentId: agentId,
      //     },
      //   },
      // });

      console.log(
        `[provision-did] Updated DID ${normalizedDid} -> agent ${agentId} (was: ${existing.agentId})`
      );

      return NextResponse.json<ProvisionDidResponse>({
        id: updated.id,
        phoneNumber: normalizedDid,
        agentId: updated.agentId!,
        organizationId: updated.organizationId,
        routingType: updated.routingType,
        created: false,
      });
    }

    // 8. Create new mapping
    const created = await prisma.phoneMapping.create({
      data: {
        phoneNumber: normalizedDid,
        agentId,
        organizationId: membership.organizationId,
        routingType,
        isActive: isActivating,
      },
    });

    console.log(
      `[provision-did] Created DID ${normalizedDid} -> agent ${agentId}`
    );

    return NextResponse.json<ProvisionDidResponse>(
      {
        id: created.id,
        phoneNumber: normalizedDid,
        agentId: created.agentId!,
        organizationId: created.organizationId,
        routingType: created.routingType,
        created: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[provision-did] Error:", error);

    return NextResponse.json<ErrorResponse>(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

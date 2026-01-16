/**
 * Voice Agent Detail API
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// Voice service URL for cleanup operations
const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice";

/**
 * Cleanup phone number resources (LiveKit trunks, dispatch rules, Magnus DIDs)
 */
async function cleanupPhoneResources(phoneMapping: {
  id: string;
  phoneNumber: string;
  livekitTrunkId: string | null;
  livekitOutboundTrunkId: string | null;
  livekitDispatchRuleId: string | null;
  magnusDidId: string | null;
}): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Delete LiveKit dispatch rule first
  if (phoneMapping.livekitDispatchRuleId) {
    try {
      const res = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules/${phoneMapping.livekitDispatchRuleId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        errors.push(`Failed to delete dispatch rule ${phoneMapping.livekitDispatchRuleId}: ${res.status}`);
      }
    } catch (err) {
      errors.push(`Error deleting dispatch rule: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Delete inbound LiveKit trunk
  if (phoneMapping.livekitTrunkId) {
    try {
      const res = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/trunks/${phoneMapping.livekitTrunkId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        errors.push(`Failed to delete inbound trunk ${phoneMapping.livekitTrunkId}: ${res.status}`);
      }
    } catch (err) {
      errors.push(`Error deleting inbound trunk: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Delete outbound LiveKit trunk
  if (phoneMapping.livekitOutboundTrunkId) {
    try {
      const res = await fetch(
        `${VOICE_SERVICE_URL}/api/telephony/trunks/${phoneMapping.livekitOutboundTrunkId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        errors.push(`Failed to delete outbound trunk ${phoneMapping.livekitOutboundTrunkId}: ${res.status}`);
      }
    } catch (err) {
      errors.push(`Error deleting outbound trunk: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  // Release Magnus DID
  if (phoneMapping.magnusDidId || phoneMapping.phoneNumber) {
    const didNumber = phoneMapping.phoneNumber.replace(/[^0-9]/g, "");
    try {
      const res = await fetch(
        `${VOICE_SERVICE_URL}/api/magnus/dids/${didNumber}`,
        { method: "DELETE" }
      );
      if (!res.ok && res.status !== 404) {
        errors.push(`Failed to release DID ${didNumber}: ${res.status}`);
      }
    } catch (err) {
      errors.push(`Error releasing DID: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return { success: errors.length === 0, errors };
}

// GET single agent
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get brand info
    const brand = await prisma.brand.findUnique({
      where: { id: agent.brandId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ...agent, brand });
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// PATCH update agent
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    // Verify ownership
    const existing = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();

    // Only allow updating fields that exist on the model
    const { name, systemPrompt, voiceId, isActive, settings, ttsProvider, ttsModel, ttsVoiceId } = body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    if (voiceId !== undefined) updateData.voiceId = voiceId;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (settings !== undefined) updateData.settings = settings;
    // TTS provider settings (ElevenLabs, OpenAI, Cartesia, Deepgram)
    if (ttsProvider !== undefined) updateData.ttsProvider = ttsProvider;
    if (ttsModel !== undefined) updateData.ttsModel = ttsModel;
    if (ttsVoiceId !== undefined) updateData.ttsVoiceId = ttsVoiceId;

    const agent = await prisma.voiceAgent.update({
      where: { id },
      data: updateData,
    });

    const brand = await prisma.brand.findUnique({
      where: { id: agent.brandId },
      select: { id: true, name: true },
    });

    return NextResponse.json({ ...agent, brand });
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE agent
// Query params:
// - deletePhoneNumbers=true: Also delete phone numbers and release all resources
// - deletePhoneNumbers=false (default): Phone numbers go back to pool (agentId set to null)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getUserOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const deletePhoneNumbers = searchParams.get("deletePhoneNumbers") === "true";

    // Get brand IDs for this org
    const brands = await prisma.brand.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });
    const brandIds = brands.map((b) => b.id);

    // Verify ownership
    const existing = await prisma.voiceAgent.findFirst({
      where: {
        id,
        brandId: { in: brandIds },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Get phone mappings for this agent
    const phoneMappings = await prisma.phoneMapping.findMany({
      where: { agentId: id },
      select: {
        id: true,
        phoneNumber: true,
        livekitTrunkId: true,
        livekitOutboundTrunkId: true,
        livekitDispatchRuleId: true,
        magnusDidId: true,
      },
    });

    const cleanupErrors: string[] = [];
    const releasedNumbers: string[] = [];
    const pooledNumbers: string[] = [];

    if (deletePhoneNumbers && phoneMappings.length > 0) {
      // Delete phone numbers and release all resources
      for (const mapping of phoneMappings) {
        const result = await cleanupPhoneResources(mapping);
        if (!result.success) {
          cleanupErrors.push(...result.errors);
        }
        releasedNumbers.push(mapping.phoneNumber);
      }

      // Delete phone mapping records
      await prisma.phoneMapping.deleteMany({
        where: { agentId: id },
      });
    } else {
      // Just unlink from agent (goes back to pool)
      // Prisma handles this automatically with onDelete: SetNull
      pooledNumbers.push(...phoneMappings.map((m) => m.phoneNumber));
    }

    // Delete the agent
    await prisma.voiceAgent.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      deletedAgent: existing.name,
      phoneNumbersReleased: releasedNumbers,
      phoneNumbersPooled: pooledNumbers,
      cleanupErrors: cleanupErrors.length > 0 ? cleanupErrors : undefined,
    });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}

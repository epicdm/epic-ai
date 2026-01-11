/**
 * Provision Phone Number for Voice Agent API
 *
 * POST /api/voice/agents/[id]/provision-phone
 * Provisions a Magnus SIP user and DID for an existing voice agent
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// Voice service URL for Magnus Billing integration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

interface ProvisioningResult {
  success: boolean;
  magnus_user_id?: string;
  magnus_sip_id?: string;
  magnus_did_id?: string;
  did_number?: string;
  sip_username?: string;
  sip_password?: string;
  sip_server?: string;
  sip_url?: string;
  error?: string;
}

export async function POST(
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

    // Get user info for provisioning
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    // Find the agent and verify ownership
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        id,
        organizationId: org.id,
      },
      include: {
        phoneMappings: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if agent already has a phone number
    if (agent.phoneMappings.length > 0) {
      return NextResponse.json(
        { error: "Agent already has a phone number assigned" },
        { status: 400 }
      );
    }

    // Call voice service to provision Magnus resources
    console.log(`Provisioning Magnus resources for existing agent ${agent.id}`);

    const provisionResponse = await fetch(
      `${VOICE_SERVICE_URL}/api/magnus/provision-agent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agent.id,
          agent_name: agent.name,
          email: user?.email || `agent-${agent.id}@epic.dm`,
          organization_id: org.id,
        }),
      }
    );

    if (!provisionResponse.ok) {
      const errorText = await provisionResponse.text();
      console.error("Voice service error:", errorText);
      return NextResponse.json(
        { error: "Failed to provision phone number" },
        { status: 500 }
      );
    }

    const provisionResult: ProvisioningResult = await provisionResponse.json();

    if (!provisionResult.success || !provisionResult.sip_username) {
      return NextResponse.json(
        { error: provisionResult.error || "Provisioning failed" },
        { status: 500 }
      );
    }

    // Create SIPConfig with Magnus credentials
    const sipConfig = await prisma.sIPConfig.create({
      data: {
        name: `${agent.name} SIP`,
        organizationId: org.id,
        provider: "magnus",
        sipUrl: provisionResult.sip_url || `sip:${provisionResult.sip_username}@${provisionResult.sip_server}`,
        sipUsername: provisionResult.sip_username,
        sipPassword: provisionResult.sip_password || "",
        magnusTrunkId: provisionResult.magnus_sip_id,
      },
    });

    // Create PhoneMapping linking agent to DID
    let phoneMapping = null;
    if (provisionResult.did_number) {
      phoneMapping = await prisma.phoneMapping.create({
        data: {
          phoneNumber: provisionResult.did_number,
          organizationId: org.id,
          agentId: agent.id,
          sipConfigId: sipConfig.id,
          magnusDidId: provisionResult.magnus_did_id,
          magnusStatus: "active",
          isActive: true,
        },
      });

      console.log(`Provisioned DID ${provisionResult.did_number} for agent ${agent.id}`);
    }

    return NextResponse.json({
      success: true,
      phoneNumber: phoneMapping
        ? {
            id: phoneMapping.id,
            number: phoneMapping.phoneNumber,
          }
        : null,
      sipConfig: {
        id: sipConfig.id,
        name: sipConfig.name,
      },
    });
  } catch (error) {
    console.error("Error provisioning phone:", error);
    return NextResponse.json(
      { error: "Failed to provision phone number" },
      { status: 500 }
    );
  }
}

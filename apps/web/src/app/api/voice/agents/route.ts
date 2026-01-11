/**
 * Voice Agents API
 *
 * When creating a new voice agent, this API:
 * 1. Creates the VoiceAgent record
 * 2. Provisions a Magnus SIP user and DID via voice service
 * 3. Creates SIPConfig with returned credentials
 * 4. Creates PhoneMapping linking agent to DID
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { generateDemoVoiceAgent } from "@/lib/demo/sample-data";

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

// GET all agents for the organization
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is in demo mode
    const progress = await prisma.userOnboardingProgress.findUnique({
      where: { userId },
      select: { isDemoMode: true },
    });

    if (progress?.isDemoMode) {
      const demoAgent = generateDemoVoiceAgent("Demo Company");
      return NextResponse.json({
        agents: [demoAgent],
        isDemo: true,
      });
    }

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Query agents directly by organizationId with all required relations
    const agents = await prisma.voiceAgent.findMany({
      where: {
        organizationId: org.id,
      },
      include: {
        phoneMappings: {
          select: { id: true, phoneNumber: true },
        },
        _count: {
          select: { callLogs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend expectations
    const agentsWithBrand = await Promise.all(
      agents.map(async (agent) => {
        const brand = agent.brandId
          ? await prisma.brand.findUnique({
              where: { id: agent.brandId },
              select: { id: true, name: true },
            })
          : null;

        return {
          ...agent,
          brand: brand || { id: "", name: "No Brand" },
          phoneNumbers: agent.phoneMappings.map((pm) => ({
            id: pm.id,
            number: pm.phoneNumber,
          })),
          isDeployed: agent.status === "deployed",
          _count: { calls: agent._count.callLogs },
        };
      })
    );

    return NextResponse.json({ agents: agentsWithBrand });
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST create new agent
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const org = await getCurrentOrganization();
    if (!org) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Get user info for provisioning
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    const body = await request.json();
    const { name, brandId, systemPrompt, voiceId, isActive, settings, provisionPhone } = body;

    // Validate brand belongs to org
    const brand = await prisma.brand.findFirst({
      where: {
        id: brandId,
        organizationId: org.id,
      },
    });

    if (!brand) {
      return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
    }

    // Create the agent first
    const agent = await prisma.voiceAgent.create({
      data: {
        name,
        organizationId: org.id,
        brandId,
        systemPrompt: systemPrompt || "You are a helpful AI assistant.",
        voiceId,
        isActive: isActive ?? true,
        settings: settings || {},
      },
    });

    let phoneMapping = null;
    let sipConfig = null;
    let provisioningError = null;

    // Provision Magnus SIP user and DID if requested (default: true)
    if (provisionPhone !== false) {
      try {
        console.log(`Provisioning Magnus resources for agent ${agent.id}`);

        const provisionResponse = await fetch(
          `${VOICE_SERVICE_URL}/api/magnus/provision-agent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agent_id: agent.id,
              agent_name: name,
              email: user?.email || `agent-${agent.id}@epic.dm`,
              organization_id: org.id,
            }),
          }
        );

        if (provisionResponse.ok) {
          const provisionResult: ProvisioningResult = await provisionResponse.json();

          if (provisionResult.success && provisionResult.sip_username) {
            // Create SIPConfig with Magnus credentials
            sipConfig = await prisma.sIPConfig.create({
              data: {
                name: `${name} SIP`,
                organizationId: org.id,
                provider: "magnus",
                sipUrl: provisionResult.sip_url || `sip:${provisionResult.sip_username}@${provisionResult.sip_server}`,
                sipUsername: provisionResult.sip_username,
                sipPassword: provisionResult.sip_password || "",
                magnusTrunkId: provisionResult.magnus_sip_id,
              },
            });

            // Create PhoneMapping linking agent to DID
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
          } else {
            provisioningError = provisionResult.error || "Provisioning returned unsuccessful";
            console.warn(`Provisioning failed for agent ${agent.id}:`, provisioningError);
          }
        } else {
          const errorText = await provisionResponse.text();
          provisioningError = `Voice service error: ${provisionResponse.status}`;
          console.warn(`Provisioning request failed for agent ${agent.id}:`, errorText);
        }
      } catch (error) {
        provisioningError = error instanceof Error ? error.message : "Provisioning error";
        console.warn(`Error during provisioning for agent ${agent.id}:`, error);
        // Continue - agent was created, just without phone
      }
    }

    return NextResponse.json(
      {
        ...agent,
        brand: { id: brand.id, name: brand.name },
        phoneNumbers: phoneMapping
          ? [{ id: phoneMapping.id, number: phoneMapping.phoneNumber }]
          : [],
        sipConfig: sipConfig
          ? { id: sipConfig.id, name: sipConfig.name }
          : null,
        provisioningError,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

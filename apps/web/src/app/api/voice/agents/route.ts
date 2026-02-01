/**
 * Voice Agents API
 *
 * When creating a new voice agent, this API:
 * 1. Creates the VoiceAgent record
 * 2. Provisions a Magnus SIP user and DID via voice service
 * 3. Creates SIPConfig with returned credentials
 * 4. Creates PhoneMapping linking agent to DID
 *
 * Enhanced error reporting provides structured error responses with:
 * - Error codes for programmatic handling
 * - User-friendly messages
 * - Diagnostic details for debugging
 * - Retry recommendations
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@epic-ai/database";
import { getAuthWithBypass, getCurrentOrganization } from "@/lib/auth";
import { generateDemoVoiceAgent } from "@/lib/demo/sample-data";
import { provisionLiveKitResources } from "@/lib/services/voice/livekit-provisioning";

// Voice service URL for Magnus Billing integration
// In production (Vercel), default to DigitalOcean App Platform voice service
// In development, default to local Flask server
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL ||
  (process.env.VOICE_SERVICE_URL || "http://localhost:5000");

// Timeout for voice service requests (30 seconds)
const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * Error codes for voice agent provisioning
 */
export enum ProvisioningErrorCode {
  // Network/connectivity errors
  VOICE_SERVICE_UNREACHABLE = "VOICE_SERVICE_UNREACHABLE",
  VOICE_SERVICE_TIMEOUT = "VOICE_SERVICE_TIMEOUT",
  VOICE_SERVICE_ERROR = "VOICE_SERVICE_ERROR",

  // DID/Phone errors
  DID_RANGE_EXHAUSTED = "DID_RANGE_EXHAUSTED",
  DID_CREATION_FAILED = "DID_CREATION_FAILED",
  DID_RACE_CONDITION = "DID_RACE_CONDITION",

  // SIP errors
  SIP_CREATION_FAILED = "SIP_CREATION_FAILED",
  SIP_CONFIGURATION_FAILED = "SIP_CONFIGURATION_FAILED",

  // Magnus errors
  MAGNUS_API_ERROR = "MAGNUS_API_ERROR",
  MAGNUS_AUTH_FAILED = "MAGNUS_AUTH_FAILED",
  MAGNUS_NOT_CONFIGURED = "MAGNUS_NOT_CONFIGURED",

  // General errors
  PROVISIONING_FAILED = "PROVISIONING_FAILED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Structured provisioning error for client consumption
 */
interface ProvisioningError {
  code: ProvisioningErrorCode;
  message: string;
  details?: string;
  retryable: boolean;
  suggestedAction?: string;
}

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
  error_code?: string;
  race_conditions_encountered?: number;
  is_exhausted?: boolean;
  utilization_percent?: number;
}

/**
 * Parse error message to extract structured error information.
 * Analyzes the error message from the voice service to determine error type.
 */
function parseProvisioningError(
  errorMessage: string,
  provisionResult?: ProvisioningResult,
  httpStatus?: number
): ProvisioningError {
  const errorLower = errorMessage.toLowerCase();

  // Check for DID range exhaustion
  if (
    errorLower.includes("exhausted") ||
    errorLower.includes("range is completely exhausted") ||
    errorLower.includes("no available dids") ||
    provisionResult?.is_exhausted
  ) {
    return {
      code: ProvisioningErrorCode.DID_RANGE_EXHAUSTED,
      message: "No phone numbers available",
      details: `The phone number range is fully allocated. ${provisionResult?.utilization_percent ? `Current utilization: ${provisionResult.utilization_percent}%` : ""}`,
      retryable: false,
      suggestedAction: "Contact support to expand the available phone number range or release unused numbers.",
    };
  }

  // Check for race condition / duplicate DID
  if (
    errorLower.includes("race condition") ||
    errorLower.includes("duplicate entry") ||
    errorLower.includes("already exists")
  ) {
    const raceCount = provisionResult?.race_conditions_encountered || 0;
    return {
      code: ProvisioningErrorCode.DID_RACE_CONDITION,
      message: "Phone number allocation conflict",
      details: `A race condition occurred during phone number allocation. Attempts: ${raceCount}`,
      retryable: true,
      suggestedAction: "Please try again. This is a temporary issue caused by concurrent requests.",
    };
  }

  // Check for Magnus API authentication issues
  if (
    errorLower.includes("unauthorized") ||
    errorLower.includes("authentication failed") ||
    errorLower.includes("invalid credentials") ||
    httpStatus === 401
  ) {
    return {
      code: ProvisioningErrorCode.MAGNUS_AUTH_FAILED,
      message: "Phone system authentication failed",
      details: "Unable to authenticate with the phone provisioning system.",
      retryable: false,
      suggestedAction: "Contact support to verify phone system credentials.",
    };
  }

  // Check for Magnus not configured
  if (
    errorLower.includes("not configured") ||
    errorLower.includes("magnus billing not configured")
  ) {
    return {
      code: ProvisioningErrorCode.MAGNUS_NOT_CONFIGURED,
      message: "Phone system not configured",
      details: "The phone provisioning system is not properly configured.",
      retryable: false,
      suggestedAction: "Contact support to configure the phone system integration.",
    };
  }

  // Check for SIP-related errors
  if (
    errorLower.includes("sip account not found") ||
    errorLower.includes("sip creation failed")
  ) {
    return {
      code: ProvisioningErrorCode.SIP_CREATION_FAILED,
      message: "Failed to create SIP account",
      details: errorMessage,
      retryable: true,
      suggestedAction: "Please try again. If the issue persists, contact support.",
    };
  }

  // Check for DID creation errors
  if (
    errorLower.includes("did creation failed") ||
    errorLower.includes("failed to create did")
  ) {
    return {
      code: ProvisioningErrorCode.DID_CREATION_FAILED,
      message: "Failed to allocate phone number",
      details: errorMessage,
      retryable: true,
      suggestedAction: "Please try again. If the issue persists, contact support.",
    };
  }

  // Check for general Magnus API errors
  if (
    errorLower.includes("magnus") ||
    errorLower.includes("billing")
  ) {
    return {
      code: ProvisioningErrorCode.MAGNUS_API_ERROR,
      message: "Phone system error",
      details: errorMessage,
      retryable: true,
      suggestedAction: "Please try again. If the issue persists, contact support.",
    };
  }

  // Default to unknown provisioning error
  return {
    code: ProvisioningErrorCode.PROVISIONING_FAILED,
    message: "Failed to provision phone number",
    details: errorMessage,
    retryable: true,
    suggestedAction: "Please try again. If the issue persists, contact support.",
  };
}

/**
 * Classify network/fetch errors into structured provisioning errors.
 */
function classifyFetchError(error: unknown): ProvisioningError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorLower = errorMessage.toLowerCase();

  // Timeout errors
  if (
    errorLower.includes("timeout") ||
    errorLower.includes("aborted") ||
    errorLower.includes("timed out")
  ) {
    return {
      code: ProvisioningErrorCode.VOICE_SERVICE_TIMEOUT,
      message: "Phone provisioning request timed out",
      details: `The request to the voice service timed out after ${VOICE_SERVICE_TIMEOUT_MS / 1000} seconds.`,
      retryable: true,
      suggestedAction: "Please try again. The service may be temporarily slow.",
    };
  }

  // Connection errors
  if (
    errorLower.includes("econnrefused") ||
    errorLower.includes("enotfound") ||
    errorLower.includes("network") ||
    errorLower.includes("fetch failed") ||
    errorLower.includes("connect")
  ) {
    return {
      code: ProvisioningErrorCode.VOICE_SERVICE_UNREACHABLE,
      message: "Unable to reach phone provisioning service",
      details: "The voice service is currently unavailable.",
      retryable: true,
      suggestedAction: "Please try again in a few moments. If the issue persists, contact support.",
    };
  }

  // Generic service error
  return {
    code: ProvisioningErrorCode.VOICE_SERVICE_ERROR,
    message: "Phone provisioning service error",
    details: errorMessage,
    retryable: true,
    suggestedAction: "Please try again. If the issue persists, contact support.",
  };
}

/**
 * Create AbortController with timeout for fetch requests.
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

// GET all agents for the organization
export async function GET() {
  try {
    const { userId } = await getAuthWithBypass();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[GET /api/voice/agents] User ID:", userId);

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
    console.log("[GET /api/voice/agents] Organization:", org ? `${org.name} (${org.id})` : "null");

    if (!org) {
      // No organization found - let's check all agents for this user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          memberships: {
            include: {
              organization: true,
            },
          },
        },
      });

      console.log("[GET /api/voice/agents] User memberships:", user?.memberships.length || 0);

      if (user?.memberships && user.memberships.length > 0) {
        // User has memberships but getCurrentOrganization() returned null
        // This is the bug! Let's get all org IDs and query agents
        const orgIds = user.memberships.map(m => m.organizationId);
        console.log("[GET /api/voice/agents] Organization IDs:", orgIds);

        const agents = await prisma.voiceAgent.findMany({
          where: {
            organizationId: { in: orgIds },
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

        console.log("[GET /api/voice/agents] Found agents (fallback):", agents.length);

        // Transform and return
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
      }

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

    console.log("[GET /api/voice/agents] Found agents:", agents.length);

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

    // Get organization with fallback
    let org = await getCurrentOrganization();
    if (!org) {
      // Fallback: get first membership's organization
      const userWithMemberships = await prisma.user.findUnique({
        where: { id: userId },
        include: { memberships: { include: { organization: true }, take: 1 } }
      });
      if (userWithMemberships?.memberships?.[0]?.organization) {
        org = userWithMemberships.memberships[0].organization;
        console.log("[agents POST] Using fallback org:", org.id, org.name);
      } else {
        return NextResponse.json({ error: "No organization" }, { status: 404 });
      }
    }

    // Get user info for provisioning
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });

    const body = await request.json();
    const { name, brandId, systemPrompt, voiceId, isActive, settings, provisionPhone, ttsProvider, ttsModel, ttsVoiceId } = body;

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
        // TTS provider settings (ElevenLabs, OpenAI, Cartesia, Deepgram)
        ttsProvider: ttsProvider || "openai",
        ttsModel: ttsModel || null,
        ttsVoiceId: ttsVoiceId || voiceId || null,
      },
    });

    let phoneMapping = null;
    let sipConfig = null;
    let provisioningError: ProvisioningError | null = null;
    let provisioningDetails: {
      raceConditionsEncountered?: number;
      utilizationPercent?: number;
    } | null = null;

    // Provision Magnus SIP and DID if requested (default: true)
    // IMPORTANT: Each organization has ONE Magnus user for billing.
    // Each voice agent gets its own SIP account and DID under that user.
    if (provisionPhone !== false) {
      try {
        console.log(`[Agent ${agent.id}] Starting Magnus provisioning...`);
        console.log(`[Agent ${agent.id}] Voice service URL: ${VOICE_SERVICE_URL}`);

        // Re-fetch org to get current magnus_user_id (might have been set by concurrent request)
        const currentOrg = await prisma.organization.findUnique({
          where: { id: org.id },
          select: { id: true, name: true, magnusUserId: true, magnusUsername: true },
        });

        let magnusUserId = currentOrg?.magnusUserId;

        // Step 1: Ensure organization has a Magnus user for billing
        if (!magnusUserId) {
          console.log(`[Agent ${agent.id}] Organization ${org.id} has no Magnus user. Creating one...`);

          const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
          const createUserResponse = await fetch(
            `${VOICE_SERVICE_URL}/api/magnus/create-org-user`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                org_id: org.id,
                org_name: org.name,
                email: user?.email || `billing-${org.id}@epic.dm`,
              }),
              signal: controller.signal,
            }
          );

          let createUserResult: { success: boolean; magnus_user_id?: string; magnus_username?: string; error?: string } | null = null;
          try {
            createUserResult = await createUserResponse.json();
          } catch {
            console.error(`[Agent ${agent.id}] Failed to parse create-org-user response`);
          }

          if (createUserResponse.ok && createUserResult?.success && createUserResult.magnus_user_id) {
            magnusUserId = createUserResult.magnus_user_id;
            console.log(`[Agent ${agent.id}] Created Magnus org user: ${magnusUserId} (${createUserResult.magnus_username})`);

            // Save to organization for future agents
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                magnusUserId: createUserResult.magnus_user_id,
                magnusUsername: createUserResult.magnus_username,
              },
            });
          } else {
            const errorMessage = createUserResult?.error || "Failed to create organization Magnus user";
            console.error(`[Agent ${agent.id}] Failed to create org user: ${errorMessage}`);

            provisioningError = {
              code: ProvisioningErrorCode.MAGNUS_API_ERROR,
              message: "Failed to create billing account",
              details: errorMessage,
              retryable: true,
              suggestedAction: "Try creating the agent again. If the problem persists, contact support.",
            };
          }
        } else {
          console.log(`[Agent ${agent.id}] Using existing Magnus org user: ${magnusUserId}`);
        }

        // Step 2: If we have a Magnus user, provision SIP and DID for this agent
        if (magnusUserId && !provisioningError) {
          const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);

          const provisionResponse = await fetch(
            `${VOICE_SERVICE_URL}/api/magnus/provision-sip-did`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                magnus_user_id: magnusUserId,
                agent_id: agent.id,
                agent_name: name,
                email: user?.email || `agent-${agent.id}@epic.dm`,
              }),
              signal: controller.signal,
            }
          );

          // Parse the response
          let provisionResult: ProvisioningResult | null = null;
          let responseText = "";

          try {
            responseText = await provisionResponse.text();
            provisionResult = JSON.parse(responseText);
          } catch {
            // Response is not JSON
            console.warn(`[Agent ${agent.id}] Non-JSON response from voice service: ${responseText.substring(0, 200)}`);
          }

          if (provisionResponse.ok && provisionResult?.success && provisionResult.sip_username) {
            // SUCCESS: SIP/DID provisioning completed
            console.log(`[Agent ${agent.id}] SIP/DID provisioning successful`);

            // Track provisioning details for logging
            if (provisionResult.race_conditions_encountered) {
              provisioningDetails = {
                raceConditionsEncountered: provisionResult.race_conditions_encountered,
                utilizationPercent: provisionResult.utilization_percent,
              };
              console.log(`[Agent ${agent.id}] Provisioning succeeded after ${provisionResult.race_conditions_encountered} race condition(s)`);
            }

            // Create SIPConfig with Magnus credentials
            // Note: magnus_user_id is the org's user, magnus_sip_id is this agent's SIP account
            sipConfig = await prisma.sIPConfig.create({
              data: {
                name: `${name} SIP`,
                organizationId: org.id,
                provider: "magnus",
                sipUrl: provisionResult.sip_url || `sip:${provisionResult.sip_username}@${provisionResult.sip_server}`,
                sipUsername: provisionResult.sip_username,
                sipPassword: provisionResult.sip_password || "",
                magnusTrunkId: provisionResult.magnus_sip_id,
                magnusAccountId: magnusUserId, // Store org's Magnus user ID
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

              console.log(`[Agent ${agent.id}] Provisioned DID ${provisionResult.did_number} under org user ${magnusUserId}`);

              // Step 3: Provision LiveKit resources (inbound/outbound trunks + dispatch rule)
              console.log(`[Agent ${agent.id}] Starting LiveKit provisioning...`);
              const livekitResult = await provisionLiveKitResources({
                phoneNumber: provisionResult.did_number,
                organizationId: org.id,
                agentId: agent.id,
                userId,
                sipUsername: provisionResult.sip_username,
                sipPassword: provisionResult.sip_password,
                sipDomain: provisionResult.sip_server,
              });

              // Update PhoneMapping with LiveKit IDs
              if (livekitResult.inboundTrunkId || livekitResult.outboundTrunkId || livekitResult.dispatchRuleId) {
                await prisma.phoneMapping.update({
                  where: { id: phoneMapping.id },
                  data: {
                    livekitTrunkId: livekitResult.inboundTrunkId || undefined,
                    livekitOutboundTrunkId: livekitResult.outboundTrunkId || undefined,
                    livekitDispatchRuleId: livekitResult.dispatchRuleId || undefined,
                  },
                });
                console.log(`[Agent ${agent.id}] LiveKit provisioning complete: inbound=${livekitResult.inboundTrunkId}, outbound=${livekitResult.outboundTrunkId}, rule=${livekitResult.dispatchRuleId}`);
              }

              // Add warnings to provisioningDetails if there were LiveKit issues
              if (livekitResult.warnings.length > 0) {
                provisioningDetails = {
                  ...provisioningDetails,
                  livekitWarnings: livekitResult.warnings,
                };
              }
            }
          } else {
            // FAILURE: Parse and structure the error
            const errorMessage = provisionResult?.error || responseText || "SIP/DID provisioning failed";

            provisioningError = parseProvisioningError(
              errorMessage,
              provisionResult || undefined,
              provisionResponse.status
            );

            // Log structured error details
            console.warn(`[Agent ${agent.id}] SIP/DID provisioning failed:`, {
              code: provisioningError.code,
              message: provisioningError.message,
              details: provisioningError.details,
              httpStatus: provisionResponse.status,
              retryable: provisioningError.retryable,
            });

            // Track additional details if available
            if (provisionResult) {
              provisioningDetails = {
                raceConditionsEncountered: provisionResult.race_conditions_encountered,
                utilizationPercent: provisionResult.utilization_percent,
              };
            }
          }
        }
      } catch (error) {
        // Network/fetch error - classify it
        provisioningError = classifyFetchError(error);

        console.warn(`[Agent ${agent.id}] Provisioning network error:`, {
          code: provisioningError.code,
          message: provisioningError.message,
          originalError: error instanceof Error ? error.message : String(error),
        });
        // Continue - agent was created, just without phone
      }
    }

    // Build the response
    const response: Record<string, unknown> = {
      ...agent,
      brand: { id: brand.id, name: brand.name },
      phoneNumbers: phoneMapping
        ? [{ id: phoneMapping.id, number: phoneMapping.phoneNumber }]
        : [],
      sipConfig: sipConfig
        ? { id: sipConfig.id, name: sipConfig.name }
        : null,
    };

    // Add provisioning error if present (structured format)
    if (provisioningError) {
      response.provisioningError = {
        code: provisioningError.code,
        message: provisioningError.message,
        details: provisioningError.details,
        retryable: provisioningError.retryable,
        suggestedAction: provisioningError.suggestedAction,
      };

      // Add diagnostic details if available
      if (provisioningDetails) {
        response.provisioningDiagnostics = provisioningDetails;
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}

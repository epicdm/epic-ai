/**
 * Provision Phone Number for Voice Agent API
 *
 * POST /api/voice/agents/[id]/provision-phone
 * Provisions a Magnus SIP user and DID for an existing voice agent
 *
 * Features:
 * - Timeout configuration to prevent hanging requests
 * - Retry logic for transient failures
 * - Structured error responses with error codes
 * - Detailed diagnostic information
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthWithBypass } from "@/lib/auth";
import { prisma } from "@epic-ai/database";
import { getUserOrganization } from "@/lib/sync-user";

// Voice service URL - auto-detects production (Vercel) vs development
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL ||
  (process.env.VERCEL ? "https://epic-ai-platform-zcjiu.ondigitalocean.app/voice" : "http://localhost:5000");

// Timeout for voice service requests (30 seconds)
const VOICE_SERVICE_TIMEOUT_MS = 30000;

// Maximum number of retry attempts for transient errors
const MAX_RETRY_ATTEMPTS = 3;

// Delay between retries (in milliseconds)
const RETRY_DELAY_MS = 1000;

/**
 * Error codes for phone provisioning
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
  AGENT_ALREADY_HAS_PHONE = "AGENT_ALREADY_HAS_PHONE",
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
 * Create AbortController with timeout for fetch requests.
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse error message to extract structured error information.
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
 * Determine if an error is retryable
 */
function isRetryableError(error: ProvisioningError): boolean {
  return error.retryable && (
    error.code === ProvisioningErrorCode.VOICE_SERVICE_TIMEOUT ||
    error.code === ProvisioningErrorCode.VOICE_SERVICE_ERROR ||
    error.code === ProvisioningErrorCode.VOICE_SERVICE_UNREACHABLE ||
    error.code === ProvisioningErrorCode.DID_RACE_CONDITION ||
    error.code === ProvisioningErrorCode.SIP_CREATION_FAILED ||
    error.code === ProvisioningErrorCode.DID_CREATION_FAILED
  );
}

/**
 * Create LiveKit inbound trunk for a phone number.
 * This allows LiveKit to receive calls for this number.
 */
async function createLiveKitInboundTrunk(
  phoneNumber: string,
  organizationId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    console.log(`[LiveKit] Creating inbound trunk for ${phoneNumber}`);

    const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/inbound`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_numbers: [phoneNumber],
          organization_id: organizationId,
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`[LiveKit] Created inbound trunk: ${result.trunk_id}`);
      return { success: true, trunkId: result.trunk_id };
    }

    console.warn(`[LiveKit] Failed to create inbound trunk: ${result.error}`);
    return { success: false, error: result.error || "Failed to create inbound trunk" };
  } catch (error) {
    console.error(`[LiveKit] Error creating inbound trunk:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create LiveKit dispatch rule to route calls to the AI agent.
 * This routes incoming calls from a phone number to the voice agent.
 */
async function createLiveKitDispatchRule(
  phoneNumber: string,
  trunkId: string | undefined,
  agentId: string,
  organizationId: string,
  userId: string
): Promise<{ success: boolean; ruleId?: string; error?: string }> {
  try {
    console.log(`[LiveKit] Creating dispatch rule for ${phoneNumber} -> epic-voice-agent`);

    const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: "epic-voice-agent", // Generic LiveKit agent that handles all calls
          phone_numbers: [phoneNumber],
          trunk_ids: trunkId ? [trunkId] : undefined,
          organization_id: organizationId,
          user_id: userId,
          agent_id: agentId, // Pass agent ID so worker can fetch per-agent config
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`[LiveKit] Created dispatch rule: ${result.rule_id}`);
      return { success: true, ruleId: result.rule_id };
    }

    console.warn(`[LiveKit] Failed to create dispatch rule: ${result.error}`);
    return { success: false, error: result.error || "Failed to create dispatch rule" };
  } catch (error) {
    console.error(`[LiveKit] Error creating dispatch rule:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Ensure organization has a Magnus user for billing.
 * Creates one if it doesn't exist.
 */
async function ensureOrganizationMagnusUser(
  orgId: string,
  orgName: string,
  email: string
): Promise<{
  success: boolean;
  magnusUserId?: string;
  error?: ProvisioningError;
}> {
  console.log(`[Org ${orgId}] Ensuring Magnus user exists...`);

  const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
  const createUserResponse = await fetch(
    `${VOICE_SERVICE_URL}/api/magnus/create-org-user`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        org_id: orgId,
        org_name: orgName,
        email: email,
      }),
      signal: controller.signal,
    }
  );

  let createUserResult: { success: boolean; magnus_user_id?: string; magnus_username?: string; error?: string } | null = null;
  try {
    createUserResult = await createUserResponse.json();
  } catch {
    console.error(`[Org ${orgId}] Failed to parse create-org-user response`);
  }

  if (createUserResponse.ok && createUserResult?.success && createUserResult.magnus_user_id) {
    console.log(`[Org ${orgId}] Created/got Magnus user: ${createUserResult.magnus_user_id} (${createUserResult.magnus_username})`);

    // Save to organization for future use
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        magnusUserId: createUserResult.magnus_user_id,
        magnusUsername: createUserResult.magnus_username,
      },
    });

    return {
      success: true,
      magnusUserId: createUserResult.magnus_user_id,
    };
  }

  return {
    success: false,
    error: {
      code: ProvisioningErrorCode.MAGNUS_API_ERROR,
      message: "Failed to create billing account",
      details: createUserResult?.error || "Failed to create organization Magnus user",
      retryable: true,
      suggestedAction: "Try creating the agent again. If the problem persists, contact support.",
    },
  };
}

/**
 * Call the voice service to provision SIP and DID with timeout and retry support.
 * Uses the org-level Magnus user (one user per organization, multiple SIP/DIDs per agent).
 * Returns a structured result with either success data or error information.
 */
async function callVoiceServiceWithRetry(
  magnusUserId: string,
  agentId: string,
  agentName: string,
  email: string
): Promise<{
  success: boolean;
  result?: ProvisioningResult;
  error?: ProvisioningError;
  attemptsMade: number;
}> {
  let lastError: ProvisioningError | null = null;
  let attemptsMade = 0;

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    attemptsMade = attempt + 1;

    // Add delay between retries (not on first attempt)
    if (attempt > 0) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
      console.log(`[Agent ${agentId}] Retry attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS} after ${delayMs}ms delay`);
      await sleep(delayMs);
    }

    try {
      console.log(`[Agent ${agentId}] SIP/DID provisioning attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`);

      // Create abort controller for timeout
      const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);

      // Call provision-sip-did endpoint (not provision-agent which creates users)
      const provisionResponse = await fetch(
        `${VOICE_SERVICE_URL}/api/magnus/provision-sip-did`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            magnus_user_id: magnusUserId,
            agent_id: agentId,
            agent_name: agentName,
            email: email,
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
        console.warn(`[Agent ${agentId}] Non-JSON response from voice service: ${responseText.substring(0, 200)}`);
      }

      if (provisionResponse.ok && provisionResult?.success && provisionResult.sip_username) {
        // SUCCESS
        console.log(`[Agent ${agentId}] SIP/DID provisioning successful on attempt ${attempt + 1}`);
        return {
          success: true,
          result: provisionResult,
          attemptsMade,
        };
      }

      // FAILURE: Parse and structure the error
      const errorMessage = provisionResult?.error || responseText || "SIP/DID provisioning failed";
      lastError = parseProvisioningError(
        errorMessage,
        provisionResult || undefined,
        provisionResponse.status
      );

      console.warn(`[Agent ${agentId}] SIP/DID provisioning attempt ${attempt + 1} failed:`, {
        code: lastError.code,
        message: lastError.message,
        httpStatus: provisionResponse.status,
        retryable: lastError.retryable,
      });

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        console.log(`[Agent ${agentId}] Non-retryable error, stopping retries`);
        return {
          success: false,
          error: lastError,
          attemptsMade,
        };
      }
    } catch (fetchError) {
      // Network/fetch error - classify it
      lastError = classifyFetchError(fetchError);

      console.warn(`[Agent ${agentId}] SIP/DID provisioning attempt ${attempt + 1} network error:`, {
        code: lastError.code,
        message: lastError.message,
        originalError: fetchError instanceof Error ? fetchError.message : String(fetchError),
      });

      // Check if error is retryable
      if (!isRetryableError(lastError)) {
        console.log(`[Agent ${agentId}] Non-retryable network error, stopping retries`);
        return {
          success: false,
          error: lastError,
          attemptsMade,
        };
      }
    }
  }

  // All retries exhausted
  console.error(`[Agent ${agentId}] All ${MAX_RETRY_ATTEMPTS} SIP/DID provisioning attempts failed`);
  return {
    success: false,
    error: lastError || {
      code: ProvisioningErrorCode.PROVISIONING_FAILED,
      message: "Failed to provision phone number after multiple attempts",
      details: `Exhausted all ${MAX_RETRY_ATTEMPTS} retry attempts`,
      retryable: false,
      suggestedAction: "Please try again later. If the issue persists, contact support.",
    },
    attemptsMade,
  };
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
        {
          error: "Agent already has a phone number assigned",
          code: ProvisioningErrorCode.AGENT_ALREADY_HAS_PHONE,
          retryable: false,
          existingPhone: {
            id: agent.phoneMappings[0].id,
            number: agent.phoneMappings[0].phoneNumber,
          },
        },
        { status: 400 }
      );
    }

    // Call voice service to provision Magnus resources with retry logic
    // IMPORTANT: One Magnus user per org, multiple SIP/DIDs per agent
    console.log(`[Agent ${agent.id}] Starting Magnus provisioning with timeout=${VOICE_SERVICE_TIMEOUT_MS}ms, maxRetries=${MAX_RETRY_ATTEMPTS}`);
    console.log(`[Agent ${agent.id}] Voice service URL: ${VOICE_SERVICE_URL}`);

    // Step 1: Ensure organization has a Magnus user for billing
    // Re-fetch org to get current magnus_user_id (might have been set by concurrent request)
    const currentOrg = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { id: true, name: true, magnusUserId: true, magnusUsername: true },
    });

    let magnusUserId = currentOrg?.magnusUserId;

    if (!magnusUserId) {
      console.log(`[Agent ${agent.id}] Organization ${org.id} has no Magnus user. Creating one...`);
      const ensureUserResult = await ensureOrganizationMagnusUser(
        org.id,
        org.name,
        user?.email || `billing-${org.id}@epic.dm`
      );

      if (!ensureUserResult.success || !ensureUserResult.magnusUserId) {
        return NextResponse.json(
          {
            success: false,
            error: ensureUserResult.error!.message,
            code: ensureUserResult.error!.code,
            details: ensureUserResult.error!.details,
            retryable: ensureUserResult.error!.retryable,
            suggestedAction: ensureUserResult.error!.suggestedAction,
          },
          { status: 500 }
        );
      }

      magnusUserId = ensureUserResult.magnusUserId;
    } else {
      console.log(`[Agent ${agent.id}] Using existing Magnus org user: ${magnusUserId}`);
    }

    // Step 2: Provision SIP and DID for this agent under the org's Magnus user
    const provisioningResult = await callVoiceServiceWithRetry(
      magnusUserId,
      agent.id,
      agent.name,
      user?.email || `agent-${agent.id}@epic.dm`
    );

    // Handle provisioning failure
    if (!provisioningResult.success || !provisioningResult.result) {
      const error = provisioningResult.error!;
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
          retryable: error.retryable,
          suggestedAction: error.suggestedAction,
          attemptsMade: provisioningResult.attemptsMade,
        },
        { status: 500 }
      );
    }

    const result = provisioningResult.result;

    // Create SIPConfig with Magnus credentials
    // Note: magnus_user_id is the org's user, magnus_sip_id is this agent's SIP account
    const sipConfig = await prisma.sIPConfig.create({
      data: {
        name: `${agent.name} SIP`,
        organizationId: org.id,
        provider: "magnus",
        sipUrl: result.sip_url || `sip:${result.sip_username}@${result.sip_server}`,
        sipUsername: result.sip_username!,
        sipPassword: result.sip_password || "",
        magnusTrunkId: result.magnus_sip_id,
        magnusAccountId: magnusUserId, // Store org's Magnus user ID
      },
    });

    // Create PhoneMapping linking agent to DID
    let phoneMapping = null;
    if (result.did_number) {
      phoneMapping = await prisma.phoneMapping.create({
        data: {
          phoneNumber: result.did_number,
          organizationId: org.id,
          agentId: agent.id,
          sipConfigId: sipConfig.id,
          magnusDidId: result.magnus_did_id,
          magnusStatus: "active",
          isActive: true,
        },
      });

      console.log(`[Agent ${agent.id}] Provisioned DID ${result.did_number}`);
    }

    // Step 3: Create LiveKit inbound trunk and dispatch rule
    // This is necessary for LiveKit to receive and route inbound calls to the AI agent
    let livekitTrunkId: string | undefined;
    let livekitRuleId: string | undefined;
    let livekitWarnings: string[] = [];

    if (result.did_number) {
      console.log(`[Agent ${agent.id}] Setting up LiveKit telephony for ${result.did_number}`);

      // Create LiveKit inbound trunk (allows LiveKit to receive calls for this number)
      const trunkResult = await createLiveKitInboundTrunk(result.did_number, org.id);
      if (trunkResult.success) {
        livekitTrunkId = trunkResult.trunkId;
      } else {
        // Log warning but don't fail - Magnus provisioning succeeded
        console.warn(`[Agent ${agent.id}] LiveKit inbound trunk creation failed: ${trunkResult.error}`);
        livekitWarnings.push(`Inbound trunk: ${trunkResult.error}`);
      }

      // Create LiveKit dispatch rule (routes calls to the AI agent)
      const ruleResult = await createLiveKitDispatchRule(
        result.did_number,
        livekitTrunkId,
        agent.id,
        org.id,
        userId
      );
      if (ruleResult.success) {
        livekitRuleId = ruleResult.ruleId;
      } else {
        // Log warning but don't fail - Magnus provisioning succeeded
        console.warn(`[Agent ${agent.id}] LiveKit dispatch rule creation failed: ${ruleResult.error}`);
        livekitWarnings.push(`Dispatch rule: ${ruleResult.error}`);
      }

      // Update PhoneMapping with LiveKit IDs if available
      if (phoneMapping && (livekitTrunkId || livekitRuleId)) {
        await prisma.phoneMapping.update({
          where: { id: phoneMapping.id },
          data: {
            livekitTrunkId: livekitTrunkId || undefined,
            livekitDispatchRuleId: livekitRuleId || undefined,
          },
        });
      }

      if (livekitTrunkId && livekitRuleId) {
        console.log(`[Agent ${agent.id}] LiveKit telephony setup complete: trunk=${livekitTrunkId}, rule=${livekitRuleId}`);
      }
    }

    // Build success response with diagnostic info
    const response: Record<string, unknown> = {
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
      attemptsMade: provisioningResult.attemptsMade,
      livekit: {
        trunkId: livekitTrunkId || null,
        dispatchRuleId: livekitRuleId || null,
        fullyConfigured: !!(livekitTrunkId && livekitRuleId),
        warnings: livekitWarnings.length > 0 ? livekitWarnings : undefined,
      },
    };

    // Include diagnostic info if there were race conditions
    if (result.race_conditions_encountered) {
      response.diagnostics = {
        raceConditionsEncountered: result.race_conditions_encountered,
        utilizationPercent: result.utilization_percent,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error provisioning phone:", error);

    // Return structured error for unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: "Failed to provision phone number",
        code: ProvisioningErrorCode.UNKNOWN_ERROR,
        details: error instanceof Error ? error.message : String(error),
        retryable: true,
        suggestedAction: "Please try again. If the issue persists, contact support.",
      },
      { status: 500 }
    );
  }
}

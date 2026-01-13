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

// Voice service URL for Magnus Billing integration
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || "http://localhost:5000";

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
 * Call the voice service to provision Magnus resources with timeout and retry support.
 * Returns a structured result with either success data or error information.
 */
async function callVoiceServiceWithRetry(
  agentId: string,
  agentName: string,
  email: string,
  organizationId: string
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
      console.log(`[Agent ${agentId}] Provisioning attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}`);

      // Create abort controller for timeout
      const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);

      const provisionResponse = await fetch(
        `${VOICE_SERVICE_URL}/api/magnus/provision-agent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: agentId,
            agent_name: agentName,
            email: email,
            organization_id: organizationId,
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
        console.log(`[Agent ${agentId}] Provisioning successful on attempt ${attempt + 1}`);
        return {
          success: true,
          result: provisionResult,
          attemptsMade,
        };
      }

      // FAILURE: Parse and structure the error
      const errorMessage = provisionResult?.error || responseText || "Provisioning returned unsuccessful";
      lastError = parseProvisioningError(
        errorMessage,
        provisionResult || undefined,
        provisionResponse.status
      );

      console.warn(`[Agent ${agentId}] Provisioning attempt ${attempt + 1} failed:`, {
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

      console.warn(`[Agent ${agentId}] Provisioning attempt ${attempt + 1} network error:`, {
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
  console.error(`[Agent ${agentId}] All ${MAX_RETRY_ATTEMPTS} provisioning attempts failed`);
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
    console.log(`[Agent ${agent.id}] Starting Magnus provisioning with timeout=${VOICE_SERVICE_TIMEOUT_MS}ms, maxRetries=${MAX_RETRY_ATTEMPTS}`);
    console.log(`[Agent ${agent.id}] Voice service URL: ${VOICE_SERVICE_URL}`);

    const provisioningResult = await callVoiceServiceWithRetry(
      agent.id,
      agent.name,
      user?.email || `agent-${agent.id}@epic.dm`,
      org.id
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
    const sipConfig = await prisma.sIPConfig.create({
      data: {
        name: `${agent.name} SIP`,
        organizationId: org.id,
        provider: "magnus",
        sipUrl: result.sip_url || `sip:${result.sip_username}@${result.sip_server}`,
        sipUsername: result.sip_username!,
        sipPassword: result.sip_password || "",
        magnusTrunkId: result.magnus_sip_id,
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

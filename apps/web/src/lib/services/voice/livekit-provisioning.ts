/**
 * LiveKit SIP Provisioning Functions
 *
 * Shared functions for creating and managing LiveKit SIP trunks and dispatch rules.
 * Used by both agent creation and phone provisioning routes.
 */

// Voice service URL for LiveKit/Magnus integration
export const VOICE_SERVICE_URL =
  process.env.VOICE_SERVICE_URL ||
  (process.env.VERCEL
    ? "https://openclaw-platform-zcjiu.ondigitalocean.app/voice"
    : "http://localhost:5000");

// Timeout for voice service requests (30 seconds)
export const VOICE_SERVICE_TIMEOUT_MS = 30000;

/**
 * Create a timeout controller for fetch requests
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller;
}

/**
 * Extract conflicting resource ID from LiveKit error message.
 * Error format: "Conflicting inbound SIP Trunks: \"<new>\" and \"ST_xxx\""
 * or "Conflicting SIP Dispatch Rules: same Trunk+Number+PIN combination for \"SDR_xxx\" and \"<new>\""
 */
function extractConflictingResourceId(error: string): string | null {
  // Pattern for trunk conflicts: "ST_xxx"
  const trunkMatch = error.match(/"(ST_[A-Za-z0-9]+)"/);
  if (trunkMatch && trunkMatch[1]) {
    return trunkMatch[1];
  }

  // Pattern for dispatch rule conflicts: "SDR_xxx"
  const ruleMatch = error.match(/"(SDR_[A-Za-z0-9]+)"/);
  if (ruleMatch && ruleMatch[1]) {
    return ruleMatch[1];
  }

  return null;
}

/**
 * Delete an orphaned LiveKit trunk by ID
 */
async function deleteLiveKitTrunk(trunkId: string): Promise<boolean> {
  try {
    console.log(`[LiveKit] Deleting orphaned trunk: ${trunkId}`);
    const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/${trunkId}`,
      {
        method: "DELETE",
        signal: controller.signal,
      }
    );
    const result = await response.json();
    if (result.success) {
      console.log(`[LiveKit] Successfully deleted orphaned trunk: ${trunkId}`);
      return true;
    }
    console.warn(`[LiveKit] Failed to delete trunk ${trunkId}: ${result.error}`);
    return false;
  } catch (error) {
    console.error(`[LiveKit] Error deleting trunk ${trunkId}:`, error);
    return false;
  }
}

/**
 * Delete an orphaned LiveKit dispatch rule by ID
 */
async function deleteLiveKitDispatchRule(ruleId: string): Promise<boolean> {
  try {
    console.log(`[LiveKit] Deleting orphaned dispatch rule: ${ruleId}`);
    const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/dispatch-rules/${ruleId}`,
      {
        method: "DELETE",
        signal: controller.signal,
      }
    );
    const result = await response.json();
    if (result.success) {
      console.log(`[LiveKit] Successfully deleted orphaned dispatch rule: ${ruleId}`);
      return true;
    }
    console.warn(`[LiveKit] Failed to delete dispatch rule ${ruleId}: ${result.error}`);
    return false;
  } catch (error) {
    console.error(`[LiveKit] Error deleting dispatch rule ${ruleId}:`, error);
    return false;
  }
}

/**
 * Create an inbound SIP trunk in LiveKit for receiving calls
 */
export async function createLiveKitInboundTrunk(
  phoneNumber: string,
  organizationId: string,
  retryAfterCleanup = true
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

    // Check for conflict error and retry after cleanup
    const errorMsg = result.error || "";
    if (retryAfterCleanup && errorMsg.includes("Conflicting")) {
      const conflictingId = extractConflictingResourceId(errorMsg);
      if (conflictingId && conflictingId.startsWith("ST_")) {
        console.log(`[LiveKit] Detected orphaned trunk ${conflictingId}, cleaning up and retrying...`);
        const deleted = await deleteLiveKitTrunk(conflictingId);
        if (deleted) {
          // Retry once after cleanup (retryAfterCleanup=false to prevent infinite loop)
          return createLiveKitInboundTrunk(phoneNumber, organizationId, false);
        }
      }
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
 * Create an outbound SIP trunk in LiveKit for making outbound calls
 * Outbound trunks require SIP credentials to authenticate with the carrier
 */
export async function createLiveKitOutboundTrunk(
  phoneNumber: string,
  sipUsername: string,
  sipPassword: string,
  sipDomain: string,
  organizationId: string
): Promise<{ success: boolean; trunkId?: string; error?: string }> {
  try {
    console.log(`[LiveKit] Creating outbound trunk for ${phoneNumber}`);

    const controller = createTimeoutController(VOICE_SERVICE_TIMEOUT_MS);
    const response = await fetch(
      `${VOICE_SERVICE_URL}/api/telephony/trunks/outbound`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: sipUsername,
          password: sipPassword,
          sip_domain: sipDomain,
          phone_numbers: [phoneNumber],
          organization_id: organizationId,
        }),
        signal: controller.signal,
      }
    );

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`[LiveKit] Created outbound trunk: ${result.trunk_id}`);
      return { success: true, trunkId: result.trunk_id };
    }

    console.warn(`[LiveKit] Failed to create outbound trunk: ${result.error}`);
    return { success: false, error: result.error || "Failed to create outbound trunk" };
  } catch (error) {
    console.error(`[LiveKit] Error creating outbound trunk:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create LiveKit dispatch rule to route calls to the AI agent.
 * This routes incoming calls from a phone number to the voice agent.
 *
 * IMPORTANT: trunk_ids should always be provided to avoid creating catch-all rules
 * that block subsequent provisions.
 */
export async function createLiveKitDispatchRule(
  phoneNumber: string,
  trunkId: string | undefined,
  agentId: string,
  organizationId: string,
  userId: string,
  retryAfterCleanup = true
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

    // Check for conflict error and retry after cleanup
    const errorMsg = result.error || "";
    if (retryAfterCleanup && errorMsg.includes("Conflicting")) {
      const conflictingId = extractConflictingResourceId(errorMsg);
      if (conflictingId && conflictingId.startsWith("SDR_")) {
        console.log(`[LiveKit] Detected orphaned dispatch rule ${conflictingId}, cleaning up and retrying...`);
        const deleted = await deleteLiveKitDispatchRule(conflictingId);
        if (deleted) {
          // Retry once after cleanup (retryAfterCleanup=false to prevent infinite loop)
          return createLiveKitDispatchRule(phoneNumber, trunkId, agentId, organizationId, userId, false);
        }
      }
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
 * Provision all LiveKit resources for a phone number.
 * Creates inbound trunk first, then outbound trunk and dispatch rule in parallel.
 *
 * @returns Object with all provisioned IDs and any warnings
 */
export async function provisionLiveKitResources(params: {
  phoneNumber: string;
  organizationId: string;
  agentId: string;
  userId: string;
  sipUsername?: string;
  sipPassword?: string;
  sipDomain?: string;
}): Promise<{
  inboundTrunkId?: string;
  outboundTrunkId?: string;
  dispatchRuleId?: string;
  warnings: string[];
  fullyConfigured: boolean;
}> {
  const { phoneNumber, organizationId, agentId, userId, sipUsername, sipPassword, sipDomain } = params;
  const warnings: string[] = [];
  let livekitTrunkId: string | undefined;
  let livekitOutboundTrunkId: string | undefined;
  let livekitRuleId: string | undefined;

  console.log(`[LiveKit] Starting full provisioning for ${phoneNumber}`);

  // Step 1: Create inbound trunk FIRST (dispatch rule depends on this)
  const trunkResult = await createLiveKitInboundTrunk(phoneNumber, organizationId);

  if (trunkResult.success) {
    livekitTrunkId = trunkResult.trunkId;
  } else {
    console.warn(`[LiveKit] Inbound trunk creation failed: ${trunkResult.error}`);
    warnings.push(`Inbound trunk: ${trunkResult.error}`);
  }

  // Step 2: Create outbound trunk and dispatch rule in PARALLEL
  const hasOutboundCredentials = sipUsername && sipPassword;
  const effectiveSipDomain = sipDomain || "voice00.epic.dm";

  const [outboundResult, ruleResult] = await Promise.all([
    // Create outbound trunk (allows LiveKit to make outbound calls)
    hasOutboundCredentials
      ? createLiveKitOutboundTrunk(
          phoneNumber,
          sipUsername,
          sipPassword,
          effectiveSipDomain,
          organizationId
        )
      : Promise.resolve({ success: false as const, error: "Missing SIP credentials", trunkId: undefined }),

    // Create dispatch rule WITH trunk_id (prevents catch-all conflicts)
    createLiveKitDispatchRule(
      phoneNumber,
      livekitTrunkId, // Now we have the trunk_id from step 1
      agentId,
      organizationId,
      userId
    ),
  ]);

  // Process outbound trunk result
  if (outboundResult.success) {
    livekitOutboundTrunkId = outboundResult.trunkId;
  } else {
    const errorMsg = hasOutboundCredentials ? outboundResult.error : "Missing SIP credentials";
    console.warn(`[LiveKit] Outbound trunk creation failed: ${errorMsg}`);
    warnings.push(`Outbound trunk: ${errorMsg}`);
  }

  // Process dispatch rule result
  if (ruleResult.success) {
    livekitRuleId = ruleResult.ruleId;
  } else {
    console.warn(`[LiveKit] Dispatch rule creation failed: ${ruleResult.error}`);
    warnings.push(`Dispatch rule: ${ruleResult.error}`);
  }

  const fullyConfigured = !!(livekitTrunkId && livekitOutboundTrunkId && livekitRuleId);

  if (fullyConfigured) {
    console.log(`[LiveKit] Full provisioning complete: inbound=${livekitTrunkId}, outbound=${livekitOutboundTrunkId}, rule=${livekitRuleId}`);
  } else {
    console.warn(`[LiveKit] Partial provisioning: inbound=${livekitTrunkId || 'FAILED'}, outbound=${livekitOutboundTrunkId || 'FAILED'}, rule=${livekitRuleId || 'FAILED'}`);
  }

  return {
    inboundTrunkId: livekitTrunkId,
    outboundTrunkId: livekitOutboundTrunkId,
    dispatchRuleId: livekitRuleId,
    warnings,
    fullyConfigured,
  };
}

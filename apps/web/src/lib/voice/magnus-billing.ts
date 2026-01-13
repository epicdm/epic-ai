/**
 * Magnus Billing API Client
 * Port from Python reference code in /opt/epic-ai/livekit1/magnus_billing_client.py
 *
 * Magnus Billing is used for:
 * - DID (phone number) management
 * - SIP account management
 * - Inbound/outbound call routing
 */

// Lazy initialization to prevent build errors when env vars are not set
let magnusConfig: {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
} | null = null;

function getMagnusConfig() {
  if (!magnusConfig) {
    const apiKey = process.env.MAGNUS_API_KEY;
    const secretKey = process.env.MAGNUS_SECRET_KEY;
    const baseUrl = process.env.MAGNUS_BASE_URL;

    if (!apiKey || !secretKey || !baseUrl) {
      return null;
    }

    magnusConfig = {
      apiKey,
      secretKey,
      baseUrl: baseUrl.replace(/\/$/, ""), // Remove trailing slash
    };
  }
  return magnusConfig;
}

/**
 * Check if Magnus Billing is configured
 */
export function isMagnusConfigured(): boolean {
  return getMagnusConfig() !== null;
}

interface MagnusResponse {
  success?: boolean;
  rows?: Record<string, unknown>[];
  id?: string;
  error?: string;
  data?: string;
}

interface MagnusUser {
  id: string;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  mobile?: string;
  active: number;
  id_group: number;
  id_plan: number;
  typepaid: number;
  description?: string;
}

interface MagnusDID {
  id: string;
  did: string;
  country: string;
  activated: number;
  id_user?: string;
}

/**
 * DID range configuration
 */
const DID_CONFIG = {
  PREFIX: "1767818",
  RANGE_START: 9000,
  RANGE_END: 9999,
  TOTAL_IN_RANGE: 1000,
  WARNING_THRESHOLD_PERCENT: 90,
  CRITICAL_THRESHOLD_PERCENT: 99,
} as const;

/**
 * DID range status for monitoring utilization
 */
export interface DIDRangeStatus {
  totalInRange: number;
  usedInRange: number;
  availableInRange: number;
  utilizationPercent: number;
  rangeStart: string;
  rangeEnd: string;
  isExhausted: boolean;
  isNearlyExhausted: boolean;
  statusMessage: string;
}

/**
 * Error class for DID range exhaustion
 */
export class DIDRangeExhaustedError extends Error {
  public readonly totalInRange: number;
  public readonly usedInRange: number;
  public readonly availableInRange: number;
  public readonly rangeStart: string;
  public readonly rangeEnd: string;
  public readonly utilizationPercent: number;

  constructor(
    message: string,
    totalInRange: number,
    usedInRange: number,
    rangeStart: string,
    rangeEnd: string
  ) {
    const availableInRange = totalInRange - usedInRange;
    const utilizationPercent = totalInRange > 0 ? (usedInRange / totalInRange) * 100 : 100;

    const detailedMessage = `${message}

DID Range Status:
  - Range: ${rangeStart} to ${rangeEnd}
  - Total capacity: ${totalInRange}
  - Currently in use: ${usedInRange}
  - Available: ${availableInRange}
  - Utilization: ${utilizationPercent.toFixed(1)}%

Action Required: Contact your administrator to either:
  1. Release unused DIDs from the current range
  2. Configure an additional DID range
  3. Expand the current DID range allocation`;

    super(detailedMessage);
    this.name = "DIDRangeExhaustedError";
    this.totalInRange = totalInRange;
    this.usedInRange = usedInRange;
    this.availableInRange = availableInRange;
    this.rangeStart = rangeStart;
    this.rangeEnd = rangeEnd;
    this.utilizationPercent = utilizationPercent;
  }
}

interface MagnusSIP {
  id: string;
  id_user: string;
  name: string;
  callerid?: string;
  voicemail?: number;
  voicemail_email?: string;
  voicemail_password?: string;
  allow?: string;
}

interface DIDDestination {
  id_user: string;
  id_did: string;
  voip_call: number;
  id_sip: string;
  destination: string;
  priority: number;
}

/**
 * Make API request to Magnus Billing
 */
async function makeRequest(
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string,
  data?: Record<string, unknown>
): Promise<MagnusResponse> {
  const config = getMagnusConfig();
  if (!config) {
    return { success: false, error: "Magnus Billing not configured" };
  }

  const url = `${config.baseUrl}/index.php/api/${endpoint}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Basic ${config.apiKey}:${config.secretKey}`,
    "User-Agent": "Epic-AI Magnus Client",
  };

  try {
    const options: RequestInit = {
      method,
      headers,
    };

    if (method === "GET" && data) {
      const params = new URLSearchParams();
      Object.entries(data).forEach(([key, value]) => {
        params.append(key, String(value));
      });
      const urlWithParams = `${url}?${params.toString()}`;
      const response = await fetch(urlWithParams, options);
      return handleResponse(response);
    } else if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return handleResponse(response);
  } catch (error) {
    console.error("Magnus Billing API Error:", error);
    return { success: false, error: String(error) };
  }
}

async function handleResponse(response: Response): Promise<MagnusResponse> {
  if (!response.ok) {
    return {
      success: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
  }

  try {
    return await response.json();
  } catch {
    // Handle non-JSON responses
    const text = await response.text();
    return { success: true, data: text };
  }
}

// ============================================================================
// User Management
// ============================================================================

/**
 * Create a new user in Magnus Billing
 */
export async function createUser(userData: {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  phone?: string;
  mobile?: string;
  id_plan?: number;
  id_group?: number;
  typepaid?: number;
  prefix_local?: string;
  id_offer?: number;
  description?: string;
}): Promise<MagnusResponse> {
  const data = {
    active: 1,
    id_plan: 34,
    id_group: 3,
    typepaid: 0,
    prefix_local: "*/1767/7,767/1767/10",
    description: "Epic-AI Customer",
    ...userData,
  };

  return makeRequest("POST", "user", data);
}

/**
 * Get user by username
 */
export async function getUser(username: string): Promise<MagnusUser | null> {
  const response = await makeRequest("GET", `user?filter[username]=${username}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusUser;
  }
  return null;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<MagnusUser | null> {
  const response = await makeRequest("GET", `user/${userId}`);
  if (response.success !== false) {
    return response as unknown as MagnusUser;
  }
  return null;
}

/**
 * Update user information
 */
export async function updateUser(
  userId: string,
  updates: Partial<MagnusUser>
): Promise<MagnusResponse> {
  return makeRequest("PUT", `user/${userId}`, updates as Record<string, unknown>);
}

// ============================================================================
// DID (Phone Number) Management
// ============================================================================

/**
 * Fetch ALL DIDs from Magnus and return them as a Set for fast lookup.
 *
 * This is necessary because the Magnus API ignores filter parameters
 * and returns all records anyway. By fetching once and caching locally,
 * we can efficiently check for uniqueness without making repeated API calls.
 *
 * @returns Set of DID numbers (as strings) currently in Magnus
 */
export async function getAllDIDs(): Promise<Set<string>> {
  try {
    // Fetch all DIDs - no filter since Magnus ignores it anyway
    const dids = await listDIDs();
    const didSet = new Set<string>();

    for (const did of dids) {
      if (did.did) {
        didSet.add(String(did.did));
      }
    }

    console.log(`📞 Fetched ${didSet.size} existing DIDs from Magnus`);
    return didSet;
  } catch (error) {
    console.error("Failed to fetch DIDs from Magnus:", error);
    // Return empty set on error - this will allow DID generation to proceed
    // and let the create operation fail if there's actually a duplicate
    return new Set();
  }
}

/**
 * Get statistics about DID usage in the configured range.
 */
export async function getDIDUsageStats(): Promise<{
  totalInRange: number;
  usedInRange: number;
  availableInRange: number;
  utilizationPercent: number;
  allDidsCount: number;
  rangeStart: string;
  rangeEnd: string;
}> {
  const existingDIDs = await getAllDIDs();

  // Count DIDs in our specific range (9000-9999)
  const rangePrefix = `${DID_CONFIG.PREFIX}9`; // 17678189xxx
  let usedInRange = 0;
  for (const did of existingDIDs) {
    if (did.startsWith(rangePrefix)) {
      usedInRange++;
    }
  }

  const availableInRange = DID_CONFIG.TOTAL_IN_RANGE - usedInRange;
  const utilizationPercent = (usedInRange / DID_CONFIG.TOTAL_IN_RANGE) * 100;

  return {
    totalInRange: DID_CONFIG.TOTAL_IN_RANGE,
    usedInRange,
    availableInRange,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    allDidsCount: existingDIDs.size,
    rangeStart: `${DID_CONFIG.PREFIX}${DID_CONFIG.RANGE_START}`,
    rangeEnd: `${DID_CONFIG.PREFIX}${DID_CONFIG.RANGE_END}`,
  };
}

/**
 * Get detailed status of DID range utilization with exhaustion detection.
 */
export async function getDIDRangeStatus(
  existingDIDs?: Set<string>
): Promise<DIDRangeStatus> {
  if (!existingDIDs) {
    existingDIDs = await getAllDIDs();
  }

  // Count DIDs in our specific range (9000-9999)
  const rangePrefix = `${DID_CONFIG.PREFIX}9`; // 17678189xxx
  let usedInRange = 0;
  for (const did of existingDIDs) {
    if (did.startsWith(rangePrefix)) {
      usedInRange++;
    }
  }

  const availableInRange = DID_CONFIG.TOTAL_IN_RANGE - usedInRange;
  const utilizationPercent =
    DID_CONFIG.TOTAL_IN_RANGE > 0
      ? (usedInRange / DID_CONFIG.TOTAL_IN_RANGE) * 100
      : 100;

  const rangeStart = `${DID_CONFIG.PREFIX}${DID_CONFIG.RANGE_START}`;
  const rangeEnd = `${DID_CONFIG.PREFIX}${DID_CONFIG.RANGE_END}`;

  const isExhausted = availableInRange <= 0;
  const isNearlyExhausted =
    utilizationPercent >= DID_CONFIG.WARNING_THRESHOLD_PERCENT && !isExhausted;

  let statusMessage: string;
  if (isExhausted) {
    statusMessage = `CRITICAL: DID range exhausted. ${usedInRange}/${DID_CONFIG.TOTAL_IN_RANGE} DIDs in use (100%).`;
  } else if (isNearlyExhausted) {
    statusMessage = `WARNING: DID range nearly exhausted. ${usedInRange}/${DID_CONFIG.TOTAL_IN_RANGE} DIDs in use (${utilizationPercent.toFixed(1)}%). Only ${availableInRange} DIDs remaining.`;
  } else {
    statusMessage = `OK: DID range healthy. ${usedInRange}/${DID_CONFIG.TOTAL_IN_RANGE} DIDs in use (${utilizationPercent.toFixed(1)}%). ${availableInRange} DIDs available.`;
  }

  return {
    totalInRange: DID_CONFIG.TOTAL_IN_RANGE,
    usedInRange,
    availableInRange,
    utilizationPercent: Math.round(utilizationPercent * 100) / 100,
    rangeStart,
    rangeEnd,
    isExhausted,
    isNearlyExhausted,
    statusMessage,
  };
}

/**
 * Check if the DID range is exhausted and throw an error if so.
 */
export async function checkRangeExhaustion(
  existingDIDs?: Set<string>,
  options: {
    throwOnExhausted?: boolean;
    warnOnNearlyExhausted?: boolean;
  } = {}
): Promise<DIDRangeStatus> {
  const { throwOnExhausted = true, warnOnNearlyExhausted = true } = options;

  const status = await getDIDRangeStatus(existingDIDs);

  if (status.isExhausted) {
    const errorMsg = `Cannot provision new phone number: DID range is completely exhausted. All ${status.totalInRange} DIDs in range ${status.rangeStart}-${status.rangeEnd} are in use.`;
    console.error(`❌ ${errorMsg}`);

    if (throwOnExhausted) {
      throw new DIDRangeExhaustedError(
        errorMsg,
        status.totalInRange,
        status.usedInRange,
        status.rangeStart,
        status.rangeEnd
      );
    }
  } else if (status.isNearlyExhausted && warnOnNearlyExhausted) {
    console.warn(`⚠️ ${status.statusMessage}`);
  }

  return status;
}

/**
 * Check if a specific DID exists in Magnus.
 * Uses the local filtering approach since Magnus API ignores filter parameters.
 */
export async function checkDIDExists(did: string): Promise<boolean> {
  const existingDIDs = await getAllDIDs();
  return existingDIDs.has(did);
}

/**
 * Generate a unique DID number in the configured range.
 *
 * Improved implementation that:
 * 1. Fetches all DIDs once and checks locally (avoids API filter bug)
 * 2. Uses random generation first (fast for sparse ranges)
 * 3. Falls back to sequential search when random fails
 * 4. Provides clear error messages on range exhaustion
 *
 * @param existingDIDs Optional set of DIDs already in use. If not provided, will fetch from Magnus.
 * @param options Configuration options for DID generation
 * @returns A unique DID number string, or null if range is exhausted
 */
export async function generateUniqueDID(
  existingDIDs?: Set<string>,
  options: {
    prefix?: string;
    minRange?: number;
    maxRange?: number;
    useSequential?: boolean;
    sequentialStart?: number;
    maxRandomAttempts?: number;
  } = {}
): Promise<string | null> {
  const {
    prefix = DID_CONFIG.PREFIX,
    minRange = DID_CONFIG.RANGE_START,
    maxRange = DID_CONFIG.RANGE_END,
    useSequential = false,
    sequentialStart,
    maxRandomAttempts = 50,
  } = options;

  // Fetch all existing DIDs once if not provided
  if (!existingDIDs) {
    existingDIDs = await getAllDIDs();
    console.log(`📞 Loaded ${existingDIDs.size} existing DIDs for uniqueness check`);
  }

  // If sequential mode requested, skip random attempts
  if (!useSequential) {
    // Try random DIDs first (faster for sparse ranges)
    for (let attempt = 0; attempt < maxRandomAttempts; attempt++) {
      const randomNumber = Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
      const did = `${prefix}${randomNumber}`;

      // Check against local cache of existing DIDs
      if (!existingDIDs.has(did)) {
        console.log(`✅ Generated unique DID: ${did} (random attempt ${attempt + 1})`);
        return did;
      }
    }

    // If random didn't find one, switch to sequential
    console.warn(
      `⚠️ Random DID generation failed after ${maxRandomAttempts} attempts, trying sequential search`
    );
  }

  // Sequential search (for nearly-full ranges or fallback after race conditions)
  const startSuffix = sequentialStart ?? minRange;
  console.log(`🔍 Starting sequential DID search from ${prefix}${startSuffix}`);

  for (let suffix = startSuffix; suffix <= maxRange; suffix++) {
    const did = `${prefix}${suffix}`;
    if (!existingDIDs.has(did)) {
      console.log(`✅ Generated unique DID via sequential search: ${did}`);
      return did;
    }
  }

  // If we started mid-range, wrap around and check the beginning
  if (startSuffix > minRange) {
    console.log(`🔄 Wrapping around to check DIDs from ${minRange} to ${startSuffix - 1}`);
    for (let suffix = minRange; suffix < startSuffix; suffix++) {
      const did = `${prefix}${suffix}`;
      if (!existingDIDs.has(did)) {
        console.log(`✅ Generated unique DID via sequential search (wrapped): ${did}`);
        return did;
      }
    }
  }

  // Range is exhausted
  console.error(`❌ DID range exhausted: ${prefix}${minRange}-${prefix}${maxRange}`);
  return null;
}

/**
 * Check if an error message indicates a duplicate DID (race condition).
 */
function isDuplicateDIDError(errorMsg: string): boolean {
  const errorLower = errorMsg.toLowerCase();
  return (
    (errorLower.includes("duplicate entry") && errorLower.includes("did")) ||
    (errorLower.includes("already exists") && errorLower.includes("did")) ||
    errorLower.includes("duplicate did") ||
    errorLower.includes("did already in use")
  );
}

/**
 * Create DID in Magnus Billing
 */
export async function createDID(
  did: string,
  country: string = "Dominica",
  activated: number = 1
): Promise<MagnusResponse> {
  return makeRequest("POST", "did", {
    did,
    country,
    activated,
  });
}

/**
 * Get DID information by number
 */
export async function getDID(did: string): Promise<MagnusDID | null> {
  const response = await makeRequest("GET", `did?filter[did]=${did}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusDID;
  }
  return null;
}

/**
 * Get DID by ID
 */
export async function getDIDById(didId: string): Promise<MagnusDID | null> {
  const response = await makeRequest("GET", `did/${didId}`);
  if (response.success !== false) {
    return response as unknown as MagnusDID;
  }
  return null;
}

/**
 * List all DIDs
 */
export async function listDIDs(
  filters?: Record<string, string>
): Promise<MagnusDID[]> {
  let endpoint = "did";
  if (filters) {
    const params = Object.entries(filters)
      .map(([key, value]) => `filter[${key}]=${encodeURIComponent(value)}`)
      .join("&");
    endpoint = `did?${params}`;
  }

  const response = await makeRequest("GET", endpoint);
  if (response.rows) {
    return response.rows as unknown as MagnusDID[];
  }
  return [];
}

// ============================================================================
// DID Destination (Routing)
// ============================================================================

/**
 * Create DID destination (routing rules)
 */
export async function createDIDDestination(
  destinationData: DIDDestination
): Promise<MagnusResponse> {
  return makeRequest("POST", "diddestination", destinationData as unknown as Record<string, unknown>);
}

// ============================================================================
// SIP Management
// ============================================================================

/**
 * Get SIP account for user
 */
export async function getSIPByUser(userId: string): Promise<MagnusSIP | null> {
  const response = await makeRequest("GET", `sip?filter[id_user]=${userId}`);
  if (response.rows && response.rows.length > 0) {
    return response.rows[0] as unknown as MagnusSIP;
  }
  return null;
}

/**
 * Update SIP account settings
 */
export async function updateSIP(
  sipId: string,
  updates: {
    callerid?: string;
    voicemail?: number;
    voicemail_email?: string;
    voicemail_password?: string;
    allow?: string;
  }
): Promise<MagnusResponse> {
  return makeRequest("PUT", `sip/${sipId}`, updates);
}

// ============================================================================
// Offer Management
// ============================================================================

/**
 * Create offer usage for user
 */
export async function createOfferUse(offerData: {
  id_user: string;
  id_offer: number;
  reservationdate: string;
  month_payed: number;
  status: number;
}): Promise<MagnusResponse> {
  return makeRequest("POST", "offeruse", offerData);
}

// ============================================================================
// Complete Provisioning Workflows
// ============================================================================

export interface ProvisionDIDResult {
  success: boolean;
  did?: string;
  didId?: string;
  sipId?: string;
  destination?: string;
  message?: string;
  error?: string;
  raceConditionsEncountered?: number;
}

/**
 * Internal function to provision a DID with a specific DID number.
 * Separated to allow retry logic in the main function.
 */
async function provisionDIDWithSpecificNumber(
  userId: string,
  username: string,
  did: string
): Promise<ProvisionDIDResult> {
  // 1. Create DID in Magnus Billing
  const didResult = await createDID(did, "Dominica", 1);
  if (!didResult.success && !didResult.id) {
    return {
      success: false,
      did,
      error: `Failed to create DID: ${didResult.error || "Unknown error"}`,
    };
  }

  const didId = didResult.id;
  console.log(`✅ Created DID in Magnus, ID: ${didId}`);

  // 2. Get user's SIP account
  const sip = await getSIPByUser(userId);
  if (!sip) {
    return {
      success: false,
      did,
      error: `No SIP account found for user ${userId}`,
    };
  }

  const sipId = sip.id;
  console.log(`✅ Found SIP account, ID: ${sipId}`);

  // 3. Create DID destination (routing to SIP account)
  const destinationData: DIDDestination = {
    id_user: userId,
    id_did: didId!,
    voip_call: 1,
    id_sip: sipId,
    destination: `SIP/${username}`,
    priority: 1,
  };

  await createDIDDestination(destinationData);
  console.log(`✅ Created DID destination: SIP/${username}`);

  // 4. Set caller ID on SIP account
  await updateSIP(sipId, {
    callerid: did,
    allow: "opus,g729,gsm,alaw,ulaw",
  });
  console.log(`✅ Set caller ID: ${did}`);

  return {
    success: true,
    did,
    didId,
    sipId,
    destination: `SIP/${username}`,
    message: `DID ${did} provisioned and routed to ${username}`,
  };
}

/**
 * Provision a DID for an existing user with complete setup.
 *
 * Improved implementation with:
 * 1. Upfront DID range exhaustion check
 * 2. Local DID cache for efficient uniqueness checking
 * 3. Retry logic with sequential fallback for race conditions
 * 4. Clear error messaging
 */
export async function provisionDIDForUser(
  userId: string,
  username: string,
  prefix: string = DID_CONFIG.PREFIX,
  minRange: number = DID_CONFIG.RANGE_START,
  maxRange: number = DID_CONFIG.RANGE_END
): Promise<ProvisionDIDResult> {
  // Configuration for retry strategy
  const MAX_RANDOM_RETRIES = 5;
  const MAX_SEQUENTIAL_RETRIES = 10;
  const TOTAL_MAX_RETRIES = MAX_RANDOM_RETRIES + MAX_SEQUENTIAL_RETRIES;

  try {
    // 1. Fetch all existing DIDs once upfront
    const existingDIDs = await getAllDIDs();
    console.log(`📞 Loaded ${existingDIDs.size} existing DIDs for provisioning`);

    // 2. Pre-emptive check for range exhaustion
    const rangeStatus = await checkRangeExhaustion(existingDIDs, {
      throwOnExhausted: true,
      warnOnNearlyExhausted: true,
    });
    console.log(`📊 DID range status: ${rangeStatus.statusMessage}`);

    // Track state for sequential fallback
    let useSequential = false;
    let sequentialStart: number | undefined;
    let lastFailedDID: string | null = null;
    let raceConditionCount = 0;

    for (let retryAttempt = 0; retryAttempt < TOTAL_MAX_RETRIES; retryAttempt++) {
      // 3. Generate unique DID using local cache
      const did = await generateUniqueDID(existingDIDs, {
        prefix,
        minRange,
        maxRange,
        useSequential,
        sequentialStart,
      });

      if (!did) {
        // Range exhausted - provide clear error
        throw new DIDRangeExhaustedError(
          `Cannot generate unique DID: All DIDs in range are in use.`,
          rangeStatus.totalInRange,
          rangeStatus.usedInRange,
          rangeStatus.rangeStart,
          rangeStatus.rangeEnd
        );
      }

      const modeStr = useSequential ? "sequential" : "random";
      console.log(
        `🔄 Attempting provisioning with DID ${did} (${modeStr} mode, attempt ${retryAttempt + 1}/${TOTAL_MAX_RETRIES})`
      );

      // 4. Attempt to provision with this DID
      const result = await provisionDIDWithSpecificNumber(userId, username, did);

      if (result.success) {
        if (raceConditionCount > 0) {
          console.log(`✅ Provisioning succeeded after ${raceConditionCount} race condition(s)`);
        }
        return { ...result, raceConditionsEncountered: raceConditionCount };
      }

      // 5. Check if failure is due to duplicate DID (race condition)
      if (result.error && isDuplicateDIDError(result.error)) {
        raceConditionCount++;
        console.warn(
          `⚠️ Race condition #${raceConditionCount}: DID ${did} was created by another process. Adding to cache and retrying...`
        );
        existingDIDs.add(did);
        lastFailedDID = did;

        // After several random failures, switch to sequential mode
        if (raceConditionCount >= MAX_RANDOM_RETRIES && !useSequential) {
          useSequential = true;
          if (lastFailedDID) {
            const failedSuffix = parseInt(lastFailedDID.slice(-4), 10);
            sequentialStart = failedSuffix < maxRange ? failedSuffix + 1 : minRange;
          }
          console.warn(
            `⚠️ Switching to sequential DID allocation after ${raceConditionCount} race conditions. Starting from ${prefix}${sequentialStart}`
          );
        }
        continue;
      }

      // Different error, don't retry
      console.error(`❌ Provisioning failed with non-retryable error: ${result.error}`);
      return result;
    }

    // Exhausted all retries
    const finalStatus = await getDIDRangeStatus(existingDIDs);
    if (finalStatus.isExhausted) {
      throw new DIDRangeExhaustedError(
        `DID range exhausted after ${TOTAL_MAX_RETRIES} provisioning attempts.`,
        finalStatus.totalInRange,
        finalStatus.usedInRange,
        finalStatus.rangeStart,
        finalStatus.rangeEnd
      );
    }

    return {
      success: false,
      error: `Could not provision DID after ${TOTAL_MAX_RETRIES} attempts due to repeated race conditions. Race conditions encountered: ${raceConditionCount}. DID range still has ${finalStatus.availableInRange} available DIDs - this may indicate high concurrency. Please try again.`,
      raceConditionsEncountered: raceConditionCount,
    };
  } catch (error) {
    if (error instanceof DIDRangeExhaustedError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: `DID provisioning failed: ${String(error)}`,
    };
  }
}

export interface ProvisionUserResult {
  success: boolean;
  userId?: string;
  username?: string;
  did?: string;
  password?: string;
  sipId?: string;
  email?: string;
  error?: string;
  raceConditionsEncountered?: number;
}

/**
 * Internal function to create a DID with retry logic for race conditions.
 */
async function createDIDWithRetry(
  did: string,
  existingDIDs: Set<string>,
  options: {
    prefix?: string;
    minRange?: number;
    maxRange?: number;
    maxRetries?: number;
  } = {}
): Promise<{ success: boolean; did: string; didId?: string; error?: string; raceConditionCount: number }> {
  const {
    prefix = DID_CONFIG.PREFIX,
    minRange = DID_CONFIG.RANGE_START,
    maxRange = DID_CONFIG.RANGE_END,
    maxRetries = 15,
  } = options;

  let currentDID = did;
  let raceConditionCount = 0;
  let useSequential = false;
  let sequentialStart: number | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    console.log(`🔄 Attempting to create DID ${currentDID} (attempt ${attempt + 1}/${maxRetries})`);

    const didResult = await createDID(currentDID, "Dominica", 1);

    if (didResult.success || didResult.id) {
      return {
        success: true,
        did: currentDID,
        didId: didResult.id,
        raceConditionCount,
      };
    }

    // Check if error is due to duplicate DID (race condition)
    const errorMsg = didResult.error || "";
    if (isDuplicateDIDError(errorMsg)) {
      raceConditionCount++;
      console.warn(
        `⚠️ Race condition #${raceConditionCount}: DID ${currentDID} already exists. Generating new DID...`
      );
      existingDIDs.add(currentDID);

      // After several failures, switch to sequential mode
      if (raceConditionCount >= 5 && !useSequential) {
        useSequential = true;
        const failedSuffix = parseInt(currentDID.slice(-4), 10);
        sequentialStart = failedSuffix < maxRange ? failedSuffix + 1 : minRange;
        console.warn(`⚠️ Switching to sequential DID allocation starting from ${prefix}${sequentialStart}`);
      }

      // Generate new DID
      const newDID = await generateUniqueDID(existingDIDs, {
        prefix,
        minRange,
        maxRange,
        useSequential,
        sequentialStart,
      });

      if (!newDID) {
        return {
          success: false,
          did: currentDID,
          error: "DID range exhausted",
          raceConditionCount,
        };
      }

      currentDID = newDID;
      continue;
    }

    // Different error, don't retry
    return {
      success: false,
      did: currentDID,
      error: errorMsg || "Unknown error creating DID",
      raceConditionCount,
    };
  }

  return {
    success: false,
    did: currentDID,
    error: `Could not create DID after ${maxRetries} attempts`,
    raceConditionCount,
  };
}

/**
 * Complete user provisioning workflow
 * Creates user, generates DID, creates SIP, sets up routing
 *
 * Improved implementation with:
 * 1. Upfront DID range exhaustion check
 * 2. Local DID cache for efficient uniqueness checking
 * 3. Retry logic with sequential fallback for race conditions
 * 4. Clear error messaging
 */
export async function provisionCompleteUser(
  firstname: string,
  lastname: string,
  email: string,
  phone: string,
  password?: string,
  prefix: string = DID_CONFIG.PREFIX
): Promise<ProvisionUserResult> {
  try {
    // 1. Fetch all existing DIDs once upfront
    const existingDIDs = await getAllDIDs();
    console.log(`📞 Loaded ${existingDIDs.size} existing DIDs for provisioning`);

    // 2. Pre-emptive check for range exhaustion
    const rangeStatus = await checkRangeExhaustion(existingDIDs, {
      throwOnExhausted: true,
      warnOnNearlyExhausted: true,
    });
    console.log(`📊 DID range status: ${rangeStatus.statusMessage}`);

    // 3. Generate password if not provided
    if (!password) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      password = Array.from({ length: 12 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
      ).join("");
    }

    // 4. Generate unique DID using local cache
    const did = await generateUniqueDID(existingDIDs, { prefix });
    if (!did) {
      throw new DIDRangeExhaustedError(
        "Could not generate unique DID: All DIDs in range are in use.",
        rangeStatus.totalInRange,
        rangeStatus.usedInRange,
        rangeStatus.rangeStart,
        rangeStatus.rangeEnd
      );
    }

    // 5. Create username
    const safeFirstname = firstname.replace(/\s/g, "_").slice(0, 8);
    const username = `${safeFirstname}_${did}`;

    // Check if user exists
    const existingUser = await getUser(username);
    if (existingUser) {
      return {
        success: false,
        error: "User already exists",
      };
    }

    // 6. Create user
    const userResult = await createUser({
      username,
      password,
      firstname,
      lastname,
      email,
      phone,
      mobile: phone,
      id_group: 3,
      id_plan: 34,
      typepaid: 0,
      prefix_local: "*/1767/7,767/1767/10",
      description: "Epic-AI Customer",
      id_offer: 7,
    });

    if (!userResult.success && !userResult.id) {
      return {
        success: false,
        error: `User creation failed: ${userResult.error || "Unknown error"}`,
      };
    }

    const userId = userResult.id!;

    // 7. Create DID with retry logic for race conditions
    const didCreation = await createDIDWithRetry(did, existingDIDs, { prefix });
    if (!didCreation.success || !didCreation.didId) {
      return {
        success: false,
        error: `DID creation failed: ${didCreation.error}`,
        raceConditionsEncountered: didCreation.raceConditionCount,
      };
    }

    const didId = didCreation.didId;
    const actualDID = didCreation.did;

    // 8. Get SIP account
    const sip = await getSIPByUser(userId);
    if (!sip) {
      return {
        success: false,
        error: "SIP account not found",
        raceConditionsEncountered: didCreation.raceConditionCount,
      };
    }

    const sipId = sip.id;

    // 9. Create DID destination
    await createDIDDestination({
      id_user: userId,
      id_did: didId,
      voip_call: 1,
      id_sip: sipId,
      destination: `SIP/${username}`,
      priority: 1,
    });

    // 10. Update SIP settings
    await updateSIP(sipId, {
      callerid: actualDID,
      voicemail: 1,
      voicemail_email: email,
      voicemail_password: actualDID.slice(-4), // Last 4 digits of DID
      allow: "opus,g729,gsm,alaw,ulaw",
    });

    // 11. Create offer use
    await createOfferUse({
      id_user: userId,
      id_offer: 7,
      reservationdate: new Date().toISOString().slice(0, 19).replace("T", " "),
      month_payed: 1,
      status: 1,
    });

    if (didCreation.raceConditionCount > 0) {
      console.log(`✅ Provisioning succeeded after ${didCreation.raceConditionCount} race condition(s)`);
    }

    return {
      success: true,
      userId,
      username,
      did: actualDID,
      password,
      sipId,
      email,
      raceConditionsEncountered: didCreation.raceConditionCount,
    };
  } catch (error) {
    if (error instanceof DIDRangeExhaustedError) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: `Provisioning failed: ${String(error)}`,
    };
  }
}

// ============================================================================
// CDR (Call Detail Records)
// ============================================================================

export interface CallDetailRecord {
  id: string;
  id_user: string;
  calledstation: string;
  src: string;
  starttime: string;
  sessiontime: number;
  sessionbill: number;
  real_sessiontime: number;
  terminatecauseid: number;
}

/**
 * Get call detail records
 */
export async function getCDRs(
  filters?: Record<string, string>,
  limit: number = 100
): Promise<CallDetailRecord[]> {
  let endpoint = `cdr?limit=${limit}`;
  if (filters) {
    const params = Object.entries(filters)
      .map(([key, value]) => `filter[${key}]=${encodeURIComponent(value)}`)
      .join("&");
    endpoint = `${endpoint}&${params}`;
  }

  const response = await makeRequest("GET", endpoint);
  if (response.rows) {
    return response.rows as unknown as CallDetailRecord[];
  }
  return [];
}
